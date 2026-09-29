"""
LLM-Assisted Intent Disambiguation Engine for Engineering Agent.
Used when deterministic rules detect ambiguity or complex natural language syntax.
"""
import json
import time
from typing import Optional, Dict, Any

from app.engineering_agent.router.schemas import (
    IntentCategory,
    ExtractedEntities,
    IntentClassificationResult
)
from app.engineering_agent.llm import agent_llm_factory
from app.utils.logger import logger

INTENT_CLASSIFIER_PROMPT = """You are an intent classification subsystem for a GitHub Engineering Analytics SaaS.
Analyze the user's prompt and classify it into EXACTLY ONE of the following intent categories:

CATEGORIES:
1. repository_info - Status, languages, metadata of a repository.
2. commit_info - Commits, commit history, authors, diffs.
3. developer_info - Developer velocity, contributions, commits/PRs per author.
4. pull_request_info - PR reviews, turnaround time, open/merged PRs.
5. issue_info - Issues, bug tickets, resolution time.
6. code_impact - Code churn, additions, deletions, top modified files.
7. project_info - Project health, connected repositories.
8. dashboard_analytics - High-level metrics, executive KPIs, overall system health.
9. cross_repository_analytics - Comparing or benchmarking multiple repositories.
10. general_engineering_qa - Software engineering concepts, architecture, Git theory.
11. unsupported_non_it - Unrelated non-IT questions (cooking, weather, sports, dating).

Respond ONLY with valid JSON in this exact structure:
{
  "intent": "<one_of_the_categories_above>",
  "confidence": <float_between_0.0_and_1.0>,
  "repository_name": "<name_or_null>",
  "developer_name": "<name_or_null>",
  "project_name": "<name_or_null>",
  "timeframe": "<e.g._30d_7d_today_or_null>",
  "requires_clarification": <true_or_false>,
  "clarification_prompt": "<optional_question_if_unclear>"
}
"""

class LLMIntentClassifier:
    """LLM-based classifier for ambiguous or complex natural language inputs."""

    async def classify(self, prompt: str) -> Optional[IntentClassificationResult]:
        """Classify user intent via the configured Engineering Agent LLM provider."""
        try:
            provider = agent_llm_factory.get_provider()
            messages = [
                {"role": "system", "content": INTENT_CLASSIFIER_PROMPT},
                {"role": "user", "content": f"User Prompt: \"{prompt}\""}
            ]

            t0 = time.time()
            resp = await provider.complete(messages=messages, temperature=0.0, max_tokens=250)
            latency_ms = (time.time() - t0) * 1000.0

            content = resp.content.strip()
            # Clean possible markdown code fences
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            parsed = json.loads(content)
            raw_intent = parsed.get("intent", "general_engineering_qa").lower().strip()

            matched_intent = IntentCategory.GENERAL_ENGINEERING_QA
            for cat in IntentCategory:
                if cat.value == raw_intent:
                    matched_intent = cat
                    break

            confidence = float(parsed.get("confidence", 0.85))
            requires_clarification = bool(parsed.get("requires_clarification", False)) or confidence < 0.45

            entities = ExtractedEntities(
                repository_name=parsed.get("repository_name"),
                developer_name=parsed.get("developer_name"),
                project_name=parsed.get("project_name"),
                timeframe=parsed.get("timeframe")
            )

            logger.info(f"[LLMIntentClassifier] Resolved '{prompt[:30]}...' -> {matched_intent.value} ({confidence:.2f}) in {latency_ms:.1f}ms")

            return IntentClassificationResult(
                intent=matched_intent,
                confidence=confidence,
                entities=entities,
                requires_clarification=requires_clarification,
                clarification_prompt=parsed.get("clarification_prompt"),
                routing_strategy="llm"
            )

        except Exception as e:
            logger.warning(f"[LLMIntentClassifier] Failed to classify via LLM: {str(e)}")
            return None

llm_intent_classifier = LLMIntentClassifier()
