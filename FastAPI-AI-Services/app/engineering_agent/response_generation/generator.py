"""
Response Generator Engine for Engineering AI Agent.
Coordinates factual synthesis, empty-data handling, anti-hallucination verification,
CoT suppression, and structured FactCheckedResponse packaging.
"""
import time
import re
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.engineering_agent.orchestration.state import GraphState
from app.engineering_agent.response_generation.schemas import (
    FactCheckedResponse,
    DataAvailabilityStatus,
    MetricItem
)
from app.engineering_agent.response_generation.prompts import (
    RESPONSE_GENERATION_SYSTEM_PROMPT,
    EMPTY_DATA_RESPONSE_TEMPLATE,
    CONFLICTING_DATA_RESPONSE_TEMPLATE
)
from app.engineering_agent.freshness import freshness_evaluator, FreshnessMetadata
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.config import settings
from app.utils.logger import logger


class ResponseGenerator:
    """
    Dedicated Response Generation Stage.
    Transforms raw specialist agent outputs into fact-checked, structured engineering answers.
    """

    def clean_chain_of_thought(self, text: str) -> str:
        """
        Removes any internal reasoning traces, <think> tags, or prompt instructions.
        """
        if not text:
            return ""
        # 1. Remove <think>...</think> blocks from reasoning models
        cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
        # 2. Remove common internal scratchpad artifacts
        cleaned = re.sub(r"^(?:Thought|Reasoning|Internal CoT):\s*.*?\n\n", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        return cleaned.strip()

    def check_telemetry_emptiness(self, telemetry: Dict[str, Any]) -> bool:
        """
        Determines if telemetry contains meaningful data or is entirely empty.
        """
        if not telemetry:
            return True

        # Check for known empty indicators
        all_empty = True
        for key, val in telemetry.items():
            if val is None:
                continue
            if isinstance(val, (list, dict, set)) and len(val) == 0:
                continue
            if isinstance(val, (int, float)) and val == 0:
                continue
            if isinstance(val, str) and val.strip() in ("", "[]", "{}"):
                continue
            # If any non-empty factual structure exists, it's not empty
            all_empty = False
            break

        return all_empty

    def _format_clean_fallback_markdown(
        self,
        selected_agent: str,
        tenant_id: str,
        telemetry: Dict[str, Any],
        entities: Dict[str, List[str]]
    ) -> str:
        """Format clean, human-readable natural language Markdown summary when LLM fallback occurs."""
        lines = []
        proj_name = (entities.get("projects") or [None])[0] or "your project"
        repos = entities.get("repositories", [])
        devs = entities.get("developers", [])

        # Project Overview extraction
        proj_overview = telemetry.get("project_overview") or {}
        repo_count = proj_overview.get("repository_count") or len(repos) or len(telemetry.get("repositories", [])) or 1
        dev_count = proj_overview.get("contributor_count") or len(devs) or len(telemetry.get("developers", [])) or 1

        lines.append("## Project Summary\n")
        lines.append(f"The **{proj_name}** currently contains **{repo_count} repository/repositories** and **{dev_count} active contributor(s)**.\n")

        # Repositories Table / List
        repo_items = telemetry.get("repositories") or []
        if isinstance(repo_items, list) and repo_items:
            lines.append("### Repositories\n")
            lines.append("| Repository | Commits | PRs | Issues |")
            lines.append("|---|---:|---:|---:|")
            for r in repo_items:
                if isinstance(r, dict):
                    r_name = r.get("name") or r.get("repository_name") or "Unknown"
                    r_commits = r.get("commits_count") or r.get("commit_count") or 0
                    r_prs = r.get("pull_requests_count") or r.get("pr_count") or 0
                    r_issues = r.get("issues_count") or r.get("issue_count") or 0
                    lines.append(f"| `{r_name}` | {r_commits} | {r_prs} | {r_issues} |")
            lines.append("")
        elif "commits" in telemetry and isinstance(telemetry["commits"], list):
            commits = telemetry["commits"]
            lines.append("### Repositories\n")
            lines.append("| Repository | Commits | PRs | Issues |")
            lines.append("|---|---:|---:|---:|")
            main_repo = repos[0] if repos else "Monitored Repository"
            prs_cnt = len(telemetry.get("pull_requests", [])) if isinstance(telemetry.get("pull_requests"), list) else 0
            issues_cnt = len(telemetry.get("issues", [])) if isinstance(telemetry.get("issues"), list) else 0
            lines.append(f"| `{main_repo}` | {len(commits)} | {prs_cnt} | {issues_cnt} |")
            lines.append("")

        # Code Churn Section
        if "code_churn" in telemetry and isinstance(telemetry["code_churn"], dict):
            churn = telemetry["code_churn"]
            added = churn.get("linesAdded") or churn.get("lines_added", 0)
            deleted = churn.get("linesDeleted") or churn.get("lines_deleted", 0)
            lines.append("### Code Impact & Churn\n")
            lines.append(f"- **Lines Added**: `+{added:,}`")
            lines.append(f"- **Lines Deleted**: `-{deleted:,}`")
            lines.append("")

        # Contributor Activity Section
        if "developers" in telemetry and isinstance(telemetry["developers"], list):
            dev_list = telemetry["developers"]
            lines.append("### Contributor Activity\n")
            for d in dev_list[:5]:
                if isinstance(d, dict):
                    d_name = d.get("name") or d.get("login") or d.get("githubUserId") or "Contributor"
                    d_commits = d.get("commits_count") or d.get("commitsCount") or d.get("commit_count") or 0
                    d_prs = d.get("prs_count") or d.get("pull_requests_count") or 0
                    lines.append(f"**{d_name}**")
                    lines.append(f"- Commits: **{d_commits}**")
                    lines.append(f"- Pull Requests: **{d_prs}**")
            lines.append("")

        # Tool & Upstream API Failure Notices (Phase 25L)
        if "github_api_error" in telemetry or telemetry.get("error") == "github_api_failed":
            lines.append("> ⚠️ **Upstream GitHub API Notice**: Unable to fetch live activity from GitHub API. No hypothetical data has been substituted.\n")

        tool_failures = telemetry.get("failed_tools") or []
        if tool_failures and isinstance(tool_failures, list):
            lines.append("### ⚠️ Information Retrieval Warning\n")
            for ft in tool_failures:
                t_name = ft.get("tool_name") if isinstance(ft, dict) else str(ft)
                t_err = ft.get("error") if isinstance(ft, dict) else "execution error"
                lines.append(f"- Unable to retrieve complete information from tool `{t_name}`: {t_err}")
            lines.append("")

        # Data Freshness Section
        lines.append("### Data Freshness\n")
        lines.append("Data source: live/project monitoring backend.\n")

        return "\n".join(lines).strip()

    def extract_metrics(self, state: GraphState) -> List[MetricItem]:
        """Extract structured metrics from state telemetry and specialist results."""
        metrics_list: List[MetricItem] = []
        raw_metrics = state.get("metrics") or []

        for m in raw_metrics:
            if isinstance(m, dict) and "name" in m and "value" in m:
                metrics_list.append(
                    MetricItem(
                        name=str(m["name"]),
                        value=m["value"],
                        unit=m.get("unit"),
                        context=m.get("context")
                    )
                )

        # Also inspect top-level telemetry metrics if available
        telemetry = state.get("telemetry_data") or {}
        if "total_commits" in telemetry:
            metrics_list.append(MetricItem(name="Total Commits", value=telemetry["total_commits"], unit="commits"))
        if "open_prs" in telemetry:
            metrics_list.append(MetricItem(name="Open Pull Requests", value=telemetry["open_prs"], unit="PRs"))
        if "churn_lines" in telemetry:
            metrics_list.append(MetricItem(name="Code Churn", value=telemetry["churn_lines"], unit="lines"))

        return metrics_list

    def extract_entities_involved(self, state: GraphState) -> Dict[str, List[str]]:
        """Categorize verified entities involved in the execution."""
        entities_dict: Dict[str, List[str]] = {
            "repositories": [],
            "projects": [],
            "developers": []
        }

        raw_entities = state.get("entities")
        if raw_entities:
            if getattr(raw_entities, "repository_name", None):
                entities_dict["repositories"].append(raw_entities.repository_name)
            if getattr(raw_entities, "project_name", None):
                entities_dict["projects"].append(raw_entities.project_name)
            if getattr(raw_entities, "developer_name", None):
                entities_dict["developers"].append(raw_entities.developer_name)

        if state.get("repository_id") and state["repository_id"] not in entities_dict["repositories"]:
            entities_dict["repositories"].append(state["repository_id"])
        if state.get("project_id") and state["project_id"] not in entities_dict["projects"]:
            entities_dict["projects"].append(state["project_id"])

        return {k: list(set(v)) for k, v in entities_dict.items() if v}

    async def generate_response(self, state: GraphState) -> FactCheckedResponse:
        """
        Main response generation entry point.
        """
        telemetry = state.get("telemetry_data") or {}
        selected_agent = state.get("selected_agent", "Engineering Agent")
        user_request = state.get("user_request", "")
        tenant_id = state.get("tenant_id", "")
        freshness_dict = state.get("freshness_metadata") or {}
        
        entities_involved = self.extract_entities_involved(state)
        key_metrics = self.extract_metrics(state)
        grounding_sources = [t.get("tool_name", "api") for t in (state.get("tools_executed") or [])]
        time_period = getattr(state.get("entities"), "timeframe", None) or "recent"

        # 0. Handle General IT & Software Engineering Knowledge (Category B)
        if (
            selected_agent in ("General IT & Software Engineering Specialist", "general_it_agent") or
            state.get("detected_intent") == "general_engineering_qa" or
            "explanation" in telemetry
        ):
            explanation_text = telemetry.get("explanation") or "Technical engineering synthesis complete."
            summary = explanation_text.split("\n\n")[0].replace("#", "").strip()
            if len(summary) > 200:
                summary = summary[:197] + "..."

            return FactCheckedResponse(
                summary=summary,
                markdown_content=explanation_text,
                data_availability=DataAvailabilityStatus.AVAILABLE,
                key_metrics=[],
                entities_involved=entities_involved,
                time_period="n/a",
                grounding_sources=["LLM Parametric Knowledge"],
                actions=state.get("actions") or [
                    {"label": "Explore Dashboard", "href": "/dashboard"},
                    {"label": "View Repositories", "href": "/repositories"}
                ],
                freshness_tier=state.get("data_freshness_tier")
            )

        # 0.5 Phase 25L Failure Handling: Project Not Found & Unconnected Repository
        if telemetry.get("error") == "project_not_found" or state.get("project_not_found"):
            proj_target = (entities_involved.get("projects") or ["requested"])[0]
            not_found_md = f"### ⚠️ Project Not Found\n\nThe requested project **{proj_target}** could not be found in your organization.\n\n*Please verify the project title or check your dashboard projects list.*"
            return FactCheckedResponse(
                summary=f"The requested project '{proj_target}' could not be found.",
                markdown_content=not_found_md,
                data_availability=DataAvailabilityStatus.EMPTY,
                key_metrics=[],
                entities_involved=entities_involved,
                time_period=time_period,
                grounding_sources=grounding_sources,
                actions=[{"label": "View Projects", "href": "/projects"}],
                freshness_tier=state.get("data_freshness_tier")
            )

        if telemetry.get("error") == "repo_not_in_project" or state.get("repo_not_in_project"):
            repo_target = (entities_involved.get("repositories") or ["requested"])[0]
            proj_target = (entities_involved.get("projects") or ["requested"])[0]
            unconnected_md = f"### ⚠️ Repository Not Connected to Project\n\nThe repository `{repo_target}` is not connected to project **{proj_target}**. Unrelated repository data was excluded to preserve answer accuracy."
            return FactCheckedResponse(
                summary=f"Repository '{repo_target}' is not connected to project '{proj_target}'.",
                markdown_content=unconnected_md,
                data_availability=DataAvailabilityStatus.EMPTY,
                key_metrics=[],
                entities_involved=entities_involved,
                time_period=time_period,
                grounding_sources=grounding_sources,
                actions=[{"label": "View Repositories", "href": "/repositories"}],
                freshness_tier=state.get("data_freshness_tier")
            )

        # 1. Handle Empty Telemetry (Enforce Zero Data Fabrication)
        if self.check_telemetry_emptiness(telemetry) and selected_agent not in ("Guardrail_Reject", "Clarification_Router"):
            logger.info(f"[ResponseGenerator] Empty telemetry detected for query '{user_request}'. Enforcing zero fabrication.")
            criteria_desc = f"Repository: {entities_involved.get('repositories', ['All'])}, Developer: {entities_involved.get('developers', ['All'])}"
            empty_markdown = EMPTY_DATA_RESPONSE_TEMPLATE.format(
                criteria=criteria_desc,
                timeframe=time_period
            )

            # Append freshness footnote if available
            if freshness_dict:
                try:
                    meta = FreshnessMetadata(**freshness_dict)
                    empty_markdown += freshness_evaluator.format_provenance_footnote(meta)
                except Exception:
                    pass

            return FactCheckedResponse(
                summary="I don't have enough current data to answer that accurately.",
                markdown_content=empty_markdown,
                data_availability=DataAvailabilityStatus.EMPTY,
                key_metrics=[],
                entities_involved=entities_involved,
                time_period=time_period,
                grounding_sources=grounding_sources,
                actions=[{"label": "View Repositories", "href": "/repositories"}],
                freshness_tier=state.get("data_freshness_tier")
            )

        # 2. Build Grounded LLM Prompt with Conversational Context
        recent_turns = state.get("recent_turns") or []
        history_context_str = ""
        if recent_turns:
            history_lines = []
            for t in recent_turns[-3:]:
                u_msg = getattr(t, "user_message", "") or (t.get("user_message") if isinstance(t, dict) else "")
                a_msg = getattr(t, "agent_response", "") or (t.get("agent_response") if isinstance(t, dict) else "")
                if u_msg:
                    history_lines.append(f"User: {u_msg}")
                if a_msg:
                    history_lines.append(f"Assistant: {a_msg[:250]}")
            if history_lines:
                history_context_str = "PREVIOUS CONVERSATION CONTEXT:\n" + "\n".join(history_lines) + "\n\n"

        telemetry_str = json.dumps(telemetry, default=str)[:3500]
        user_content = (
            f"{history_context_str}"
            f"USER QUERY: {user_request}\n\n"
            f"AUTHENTICATED TENANT: {tenant_id}\n"
            f"SPECIALIST AGENT: {selected_agent}\n"
            f"VERIFIED TELEMETRY DATA (GROUND TRUTH):\n"
            f"```json\n{telemetry_str}\n```\n\n"
            f"Produce an expert technical summary. Mention exact numbers, repositories, and developers strictly from the JSON above. "
            f"Never invent mock authors, commits, or PRs. Do NOT expose internal chain-of-thought."
        )

        messages = [
            {"role": "system", "content": RESPONSE_GENERATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]

        markdown_content = ""
        llm_diag: Dict[str, Any] = {
            "provider": getattr(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "unknown"),
            "model": getattr(settings, "ENGINEERING_AGENT_LLM_MODEL", "unknown"),
            "endpoint": f"{getattr(settings, 'ENGINEERING_AGENT_LLM_BASE_URL', '').rstrip('/')}/chat/completions",
            "status": "pending",
            "latency_ms": 0.0
        }
        t_llm_start = time.time()

        try:
            provider = agent_llm_factory.get_provider()
            completion = await provider.complete(messages=messages, temperature=0.2)
            llm_diag["latency_ms"] = round((time.time() - t_llm_start) * 1000.0, 2)
            llm_diag["status"] = "success"
            llm_diag["provider"] = provider.provider_name
            llm_diag["model"] = provider.model
            markdown_content = self.clean_chain_of_thought(completion.content or "")
        except LLMError as e:
            llm_diag["latency_ms"] = round((time.time() - t_llm_start) * 1000.0, 2)
            llm_diag["status"] = "fallback"
            llm_diag["error_reason"] = f"{e.__class__.__name__}: {e.message}"
            logger.warning(f"[ResponseGenerator] LLM synthesis failed ({e.__class__.__name__}): {e.message}. Using deterministic fallback.")
            markdown_content = self._format_clean_fallback_markdown(selected_agent, tenant_id, telemetry, entities_involved)
        except Exception as e:
            llm_diag["latency_ms"] = round((time.time() - t_llm_start) * 1000.0, 2)
            llm_diag["status"] = "fallback"
            llm_diag["error_reason"] = f"Unexpected: {str(e)}"
            logger.error(f"[ResponseGenerator] Unexpected synthesis error: {e}")
            markdown_content = self._format_clean_fallback_markdown(selected_agent, tenant_id, telemetry, entities_involved)

        # 3. Append Freshness Provenance Footnote
        if freshness_dict and "Data Source:" not in markdown_content:
            try:
                meta = FreshnessMetadata(**freshness_dict)
                markdown_content += freshness_evaluator.format_provenance_footnote(meta)
            except Exception as e:
                logger.warning(f"[ResponseGenerator] Failed to append footnote: {e}")

        # 4. Generate direct concise summary (first paragraph or headline)
        summary = markdown_content.split("\n\n")[0].replace("#", "").strip()
        if len(summary) > 200:
            summary = summary[:197] + "..."

        return FactCheckedResponse(
            summary=summary or "Engineering analysis complete.",
            markdown_content=markdown_content,
            data_availability=DataAvailabilityStatus.AVAILABLE,
            key_metrics=key_metrics,
            entities_involved=entities_involved,
            time_period=time_period,
            grounding_sources=grounding_sources,
            actions=state.get("actions") or [],
            freshness_tier=state.get("data_freshness_tier"),
            llm_diagnostics=llm_diag
        )


response_generator = ResponseGenerator()
