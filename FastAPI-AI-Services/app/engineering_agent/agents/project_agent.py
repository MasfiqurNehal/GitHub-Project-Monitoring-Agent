"""
Project Specialist Agent.
Specialized in aggregating multiple repositories belonging to a project, project health, and cross-repo project scope.
"""
import time
import asyncio
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


class ProjectAgent(BaseSpecialistAgent):
    """Specialist sub-agent for multi-repository project aggregation and milestone analysis."""
    agent_id = "project_agent"
    name = "Project Specialist Agent"
    description = "Aggregates repositories linked to a project, tracks total commits, active developers, and project KPI statistics."

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

        target_project_id = state.project_id
        target_project_name = entities.project_name if entities else None

        # 1. If project ID not specified, list projects to resolve by name or provide overview
        if not target_project_id:
            projects_res = await self.call_tool("list_projects", {}, state)
            tools_used.append("list_projects")
            if projects_res.success and isinstance(projects_res.data, list):
                data["projects"] = projects_res.data
                metrics.append({"label": "Active Projects", "value": len(projects_res.data)})

                if target_project_name:
                    match = next(
                        (p for p in projects_res.data if isinstance(p, dict) and (
                            target_project_name.lower() in (p.get("name") or "").lower()
                        )),
                        None
                    )
                    if match:
                        target_project_id = match.get("id")

        # 2. Fetch specific Project details, linked repositories, and aggregated statistics concurrently (Part 8)
        if target_project_id:
            timeframe_preset = entities.timeframe or "30d" if entities else "30d"
            proj_task = self.call_tool("get_project", {"project_id": target_project_id}, state)
            repos_task = self.call_tool("get_project_repositories", {"project_id": target_project_id}, state)
            stats_task = self.call_tool(
                "get_project_statistics",
                {"project_id": target_project_id, "preset": timeframe_preset},
                state
            )
            tools_used.extend(["get_project", "get_project_repositories", "get_project_statistics"])

            proj_res, repos_res, stats_res = await asyncio.gather(proj_task, repos_task, stats_task, return_exceptions=False)

            if proj_res.success and proj_res.data:
                data["project_detail"] = proj_res.data
                state.project_context = proj_res.data

            if repos_res.success and isinstance(repos_res.data, list):
                data["project_repositories"] = repos_res.data
                metrics.append({"label": "Linked Repositories", "value": len(repos_res.data), "color": "blue"})

            if stats_res.success and isinstance(stats_res.data, dict):
                data["project_statistics"] = stats_res.data
                s = stats_res.data
                if "totalCommits" in s or "commitsCount" in s:
                    metrics.append({"label": "Project Commits", "value": s.get("totalCommits") or s.get("commitsCount", 0)})
                if "activeDevelopers" in s or "developersCount" in s:
                    metrics.append({"label": "Active Devs", "value": s.get("activeDevelopers") or s.get("developersCount", 0), "color": "emerald"})

            actions.append({"label": "View Project Details", "href": f"/projects/{target_project_id}"})
        else:
            actions.append({"label": "View All Projects", "href": "/projects"})

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
            summary=f"Aggregated project repositories and KPI statistics using {len(tools_used)} tools."
        )


project_agent = ProjectAgent()
