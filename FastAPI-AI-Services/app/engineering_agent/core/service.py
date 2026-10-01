"""
Engineering Agent Core Service Facade.
Provides Multi-Tenant Persistent Execution, Cold-Start Memory Hydration, and PostgreSQL Auditing (Phase 22).
"""
import uuid
import time
from typing import Optional, Dict, Any

from fastapi import HTTPException, status
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.schemas.response import (
    EngineeringAgentResponse,
    MetricItem,
    ArtifactItem,
    ActionItem,
    ToolExecutionSummary,
    ExecutionTelemetryTrace
)
from app.config import settings
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.agents.orchestrator import engineering_orchestrator
from app.engineering_agent.reliability import tenant_rate_limiter, ReliabilityMetricsTracker
from app.engineering_agent.memory import conversation_memory_store, ConversationTurn
from app.engineering_agent.memory.scrubber import secret_scrubber
from app.db.connection import db_manager
from app.db.engineering_repository import engineering_chat_repository
from app.utils.auth import AuthenticatedUser
from app.utils.logger import logger


class EngineeringAgentService:
    """High-level service facade for processing Engineering AI Agent requests with PostgreSQL persistence."""

    async def execute_agent(
        self,
        request: EngineeringAgentRequest,
        user: AuthenticatedUser,
        raw_token: Optional[str] = None
    ) -> EngineeringAgentResponse:
        """
        Execute an engineering agent task within the authenticated tenant context.
        Enforces strict SaaS tenant boundary validation, PostgreSQL persistence, and memory hydration.
        """
        # 1. Require verified organization_id from the authenticated user token
        if not user.organization_id:
            logger.warning(f"[EngineeringAgentService] Request rejected: User '{user.id}' missing organization_id in token.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant context required. The authenticated token does not contain a valid organization identifier."
            )

        # 2. Prevent client-side tenant override / IDOR attempt
        if request.tenant_id and request.tenant_id != user.organization_id:
            logger.warning(
                f"[EngineeringAgentService] IDOR Security Alert: User '{user.id}' (org: '{user.organization_id}') "
                f"attempted to access foreign tenant '{request.tenant_id}'."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access forbidden. You cannot access or specify a tenant ID other than your authenticated organization."
            )

        tenant_id = user.organization_id

        # 3. Tenant Rate Limiting (Phase 16: Production Reliability)
        is_allowed, retry_after = await tenant_rate_limiter.check_rate_limit(tenant_id)
        if not is_allowed:
            logger.warning(f"[EngineeringAgentService] Rate limit exceeded for tenant '{tenant_id}' (user '{user.id}').")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
                headers={"Retry-After": str(int(retry_after) + 1)}
            )

        # 4. PostgreSQL Persistent Conversation Resolution & Validation
        conversation_id: str = request.conversation_id or f"eng-conv-{uuid.uuid4().hex[:12]}"
        scrubbed_user_message = secret_scrubber.scrub(request.message)

        if db_manager.session_factory:
            async with db_manager.get_session() as db_sess:
                if request.conversation_id:
                    # Validate ownership & existence in PostgreSQL
                    conv = await engineering_chat_repository.get_conversation(
                        db_sess,
                        conversation_id=request.conversation_id,
                        user_id=user.id,
                        organization_id=tenant_id,
                        include_messages=True
                    )
                    if not conv:
                        logger.warning(
                            f"[EngineeringAgentService] Conversation '{request.conversation_id}' not found "
                            f"or unowned by user '{user.id}' (org: '{tenant_id}')."
                        )
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Conversation not found."
                        )
                    conversation_id = conv.id

                    # If in-memory memory store is cold, hydrate from persistent messages
                    existing_session = await conversation_memory_store.get_session(tenant_id, user.id, conversation_id)
                    if not existing_session and conv.messages:
                        await conversation_memory_store.hydrate_from_messages(
                            tenant_id=tenant_id,
                            user_id=user.id,
                            conversation_id=conversation_id,
                            messages=conv.messages
                        )
                else:
                    # Automatically create a persistent conversation in PostgreSQL
                    conv = await engineering_chat_repository.create_conversation(
                        db_sess,
                        user_id=user.id,
                        organization_id=tenant_id,
                        title="New Engineering Analysis",
                        project_id=request.project_id,
                        repository_id=request.repository_id,
                        developer_id=request.developer_id
                    )
                    conversation_id = conv.id

                # 5. Persist the incoming USER message to PostgreSQL
                user_msg_id = f"eng-msg-{uuid.uuid4().hex[:12]}"
                await engineering_chat_repository.create_message(
                    db_sess,
                    conversation_id=conversation_id,
                    organization_id=tenant_id,
                    user_id=user.id,
                    sender="user",
                    content=scrubbed_user_message,
                    custom_id=user_msg_id
                )

        message_id = f"eng-msg-{uuid.uuid4().hex[:12]}"

        # 6. Initialize isolated agent execution state strictly bounded to user's tenant
        state = AgentState(
            user_request=request.message,
            tenant_id=tenant_id,
            user_id=user.id,
            auth_token=raw_token,
            project_id=request.project_id,
            repository_id=request.repository_id,
            developer_id=request.developer_id,
            conversation_id=conversation_id,
            message_id=message_id
        )

        # 7. Execute Multi-Agent LangGraph Orchestration
        try:
            await engineering_orchestrator.orchestrate(state)
        except Exception as e:
            logger.error(f"[EngineeringAgentService] Execution error: {str(e)}", exc_info=True)
            state.error = str(e)
            if not state.final_response:
                state.final_response = f"An error occurred during engineering agent execution: {str(e)}"

        duration_ms = state.finalize()

        # 8. Transform Output Artifacts & Telemetry
        tools_executed = [
            ToolExecutionSummary(
                tool_name=getattr(t, "tool_name", t.get("tool_name", "unknown") if isinstance(t, dict) else "unknown"),
                status="success" if (getattr(t, "success", True) if not isinstance(t, dict) else t.get("success", True)) else "error",
                duration_ms=round(getattr(t, "duration_ms", 0.0) if not isinstance(t, dict) else float(t.get("duration_ms", 0.0)), 2),
                start_time=getattr(t, "start_time", None) if not isinstance(t, dict) else t.get("start_time"),
                end_time=getattr(t, "end_time", None) if not isinstance(t, dict) else t.get("end_time"),
                error=getattr(t, "error_message", None) if not isinstance(t, dict) else t.get("error_message")
            )
            for t in state.tool_results
        ]

        metrics = [
            MetricItem(
                label=m["label"],
                value=m["value"],
                change=m.get("change"),
                color=m.get("color", "emerald")
            )
            for m in state.metrics
        ]

        actions = [
            ActionItem(
                label=a["label"],
                href=a.get("href"),
                action_type=a.get("action_type", "link")
            )
            for a in state.actions
        ]

        artifacts = [
            ArtifactItem(
                id=art.get("id", str(uuid.uuid4())),
                title=art.get("title", "Artifact"),
                artifact_type=art.get("artifact_type", "report"),
                content=art.get("content", ""),
                created_at=art.get("created_at", str(time.time()))
            )
            for art in state.artifacts
        ]

        scrubbed_assistant_response = secret_scrubber.scrub(state.final_response or "Analysis complete.")

        # 9. Persist ASSISTANT Response + Telemetry to PostgreSQL & Touch updated_at
        if db_manager.session_factory:
            try:
                async with db_manager.get_session() as db_sess:
                    await engineering_chat_repository.create_message(
                        db_sess,
                        conversation_id=conversation_id,
                        organization_id=tenant_id,
                        user_id=user.id,
                        sender="assistant",
                        content=scrubbed_assistant_response,
                        detected_intent=state.detected_intent,
                        selected_agent=state.selected_agent,
                        metrics=[m.model_dump() for m in metrics] if metrics else [],
                        artifacts=[art.model_dump() for art in artifacts] if artifacts else [],
                        actions=[a.model_dump() for a in actions] if actions else [],
                        tools_executed=[t.model_dump() for t in tools_executed] if tools_executed else [],
                        execution_time_ms=round(duration_ms, 2),
                        custom_id=message_id
                    )
            except Exception as db_err:
                logger.error(f"[EngineeringAgentService] Failed to persist assistant response in PostgreSQL: {db_err}")

        # 10. Record turn into in-memory conversation memory cache
        try:
            turn = ConversationTurn(
                turn_id=message_id,
                user_message=scrubbed_user_message,
                agent_response=scrubbed_assistant_response,
                detected_intent=state.detected_intent,
                selected_agent=state.selected_agent,
                resolved_repository_name=state.repository_id,
                resolved_project_name=state.project_id,
                resolved_developer_name=state.developer_id,
                metrics_summary=[m.model_dump() for m in metrics] if metrics else []
            )
            await conversation_memory_store.add_turn(
                tenant_id=tenant_id,
                user_id=user.id,
                conversation_id=conversation_id,
                turn=turn
            )
        except Exception as mem_err:
            logger.warning(f"[EngineeringAgentService] Failed to record turn in memory store: {mem_err}")

        # 11. Construct safe structured execution telemetry trace (Phase 25K & Part 6)
        trace_id = f"trace-{uuid.uuid4().hex[:16]}"
        request_id = f"req-{uuid.uuid4().hex[:12]}"
        if isinstance(state, dict):
            llm_diag = state.get("llm_diagnostics") or {}
            detected_intent = state.get("detected_intent")
            selected_agent_name = state.get("selected_agent", "")
            raw_tools = state.get("tool_results", [])
        else:
            llm_diag = getattr(state, "llm_diagnostics", {}) or {}
            detected_intent = getattr(state, "detected_intent", None)
            selected_agent_name = getattr(state, "selected_agent", "") or ""
            raw_tools = getattr(state, "tool_results", [])

        provider_name = llm_diag.get("provider") or getattr(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "unknown")
        model_name = llm_diag.get("model") or getattr(settings, "ENGINEERING_AGENT_LLM_MODEL", "unknown")
        llm_status = llm_diag.get("status")
        llm_called_flag = bool(llm_status in ("success", "fallback") or llm_diag.get("called", True))
        llm_latency_ms = round(float(llm_diag.get("latency_ms", 0.0)), 2)

        # Route categorization
        if detected_intent in ("general_technical_qa", "general_engineering_qa"):
            route_type = "direct_llm"
        elif "Multi-Agent" in selected_agent_name:
            route_type = "multi_agent"
        elif "Clarification" in selected_agent_name:
            route_type = "clarification"
        elif "Guardrail" in selected_agent_name or "Security" in selected_agent_name:
            route_type = "guardrail"
        else:
            route_type = "tool_first"

        tools_executed_names: List[str] = []
        tools_called_telemetry = []
        total_tool_latency = 0.0

        for t in raw_tools:
            if hasattr(t, "tool_name"):
                t_name = t.tool_name
                t_dur = round(getattr(t, "duration_ms", 0.0), 2)
                t_succ = getattr(t, "success", True)
            elif isinstance(t, dict):
                t_name = t.get("name") or t.get("tool_name", "unknown")
                t_dur = round(float(t.get("duration_ms", 0.0)), 2)
                t_succ = bool(t.get("success", True))
            else:
                t_name = "unknown"
                t_dur = 0.0
                t_succ = True

            tools_executed_names.append(t_name)
            total_tool_latency += t_dur
            tools_called_telemetry.append({
                "name": t_name,
                "duration_ms": t_dur,
                "success": t_succ
            })

        response_gen_metrics = {
            "llm_called": llm_called_flag,
            "duration_ms": llm_latency_ms
        }

        resp_error = state.get("error") if isinstance(state, dict) else getattr(state, "error", None)

        telemetry_trace = ExecutionTelemetryTrace(
            request_id=request_id,
            trace_id=trace_id,
            query=scrubbed_user_message,
            intent=detected_intent or "unknown",
            route=route_type,
            llm_provider=provider_name,
            llm_model=model_name,
            llm_called=llm_called_flag,
            llm_latency_ms=llm_latency_ms,
            tools_selected=tools_executed_names,
            tools_executed=tools_executed_names,
            tools_called=tools_called_telemetry,
            tool_latency_ms=round(total_tool_latency, 2),
            database_latency_ms=0.0,
            total_latency_ms=round(duration_ms, 2),
            success=resp_error is None,
            error_type=type(resp_error).__name__ if resp_error else None,
            response_generation=response_gen_metrics
        )

        logger.info(
            f"[EngineeringAgentService] Request '{request_id}' (Trace: '{trace_id}') | "
            f"Intent: {detected_intent} | Route: {route_type} | Tools: {len(tools_executed_names)} | "
            f"LLM: {provider_name}/{model_name} ({llm_latency_ms}ms) | Total: {duration_ms:.2f}ms"
        )

        resp_error = state.get("error") if isinstance(state, dict) else getattr(state, "error", None)
        resp_conv_id = state.get("conversation_id", conversation_id) if isinstance(state, dict) else getattr(state, "conversation_id", conversation_id)
        resp_msg_id = state.get("message_id") if isinstance(state, dict) else getattr(state, "message_id", None)
        if not resp_msg_id:
            resp_msg_id = f"eng-msg-{uuid.uuid4().hex[:12]}"

        resp_response = state.get("final_response") if isinstance(state, dict) else getattr(state, "final_response", None)
        resp_detected_intent = state.get("detected_intent") if isinstance(state, dict) else getattr(state, "detected_intent", None)
        resp_selected_agent = state.get("selected_agent") if isinstance(state, dict) else getattr(state, "selected_agent", None)

        return EngineeringAgentResponse(
            success=resp_error is None,
            conversation_id=resp_conv_id,
            message_id=resp_msg_id,
            response=resp_response or "Analysis complete.",
            detected_intent=resp_detected_intent,
            selected_agent=resp_selected_agent,
            metrics=metrics,
            artifacts=artifacts,
            actions=actions,
            tools_executed=tools_executed,
            execution_time_ms=round(duration_ms, 2),
            llm_diagnostics=llm_diag,
            execution_telemetry=telemetry_trace,
            error=resp_error
        )

    async def execute_agent_stream(
        self,
        request: EngineeringAgentRequest,
        user: AuthenticatedUser,
        raw_token: Optional[str] = None
    ):
        """
        Execute engineering agent task while yielding progressive Server-Sent Events (SSE) (Phase 25 Part 12).
        """
        yield {
            "event": "agent_started",
            "data": {
                "message": "Engineering Agent workflow initiated",
                "conversation_id": request.conversation_id,
                "project_id": request.project_id,
                "repository_id": request.repository_id
            }
        }

        try:
            yield {
                "event": "context_resolved",
                "data": {
                    "project_id": request.project_id,
                    "repository_id": request.repository_id
                }
            }

            response = await self.execute_agent(request, user, raw_token)

            if response.detected_intent:
                yield {
                    "event": "intent_detected",
                    "data": {
                        "intent": response.detected_intent,
                        "selected_agent": response.selected_agent
                    }
                }

            for tool in response.tools_executed:
                yield {
                    "event": "tool_completed",
                    "data": {
                        "tool": tool.tool_name,
                        "status": tool.status,
                        "duration_ms": tool.duration_ms
                    }
                }

            yield {
                "event": "llm_completed",
                "data": {
                    "execution_time_ms": response.execution_time_ms
                }
            }

            yield {
                "event": "response_completed",
                "data": response.model_dump()
            }
        except Exception as e:
            logger.error(f"[EngineeringAgentService] Stream error: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": {
                    "error": str(e),
                    "category": "AGENT_EXECUTION_ERROR"
                }
            }


engineering_agent_service = EngineeringAgentService()


