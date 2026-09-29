"""
Pull Request Specialist Agent.
Specialized in pull requests, review workflows, merge turnaround time, and PR backlog.
"""
import time
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


class PullRequestAgent(BaseSpecialistAgent):
    """Specialist sub-agent for pull request velocity and review turnaround analysis."""
    agent_id = "pull_request_agent"
    name = "Pull Request Specialist Agent"
    description = "Monitors active and merged PRs, review turnaround times, reviewer participation, and unblocking bottlenecks."

    async def analyze(
        self,
        state: AgentState,
        entities: Optional[ExtractedEntities] = None
    ) -> SpecialistExecutionResult:
        t0 = time.time()
        tools_used: List[str] = []
        data: Dict[str, Any] = {}
        metrics: List[Dict[str, Any]] = []
        actions: List[Dict[str, str]] = []

        target_repo_id = state.repository_id

        # 1. Fetch Pull Requests
        prs_res = await self.call_tool(
            "get_repository_pull_requests",
            {"repository_id": target_repo_id, "limit": 50},
            state
        )
        tools_used.append("get_repository_pull_requests")

        if prs_res.success and isinstance(prs_res.data, list):
            prs_list = prs_res.data
            data["pull_requests"] = prs_list

            open_prs = [p for p in prs_list if isinstance(p, dict) and p.get("state") == "open"]
            closed_prs = [p for p in prs_list if isinstance(p, dict) and p.get("state") in ("closed", "merged")]

            metrics.append({"label": "Total PRs", "value": len(prs_list)})
            metrics.append({"label": "Open PRs", "value": len(open_prs), "color": "amber" if open_prs else "emerald"})
            metrics.append({"label": "Merged/Closed", "value": len(closed_prs), "color": "purple"})

            # Fetch deep details for the first active/recent PR
            if prs_list:
                first_pr_id = prs_list[0].get("id")
                if first_pr_id:
                    detail_res = await self.call_tool(
                        "get_pull_request_details",
                        {"pull_request_id": str(first_pr_id)},
                        state
                    )
                    tools_used.append("get_pull_request_details")
                    if detail_res.success:
                        data["sample_pr_detail"] = detail_res.data

        actions.append({"label": "View Pull Requests", "href": "/pull-requests"})
        dur = (time.time() - t0) * 1000.0

        return SpecialistExecutionResult(
            agent_id=self.agent_id,
            agent_name=self.name,
            success=True,
            data=data,
            metrics=metrics,
            actions=actions,
            tools_used=tools_used,
            duration_ms=round(dur, 2),
            summary=f"Gathered pull request stream and review velocity metrics using {len(tools_used)} tools."
        )


pull_request_agent = PullRequestAgent()
