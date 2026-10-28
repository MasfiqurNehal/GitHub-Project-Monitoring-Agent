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
                t_norm = target_repo_name.lower().replace("-", " ")
                match = next(
                    (r for r in repos_res.data if isinstance(r, dict) and (
                        target_repo_name.lower() in (r.get("name") or "").lower() or
                        target_repo_name.lower() in (r.get("full_name") or "").lower() or
                        t_norm in (r.get("name") or "").lower().replace("-", " ") or
                        (r.get("name") or "").lower().replace("-", " ") in t_norm
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
                r_data = repo_detail_res.data
                repo_obj = r_data.get("repository") if isinstance(r_data.get("repository"), dict) else r_data

                if "repositories" not in data:
                    data["repositories"] = [repo_obj]

                commits_list = r_data.get("commits") or []
                commits_count = (
                    len(commits_list) if isinstance(commits_list, list) and commits_list else
                    repo_obj.get("commits_count") or repo_obj.get("commitsCount", 0)
                )
                if commits_count:
                    metrics.append({"label": "Total Commits", "value": commits_count, "color": "indigo"})

                stars = repo_obj.get("stars") or repo_obj.get("stars_count")
                if stars is not None:
                    metrics.append({"label": "GitHub Stars", "value": stars, "color": "amber"})

                lang = repo_obj.get("language")
                if lang:
                    metrics.append({"label": "Primary Language", "value": lang, "color": "cyan"})

                code_changes = r_data.get("codeChanges")
                if isinstance(code_changes, dict):
                    if "totalAdditions" in code_changes:
                        metrics.append({"label": "Total Additions", "value": f"+{code_changes['totalAdditions']:,}", "color": "emerald"})
                    if "totalDeletions" in code_changes:
                        metrics.append({"label": "Total Deletions", "value": f"-{code_changes['totalDeletions']:,}", "color": "rose"})

            if branches_res.success:
                data["branches"] = branches_res.data

        # 3. Direct Neon PostgreSQL Database Fallback if data is missing or incomplete
        if not data.get("repository_detail") or not data.get("repositories"):
            try:
                from app.db.connection import db_manager
                from sqlalchemy import text
                if db_manager.session_factory:
                    async with db_manager.get_session() as sess:
                        if not data.get("repositories"):
                            q_repos = text("""
                                SELECT id, name, full_name, default_branch, language, stars, forks, open_issues_count, sync_status, last_synced_at
                                FROM repositories
                                WHERE organization_id = :org_id
                            """)
                            db_rows = (await sess.execute(q_repos, {"org_id": state.tenant_id})).fetchall()
                            if db_rows:
                                data["repositories"] = [dict(r._mapping) for r in db_rows]
                                if not any(m.get("label") == "Monitored Repos" for m in metrics):
                                    metrics.append({"label": "Monitored Repos", "value": len(data["repositories"]), "color": "blue"})

                                if not target_repo_id and target_repo_name:
                                    t_norm = target_repo_name.lower().replace("-", " ")
                                    for r in data["repositories"]:
                                        r_name = (r.get("name") or "").lower()
                                        r_full = (r.get("full_name") or "").lower()
                                        if t_norm in r_name.replace("-", " ") or r_name.replace("-", " ") in t_norm or target_repo_name.lower() in r_full:
                                            target_repo_id = r.get("id")
                                            break

                        if target_repo_id or target_repo_name:
                            t_norm_slug = (target_repo_name or "").lower().replace(" ", "-")
                            q_detail = text("""
                                SELECT r.id, r.name, r.full_name, r.default_branch, r.language, r.stars, r.forks,
                                       r.open_issues_count, r.sync_status, r.last_synced_at, r.owner,
                                       (SELECT count(*) FROM commits WHERE repository_id = r.id) as commits_count
                                FROM repositories r
                                WHERE (r.id = :tid OR lower(r.name) = :tname OR lower(r.full_name) = :tname OR lower(r.name) = :tslug)
                                  AND r.organization_id = :org_id
                                LIMIT 1
                            """)
                            detail_row = (await sess.execute(q_detail, {
                                "tid": target_repo_id or "",
                                "tname": (target_repo_name or "").lower(),
                                "tslug": t_norm_slug,
                                "org_id": state.tenant_id
                            })).fetchone()

                            if detail_row:
                                r_detail = dict(detail_row._mapping)
                                data["repository_detail"] = r_detail
                                state.repository_context = r_detail
                                target_repo_id = r_detail.get("id") or target_repo_id
                                if "commits_count" in r_detail and not any(m.get("label") == "Total Commits" for m in metrics):
                                    metrics.append({"label": "Total Commits", "value": r_detail["commits_count"], "color": "indigo"})
                                if "stars" in r_detail and not any(m.get("label") == "GitHub Stars" for m in metrics):
                                    metrics.append({"label": "GitHub Stars", "value": r_detail["stars"], "color": "amber"})
                                if "language" in r_detail and r_detail["language"] and not any(m.get("label") == "Primary Language" for m in metrics):
                                    metrics.append({"label": "Primary Language", "value": r_detail["language"], "color": "cyan"})
            except Exception as e:
                logger.warning(f"[RepositoryAgent] Direct Neon DB fallback error: {e}")

        if target_repo_id:
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
