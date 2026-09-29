"""
Commit Specialist Agent.
Specialized in commit history, commit frequency, author attribution, and code changes.
"""
import time
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


class CommitAgent(BaseSpecialistAgent):
    """Specialist sub-agent for commit stream, history, and diff volume analysis."""
    agent_id = "commit_agent"
    name = "Commit Specialist Agent"
    description = "Analyzes commit logs, revision history, author contributions, and additions/deletions."

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
        target_repo_name = entities.repository_name if entities else None

        # 1. Resolve repository if not explicitly set
        if not target_repo_id:
            repos_res = await self.call_tool("list_repositories", {"limit": 50}, state)
            tools_used.append("list_repositories")
            if repos_res.success and isinstance(repos_res.data, list) and repos_res.data:
                if target_repo_name:
                    match = next(
                        (r for r in repos_res.data if isinstance(r, dict) and (
                            target_repo_name.lower() in (r.get("name") or "").lower() or
                            target_repo_name.lower() in (r.get("full_name") or "").lower()
                        )),
                        None
                    )
                    if match:
                        target_repo_id = match.get("id")
                if not target_repo_id:
                    # Default to first repository in tenant
                    target_repo_id = repos_res.data[0].get("id")

        # 2. Fetch commits for the target repository
        if target_repo_id:
            commits_res = await self.call_tool(
                "get_repository_commits",
                {"repository_id": target_repo_id, "limit": 50},
                state
            )
            tools_used.append("get_repository_commits")
            if commits_res.success and isinstance(commits_res.data, list):
                data["commits"] = commits_res.data
                metrics.append({"label": "Recent Commits", "value": len(commits_res.data), "color": "emerald"})
                
                # Fetch details for the latest commit if available
                if commits_res.data:
                    latest_commit_id = commits_res.data[0].get("sha") or commits_res.data[0].get("id")
                    if latest_commit_id:
                        commit_detail_res = await self.call_tool(
                            "get_commit_details",
                            {"commit_id": str(latest_commit_id), "include_changes": True},
                            state
                        )
                        tools_used.append("get_commit_details")
                        if commit_detail_res.success:
                            data["latest_commit_details"] = commit_detail_res.data

            # 3. Fetch code impact / churn
            churn_res = await self.call_tool(
                "get_code_impact",
                {"repository_id": target_repo_id, "timeframe": entities.timeframe or "30d" if entities else "30d"},
                state
            )
            tools_used.append("get_code_impact")
            if churn_res.success and isinstance(churn_res.data, dict):
                data["code_churn"] = churn_res.data
                churn_data = churn_res.data
                if "linesAdded" in churn_data or "lines_added" in churn_data:
                    metrics.append({"label": "Lines Added", "value": f"+{churn_data.get('linesAdded') or churn_data.get('lines_added', 0):,}", "color": "emerald"})
                if "linesDeleted" in churn_data or "lines_deleted" in churn_data:
                    metrics.append({"label": "Lines Deleted", "value": f"-{churn_data.get('linesDeleted') or churn_data.get('lines_deleted', 0):,}", "color": "rose"})

            actions.append({"label": "View Commits", "href": f"/repositories/{target_repo_id}"})
        else:
            actions.append({"label": "View Activity", "href": "/activity"})

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
            summary=f"Gathered commit stream and diff metrics using {len(tools_used)} tools."
        )


commit_agent = CommitAgent()
