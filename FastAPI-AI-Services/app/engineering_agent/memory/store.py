"""
Thread-safe In-Memory and Persistent Conversation Memory Store.
Enforces strict Tenant, User, and Conversation isolation with TTL expiration and secret scrubbing.
"""
import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from collections import OrderedDict

from app.engineering_agent.memory.schemas import ConversationTurn, ConversationSession
from app.engineering_agent.memory.scrubber import secret_scrubber
from app.utils.logger import logger


class ConversationMemoryStore:
    """
    Episodic memory store for Engineering AI Agent multi-turn conversations.
    Strictly isolated by (tenant_id, user_id, conversation_id).
    """

    def __init__(
        self,
        max_turns_per_conversation: int = 10,
        ttl_seconds: int = 72 * 3600  # 72 hours retention
    ):
        self.max_turns = max_turns_per_conversation
        self.ttl_seconds = ttl_seconds
        # Composite Key: "{tenant_id}:{user_id}:{conversation_id}" -> ConversationSession
        self._store: Dict[str, ConversationSession] = OrderedDict()
        self._lock = asyncio.Lock()

    def _make_key(self, tenant_id: str, user_id: str, conversation_id: str) -> str:
        """Constructs an isolated composite lookup key."""
        return f"{tenant_id.strip()}:{user_id.strip()}:{conversation_id.strip()}"

    async def get_session(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str
    ) -> Optional[ConversationSession]:
        """
        Retrieve an active conversation session, ensuring tenant and user boundaries match.
        Automatically evicts expired sessions.
        """
        key = self._make_key(tenant_id, user_id, conversation_id)
        async with self._lock:
            session = self._store.get(key)
            if not session:
                return None

            # Check TTL
            if (time.time() - session.updated_at) > self.ttl_seconds:
                logger.info(f"[MemoryStore] Session '{conversation_id}' for tenant '{tenant_id}' expired. Evicting.")
                del self._store[key]
                return None

            return session

    async def add_turn(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str,
        turn: ConversationTurn
    ) -> ConversationSession:
        """
        Appends a sanitized conversation turn to the specified session.
        Applies window limit, updates active entities, and updates timestamp.
        """
        # 1. Scrub secrets before storing
        turn.user_message = secret_scrubber.scrub(turn.user_message)
        turn.agent_response = secret_scrubber.scrub(turn.agent_response)

        key = self._make_key(tenant_id, user_id, conversation_id)
        now = time.time()

        async with self._lock:
            session = self._store.get(key)
            if not session:
                session = ConversationSession(
                    conversation_id=conversation_id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    created_at=now,
                    updated_at=now,
                    turns=[]
                )
                self._store[key] = session

            session.updated_at = now
            session.turns.append(turn)

            # Enforce max turns sliding window
            if len(session.turns) > self.max_turns:
                session.turns = session.turns[-self.max_turns:]

            # Update active entity track
            if turn.detected_intent:
                session.last_intent = turn.detected_intent
            if turn.resolved_repository_name:
                session.last_repository_name = turn.resolved_repository_name
            elif turn.entities and turn.entities.repository_name:
                session.last_repository_name = turn.entities.repository_name

            if turn.resolved_project_name:
                session.last_project_name = turn.resolved_project_name
            elif turn.entities and turn.entities.project_name:
                session.last_project_name = turn.entities.project_name

            if turn.resolved_developer_name:
                session.last_developer_name = turn.resolved_developer_name
            elif turn.entities and turn.entities.developer_name:
                session.last_developer_name = turn.entities.developer_name

            if turn.timeframe:
                session.last_timeframe = turn.timeframe
            elif turn.entities and turn.entities.timeframe:
                session.last_timeframe = turn.entities.timeframe

            logger.info(
                f"[MemoryStore] Saved turn in session '{conversation_id}' "
                f"(Tenant: '{tenant_id}', User: '{user_id}', Total Turns: {len(session.turns)})"
            )
            return session

    async def get_recent_turns(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str,
        max_turns: int = 5
    ) -> List[ConversationTurn]:
        """Fetch the most recent N turns for contextual prompt assembly."""
        session = await self.get_session(tenant_id, user_id, conversation_id)
        if not session or not session.turns:
            return []
        return session.turns[-max_turns:]

    async def clear_session(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str
    ) -> bool:
        """Explicitly clear / delete a conversation session."""
        key = self._make_key(tenant_id, user_id, conversation_id)
        async with self._lock:
            if key in self._store:
                del self._store[key]
                logger.info(f"[MemoryStore] Cleared session '{conversation_id}' for tenant '{tenant_id}'")
                return True
            return False

    async def cleanup_expired_sessions(self) -> int:
        """Prunes all sessions older than TTL."""
        now = time.time()
        evicted_count = 0
        async with self._lock:
            keys_to_delete = [
                k for k, session in self._store.items()
                if (now - session.updated_at) > self.ttl_seconds
            ]
            for k in keys_to_delete:
                del self._store[k]
                evicted_count += 1
        
        if evicted_count > 0:
            logger.info(f"[MemoryStore] Cleaned up {evicted_count} expired conversation sessions.")
        return evicted_count

    async def hydrate_from_messages(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str,
        messages: List[Any]
    ) -> ConversationSession:
        """
        Hydrate in-memory session from persistent PostgreSQL messages (e.g. after cold start / server restart).
        Sorts messages chronologically and reconstructs ConversationTurns.
        """
        key = self._make_key(tenant_id, user_id, conversation_id)
        now = time.time()

        def _get_field(obj: Any, name: str, default: Any = None) -> Any:
            if hasattr(obj, name):
                return getattr(obj, name)
            if isinstance(obj, dict):
                return obj.get(name, default)
            return default

        # Sort messages by created_at ASC
        sorted_msgs = sorted(
            messages,
            key=lambda m: _get_field(m, "created_at") or datetime.min.replace(tzinfo=timezone.utc)
        )

        turns: List[ConversationTurn] = []
        pending_user_msg = None

        for msg in sorted_msgs:
            sender = _get_field(msg, "sender", "")
            content = _get_field(msg, "content", "")

            if sender == "user":
                pending_user_msg = msg
            elif sender == "assistant":
                user_text = ""
                if pending_user_msg:
                    user_text = _get_field(pending_user_msg, "content", "")

                detected_intent = _get_field(msg, "detected_intent")
                selected_agent = _get_field(msg, "selected_agent")
                metrics_json = _get_field(msg, "metrics_json") or []
                msg_time = _get_field(msg, "created_at")
                ts = msg_time.timestamp() if (msg_time and hasattr(msg_time, "timestamp")) else now

                turn = ConversationTurn(
                    turn_id=_get_field(msg, "id") or f"turn-{uuid.uuid4().hex[:8]}",
                    user_message=secret_scrubber.scrub(user_text),
                    agent_response=secret_scrubber.scrub(content),
                    detected_intent=detected_intent,
                    selected_agent=selected_agent,
                    metrics_summary=metrics_json if isinstance(metrics_json, list) else [],
                    timestamp=ts
                )
                turns.append(turn)
                pending_user_msg = None

        async with self._lock:
            session = self._store.get(key)
            if not session:
                session = ConversationSession(
                    conversation_id=conversation_id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    created_at=now,
                    updated_at=now,
                    turns=[]
                )
                self._store[key] = session

            session.updated_at = now
            session.turns = turns[-self.max_turns:]

            if session.turns:
                last_turn = session.turns[-1]
                if last_turn.detected_intent:
                    session.last_intent = last_turn.detected_intent
                if last_turn.resolved_repository_name:
                    session.last_repository_name = last_turn.resolved_repository_name
                if last_turn.resolved_project_name:
                    session.last_project_name = last_turn.resolved_project_name
                if last_turn.resolved_developer_name:
                    session.last_developer_name = last_turn.resolved_developer_name

            logger.info(
                f"[MemoryStore] Hydrated session '{conversation_id}' from DB for tenant '{tenant_id}' "
                f"({len(session.turns)} turns loaded)"
            )
            return session

    def get_active_sessions_count(self) -> int:
        """Returns current total active sessions in memory."""
        return len(self._store)


conversation_memory_store = ConversationMemoryStore()

