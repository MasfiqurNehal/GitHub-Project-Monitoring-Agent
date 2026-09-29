"""
Test Suite for Phase 10: Engineering Agent Response Generation.
Validates factual grounding, anti-hallucination guarantees, empty data handling,
chain-of-thought suppression, and structured FactCheckedResponse delivery.
"""
import unittest
import asyncio
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch

from app.engineering_agent.response_generation import (
    DataAvailabilityStatus,
    MetricItem,
    FactCheckedResponse,
    response_generator
)
from app.engineering_agent.orchestration import compiled_engineering_graph, GraphState
from app.engineering_agent.llm import LLMError, LLMCompletionResponse





class TestPhase10ResponseGeneration(unittest.TestCase):
    """Unit and integration test cases for Phase 10 Response Generation."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    # =========================================================================
    # 1. Chain-of-Thought (CoT) Suppression
    # =========================================================================
    def test_clean_chain_of_thought(self):
        """Verify that <think> tags, scratchpads, and reasoning blocks are removed."""
        raw_text_with_think = (
            "<think>\n"
            "The user is asking about commit counts for Nehal.\n"
            "I should query the telemetry and extract 42 commits.\n"
            "</think>\n\n"
            "### 📊 Developer Summary: Masfiqur Nehal\n\n"
            "Nehal authored **42 commits** over the past 30 days."
        )

        cleaned = response_generator.clean_chain_of_thought(raw_text_with_think)
        self.assertNotIn("<think>", cleaned)
        self.assertNotIn("</think>", cleaned)
        self.assertNotIn("The user is asking about", cleaned)
        self.assertIn("Nehal authored **42 commits**", cleaned)

    # =========================================================================
    # 2. Empty Data Handling (Zero Data Fabrication)
    # =========================================================================
    def test_empty_telemetry_handling(self):
        """When telemetry is empty, explicitly state no records found without fabricating mock data."""
        async def _run():
            state: GraphState = {
                "user_request": "Show commits by developer bob in repo-analytics",
                "tenant_id": "org-test-empty",
                "user_id": "usr-test-1",
                "selected_agent": "CommitSpecialistAgent",
                "telemetry_data": {"commits": [], "total_commits": 0, "authors": []},
                "tools_executed": [{"tool_name": "get_repository_commits"}]
            }

            resp = await response_generator.generate_response(state)

            self.assertEqual(resp.data_availability, DataAvailabilityStatus.EMPTY)
            self.assertIn("No Records Found", resp.markdown_content)
            self.assertIn("No engineering activity", resp.summary)
            # Ensure no fake metrics are invented
            self.assertEqual(len(resp.key_metrics), 0)

        self.loop.run_until_complete(_run())

    # =========================================================================
    # 3. Grounded Telemetry Synthesis with Key Metrics
    # =========================================================================
    def test_grounded_telemetry_synthesis(self):
        """Verify that factual metrics and entities are extracted accurately into FactCheckedResponse."""
        async def _run():
            state: GraphState = {
                "user_request": "How many commits did Nehal make last month?",
                "tenant_id": "org-acme-prod",
                "user_id": "usr-test-1",
                "selected_agent": "DeveloperSpecialistAgent",
                "telemetry_data": {
                    "developer": "MasfiqurNehal",
                    "total_commits": 57,
                    "additions": 3420,
                    "deletions": 810,
                    "repositories": ["nexora-ai", "hospital-management-frontend"]
                },
                "metrics": [
                    {"name": "Total Commits", "value": 57, "unit": "commits"},
                    {"name": "Lines Added", "value": 3420, "unit": "lines"},
                    {"name": "Lines Deleted", "value": 810, "unit": "lines"}
                ],
                "freshness_metadata": {
                    "tier": "historical",
                    "source_type": "neon_synced_db",
                    "source_label": "Neon Synced DB (Historical Store)",
                    "as_of": "2026-09-29 16:00:00 UTC",
                    "is_live_requested": False,
                    "is_stale": False
                }
            }

            resp = await response_generator.generate_response(state)

            self.assertEqual(resp.data_availability, DataAvailabilityStatus.AVAILABLE)
            self.assertGreaterEqual(len(resp.key_metrics), 3)
            metric_names = [m.name for m in resp.key_metrics]
            self.assertIn("Total Commits", metric_names)
            
            # Assert freshness provenance footnote appended
            self.assertIn("Neon Synced DB (Historical Store)", resp.markdown_content)

        self.loop.run_until_complete(_run())

    # =========================================================================
    # 4. Anti-Hallucination Guard on LLM Error / Offline Fallback
    # =========================================================================
    def test_llm_provider_offline_fallback_is_grounded(self):
        """When LLM provider fails, deterministic grounded fallback output is generated without hallucinating."""
        async def _run():
            with patch("app.engineering_agent.llm.agent_llm_factory.get_provider") as mock_provider_factory:
                mock_provider = AsyncMock()
                mock_provider.complete.side_effect = LLMError("Provider connection timeout", status_code=504)
                mock_provider_factory.return_value = mock_provider


                state: GraphState = {
                    "user_request": "Show pull request summary",
                    "tenant_id": "org-offline-test",
                    "user_id": "usr-test-1",
                    "selected_agent": "PullRequestSpecialistAgent",
                    "telemetry_data": {
                        "open_prs": 4,
                        "closed_prs": 12,
                        "merged_prs": 25
                    }
                }

                resp = await response_generator.generate_response(state)

                self.assertIsNotNone(resp)
                self.assertIn("Engineering Analysis (PullRequestSpecialistAgent)", resp.markdown_content)
                self.assertIn("Telemetry gathered successfully", resp.markdown_content)

        self.loop.run_until_complete(_run())

    # =========================================================================
    # 5. StateGraph End-to-End Integration with ResponseGenerator
    # =========================================================================
    def test_stategraph_end_to_end_with_response_generator(self):
        """Test StateGraph executes generate_response_node through response_generator."""
        async def _run():
            initial_state: GraphState = {
                "user_request": "How many commits did Masfiqur make today?",
                "tenant_id": "org-e2e-test",
                "user_id": "usr-test-1",
                "auth_token": "mock-token",
                "conversation_id": "conv-resp-1",
                "message_id": "msg-resp-1"
            }

            final_state = await compiled_engineering_graph.ainvoke(initial_state)

            self.assertIn("final_response", final_state)
            response_text = final_state["final_response"] or ""
            self.assertTrue(len(response_text) > 0)
            self.assertNotIn("<think>", response_text)
            self.assertIn("Data Source:", response_text)

        self.loop.run_until_complete(_run())


if __name__ == "__main__":
    unittest.main()
