"""
Unit and API Integration Tests for Phase 21: Engineering Agent Conversation Repository & REST API.
Verifies CRUD operations, multi-tenant isolation, user scoping, soft-deletion, message ordering, and HTTP endpoints.
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
from app.models.engineering_chat import EngineeringConversationModel, EngineeringMessageModel


class TestPhase21EngineeringConversationAPI(unittest.TestCase):
    """Test suite for Engineering AI Agent conversation repository and REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)

        # Auth Tokens for testing
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

        self.user_no_org = {
            "id": "usr-no-org",
            "email": "noorg@acme.com"
        }
        self.token_no_org = jwt.encode(self.user_no_org, settings.JWT_SECRET, algorithm="HS256")

        # Mock DB session manager context manager
        self.mock_session = AsyncMock()
        self.mock_session_factory = MagicMock()
        self.mock_session_factory.return_value.__aenter__.return_value = self.mock_session
        self.mock_session_factory.return_value.__aexit__.return_value = None

        self.db_patch = patch.object(db_manager, "session_factory", self.mock_session_factory)
        self.db_patch.start()

    def tearDown(self):
        self.db_patch.stop()

    # =========================================================================
    # 1. Repository Unit Tests (Async)
    # =========================================================================

    def test_01_repo_create_conversation(self):
        """Repository: Create conversation adds model to session and commits."""
        import asyncio

        async def _run():
            conv = await engineering_chat_repository.create_conversation(
                session=self.mock_session,
                user_id="usr-alice",
                organization_id="org-acme",
                title="Sprint Architecture Review",
                project_id="prj-1",
                repository_id="repo-backend"
            )
            self.assertEqual(conv.user_id, "usr-alice")
            self.assertEqual(conv.organization_id, "org-acme")
            self.assertEqual(conv.title, "Sprint Architecture Review")
            self.assertFalse(conv.is_deleted)
            self.mock_session.add.assert_called_once()
            self.mock_session.commit.assert_called_once()

        asyncio.run(_run())

    def test_02_repo_list_conversations(self):
        """Repository: List conversations queries non-deleted conversations scoped to user & org."""
        import asyncio

        async def _run():
            now = datetime.now(timezone.utc)
            mock_conv1 = EngineeringConversationModel(
                id="eng-conv-1",
                organization_id="org-acme",
                user_id="usr-alice",
                title="Analysis 1",
                is_deleted=False,
                created_at=now,
                updated_at=now
            )
            mock_conv2 = EngineeringConversationModel(
                id="eng-conv-2",
                organization_id="org-acme",
                user_id="usr-alice",
                title="Analysis 2",
                is_deleted=False,
                created_at=now,
                updated_at=now
            )

            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [mock_conv2, mock_conv1]
            self.mock_session.execute.return_value = mock_result

            convs = await engineering_chat_repository.list_conversations(
                session=self.mock_session,
                user_id="usr-alice",
                organization_id="org-acme"
            )
            self.assertEqual(len(convs), 2)
            self.assertEqual(convs[0].id, "eng-conv-2")
            self.assertEqual(convs[1].id, "eng-conv-1")

        asyncio.run(_run())

    def test_03_repo_get_conversation_with_messages(self):
        """Repository: Fetch conversation verifies tenant ownership and includes ordered messages."""
        import asyncio

        async def _run():
            now = datetime.now(timezone.utc)
            mock_conv = EngineeringConversationModel(
                id="eng-conv-1",
                organization_id="org-acme",
                user_id="usr-alice",
                title="Detail Analysis",
                is_deleted=False,
                created_at=now,
                updated_at=now
            )
            mock_msg = EngineeringMessageModel(
                id="eng-msg-1",
                conversation_id="eng-conv-1",
                organization_id="org-acme",
                user_id="usr-alice",
                sender="user",
                content="Show repository status",
                created_at=now
            )
            mock_conv.messages = [mock_msg]

            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_conv
            self.mock_session.execute.return_value = mock_result

            conv = await engineering_chat_repository.get_conversation(
                session=self.mock_session,
                conversation_id="eng-conv-1",
                user_id="usr-alice",
                organization_id="org-acme"
            )
            self.assertIsNotNone(conv)
            self.assertEqual(conv.id, "eng-conv-1")
            self.assertEqual(len(conv.messages), 1)

        asyncio.run(_run())

    def test_04_repo_soft_delete_conversation(self):
        """Repository: Soft delete executes update query setting is_deleted=True."""
        import asyncio

        async def _run():
            mock_result = MagicMock()
            mock_result.rowcount = 1
            self.mock_session.execute.return_value = mock_result

            deleted = await engineering_chat_repository.soft_delete_conversation(
                session=self.mock_session,
                conversation_id="eng-conv-1",
                user_id="usr-alice",
                organization_id="org-acme"
            )
            self.assertTrue(deleted)
            self.mock_session.commit.assert_called_once()

        asyncio.run(_run())

    def test_05_repo_create_message(self):
        """Repository: Create message checks conversation ownership before persisting."""
        import asyncio

        async def _run():
            now = datetime.now(timezone.utc)
            mock_conv = EngineeringConversationModel(
                id="eng-conv-1",
                organization_id="org-acme",
                user_id="usr-alice",
                title="Detail Analysis",
                is_deleted=False,
                created_at=now,
                updated_at=now
            )
            # 1. get_conversation check
            mock_result1 = MagicMock()
            mock_result1.scalar_one_or_none.return_value = mock_conv
            # 2. update query
            mock_result2 = MagicMock()
            self.mock_session.execute.side_effect = [mock_result1, mock_result2]

            msg = await engineering_chat_repository.create_message(
                session=self.mock_session,
                conversation_id="eng-conv-1",
                organization_id="org-acme",
                user_id="usr-alice",
                sender="assistant",
                content="Here is the telemetry analysis.",
                detected_intent="commit_info",
                selected_agent="Commit Specialist Agent",
                metrics=[{"label": "Commits", "value": 20}],
                execution_time_ms=85.2
            )
            self.assertIsNotNone(msg)
            self.assertEqual(msg.sender, "assistant")
            self.assertEqual(msg.detected_intent, "commit_info")
            self.mock_session.add.assert_called_once()
            self.mock_session.commit.assert_called_once()

        asyncio.run(_run())

    # =========================================================================
    # 2. REST API Endpoint HTTP Tests
    # =========================================================================

    def test_06_api_post_create_conversation(self):
        """API POST /conversations: Creates conversation and returns 201 Created."""
        headers = {"Authorization": f"Bearer {self.token_user_a}"}
        payload = {
            "title": "Backend Sprint Review",
            "project_id": "prj-1",
            "repository_id": "repo-be"
        }

        now = datetime.now(timezone.utc)
        mock_conv = EngineeringConversationModel(
            id="eng-conv-101",
            organization_id="org-acme",
            user_id="usr-alice",
            title="Backend Sprint Review",
            project_id="prj-1",
            repository_id="repo-be",
            is_deleted=False,
            created_at=now,
            updated_at=now
        )
        mock_conv.messages = []

        with patch.object(engineering_chat_repository, "create_conversation", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_conv
            res = self.client.post("/api/v1/engineering-agent/conversations", json=payload, headers=headers)

            self.assertEqual(res.status_code, 201)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["conversation"]["id"], "eng-conv-101")
            self.assertEqual(data["conversation"]["title"], "Backend Sprint Review")
            self.assertEqual(data["conversation"]["organization_id"], "org-acme")
            self.assertEqual(data["conversation"]["user_id"], "usr-alice")

    def test_07_api_get_list_conversations(self):
        """API GET /conversations: Lists user's conversations with ChatGPT-style recency order."""
        headers = {"Authorization": f"Bearer {self.token_user_a}"}
        now = datetime.now(timezone.utc)
        mock_conv1 = EngineeringConversationModel(
            id="eng-conv-1",
            organization_id="org-acme",
            user_id="usr-alice",
            title="Analysis 1",
            is_deleted=False,
            created_at=now,
            updated_at=now
        )
        mock_conv1.messages = []

        with patch.object(engineering_chat_repository, "list_conversations", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [mock_conv1]
            res = self.client.get("/api/v1/engineering-agent/conversations", headers=headers)

            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["count"], 1)
            self.assertEqual(data["conversations"][0]["id"], "eng-conv-1")

    def test_08_api_get_conversation_detail(self):
        """API GET /conversations/{id}: Fetches metadata and message history."""
        headers = {"Authorization": f"Bearer {self.token_user_a}"}
        now = datetime.now(timezone.utc)
        mock_conv = EngineeringConversationModel(
            id="eng-conv-detail",
            organization_id="org-acme",
            user_id="usr-alice",
            title="Deep Dive Session",
            is_deleted=False,
            created_at=now,
            updated_at=now
        )
        mock_msg = EngineeringMessageModel(
            id="eng-msg-1",
            conversation_id="eng-conv-detail",
            organization_id="org-acme",
            user_id="usr-alice",
            sender="user",
            content="Show commit churn",
            created_at=now
        )
        mock_conv.messages = [mock_msg]

        with patch.object(engineering_chat_repository, "get_conversation", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_conv
            res = self.client.get("/api/v1/engineering-agent/conversations/eng-conv-detail", headers=headers)

            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["conversation"]["id"], "eng-conv-detail")
            self.assertEqual(len(data["conversation"]["messages"]), 1)
            self.assertEqual(data["conversation"]["messages"][0]["content"], "Show commit churn")

    def test_09_api_patch_rename_conversation(self):
        """API PATCH /conversations/{id}: Renames conversation title."""
        headers = {"Authorization": f"Bearer {self.token_user_a}"}
        now = datetime.now(timezone.utc)
        mock_conv = EngineeringConversationModel(
            id="eng-conv-rename",
            organization_id="org-acme",
            user_id="usr-alice",
            title="Renamed Title",
            is_deleted=False,
            created_at=now,
            updated_at=now
        )
        mock_conv.messages = []

        with patch.object(engineering_chat_repository, "rename_conversation", new_callable=AsyncMock) as mock_rename:
            mock_rename.return_value = mock_conv
            res = self.client.patch(
                "/api/v1/engineering-agent/conversations/eng-conv-rename",
                json={"title": "Renamed Title"},
                headers=headers
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["conversation"]["title"], "Renamed Title")

    def test_10_api_delete_conversation(self):
        """API DELETE /conversations/{id}: Soft-deletes conversation."""
        headers = {"Authorization": f"Bearer {self.token_user_a}"}

        with patch.object(engineering_chat_repository, "soft_delete_conversation", new_callable=AsyncMock) as mock_del:
            mock_del.return_value = True
            res = self.client.delete("/api/v1/engineering-agent/conversations/eng-conv-del", headers=headers)

            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["conversation_id"], "eng-conv-del")

    def test_11_api_cross_tenant_access_returns_404(self):
        """API Security: Accessing another organization's conversation returns 404 (zero leakage)."""
        headers_foreign = {"Authorization": f"Bearer {self.token_user_c}"}

        with patch.object(engineering_chat_repository, "get_conversation", new_callable=AsyncMock) as mock_get, \
             patch.object(engineering_chat_repository, "rename_conversation", new_callable=AsyncMock) as mock_rename, \
             patch.object(engineering_chat_repository, "soft_delete_conversation", new_callable=AsyncMock) as mock_del:
            
            # Repository returns None when tenant does not match
            mock_get.return_value = None
            mock_rename.return_value = None
            mock_del.return_value = False

            # 1. GET
            res_get = self.client.get("/api/v1/engineering-agent/conversations/eng-conv-acme", headers=headers_foreign)
            self.assertEqual(res_get.status_code, 404)

            # 2. PATCH
            res_patch = self.client.patch(
                "/api/v1/engineering-agent/conversations/eng-conv-acme",
                json={"title": "Hacked"},
                headers=headers_foreign
            )
            self.assertEqual(res_patch.status_code, 404)

            # 3. DELETE
            res_del = self.client.delete("/api/v1/engineering-agent/conversations/eng-conv-acme", headers=headers_foreign)
            self.assertEqual(res_del.status_code, 404)

    def test_12_api_missing_tenant_token_rejected(self):
        """API Security: Token missing organization identifier is rejected with 403 Forbidden."""
        headers_no_org = {"Authorization": f"Bearer {self.token_no_org}"}
        res = self.client.get("/api/v1/engineering-agent/conversations", headers=headers_no_org)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Tenant context required", res.json()["error"]["message"])


if __name__ == "__main__":
    unittest.main()
