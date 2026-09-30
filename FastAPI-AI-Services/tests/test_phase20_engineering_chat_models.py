"""
Unit and Schema Mapping Tests for Phase 20: Engineering Agent Persistent Conversation Models.
Verifies SQLAlchemy ORM mappings, constraints, tenant fields, relationships, and serialization.
"""
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import create_engine, select, inspect
from sqlalchemy.orm import sessionmaker

from app.db.connection import Base
from app.models.engineering_chat import EngineeringConversationModel, EngineeringMessageModel
from app.models.chat import ConversationModel, MessageModel


class TestPhase20EngineeringChatModels(unittest.TestCase):
    """Test suite for Engineering AI Agent conversation and message SQLAlchemy models."""

    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for fast unit testing of schema definitions
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.session = self.Session()

    def tearDown(self):
        self.session.rollback()
        self.session.close()

    def test_01_engineering_conversation_table_mapping(self):
        """Verify EngineeringConversationModel maps to engineering_conversations with correct columns."""
        mapper = inspect(EngineeringConversationModel)
        self.assertEqual(mapper.mapped_table.name, "engineering_conversations")
        
        column_names = {c.key for c in mapper.columns}
        expected_columns = {
            "id",
            "user_id",
            "organization_id",
            "title",
            "project_id",
            "repository_id",
            "developer_id",
            "is_pinned",
            "is_deleted",
            "created_at",
            "updated_at",
        }
        self.assertTrue(expected_columns.issubset(column_names))

    def test_02_engineering_message_table_mapping(self):
        """Verify EngineeringMessageModel maps to engineering_messages with all telemetry columns."""
        mapper = inspect(EngineeringMessageModel)
        self.assertEqual(mapper.mapped_table.name, "engineering_messages")
        
        column_names = {c.key for c in mapper.columns}
        expected_columns = {
            "id",
            "conversation_id",
            "organization_id",
            "user_id",
            "sender",
            "content",
            "detected_intent",
            "selected_agent",
            "metrics_json",
            "artifacts_json",
            "actions_json",
            "tools_executed_json",
            "execution_time_ms",
            "created_at",
        }
        self.assertTrue(expected_columns.issubset(column_names))

    def test_03_tenant_isolation_fields(self):
        """Ensure both conversations and messages enforce organization_id and user_id."""
        conv = EngineeringConversationModel(
            id="eng-conv-001",
            organization_id="org-acme-corp",
            user_id="usr-alice",
            title="Repository Architecture Review"
        )
        self.session.add(conv)
        self.session.commit()

        msg = EngineeringMessageModel(
            id="eng-msg-001",
            conversation_id=conv.id,
            organization_id="org-acme-corp",
            user_id="usr-alice",
            sender="user",
            content="Show me repository activity for backend."
        )
        self.session.add(msg)
        self.session.commit()

        saved_conv = self.session.get(EngineeringConversationModel, "eng-conv-001")
        self.assertIsNotNone(saved_conv)
        self.assertEqual(saved_conv.organization_id, "org-acme-corp")
        self.assertEqual(saved_conv.user_id, "usr-alice")

        saved_msg = self.session.get(EngineeringMessageModel, "eng-msg-001")
        self.assertIsNotNone(saved_msg)
        self.assertEqual(saved_msg.organization_id, "org-acme-corp")
        self.assertEqual(saved_msg.user_id, "usr-alice")

    def test_04_conversation_message_relationship_and_cascade(self):
        """Verify relationship linking and cascade delete from conversation to messages."""
        conv = EngineeringConversationModel(
            id="eng-conv-cascade",
            organization_id="org-test-1",
            user_id="usr-1",
            title="Cascade Test"
        )
        msg1 = EngineeringMessageModel(
            id="eng-msg-c1",
            conversation_id=conv.id,
            organization_id="org-test-1",
            user_id="usr-1",
            sender="user",
            content="User prompt 1"
        )
        msg2 = EngineeringMessageModel(
            id="eng-msg-c2",
            conversation_id=conv.id,
            organization_id="org-test-1",
            user_id="usr-1",
            sender="assistant",
            content="Assistant response 1"
        )
        conv.messages.extend([msg1, msg2])
        self.session.add(conv)
        self.session.commit()

        retrieved_conv = self.session.get(EngineeringConversationModel, "eng-conv-cascade")
        self.assertEqual(len(retrieved_conv.messages), 2)
        self.assertEqual(retrieved_conv.messages[0].sender, "user")
        self.assertEqual(retrieved_conv.messages[1].sender, "assistant")

        # Delete conversation and ensure messages are deleted via cascade
        self.session.delete(retrieved_conv)
        self.session.commit()

        self.assertIsNone(self.session.get(EngineeringConversationModel, "eng-conv-cascade"))
        self.assertIsNone(self.session.get(EngineeringMessageModel, "eng-msg-c1"))
        self.assertIsNone(self.session.get(EngineeringMessageModel, "eng-msg-c2"))

    def test_05_jsonb_telemetry_serialization(self):
        """Verify complex multi-agent telemetry JSON serialization and dictionary conversion."""
        conv = EngineeringConversationModel(
            id="eng-conv-json",
            organization_id="org-json",
            user_id="usr-json",
            title="Telemetry JSON Test"
        )
        self.session.add(conv)
        self.session.commit()

        metrics_payload = [
            {"label": "Total Commits", "value": 142, "color": "emerald"},
            {"label": "Active PRs", "value": 5, "color": "amber"}
        ]
        artifacts_payload = [
            {"id": "art-1", "title": "Commit Summary Report", "type": "markdown", "content": "# Report Content"}
        ]
        actions_payload = [
            {"label": "View Dashboard", "href": "/dashboard", "type": "link"}
        ]
        tools_payload = [
            {"tool_name": "list_repositories", "status": "success", "duration_ms": 45.2},
            {"tool_name": "get_repository_commits", "status": "success", "duration_ms": 112.8}
        ]

        msg = EngineeringMessageModel(
            id="eng-msg-json",
            conversation_id=conv.id,
            organization_id="org-json",
            user_id="usr-json",
            sender="assistant",
            content="Here is your analysis report.",
            detected_intent="commit_info",
            selected_agent="Repository Specialist Agent",
            metrics_json=metrics_payload,
            artifacts_json=artifacts_payload,
            actions_json=actions_payload,
            tools_executed_json=tools_payload,
            execution_time_ms=Decimal("158.00")
        )
        self.session.add(msg)
        self.session.commit()

        saved_msg = self.session.get(EngineeringMessageModel, "eng-msg-json")
        msg_dict = saved_msg.to_dict()

        self.assertEqual(msg_dict["detected_intent"], "commit_info")
        self.assertEqual(msg_dict["selected_agent"], "Repository Specialist Agent")
        self.assertEqual(len(msg_dict["metrics"]), 2)
        self.assertEqual(len(msg_dict["artifacts"]), 1)
        self.assertEqual(len(msg_dict["actions"]), 1)
        self.assertEqual(len(msg_dict["tools_executed"]), 2)
        self.assertEqual(msg_dict["execution_time_ms"], 158.0)

    def test_06_soft_deletion_and_pinned_flags(self):
        """Verify soft deletion and pinning flags default to False and can be updated."""
        conv = EngineeringConversationModel(
            id="eng-conv-flags",
            organization_id="org-flags",
            user_id="usr-flags",
            title="Flag Test"
        )
        self.session.add(conv)
        self.session.commit()

        self.assertFalse(conv.is_deleted)
        self.assertFalse(conv.is_pinned)

        # Mark soft deleted
        conv.is_deleted = True
        conv.is_pinned = True
        self.session.commit()

        refreshed = self.session.get(EngineeringConversationModel, "eng-conv-flags")
        self.assertTrue(refreshed.is_deleted)
        self.assertTrue(refreshed.is_pinned)

    def test_07_chatbot_isolation(self):
        """Confirm chatbot models and engineering chat models remain completely distinct."""
        self.assertNotEqual(ConversationModel.__tablename__, EngineeringConversationModel.__tablename__)
        self.assertNotEqual(MessageModel.__tablename__, EngineeringMessageModel.__tablename__)
        self.assertEqual(ConversationModel.__tablename__, "chatbot_conversations")
        self.assertEqual(EngineeringConversationModel.__tablename__, "engineering_conversations")


if __name__ == "__main__":
    unittest.main()
