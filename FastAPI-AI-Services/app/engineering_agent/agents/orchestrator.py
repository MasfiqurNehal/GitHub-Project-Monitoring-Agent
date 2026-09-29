"""
Engineering Agent Multi-Agent Orchestrator.
Coordinates intent classification, tool invocation, telemetry retrieval, and LLM reasoning.
"""
import time
import json
from typing import Dict, Any, List, Optional

from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.tools.express_client import express_api_client
from app.engineering_agent.prompts.system_prompts import (
    ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT,
    SPECIALIZED_INTENT_PROMPTS
)
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.engineering_agent.router import engineering_intent_router, IntentCategory
from app.utils.logger import logger

class EngineeringOrchestrator:
    """
    Main controller for the Engineering AI Agent.
    """

    async def orchestrate(self, state: AgentState) -> None:
        """
        Execute full multi-step engineering analysis workflow:
        1. Classify intent via hybrid intent router.
        2. Plan and execute context tool calls based on extracted entities.
        3. Formulate structured engineering prompt with real backend telemetry.
        4. Query AI Provider.
        5. Populate state with response, metrics, and actions.
        """
        logger.info(f"[EngineeringAgent] Orchestrating request for user '{state.user_id}' in tenant '{state.tenant_id}'")
        state.add_reasoning_step("Initiating engineering intent classification and entity extraction.", action="classify_intent")

        # Step 1: Execute Intent Router
        routing_result = await engineering_intent_router.route(
            prompt=state.user_request,
            project_id=state.project_id,
            repository_id=state.repository_id
        )

        state.detected_intent = routing_result.intent.value
        state.selected_agent = f"Specialist_{routing_result.intent.value.title().replace('_', '')}"

        # Handle unsupported non-IT questions
        if routing_result.intent == IntentCategory.UNSUPPORTED_NON_IT:
            state.final_response = (
                "👋 I am the **GitMonitor Engineering Intelligence Agent**, specialized exclusively in "
                "GitHub repository monitoring, developer velocity, code churn, and software engineering analytics.\n\n"
                "How can I assist you with your projects, commits, pull requests, or team contributions today?"
            )
            for opt in routing_result.suggested_options:
                state.add_action(opt, href="/dashboard")
            state.add_reasoning_step("Handled out-of-scope non-IT query gracefully.", action="guardrail_reject")
            return

        # Handle clarification if confidence is too low
        if routing_result.requires_clarification and routing_result.clarification_prompt:
            state.final_response = (
                f"### 🔍 Clarification Needed\n\n"
                f"{routing_result.clarification_prompt}\n\n"
                f"Please choose one of the options below or rephrase your request."
            )
            for opt in routing_result.suggested_options:
                state.add_action(opt, href="/projects")
            state.add_reasoning_step("Requested user clarification due to ambiguous query.", action="request_clarification")
            return

        state.add_reasoning_step(
            f"Resolved intent '{state.detected_intent}' (confidence: {routing_result.confidence:.2f}) using {routing_result.routing_strategy} strategy.",
            action="plan_tools"
        )

        # Step 2: Fetch relevant telemetry data from Express backend via Tools
        context_data: Dict[str, Any] = {}
        target_repo_name = routing_result.entities.repository_name if routing_result.entities else None
        target_dev_name = routing_result.entities.developer_name if routing_result.entities else None
        
        # Tool A: Projects
        if state.project_id:
            t0 = time.time()
            proj_res = await express_api_client.get_project_detail(
                project_id=state.project_id,
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="get_project_detail",
                input_args={"project_id": state.project_id},
                output_data=proj_res.get("data"),
                success=proj_res.get("success", False),
                error_message=proj_res.get("error"),
                duration_ms=dur
            )
            if proj_res.get("success"):
                context_data["project_details"] = proj_res.get("data")
                state.project_context = proj_res.get("data")
            elif proj_res.get("status_code") in (403, 404):
                context_data["project_notice"] = f"Project '{state.project_id}' was not found in your organization."
        else:
            t0 = time.time()
            projs_res = await express_api_client.list_projects(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_projects",
                input_args={},
                output_data=projs_res.get("data"),
                success=projs_res.get("success", False),
                error_message=projs_res.get("error"),
                duration_ms=dur
            )
            if projs_res.get("success"):
                context_data["projects_list"] = projs_res.get("data")

        # Tool B: Repositories (Tenant Scoped)
        if state.repository_id:
            t0 = time.time()
            repo_res = await express_api_client.get_repository_detail(
                repository_id=state.repository_id,
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="get_repository_detail",
                input_args={"repository_id": state.repository_id},
                output_data=repo_res.get("data"),
                success=repo_res.get("success", False),
                error_message=repo_res.get("error"),
                duration_ms=dur
            )
            if repo_res.get("success"):
                context_data["repository_details"] = repo_res.get("data")
                state.repository_context = repo_res.get("data")
            elif repo_res.get("status_code") in (403, 404):
                context_data["repository_notice"] = f"Repository '{state.repository_id}' was not found in your organization."
        else:
            # Fetch tenant-monitored repositories
            t0 = time.time()
            repos_res = await express_api_client.list_repositories(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_repositories",
                input_args={},
                output_data=repos_res.get("data"),
                success=repos_res.get("success", False),
                error_message=repos_res.get("error"),
                duration_ms=dur
            )
            if repos_res.get("success"):
                tenant_repos = repos_res.get("data", [])
                context_data["repositories_list"] = tenant_repos
                
                # If a specific repository was requested by name, match strictly within tenant repos
                if target_repo_name and isinstance(tenant_repos, list):
                    matching_repo = next(
                        (r for r in tenant_repos if isinstance(r, dict) and (
                            target_repo_name.lower() in (r.get("name") or "").lower() or
                            target_repo_name.lower() in (r.get("full_name") or "").lower()
                        )),
                        None
                    )
                    if matching_repo and matching_repo.get("id"):
                        detail_res = await express_api_client.get_repository_detail(
                            repository_id=matching_repo["id"],
                            auth_token=state.auth_token,
                            tenant_id=state.tenant_id
                        )
                        if detail_res.get("success"):
                            context_data["repository_details"] = detail_res.get("data")
                            state.repository_context = detail_res.get("data")
                    else:
                        context_data["repository_notice"] = (
                            f"Repository '{target_repo_name}' is not monitored in your organization."
                        )

        # Tool C: Developers (Tenant Scoped)
        t0 = time.time()
        devs_res = await express_api_client.list_developers(
            auth_token=state.auth_token,
            tenant_id=state.tenant_id
        )
        dur = (time.time() - t0) * 1000.0
        state.record_tool_result(
            tool_name="list_developers",
            input_args={},
            output_data=devs_res.get("data"),
            success=devs_res.get("success", False),
            error_message=devs_res.get("error"),
            duration_ms=dur
        )
        if devs_res.get("success"):
            tenant_devs = devs_res.get("data", [])
            context_data["developers_list"] = tenant_devs
            if target_dev_name and isinstance(tenant_devs, list):
                matching_dev = next(
                    (d for d in tenant_devs if isinstance(d, dict) and (
                        target_dev_name.lower() in (d.get("login") or "").lower() or
                        target_dev_name.lower() in (d.get("name") or "").lower()
                    )),
                    None
                )
                if matching_dev:
                    context_data["target_developer"] = matching_dev
                else:
                    context_data["developer_notice"] = (
                        f"Developer '{target_dev_name}' has no recorded activity in your organization."
                    )

        # Tool D: Pull Requests / Activity
        if "pr" in state.user_request.lower() or "review" in state.user_request.lower() or "pull request" in state.user_request.lower() or state.detected_intent == "pull_request_info":
            t0 = time.time()
            prs_res = await express_api_client.list_pull_requests(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_pull_requests",
                input_args={},
                output_data=prs_res.get("data"),
                success=prs_res.get("success", False),
                error_message=prs_res.get("error"),
                duration_ms=dur
            )
            if prs_res.get("success"):
                context_data["pull_requests_list"] = prs_res.get("data")

        state.add_reasoning_step(
            f"Retrieved telemetry from {len(state.tool_results)} Express tools.",
            action="execute_llm_reasoning"
        )

        # Step 3: Construct LLM Prompt Messages
        intent_instruction = SPECIALIZED_INTENT_PROMPTS.get(
            state.detected_intent,
            SPECIALIZED_INTENT_PROMPTS["general_engineering_analysis"]
        )

        system_message = (
            f"{ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT}\n\n"
            f"Specialized Task Focus: {intent_instruction}\n"
        )

        telemetry_summary_str = json.dumps(context_data, default=str)[:3500] if context_data else "No specific repository telemetry available."

        user_content = (
            f"USER INSTRUCTION: {state.user_request}\n\n"
            f"AUTHENTICATED TENANT CONTEXT:\n"
            f"- Tenant ID: {state.tenant_id}\n"
            f"- Scoped Project ID: {state.project_id or 'All Projects'}\n"
            f"- Scoped Repository ID: {state.repository_id or 'All Repositories'}\n\n"
            f"LIVE TELEMETRY FROM BACKEND TOOLS:\n"
            f"```json\n{telemetry_summary_str}\n```\n\n"
            f"Synthesize an expert technical response with actionable recommendations."
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_content}
        ]

        # Step 4: Generate completion via Engineering Agent LLM Provider
        try:
            provider = agent_llm_factory.get_provider()
            completion_resp = await provider.complete(messages=messages, temperature=0.3)
            state.final_response = completion_resp.content or "Analysis complete."
        except LLMError as e:
            logger.error(f"[EngineeringAgent] LLM Provider error ({e.__class__.__name__}): {e.message}")
            state.final_response = (
                f"### ⚙️ Engineering Analysis\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: Engineering Agent LLM Provider synthesis notice: {e.message})*"
            )
        except Exception as e:
            logger.error(f"[EngineeringAgent] Unexpected error during AI completion: {str(e)}")
            state.final_response = (
                f"### ⚙️ Engineering Analysis\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: AI Provider synthesis temporarily unavailable)*"
            )

        # Step 5: Extract Metrics & Recommended Actions from telemetry
        if state.project_context and isinstance(state.project_context, dict):
            metrics_dict = state.project_context.get("project", {}).get("metrics", {}) or state.project_context.get("stats", {})
            if metrics_dict:
                if "commitsCount" in metrics_dict:
                    state.add_metric("Total Commits", metrics_dict.get("commitsCount", 0))
                if "repositoriesCount" in metrics_dict:
                    state.add_metric("Connected Repos", metrics_dict.get("repositoriesCount", 0))
                if "developersCount" in metrics_dict:
                    state.add_metric("Active Devs", metrics_dict.get("developersCount", 0))
                if "prsCount" in metrics_dict:
                    state.add_metric("Pull Requests", metrics_dict.get("prsCount", 0))

        if state.project_id:
            state.add_action("View Project Detail", href=f"/projects/{state.project_id}")
        else:
            state.add_action("View Projects Dashboard", href="/projects")
            state.add_action("View Developer Velocity", href="/developers")

        state.add_reasoning_step("Completed response formulation.", action="finalize")

engineering_orchestrator = EngineeringOrchestrator()
