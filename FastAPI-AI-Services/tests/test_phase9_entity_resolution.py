"""
Test Suite for Phase 9: Engineering Agent Entity Resolution.
Validates typo tolerance, slugification, casing invariance, partial matching,
and collision ambiguity disambiguation across repositories, developers, projects, and branches.
"""
import unittest
import asyncio
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch

from app.engineering_agent.entity_resolution import (
    EntityType,
    CandidateMatch,
    EntityResolutionResult,
    normalize_slug,
    levenshtein_distance,
    levenshtein_similarity,
    token_set_similarity,
    calculate_match_score,
    entity_resolver,
    tenant_entity_cache
)
from app.engineering_agent.orchestration import compiled_engineering_graph, GraphState


class TestPhase9EntityResolution(unittest.TestCase):
    """Unit and integration test cases for Phase 9 Entity Resolution."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        tenant_entity_cache.clear()

        # Standard fixture data for tenant
        self.repositories = [
            {"id": "repo-101", "name": "nexora-ai", "full_name": "acme/nexora-ai", "alias": "Nexora AI"},
            {"id": "repo-102", "name": "hospital-management-frontend", "full_name": "acme/hospital-management-frontend"},
            {"id": "repo-103", "name": "backend-api", "full_name": "acme/backend-api"},
            {"id": "repo-104", "name": "backend-service", "full_name": "acme/backend-service"},
            {"id": "repo-105", "name": "auth-backend", "full_name": "acme/auth-backend"},
        ]

        self.projects = [
            {"id": "prj-1", "name": "Nexora Monitoring Platform", "slug": "nexora-platform", "alias": "Nexora"},
            {"id": "prj-2", "name": "Hospital Core EHR", "slug": "hospital-ehr"},
        ]

        self.developers = [
            {"id": "dev-1", "login": "MasfiqurNehal", "name": "Masfiqur Nehal", "email": "nehal@acme.com"},
            {"id": "dev-2", "login": "alexander-smith", "name": "Alex Smith", "email": "alex@acme.com"},
            {"id": "dev-3", "login": "sarah_connor", "name": "Sarah Connor", "email": "sarah@acme.com"},
        ]

    def tearDown(self):
        self.loop.close()

    # =========================================================================
    # 1. String Algorithms & Slug Normalization
    # =========================================================================
    def test_normalize_slug(self):
        """Test normalization of noisy natural language tokens."""
        self.assertEqual(normalize_slug("Nexora AI"), "nexora-ai")
        self.assertEqual(normalize_slug("nexora ai repo"), "nexora-ai")
        self.assertEqual(normalize_slug("Developer Masfiqur"), "masfiqur")
        self.assertEqual(normalize_slug("project hospital-ehr"), "hospital-ehr")

    def test_levenshtein_and_token_similarity(self):
        """Test fuzzy edit distance and token set similarity."""
        dist = levenshtein_distance("nexora", "nexxora")
        self.assertEqual(dist, 1)

        sim = levenshtein_similarity("nexora", "nexxora")
        self.assertGreater(sim, 0.85)

        token_sim = token_set_similarity("Nexora AI Platform", "Platform Nexora AI")
        self.assertEqual(token_sim, 1.0)

    # =========================================================================
    # 2. Repository Name Resolution
    # =========================================================================
    def test_repository_resolution_variations(self):
        """
        'Nexora AI', 'nexora-ai', 'nexora', 'nexora ai repo' must resolve to repo-101.
        """
        variations = ["Nexora AI", "nexora-ai", "nexora", "nexora ai repo", "NEXORA"]

        for var in variations:
            res = entity_resolver.resolve_repository(var, self.repositories)
            self.assertFalse(res.clarification_needed, f"Failed on variation: {var}")
            self.assertIsNotNone(res.resolved_entity, f"Should resolve on variation: {var}")
            self.assertEqual(res.resolved_entity.entity_id, "repo-101")
            self.assertEqual(res.resolved_entity.entity_name, "nexora-ai")

    def test_repository_typo_resilience(self):
        """Typo variations like 'nexxora' or 'hospital-managment' should resolve."""
        res_typo1 = entity_resolver.resolve_repository("nexxora", self.repositories)
        self.assertIsNotNone(res_typo1.resolved_entity)
        self.assertEqual(res_typo1.resolved_entity.entity_id, "repo-101")

        res_typo2 = entity_resolver.resolve_repository("hospital-managment", self.repositories)
        self.assertIsNotNone(res_typo2.resolved_entity)
        self.assertEqual(res_typo2.resolved_entity.entity_id, "repo-102")

    # =========================================================================
    # 3. Developer Resolution & Partial Prefixes
    # =========================================================================
    def test_developer_resolution_variations(self):
        """
        'masfiq', 'Masfiqur', 'MasfiqurNehal' must resolve to dev-1.
        """
        dev_queries = ["masfiq", "Masfiqur", "MasfiqurNehal", "masfiqur nehal", "nehal"]

        for q in dev_queries:
            res = entity_resolver.resolve_developer(q, self.developers)
            self.assertIsNotNone(res.resolved_entity, f"Developer '{q}' failed to resolve")
            self.assertEqual(res.resolved_entity.entity_name, "MasfiqurNehal")

    # =========================================================================
    # 4. Project Resolution
    # =========================================================================
    def test_project_resolution(self):
        """Project names and aliases resolve accurately."""
        res1 = entity_resolver.resolve_project("Nexora", self.projects)
        self.assertIsNotNone(res1.resolved_entity)
        self.assertEqual(res1.resolved_entity.entity_id, "prj-1")

        res2 = entity_resolver.resolve_project("Hospital EHR", self.projects)
        self.assertIsNotNone(res2.resolved_entity)
        self.assertEqual(res2.resolved_entity.entity_id, "prj-2")

    # =========================================================================
    # 5. Branch Resolution
    # =========================================================================
    def test_branch_resolution(self):
        """Branch names resolve properly."""
        branches = ["main", "master", "develop", "feat/agent-langgraph"]
        res = entity_resolver.resolve_branch("main", branches)
        self.assertIsNotNone(res.resolved_entity)
        self.assertEqual(res.resolved_entity.entity_name, "main")

    # =========================================================================
    # 6. Ambiguity Collision & Clarification Prompting
    # =========================================================================
    def test_ambiguous_repository_disambiguation(self):
        """
        Query 'backend' matches 'backend-api', 'backend-service', 'auth-backend'.
        Must NOT silently choose; must request clarification with display names, omitting internal IDs.
        """
        res = entity_resolver.resolve_repository("backend", self.repositories)
        self.assertTrue(res.is_ambiguous, "Expected ambiguity for generic term 'backend'")
        self.assertTrue(res.clarification_needed)
        self.assertIsNone(res.resolved_entity, "Must not silently choose between ambiguous candidates")
        self.assertIn("Which one do you mean?", res.clarification_message)
        self.assertGreaterEqual(len(res.suggested_options), 2)
        
        # Verify no internal database UUIDs in suggested options
        for opt in res.suggested_options:
            self.assertNotIn("repo-", opt)

    # =========================================================================
    # 7. StateGraph Integration: Ambiguity Routing to Clarification
    # =========================================================================
    def test_stategraph_routes_to_clarification_on_ambiguity(self):
        """
        Ambiguous entity match inside StateGraph execution routes to clarification node.
        """
        async def _run():
            with patch("app.engineering_agent.entity_resolution.tenant_loader.tenant_entity_loader.get_tenant_repositories", new_callable=AsyncMock) as mock_get_repos:
                mock_get_repos.return_value = self.repositories

                initial_state: GraphState = {
                    "user_request": "Show commits in the backend repo",
                    "tenant_id": "org-test-entity",
                    "user_id": "usr-test-1",
                    "auth_token": "mock-token",
                    "conversation_id": "conv-ent-1",
                    "message_id": "msg-ent-1"
                }

                final_state = await compiled_engineering_graph.ainvoke(initial_state)

                self.assertTrue(final_state.get("requires_clarification"))
                self.assertEqual(final_state.get("selected_agent"), "Clarification_Router")
                self.assertIn("Which one do you mean?", final_state.get("clarification_prompt", ""))
                self.assertGreaterEqual(len(final_state.get("suggested_options", [])), 2)

        self.loop.run_until_complete(_run())


if __name__ == "__main__":
    unittest.main()
