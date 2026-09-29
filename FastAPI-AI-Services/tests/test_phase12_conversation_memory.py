"""
Unit and Integration Tests for Phase 12: Engineering Agent Conversation Memory.
Validates multi-turn context retention, temporal/pronoun follow-up resolution,
strict tenant and user isolation, TTL eviction, and secret scrubbing.
"""
import asyncio
import unittest
import time
from unittest.mock import patch, MagicMock

from app.engineering_agent.memory import (
    ConversationTurn,
    ConversationSession,
    ConversationMemoryStore,
    SecretScrubber,
    MemoryContextResolver,
    conversation_memory_store,
    secret_scrubber,
    memory_context_resolver
)
from app.engineering_agent.router.schemas import ExtractedEntities, IntentCategory
from app.engineering_agent.router import engineering_intent_router
from app.engineering_agent.core.service import engineering_agent_service
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.utils.auth import AuthenticatedUser


class TestPhase12ConversationMemory(unittest.IsolatedAsyncioTestCase):
    """Test suite for Phase 12 Engineering Agent Conversation Memory."""

    async def asyncSetUp(self):
        # Clean store before each test
        self.store = ConversationMemoryStore(max_turns_per_conversation=5, ttl_seconds=3600)

    # =========================================================================
    # 1. Secret & Credential Scrubbing
    # =========================================================================
    def test_secret_scrubber_redacts_tokens_and_keys(self):
        """Zero secrets policy: Ensure GitHub PATs, private keys, and JWTs are redacted."""
        scrubber = SecretScrubber()

        # GitHub PAT
        raw_msg = "Please check repo using ghp_1234567890abcdefghijklmnopqrstuvwx"
        scrubbed = scrubber.scrub(raw_msg)
        self.assertNotIn("ghp_1234567890", scrubbed)
        self.assertIn("[REDACTED_GITHUB_PAT]", scrubbed)

        # Fine-grained PAT
        fine_pat = "github_pat_11AABCDEF0123456789_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567"
        scrubbed_fine = scrubber.scrub(f"Token is {fine_pat}")
        self.assertNotIn(fine_pat, scrubbed_fine)
        self.assertIn("[REDACTED_GITHUB_FINE_GRAINED_PAT]", scrubbed_fine)

        # PEM Private Key
        pem_key = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0m\n-----END RSA PRIVATE KEY-----"
        scrubbed_pem = scrubber.scrub(f"Key data:\n{pem_key}")
        self.assertNotIn("MIIEowIBAAKCAQEA0m", scrubbed_pem)
        self.assertIn("[REDACTED_PRIVATE_KEY]", scrubbed_pem)

        # JWT Bearer Token
        jwt_text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotStoreThisSignature"
        scrubbed_jwt = scrubber.scrub(jwt_text)
        self.assertNotIn("doNotStoreThisSignature", scrubbed_jwt)
        self.assertIn("[REDACTED_JWT]", scrubbed_jwt)

    # =========================================================================
    # 2. Memory Store Lifecycle & Windowing
    # =========================================================================
    async def test_memory_store_turn_lifecycle_and_windowing(self):
        """Test adding turns, retrieval, and max-turns windowing."""
        tenant_id = "org-acme"
        user_id = "usr-alice"
        conv_id = "conv-101"

        # Add 6 turns (max_turns is 5)
        for i in range(1, 7):
            turn = ConversationTurn(
                user_message=f"Query {i}",
                agent_response=f"Answer {i}",
                detected_intent="commit_info",
                resolved_repository_name=f"repo-{i}"
            )
            await self.store.add_turn(tenant_id, user_id, conv_id, turn)

        session = await self.store.get_session(tenant_id, user_id, conv_id)
        self.assertIsNotNone(session)
        # Should be truncated to max 5 turns
        self.assertEqual(len(session.turns), 5)
        # Oldest turn should be Query 2, newest should be Query 6
        self.assertEqual(session.turns[0].user_message, "Query 2")
        self.assertEqual(session.turns[-1].user_message, "Query 6")
        self.assertEqual(session.last_repository_name, "repo-6")

    # =========================================================================
    # 3. TTL Expiration & Cleanup
    # =========================================================================
    async def test_memory_store_ttl_expiration(self):
        """Test session expiration when TTL has elapsed."""
        short_store = ConversationMemoryStore(max_turns_per_conversation=5, ttl_seconds=1)
        tenant_id = "org-acme"
        user_id = "usr-alice"
        conv_id = "conv-ttl-test"

        turn = ConversationTurn(
            user_message="Show commits",
            agent_response="Found 10 commits",
            detected_intent="commit_info"
        )
        await short_store.add_turn(tenant_id, user_id, conv_id, turn)

        # Immediately available
        sess = await short_store.get_session(tenant_id, user_id, conv_id)
        self.assertIsNotNone(sess)

        # Wait for TTL to expire
        await asyncio.sleep(1.1)

        # Evicted on next access
        expired_sess = await short_store.get_session(tenant_id, user_id, conv_id)
        self.assertIsNone(expired_sess)

    # =========================================================================
    # 4. Multi-Tenant & User Isolation
    # =========================================================================
    async def test_strict_multi_tenant_and_user_isolation(self):
        """Ensure cross-tenant and cross-user memory leakage is completely prevented."""
        conv_id = "shared-conv-id-123"

        # Tenant A adds memory
        turn_a = ConversationTurn(
            user_message="Show Nexora commits",
            agent_response="Nexora has 20 commits",
            detected_intent="commit_info",
            resolved_repository_name="nexora-repo"
        )
        await self.store.add_turn("org-tenant-a", "usr-1", conv_id, turn_a)

        # Tenant B requests memory with same conversation ID
        session_b = await self.store.get_session("org-tenant-b", "usr-1", conv_id)
        self.assertIsNone(session_b, "Tenant B must NOT access Tenant A conversation memory")

        # User 2 in Tenant A requests memory with same conversation ID
        session_u2 = await self.store.get_session("org-tenant-a", "usr-2", conv_id)
        self.assertIsNone(session_u2, "User 2 must NOT access User 1 conversation memory")

    # =========================================================================
    # 5. Follow-Up Resolution: "What about last week?"
    # =========================================================================
    async def test_temporal_follow_up_resolution_nexora_commits(self):
        """
        User: 'Show Nexora AI commits.'
        Agent: '...'
        User: 'What about last week?'
        The agent must understand 'what about last week' refers to Nexora AI commits.
        """
        tenant_id = "org-test"
        user_id = "usr-test"
        conv_id = "conv-follow-up-1"

        # Turn 1: Initial query
        turn_1 = ConversationTurn(
            user_message="Show Nexora AI commits",
            agent_response="Nexora AI has 45 commits this month.",
            detected_intent="commit_info",
            resolved_repository_name="Nexora AI"
        )
        await conversation_memory_store.add_turn(tenant_id, user_id, conv_id, turn_1)

        session = await conversation_memory_store.get_session(tenant_id, user_id, conv_id)
        self.assertIsNotNone(session)
        self.assertEqual(session.last_repository_name, "Nexora AI")
        self.assertEqual(session.last_intent, "commit_info")

        # Turn 2: Follow-up query
        turn_2_query = "What about last week?"
        routing_result = await engineering_intent_router.route(
            prompt=turn_2_query,
            session=session
        )

        self.assertEqual(routing_result.intent, IntentCategory.COMMIT_INFO)
        self.assertEqual(routing_result.entities.repository_name, "Nexora AI")
        self.assertEqual(routing_result.entities.timeframe, "last_week")
        self.assertFalse(routing_result.requires_clarification)

    # =========================================================================
    # 6. Pronoun Resolution: "How many PRs does it have?"
    # =========================================================================
    async def test_pronoun_antecedent_resolution_repository(self):
        """
        User: 'Inspect backend-service repository.'
        Agent: '...'
        User: 'How many PRs does it have?'
        The agent must resolve 'it' -> 'backend-service' and intent -> PULL_REQUEST_INFO.
        """
        tenant_id = "org-test"
        user_id = "usr-test"
        conv_id = "conv-pronoun-1"

        turn_1 = ConversationTurn(
            user_message="Inspect backend-service repository",
            agent_response="backend-service is an active TypeScript repository.",
            detected_intent="repository_info",
            resolved_repository_name="backend-service"
        )
        await conversation_memory_store.add_turn(tenant_id, user_id, conv_id, turn_1)

        session = await conversation_memory_store.get_session(tenant_id, user_id, conv_id)

        # Turn 2: Pronoun query
        turn_2_query = "How many PRs does it have?"
        routing_result = await engineering_intent_router.route(
            prompt=turn_2_query,
            session=session
        )

        self.assertEqual(routing_result.intent, IntentCategory.PULL_REQUEST_INFO)
        self.assertEqual(routing_result.entities.repository_name, "backend-service")

    # =========================================================================
    # 7. Developer Pronoun Resolution: "Who reviewed his code?"
    # =========================================================================
    async def test_pronoun_antecedent_resolution_developer(self):
        """
        User: 'Show commits by Masfiqur.'
        Agent: '...'
        User: 'How many PR reviews did he do?'
        The agent must resolve 'he' -> 'Masfiqur'.
        """
        tenant_id = "org-test"
        user_id = "usr-test"
        conv_id = "conv-dev-pronoun-1"

        turn_1 = ConversationTurn(
            user_message="Show commits by Masfiqur",
            agent_response="Masfiqur has 12 commits.",
            detected_intent="developer_info",
            resolved_developer_name="Masfiqur"
        )
        await conversation_memory_store.add_turn(tenant_id, user_id, conv_id, turn_1)

        session = await conversation_memory_store.get_session(tenant_id, user_id, conv_id)

        # Turn 2: Pronoun query
        turn_2_query = "How many PR reviews did he do?"
        routing_result = await engineering_intent_router.route(
            prompt=turn_2_query,
            session=session
        )

        self.assertEqual(routing_result.intent, IntentCategory.DEVELOPER_INFO)
        self.assertEqual(routing_result.entities.developer_name, "Masfiqur")

    # =========================================================================
    # 8. End-to-End Multi-Turn Service Execution
    # =========================================================================
    async def test_end_to_end_multi_turn_service_execution(self):
        """
        Tests the full engineering_agent_service pipeline across two sequential turns.
        """
        user = AuthenticatedUser(
            id="usr-e2e-memory",
            email="alice@nexora.io",
            name="Alice",
            organization_id="org-e2e-memory",
            role="admin"
        )
        conv_id = "conv-e2e-turns"

        # Turn 1
        req1 = EngineeringAgentRequest(
            message="Show Nexora commits",
            conversation_id=conv_id
        )
        resp1 = await engineering_agent_service.execute_agent(req1, user=user)
        self.assertTrue(resp1.success)
        self.assertEqual(resp1.conversation_id, conv_id)

        # Verify turn 1 was persisted in memory
        saved_session = await conversation_memory_store.get_session(
            tenant_id="org-e2e-memory",
            user_id="usr-e2e-memory",
            conversation_id=conv_id
        )
        self.assertIsNotNone(saved_session)
        self.assertGreaterEqual(len(saved_session.turns), 1)

        # Turn 2: Follow-up query referring to previous context
        req2 = EngineeringAgentRequest(
            message="What about last week?",
            conversation_id=conv_id
        )
        resp2 = await engineering_agent_service.execute_agent(req2, user=user)
        self.assertTrue(resp2.success)
        self.assertEqual(resp2.conversation_id, conv_id)
        self.assertEqual(resp2.detected_intent, "commit_info")


if __name__ == "__main__":
    unittest.main()
