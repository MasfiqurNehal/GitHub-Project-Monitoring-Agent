"""
Issue Specialist Agent.
Specialized in issue tracking, bug resolution, open/closed ratios, and triage health.
"""
import time
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


class IssueAgent(BaseSpecialistAgent):
    """Specialist sub-agent for issue tracking, resolution turnaround, and backlog health."""
    agent_id = "issue_agent"
    name = "Issue Specialist Agent"
    description = "Tracks bug tickets, issue resolution lifecycle, and open vs closed trends."

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

        # 1. Fetch Issues
        issues_res = await self.call_tool(
            "get_repository_issues",
            {"repository_id": target_repo_id, "limit": 50},
            state
        )
        tools_used.append("get_repository_issues")

        if issues_res.success and isinstance(issues_res.data, list):
            issues_list = issues_res.data
            data["issues"] = issues_list

            open_issues = [i for i in issues_list if isinstance(i, dict) and i.get("state") == "open"]
            closed_issues = [i for i in issues_list if isinstance(i, dict) and i.get("state") == "closed"]

            metrics.append({"label": "Total Issues", "value": len(issues_list)})
            metrics.append({"label": "Open Issues", "value": len(open_issues), "color": "rose" if open_issues else "emerald"})
            metrics.append({"label": "Resolved Issues", "value": len(closed_issues), "color": "emerald"})

            # Fetch deep details for the first issue if available
            if issues_list:
                first_issue_id = issues_list[0].get("id")
                if first_issue_id:
                    detail_res = await self.call_tool(
                        "get_issue_details",
                        {"issue_id": str(first_issue_id)},
                        state
                    )
                    tools_used.append("get_issue_details")
                    if detail_res.success:
                        data["sample_issue_detail"] = detail_res.data

        actions.append({"label": "View Issues", "href": "/issues"})
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
            summary=f"Gathered issue tracking telemetry using {len(tools_used)} tools."
        )


issue_agent = IssueAgent()
