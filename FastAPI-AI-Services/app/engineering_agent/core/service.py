"""
Engineering Agent Core Service Facade.
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
    ToolExecutionSummary
)
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.agents.orchestrator import engineering_orchestrator
from app.utils.auth import AuthenticatedUser
from app.utils.logger import logger

class EngineeringAgentService:
    """High-level service facade for processing Engineering AI Agent requests."""

    async def execute_agent(
        self,
        request: EngineeringAgentRequest,
        user: AuthenticatedUser,
        raw_token: Optional[str] = None
    ) -> EngineeringAgentResponse:
        """
        Execute an engineering agent task within the authenticated tenant context.
        Enforces strict SaaS tenant boundary validation and prevents IDOR attacks.
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
        conversation_id = request.conversation_id or f"eng-conv-{uuid.uuid4().hex[:12]}"
        message_id = f"eng-msg-{uuid.uuid4().hex[:12]}"

        # Initialize isolated agent execution state strictly bounded to user's tenant
        state = AgentState(
            user_request=request.message,
            tenant_id=tenant_id,
            user_id=user.id,
            auth_token=raw_token,
            project_id=request.project_id,
            repository_id=request.repository_id,
            conversation_id=conversation_id,
            message_id=message_id
        )

        try:
            await engineering_orchestrator.orchestrate(state)
        except Exception as e:
            logger.error(f"[EngineeringAgentService] Execution error: {str(e)}", exc_info=True)
            state.error = str(e)
            if not state.final_response:
                state.final_response = f"An error occurred during engineering agent execution: {str(e)}"

        duration_ms = state.finalize()

        tools_executed = [
            ToolExecutionSummary(
                tool_name=t.tool_name,
                status="success" if t.success else "error",
                duration_ms=round(t.duration_ms, 2)
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

        return EngineeringAgentResponse(
            success=state.error is None,
            conversation_id=state.conversation_id,
            message_id=state.message_id,
            response=state.final_response or "Analysis complete.",
            detected_intent=state.detected_intent,
            selected_agent=state.selected_agent,
            metrics=metrics,
            artifacts=artifacts,
            actions=actions,
            tools_executed=tools_executed,
            execution_time_ms=round(duration_ms, 2),
            error=state.error
        )

engineering_agent_service = EngineeringAgentService()
