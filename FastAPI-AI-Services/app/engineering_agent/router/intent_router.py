"""
Master Engineering AI Agent Intent Router.
Combines deterministic pattern recognition, entity extraction, LLM disambiguation, and clarification prompting.
"""
from typing import Optional, Dict, Any, List

from app.engineering_agent.router.schemas import (
    IntentCategory,
    ExtractedEntities,
    IntentClassificationResult
)
from app.engineering_agent.router.deterministic_matcher import deterministic_intent_matcher
from app.engineering_agent.router.llm_classifier import llm_intent_classifier
from app.utils.logger import logger

class EngineeringIntentRouter:
    """
    Intelligent routing orchestrator for the Engineering AI Agent.
    """

    SUGGESTED_CLARIFICATION_OPTIONS = {
        IntentCategory.REPOSITORY_INFO: ["Show repository overview", "Inspect recent commits", "View repository languages"],
        IntentCategory.DEVELOPER_INFO: ["View developer velocity", "See commits by author", "Show PR review leaderboard"],
        IntentCategory.COMMIT_INFO: ["List recent commits", "Analyze code churn", "Inspect commit authors"],
        IntentCategory.PULL_REQUEST_INFO: ["View open pull requests", "Check PR review turnaround", "List merged PRs"],
        IntentCategory.PROJECT_INFO: ["Show project dashboard", "View connected repositories", "Inspect project KPIs"],
    }

    async def route(
        self,
        prompt: str,
        project_id: Optional[str] = None,
        repository_id: Optional[str] = None
    ) -> IntentClassificationResult:
        """
        Classify user intent with confidence scoring and entity resolution.
        """
        # Step 1: Execute fast deterministic matcher
        det_intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        # Contextual boost if user is inside a specific project/repository page
        if project_id and not entities.project_name:
            entities.project_name = project_id
        if repository_id and not entities.repository_name:
            entities.repository_name = repository_id

        # High confidence deterministic match -> Return immediately
        if det_intent is not None and confidence >= 0.80:
            logger.info(f"[IntentRouter] Fast deterministic match: {det_intent.value} ({confidence:.2f})")
            
            # Generate suggested options based on intent
            options = self.SUGGESTED_CLARIFICATION_OPTIONS.get(det_intent, [
                "View projects overview",
                "View developer velocity",
                "Inspect pull requests"
            ])

            return IntentClassificationResult(
                intent=det_intent,
                confidence=confidence,
                entities=entities,
                requires_clarification=False,
                suggested_options=options,
                routing_strategy="deterministic"
            )

        # Step 2: Fallback to LLM intent disambiguation for complex / borderline natural language
        logger.info(f"[IntentRouter] Deterministic confidence ({confidence:.2f}) is borderline. Invoking LLM disambiguation...")
        llm_result = await llm_intent_classifier.classify(prompt)

        if llm_result:
            # Merge extracted entities
            if not llm_result.entities.repository_name and entities.repository_name:
                llm_result.entities.repository_name = entities.repository_name
            if not llm_result.entities.developer_name and entities.developer_name:
                llm_result.entities.developer_name = entities.developer_name
            if not llm_result.entities.timeframe and entities.timeframe:
                llm_result.entities.timeframe = entities.timeframe

            options = self.SUGGESTED_CLARIFICATION_OPTIONS.get(llm_result.intent, [
                "View projects overview",
                "View developer velocity",
                "Inspect pull requests"
            ])
            llm_result.suggested_options = options
            return llm_result

        # Step 3: If LLM is unavailable and deterministic had partial match
        fallback_intent = det_intent or IntentCategory.GENERAL_ENGINEERING_QA
        is_low_confidence = confidence < 0.45

        clarification_text = None
        if is_low_confidence:
            clarification_text = (
                "Could you please specify which repository, developer, or project you'd like to analyze? "
                "You can choose one of the quick options below."
            )

        return IntentClassificationResult(
            intent=fallback_intent,
            confidence=confidence,
            entities=entities,
            requires_clarification=is_low_confidence,
            clarification_prompt=clarification_text,
            suggested_options=[
                "Analyze developer velocity",
                "Inspect repository commits",
                "View open pull requests",
                "Generate engineering summary"
            ],
            routing_strategy="fallback"
        )

engineering_intent_router = EngineeringIntentRouter()
