"""
Developer Specialist Agent.
Specialized in contributor velocity, throughput, activity streams, individual commit statistics, and code impact.
"""
import time
from typing import Optional, Dict, Any, List

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities


class DeveloperAgent(BaseSpecialistAgent):
    """Specialist sub-agent for contributor velocity, rankings, and individual productivity analysis."""
    agent_id = "developer_agent"
    name = "Developer Specialist Agent"
    description = "Analyzes developer throughput, individual commit stats, review contributions, and activity cadence."

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

        target_dev_name = entities.developer_name if entities else None

        # 1. Fetch Developers List
        devs_res = await self.call_tool("get_repository_developers", {}, state)
        tools_used.append("get_repository_developers")

        target_dev_id: Optional[str] = None
        if devs_res.success and isinstance(devs_res.data, list):
            devs_list = devs_res.data
            data["developers"] = devs_list
            metrics.append({"label": "Active Contributors", "value": len(devs_list), "color": "emerald"})

            if target_dev_name:
                match = next(
                    (d for d in devs_list if isinstance(d, dict) and (
                        target_dev_name.lower() in (d.get("login") or "").lower() or
                        target_dev_name.lower() in (d.get("name") or "").lower()
                    )),
                    None
                )
                if match:
                    target_dev_id = str(match.get("id") or match.get("login"))
                    data["matched_developer"] = match

        # 2. Fetch specific Developer Activity and Commit Statistics if identified
        if target_dev_id:
            activity_res = await self.call_tool(
                "get_developer_activity",
                {"developer_id": target_dev_id, "limit": 50},
                state
            )
            tools_used.append("get_developer_activity")
            if activity_res.success:
                data["developer_activity"] = activity_res.data

            stats_res = await self.call_tool(
                "get_developer_commit_statistics",
                {"developer_id": target_dev_id, "preset": entities.timeframe or "30d" if entities else "30d"},
                state
            )
            tools_used.append("get_developer_commit_statistics")
            if stats_res.success and isinstance(stats_res.data, dict):
                data["developer_commit_stats"] = stats_res.data
                s = stats_res.data
                if "commitsCount" in s or "commits_count" in s:
                    metrics.append({"label": "Commits", "value": s.get("commitsCount") or s.get("commits_count", 0)})
                if "linesAdded" in s or "lines_added" in s:
                    metrics.append({"label": "Additions", "value": f"+{s.get('linesAdded') or s.get('lines_added', 0):,}", "color": "emerald"})

            actions.append({"label": "View Developer Profile", "href": f"/developers/{target_dev_id}"})
        else:
            # Fetch general organization activity stream
            gen_activity_res = await self.call_tool("get_developer_activity", {"limit": 50}, state)
            tools_used.append("get_developer_activity")
            if gen_activity_res.success:
                data["organization_activity"] = gen_activity_res.data

            actions.append({"label": "View All Developers", "href": "/developers"})

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
            summary=f"Gathered developer velocity and throughput statistics using {len(tools_used)} tools."
        )


developer_agent = DeveloperAgent()
