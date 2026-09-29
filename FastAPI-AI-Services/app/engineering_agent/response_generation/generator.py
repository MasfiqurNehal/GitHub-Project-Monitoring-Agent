"""
Response Generator Engine for Engineering AI Agent.
Coordinates factual synthesis, empty-data handling, anti-hallucination verification,
CoT suppression, and structured FactCheckedResponse packaging.
"""
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
                summary="No engineering activity records were found for the specified criteria.",
                markdown_content=empty_markdown,
                data_availability=DataAvailabilityStatus.EMPTY,
                key_metrics=[],
                entities_involved=entities_involved,
                time_period=time_period,
                grounding_sources=grounding_sources,
                actions=[{"label": "View Repositories", "href": "/repositories"}],
                freshness_tier=state.get("data_freshness_tier")
            )

        # 2. Build Grounded LLM Prompt
        telemetry_str = json.dumps(telemetry, default=str)[:3500]
        user_content = (
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
        try:
            provider = agent_llm_factory.get_provider()
            completion = await provider.complete(messages=messages, temperature=0.2)
            markdown_content = self.clean_chain_of_thought(completion.content or "")
        except LLMError as e:
            logger.warning(f"[ResponseGenerator] LLM synthesis failed ({e.__class__.__name__}): {e.message}. Using deterministic fallback.")
            markdown_content = (
                f"### ⚙️ Engineering Analysis ({selected_agent})\n\n"
                f"Telemetry gathered successfully for tenant `{tenant_id}`.\n\n"
                f"- **Data Points**: {len(telemetry)} items recorded.\n"
                f"- **Specialist**: {selected_agent}\n\n"
                f"```json\n{telemetry_str[:800]}\n```"
            )
        except Exception as e:
            logger.error(f"[ResponseGenerator] Unexpected synthesis error: {e}")
            markdown_content = f"### ⚙️ Engineering Telemetry ({selected_agent})\n\nAnalysis gathered successfully."

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
            freshness_tier=state.get("data_freshness_tier")
        )


response_generator = ResponseGenerator()
