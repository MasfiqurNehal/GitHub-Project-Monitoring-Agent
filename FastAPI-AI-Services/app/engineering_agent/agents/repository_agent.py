"""
Repository Specialist Agent.
Specialized in repository metadata, branches, sync status, and codebase activity.
"""
import time
import asyncio
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities
from app.utils.logger import logger


class RepositoryAgent(BaseSpecialistAgent):
    """Specialist sub-agent for repository investigation and metadata analysis."""
    agent_id = "repository_agent"
    name = "Repository Specialist Agent"
    description = "Investigates repository metadata, branch configurations, languages, and codebase sync health."

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

        # 1. List repositories to populate repository overview and resolve repository ID if needed
        repos_res = await self.call_tool("list_repositories", {"limit": 50}, state)
        tools_used.append("list_repositories")

        if repos_res.success and isinstance(repos_res.data, list):
            data["repositories"] = repos_res.data
            metrics.append({"label": "Monitored Repos", "value": len(repos_res.data), "color": "blue"})

            if not target_repo_id and target_repo_name:
                match = next(
                    (r for r in repos_res.data if isinstance(r, dict) and (
                        target_repo_name.lower() in (r.get("name") or "").lower() or
                        target_repo_name.lower() in (r.get("full_name") or "").lower()
                    )),
                    None
                )
                if match:
                    target_repo_id = match.get("id")

        # 2. Fetch specific repository details and branches concurrently (Part 8)
        if target_repo_id:
            detail_task = self.call_tool("get_repository", {"repository_id": target_repo_id}, state)
            branches_task = self.call_tool("get_repository_branches", {"repository_id": target_repo_id}, state)
            tools_used.extend(["get_repository", "get_repository_branches"])

            repo_detail_res, branches_res = await asyncio.gather(detail_task, branches_task, return_exceptions=False)

            if repo_detail_res.success and repo_detail_res.data:
                data["repository_detail"] = repo_detail_res.data
                state.repository_context = repo_detail_res.data
                if "repositories" not in data:
                    data["repositories"] = [repo_detail_res.data] if isinstance(repo_detail_res.data, dict) else repo_detail_res.data
                r_data = repo_detail_res.data
                if "commits_count" in r_data or "commitsCount" in r_data:
                    metrics.append({"label": "Total Commits", "value": r_data.get("commits_count") or r_data.get("commitsCount", 0)})
                if "stars_count" in r_data or "stars" in r_data:
                    metrics.append({"label": "GitHub Stars", "value": r_data.get("stars_count") or r_data.get("stars", 0)})


            if branches_res.success:
                data["branches"] = branches_res.data

            actions.append({"label": "View Repository", "href": f"/repositories/{target_repo_id}"})
        else:
            actions.append({"label": "View Repositories", "href": "/repositories"})

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
            summary=f"Gathered repository metadata and branch telemetry for {len(tools_used)} tools."
        )


repository_agent = RepositoryAgent()
