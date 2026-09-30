"""
Unit and Integration Tests for Phase 22: Engineering Agent Execution Persistence & Memory Hydration.
Verifies:
1. Automatic conversation creation in PostgreSQL when conversation_id is omitted.
2. User and Assistant message persistence in PostgreSQL.
3. Telemetry, metrics, and actions serialized in message records.
4. Multi-turn continuation with existing conversation_id.
5. Strict tenant and user ownership enforcement (404 on unowned/cross-tenant conversations).
6. Cold-start / process-restart memory hydration from PostgreSQL.
7. Soft-deleted conversation rejection.
8. Failure tolerance (user message preserved even if execution encounters an error).
9. Live tool & freshness behavior preservation alongside conversation history.
10. Legacy chatbot regression protection.
"""
import unittest
import jwt
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.db.connection import db_manager
from app.db.engineering_repository import engineering_chat_repository
from app.engineering_agent.memory import conversation_memory_store, ConversationTurn
from app.models.engineering_chat import EngineeringConversationModel, EngineeringMessageModel


class TestPhase22EngineeringExecutionPersistence(unittest.TestCase):
    """Test suite for Phase 22 execution persistence and context hydration."""

    def setUp(self):
        self.client = TestClient(app)

        # JWT Tokens for various test personas
        self.user_a = {
            "id": "usr-alice",
            "email": "alice@acme.com",
            "organizationId": "org-acme",
            "role": "admin"
        }
        self.token_user_a = jwt.encode(self.user_a, settings.JWT_SECRET, algorithm="HS256")

        self.user_b_same_org = {
            "id": "usr-bob",
            "email": "bob@acme.com",
            "organizationId": "org-acme",
            "role": "developer"
        }
        self.token_user_b = jwt.encode(self.user_b_same_org, settings.JWT_SECRET, algorithm="HS256")

        self.user_c_foreign_org = {
            "id": "usr-charlie",
            "email": "charlie@foreign.com",
            "organizationId": "org-foreign",
            "role": "admin"
        }
        self.token_user_c = jwt.encode(self.user_c_foreign_org, settings.JWT_SECRET, algorithm="HS256")

        # Mock DB session and session_factory
        self.mock_session = AsyncMock()
        self.mock_session_factory = MagicMock()
        self.mock_session_factory.return_value.__aenter__.return_value = self.mock_session
        self.mock_session_factory.return_value.__aexit__.return_value = None

        self.db_patch = patch.object(db_manager, "session_factory", self.mock_session_factory)
        self.db_patch.start()

    def tearDown(self):
        self.db_patch.stop()
        conversation_memory_store._store.clear()

    # -------------------------------------------------------------------------
    # Test 1: New Conversation Auto-Creation & Persistence
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_new_conversation_auto_creates_and_persists(self, mock_orchestrate, mock_repo):
        """When conversation_id is omitted, automatically create conversation in DB and persist messages."""
        created_conv = EngineeringConversationModel(
            id="eng-conv-new-123",
            user_id="usr-alice",
            organization_id="org-acme",
            title="New Engineering Analysis",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        mock_repo.create_conversation = AsyncMock(return_value=created_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        async def fake_orchestrate(state):
            state.final_response = "Here is the sprint velocity analysis."
            state.detected_intent = "analytics"
            state.selected_agent = "analytics_agent"
            state.add_metric("Sprint Velocity", "42 pts")
        mock_orchestrate.side_effect = fake_orchestrate

        payload = {
            "message": "Analyze sprint velocity for the team."
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["conversation_id"], "eng-conv-new-123")
        self.assertEqual(data["response"], "Here is the sprint velocity analysis.")

        # Verify conversation creation was called with correct JWT identity
        mock_repo.create_conversation.assert_called_once()
        conv_call_kwargs = mock_repo.create_conversation.call_args[1]
        self.assertEqual(conv_call_kwargs["user_id"], "usr-alice")
        self.assertEqual(conv_call_kwargs["organization_id"], "org-acme")

        # Verify both user and assistant messages were persisted
        self.assertEqual(mock_repo.create_message.call_count, 2)
        user_msg_call = mock_repo.create_message.call_args_list[0][1]
        self.assertEqual(user_msg_call["sender"], "user")
        self.assertEqual(user_msg_call["content"], "Analyze sprint velocity for the team.")
        self.assertEqual(user_msg_call["conversation_id"], "eng-conv-new-123")

        assistant_msg_call = mock_repo.create_message.call_args_list[1][1]
        self.assertEqual(assistant_msg_call["sender"], "assistant")
        self.assertEqual(assistant_msg_call["content"], "Here is the sprint velocity analysis.")
        self.assertEqual(assistant_msg_call["detected_intent"], "analytics")
        self.assertEqual(assistant_msg_call["selected_agent"], "analytics_agent")

    # -------------------------------------------------------------------------
    # Test 2: Continuation with Existing Conversation ID
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_existing_conversation_continuation(self, mock_orchestrate, mock_repo):
        """When valid conversation_id is provided, verify ownership and append messages without creating new conversation."""
        existing_conv = EngineeringConversationModel(
            id="eng-conv-existing-456",
            user_id="usr-alice",
            organization_id="org-acme",
            title="Repository Architecture Review",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            messages=[]
        )
        mock_repo.get_conversation = AsyncMock(return_value=existing_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        async def fake_orchestrate(state):
            state.final_response = "The main bottleneck is review turnaround."
            state.detected_intent = "pull_requests"
            state.selected_agent = "pull_request_agent"
        mock_orchestrate.side_effect = fake_orchestrate

        payload = {
            "conversation_id": "eng-conv-existing-456",
            "message": "What is the primary bottleneck?"
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["conversation_id"], "eng-conv-existing-456")

        # Verify get_conversation was called with JWT identity
        mock_repo.get_conversation.assert_called_once()
        get_kwargs = mock_repo.get_conversation.call_args[1]
        self.assertEqual(get_kwargs["conversation_id"], "eng-conv-existing-456")
        self.assertEqual(get_kwargs["user_id"], "usr-alice")
        self.assertEqual(get_kwargs["organization_id"], "org-acme")

        # Verify create_conversation was NOT called
        mock_repo.create_conversation.assert_not_called()

        # Verify messages appended
        self.assertEqual(mock_repo.create_message.call_count, 2)

    # -------------------------------------------------------------------------
    # Test 3: Unowned / Non-Existent Conversation Returns 404
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    def test_nonexistent_or_unowned_conversation_returns_404(self, mock_repo):
        """Attempting to chat in a non-existent conversation returns 404."""
        mock_repo.get_conversation = AsyncMock(return_value=None)

        payload = {
            "conversation_id": "eng-conv-nonexistent",
            "message": "Hello?"
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )
        self.assertEqual(response.status_code, 404)

    # -------------------------------------------------------------------------
    # Test 4: Cross-User Isolation (User B cannot access User A conversation)
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    def test_cross_user_isolation(self, mock_repo):
        """User B (same organization) cannot post to User A's conversation."""
        mock_repo.get_conversation = AsyncMock(return_value=None)

        payload = {
            "conversation_id": "eng-conv-user-a-secret",
            "message": "Show me User A's work."
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_b}"}
        )
        self.assertEqual(response.status_code, 404)
        mock_repo.get_conversation.assert_called_once()
        self.assertEqual(mock_repo.get_conversation.call_args[1]["user_id"], "usr-bob")

    # -------------------------------------------------------------------------
    # Test 5: Cross-Tenant Isolation (Foreign Organization Access Rejected)
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    def test_cross_tenant_isolation(self, mock_repo):
        """User in Foreign Org cannot post to ACME conversation."""
        mock_repo.get_conversation = AsyncMock(return_value=None)

        payload = {
            "conversation_id": "eng-conv-acme-private",
            "message": "Probe foreign tenant conversation."
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_c}"}
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(mock_repo.get_conversation.call_args[1]["organization_id"], "org-foreign")

    # -------------------------------------------------------------------------
    # Test 6: Soft-Deleted Conversation Cannot Be Continued
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    def test_soft_deleted_conversation_rejected(self, mock_repo):
        """A soft-deleted conversation is treated as not found (404)."""
        mock_repo.get_conversation = AsyncMock(return_value=None)

        payload = {
            "conversation_id": "eng-conv-deleted",
            "message": "Resume deleted conversation."
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )
        self.assertEqual(response.status_code, 404)

    # -------------------------------------------------------------------------
    # Test 7: Cold-Start / Process-Restart Memory Hydration from PostgreSQL
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_cold_start_recovery_from_postgresql(self, mock_orchestrate, mock_repo):
        """When memory store is completely empty, history is hydrated from DB and available to execution."""
        conversation_memory_store._store.clear()

        # Prepare DB conversation with historical messages
        msg1 = EngineeringMessageModel(
            id="msg-1",
            conversation_id="eng-conv-cold-789",
            organization_id="org-acme",
            user_id="usr-alice",
            sender="user",
            content="Show commit activity for the backend repo.",
            created_at=datetime(2026, 9, 30, 4, 0, 0, tzinfo=timezone.utc)
        )
        msg2 = EngineeringMessageModel(
            id="msg-2",
            conversation_id="eng-conv-cold-789",
            organization_id="org-acme",
            user_id="usr-alice",
            sender="assistant",
            content="The backend repository had 52 commits this week.",
            detected_intent="commit_activity",
            selected_agent="commit_agent",
            created_at=datetime(2026, 9, 30, 4, 0, 5, tzinfo=timezone.utc)
        )
        cold_conv = EngineeringConversationModel(
            id="eng-conv-cold-789",
            user_id="usr-alice",
            organization_id="org-acme",
            title="Backend Activity",
            is_deleted=False,
            created_at=datetime(2026, 9, 30, 4, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 9, 30, 4, 0, 5, tzinfo=timezone.utc),
            messages=[msg1, msg2]
        )
        mock_repo.get_conversation = AsyncMock(return_value=cold_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        async def check_hydrated_state(state):
            # Verify memory session was successfully hydrated
            session = await conversation_memory_store.get_session("org-acme", "usr-alice", "eng-conv-cold-789")
            self.assertIsNotNone(session)
            self.assertEqual(len(session.turns), 1)
            self.assertEqual(session.turns[0].user_message, "Show commit activity for the backend repo.")
            self.assertEqual(session.turns[0].agent_response, "The backend repository had 52 commits this week.")
            state.final_response = "Developer Alice made 30 of those commits."
        mock_orchestrate.side_effect = check_hydrated_state

        payload = {
            "conversation_id": "eng-conv-cold-789",
            "message": "Which developer made the most?"
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["response"], "Developer Alice made 30 of those commits.")

    # -------------------------------------------------------------------------
    # Test 8: Failure Tolerance (User Message Preserved On Execution Error)
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_execution_failure_preserves_user_message(self, mock_orchestrate, mock_repo):
        """If graph execution raises an unexpected error, user message remains persisted and error response returned."""
        created_conv = EngineeringConversationModel(
            id="eng-conv-err-999",
            user_id="usr-alice",
            organization_id="org-acme",
            title="New Engineering Analysis",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        mock_repo.create_conversation = AsyncMock(return_value=created_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        mock_orchestrate.side_effect = RuntimeError("External tool downstream timeout")

        payload = {
            "message": "Trigger unexpected failure."
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("External tool downstream timeout", data["error"])

        # Verify user message was persisted before failure
        self.assertGreaterEqual(mock_repo.create_message.call_count, 1)
        first_call = mock_repo.create_message.call_args_list[0][1]
        self.assertEqual(first_call["sender"], "user")
        self.assertEqual(first_call["content"], "Trigger unexpected failure.")

    # -------------------------------------------------------------------------
    # Test 9: Telemetry & Metrics Persisted in Assistant Message
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_message_telemetry_fields_persisted(self, mock_orchestrate, mock_repo):
        """Verify metrics, artifacts, actions, and tools_executed are serialized to assistant message in DB."""
        created_conv = EngineeringConversationModel(
            id="eng-conv-telem-1",
            user_id="usr-alice",
            organization_id="org-acme",
            title="Telemetry Test",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        mock_repo.create_conversation = AsyncMock(return_value=created_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        async def fake_orchestrate(state):
            state.final_response = "PR review analysis completed."
            state.detected_intent = "pull_requests"
            state.selected_agent = "pull_request_agent"
            state.add_metric("Open PRs", 15, change="+3", color="amber")
            state.add_action("View PRs", href="/pull-requests")
            state.record_tool_result("github_list_prs", {"repo": "backend"}, {"count": 15}, success=True, duration_ms=45.2)
        mock_orchestrate.side_effect = fake_orchestrate

        payload = {"message": "Show open PRs"}
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )
        self.assertEqual(response.status_code, 200)

        # Assistant message is second create_message call
        assistant_call = mock_repo.create_message.call_args_list[1][1]
        self.assertEqual(assistant_call["sender"], "assistant")
        self.assertEqual(assistant_call["detected_intent"], "pull_requests")
        self.assertEqual(assistant_call["selected_agent"], "pull_request_agent")
        self.assertEqual(len(assistant_call["metrics"]), 1)
        self.assertEqual(assistant_call["metrics"][0]["label"], "Open PRs")
        self.assertEqual(len(assistant_call["actions"]), 1)
        self.assertEqual(len(assistant_call["tools_executed"]), 1)
        self.assertEqual(assistant_call["tools_executed"][0]["tool_name"], "github_list_prs")

    # -------------------------------------------------------------------------
    # Test 10: Client Tenant Override (IDOR) Rejected Without DB Persistence
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    def test_tenant_override_idor_rejected(self, mock_repo):
        """When client requests foreign tenant_id override, request is rejected 403 before DB operations."""
        payload = {
            "message": "Probe foreign tenant data",
            "tenant_id": "org-foreign"
        }
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json=payload,
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )
        self.assertEqual(response.status_code, 403)
        mock_repo.create_conversation.assert_not_called()
        mock_repo.create_message.assert_not_called()

    # -------------------------------------------------------------------------
    # Test 11: Multi-Turn Conversation Sliding Window Context
    # -------------------------------------------------------------------------
    @patch("app.engineering_agent.core.service.engineering_chat_repository")
    @patch("app.engineering_agent.core.service.engineering_orchestrator.orchestrate", new_callable=AsyncMock)
    def test_multiple_turns_sliding_window_preserved(self, mock_orchestrate, mock_repo):
        """Multiple back-and-forth turns preserve context window in memory store."""
        existing_conv = EngineeringConversationModel(
            id="eng-conv-multi-1",
            user_id="usr-alice",
            organization_id="org-acme",
            title="Multi-Turn Session",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            messages=[]
        )
        mock_repo.get_conversation = AsyncMock(return_value=existing_conv)
        mock_repo.create_message = AsyncMock(return_value=MagicMock())

        # Turn 1
        async def turn1(state):
            state.final_response = "Backend repository selected."
        mock_orchestrate.side_effect = turn1

        self.client.post(
            "/api/v1/engineering-agent/chat",
            json={"conversation_id": "eng-conv-multi-1", "message": "Look at backend repo."},
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        # Turn 2
        async def turn2(state):
            state.final_response = "Found 12 commits."
        mock_orchestrate.side_effect = turn2

        self.client.post(
            "/api/v1/engineering-agent/chat",
            json={"conversation_id": "eng-conv-multi-1", "message": "How many commits?"},
            headers={"Authorization": f"Bearer {self.token_user_a}"}
        )

        # Verify in-memory session has 2 turns
        session = conversation_memory_store._store.get("org-acme:usr-alice:eng-conv-multi-1")
        self.assertIsNotNone(session)
        self.assertEqual(len(session.turns), 2)
        self.assertEqual(session.turns[0].user_message, "Look at backend repo.")
        self.assertEqual(session.turns[1].user_message, "How many commits?")

    # -------------------------------------------------------------------------
    # Test 12: Legacy Chatbot Endpoint Intact
    # -------------------------------------------------------------------------
    def test_legacy_chatbot_endpoint_isolation(self):
        """Verify legacy chatbot route /api/v1/chatbot/chat remains isolated and intact."""
        response = self.client.post("/api/v1/chatbot/chat", json={"message": "ping"})
        self.assertIn(response.status_code, [401, 403, 422])


if __name__ == "__main__":
    unittest.main()
