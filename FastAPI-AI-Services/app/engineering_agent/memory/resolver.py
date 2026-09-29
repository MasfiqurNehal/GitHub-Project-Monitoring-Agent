"""
Memory Context Resolver for Engineering Agent.
Resolves pronoun references, elliptical follow-ups, temporal shifts, and intent continuity
using the active conversation memory session.
"""
import re
from typing import Optional, Tuple
from app.engineering_agent.memory.schemas import (
    ConversationSession,
    ConversationTurn,
    ResolvedFollowUpContext
)
from app.engineering_agent.router.schemas import (
    IntentCategory,
    ExtractedEntities
)
from app.utils.logger import logger


class MemoryContextResolver:
    """
    Analyzes new user queries against recent episodic conversation memory
    to resolve follow-ups, pronoun antecedents, and temporal adjustments.
    """

    FOLLOW_UP_TRIGGER_PATTERNS = [
        r"^(?:what\s+about|how\s+about|and|what\s+of|show\s+for|in|for)\s+",
        r"\b(?:what\s+about\s+(?:last|this|the|yesterday|today|previous))\b",
        r"\b(?:how\s+about\s+(?:last|this|the|yesterday|today|previous))\b",
        r"^(?:and\s+yesterday|and\s+today|and\s+last\s+week|and\s+last\s+month)\b",
    ]

    PRONOUN_REPO_PATTERNS = [
        r"\b(it|its|this\s+repo|this\s+repository|that\s+repo|that\s+repository|the\s+repo|the\s+repository)\b"
    ]

    PRONOUN_DEV_PATTERNS = [
        r"\b(he|his|him|she|her|they|them|their|this\s+developer|that\s+developer|the\s+dev|the\s+developer)\b"
    ]

    PRONOUN_PROJ_PATTERNS = [
        r"\b(this\s+project|that\s+project|the\s+project)\b"
    ]

    def _has_follow_up_trigger(self, text: str) -> bool:
        """Check if query begins with an elliptical or follow-up phrase."""
        for pattern in self.FOLLOW_UP_TRIGGER_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _has_repo_pronoun(self, text: str) -> bool:
        """Check if query references repository with pronouns."""
        for pattern in self.PRONOUN_REPO_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _has_dev_pronoun(self, text: str) -> bool:
        """Check if query references developer with pronouns."""
        for pattern in self.PRONOUN_DEV_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _has_proj_pronoun(self, text: str) -> bool:
        """Check if query references project with pronouns."""
        for pattern in self.PRONOUN_PROJ_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def resolve(
        self,
        query: str,
        session: Optional[ConversationSession],
        current_entities: ExtractedEntities,
        current_intent: Optional[IntentCategory] = None,
        confidence: float = 0.0
    ) -> ResolvedFollowUpContext:
        """
        Evaluate if query is a follow-up and resolve inherited antecedents.
        """
        if not session or not session.turns:
            return ResolvedFollowUpContext(is_follow_up=False)

        norm_query = query.lower().strip()
        last_turn = session.turns[-1]

        # Case 1: Temporal Follow-Up (e.g. "What about last week?", "And yesterday?", "What about 30d?")
        # User changes timeframe while maintaining the antecedent entity and intent
        has_trigger = self._has_follow_up_trigger(norm_query)
        has_timeframe = current_entities.timeframe is not None
        no_new_entity = (
            not current_entities.repository_name and
            not current_entities.developer_name and
            not current_entities.project_name
        )

        if has_timeframe and (has_trigger or no_new_entity or confidence < 0.60):
            # Inherit antecedent entity from session memory
            inherited_repo = session.last_repository_name
            inherited_proj = session.last_project_name
            inherited_dev = session.last_developer_name
            inherited_intent_str = session.last_intent

            inherited_intent = None
            if inherited_intent_str:
                try:
                    inherited_intent = IntentCategory(inherited_intent_str)
                except ValueError:
                    pass

            # If current query specifies a metric (e.g. "What about pull requests last week?"), use that intent
            final_intent = current_intent or inherited_intent

            logger.info(
                f"[MemoryContextResolver] Resolved temporal follow-up '{query}' -> "
                f"Repo: '{inherited_repo}', Dev: '{inherited_dev}', Intent: '{final_intent}'"
            )

            return ResolvedFollowUpContext(
                is_follow_up=True,
                inherited_intent=final_intent,
                inherited_repository_name=inherited_repo,
                inherited_project_name=inherited_proj,
                inherited_developer_name=inherited_dev,
                updated_timeframe=current_entities.timeframe,
                confidence_boost=0.90,
                reasoning=f"Inherited context from previous turn (Turn ID: {last_turn.turn_id})"
            )

        # Case 2: Pronoun Antecedent Resolution (e.g. "How many PRs does it have?", "Show his commits")
        if self._has_repo_pronoun(norm_query) and not current_entities.repository_name:
            inherited_repo = session.last_repository_name
            inherited_proj = session.last_project_name
            if inherited_repo or inherited_proj:
                logger.info(f"[MemoryContextResolver] Resolved pronoun 'it/this repo' -> Repo: '{inherited_repo}'")
                return ResolvedFollowUpContext(
                    is_follow_up=True,
                    inherited_intent=current_intent or (IntentCategory(session.last_intent) if session.last_intent else None),
                    inherited_repository_name=inherited_repo,
                    inherited_project_name=inherited_proj,
                    inherited_developer_name=session.last_developer_name,
                    updated_timeframe=current_entities.timeframe or session.last_timeframe,
                    confidence_boost=0.88,
                    reasoning="Resolved repository pronoun antecedent from memory"
                )

        if self._has_dev_pronoun(norm_query) and not current_entities.developer_name:
            inherited_dev = session.last_developer_name
            if inherited_dev:
                logger.info(f"[MemoryContextResolver] Resolved pronoun 'he/his/they' -> Developer: '{inherited_dev}'")
                return ResolvedFollowUpContext(
                    is_follow_up=True,
                    inherited_intent=current_intent or (IntentCategory(session.last_intent) if session.last_intent else None),
                    inherited_repository_name=session.last_repository_name,
                    inherited_project_name=session.last_project_name,
                    inherited_developer_name=inherited_dev,
                    updated_timeframe=current_entities.timeframe or session.last_timeframe,
                    confidence_boost=0.88,
                    reasoning="Resolved developer pronoun antecedent from memory"
                )

        # Case 3: Entity Pivot with Intent Continuity (e.g. Turn 1: "Show frontend commits", Turn 2: "What about backend repo?")
        if has_trigger and (current_entities.repository_name or current_entities.developer_name or current_entities.project_name):
            if current_intent is None or confidence < 0.60:
                inherited_intent = None
                if session.last_intent:
                    try:
                        inherited_intent = IntentCategory(session.last_intent)
                    except ValueError:
                        pass
                if inherited_intent:
                    logger.info(f"[MemoryContextResolver] Intent continuity applied -> Intent: '{inherited_intent}'")
                    return ResolvedFollowUpContext(
                        is_follow_up=True,
                        inherited_intent=inherited_intent,
                        inherited_repository_name=current_entities.repository_name,
                        inherited_project_name=current_entities.project_name,
                        inherited_developer_name=current_entities.developer_name,
                        updated_timeframe=current_entities.timeframe or session.last_timeframe,
                        confidence_boost=0.85,
                        reasoning="Maintained intent continuity across entity pivot"
                    )

        # Not a follow-up / standalone query
        return ResolvedFollowUpContext(is_follow_up=False)


memory_context_resolver = MemoryContextResolver()
