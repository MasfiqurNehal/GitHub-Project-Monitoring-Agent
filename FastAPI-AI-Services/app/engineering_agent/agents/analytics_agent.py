"""
Analytics Specialist Agent.
Specialized in cross-repository benchmarking, executive KPIs, churn distribution, and comparative trend analysis.
"""
import time
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


import asyncio

class AnalyticsAgent(BaseSpecialistAgent):
    """Specialist sub-agent for cross-repository intelligence, executive KPIs, and comparative benchmarks."""
    agent_id = "analytics_agent"
    name = "Analytics Specialist Agent"
    description = "Performs cross-repository comparisons, calculates code churn trends, and delivers executive telemetry summaries."

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

        timeframe = entities.timeframe or "30d" if entities else "30d"
        target_project_id = state.project_id
        target_project_name = entities.project_name if entities else None

        # 1. Project-scoped report if user is in project context or query specifies a project (Part 5)
        if target_project_id:
            proj_task = self.call_tool("get_project", {"project_id": target_project_id}, state)
            repos_task = self.call_tool("get_project_repositories", {"project_id": target_project_id}, state)
            stats_task = self.call_tool("get_project_statistics", {"project_id": target_project_id, "preset": timeframe}, state)

            tools_used.extend(["get_project", "get_project_repositories", "get_project_statistics"])
            proj_res, repos_res, stats_res = await asyncio.gather(proj_task, repos_task, stats_task, return_exceptions=False)

            if proj_res.success and proj_res.data:
                data["project_detail"] = proj_res.data
            if repos_res.success and isinstance(repos_res.data, list):
                data["project_repositories"] = repos_res.data
                metrics.append({"label": "Project Repos", "value": len(repos_res.data), "color": "blue"})
            if stats_res.success and isinstance(stats_res.data, dict):
                data["project_statistics"] = stats_res.data
                s = stats_res.data
                if "totalCommits" in s or "commitsCount" in s:
                    metrics.append({"label": "Project Commits", "value": s.get("totalCommits") or s.get("commitsCount", 0)})
                if "activeDevelopers" in s or "developersCount" in s:
                    metrics.append({"label": "Active Devs", "value": s.get("activeDevelopers") or s.get("developersCount", 0), "color": "emerald"})

            actions.append({"label": "View Project Details", "href": f"/projects/{target_project_id}"})
        else:
            # 2. General Dashboard / Organization Overview — Concurrently execute independent tools (Part 8)
            dash_task = self.call_tool("get_dashboard_analytics", {"timeframe": timeframe}, state)
            churn_task = self.call_tool("get_code_impact", {"timeframe": timeframe}, state)
            repos_task = self.call_tool("list_repositories", {"limit": 50}, state)

            tools_used.extend(["get_dashboard_analytics", "get_code_impact", "list_repositories"])
            dash_res, churn_res, repos_res = await asyncio.gather(dash_task, churn_task, repos_task, return_exceptions=False)

            if dash_res.success and isinstance(dash_res.data, dict):
                data["dashboard_overview"] = dash_res.data
                d = dash_res.data
                if "totalCommits" in d or "commits_count" in d:
                    metrics.append({"label": "Total Commits", "value": d.get("totalCommits") or d.get("commits_count", 0)})
                if "activeDevelopers" in d or "developers_count" in d:
                    metrics.append({"label": "Active Developers", "value": d.get("activeDevelopers") or d.get("developers_count", 0), "color": "emerald"})
                if "openPullRequests" in d or "open_prs" in d:
                    metrics.append({"label": "Open Pull Requests", "value": d.get("openPullRequests") or d.get("open_prs", 0), "color": "amber"})

            if churn_res.success and isinstance(churn_res.data, dict):
                data["code_impact_summary"] = churn_res.data
                c = churn_res.data
                if "linesAdded" in c or "lines_added" in c:
                    metrics.append({"label": "Net Additions", "value": f"+{c.get('linesAdded') or c.get('lines_added', 0):,}", "color": "emerald"})
                if "linesDeleted" in c or "lines_deleted" in c:
                    metrics.append({"label": "Net Deletions", "value": f"-{c.get('linesDeleted') or c.get('lines_deleted', 0):,}", "color": "rose"})

            if repos_res.success and isinstance(repos_res.data, list):
                data["repositories_comparison"] = repos_res.data

            actions.append({"label": "View Dashboard Overview", "href": "/dashboard"})
            actions.append({"label": "View Developer Rankings", "href": "/developers"})

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
            summary=f"Synthesized analytics and telemetry using {len(tools_used)} tools."
        )


analytics_agent = AnalyticsAgent()
