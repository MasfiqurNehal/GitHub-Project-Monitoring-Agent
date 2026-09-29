"""
Phase 3 Engineering Agent Intent Router Test Suite.
Verifies intent classification across 11 categories, typo resilience, entity extraction, and clarification mechanisms.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import asyncio
import time
import jwt
from fastapi.testclient import TestClient

from app.main import create_application
from app.config import settings
from app.engineering_agent.router import (
    IntentCategory,
    deterministic_intent_matcher,
    engineering_intent_router
)

class TestPhase3IntentRouter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_application()
        cls.client = TestClient(cls.app)

    def create_mock_jwt(self, user_id="usr-p3-test", org_id="org-p3-test"):
        payload = {
            "id": user_id,
            "email": "engineer@tenant.com",
            "role": "admin",
            "organizationId": org_id,
            "exp": int(time.time()) + 3600
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    # -------------------------------------------------------------------------
    # 1. Test Deterministic Matcher & Typos
    # -------------------------------------------------------------------------
    def test_developer_intent_with_name_and_timeframe(self):
        """Test 'how many commit masfiqur did last week' -> developer_info + entities."""
        prompt = "how many commit masfiqur did last week"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.DEVELOPER_INFO)
        self.assertGreaterEqual(confidence, 0.85)
        self.assertEqual(entities.developer_name.lower(), "masfiqur")
        self.assertEqual(entities.timeframe, "last_week")

    def test_commit_intent_with_repo_extraction(self):
        """Test 'show me nexora commits' -> commit_info + repo entity."""
        prompt = "show me nexora commits"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.COMMIT_INFO)
        self.assertGreaterEqual(confidence, 0.85)
        self.assertEqual(entities.repository_name.lower(), "nexora")

    def test_cross_repository_analytics(self):
        """Test comparison queries resolve to cross_repository_analytics."""
        prompt = "compare hospital-frontend with hospital-backend repos"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.CROSS_REPOSITORY_ANALYTICS)
        self.assertGreaterEqual(confidence, 0.85)

    def test_code_impact_and_churn(self):
        """Test code additions, deletions and churn queries."""
        prompt = "what is the code impact and lines added this month"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.CODE_IMPACT)
        self.assertGreaterEqual(confidence, 0.85)
        self.assertEqual(entities.timeframe, "30d")

    def test_pull_request_intent(self):
        """Test PR turnaround and open pull requests."""
        prompt = "check our pull requests review velocity"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.PULL_REQUEST_INFO)
        self.assertGreaterEqual(confidence, 0.85)

    def test_issue_tracking_intent(self):
        """Test open issues and bug ticket resolution."""
        prompt = "how many open issues and bugs are unresolved"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.ISSUE_INFO)
        self.assertGreaterEqual(confidence, 0.85)

    def test_project_health_intent(self):
        """Test project overview and status."""
        prompt = "show me overall project status and milestones"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.PROJECT_INFO)
        self.assertGreaterEqual(confidence, 0.80)

    def test_dashboard_analytics_intent(self):
        """Test executive summary and dashboard KPIs."""
        prompt = "give me an executive summary of dashboard KPIs"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.DASHBOARD_ANALYTICS)
        self.assertGreaterEqual(confidence, 0.80)

    def test_repository_info_intent(self):
        """Test repository metadata, stars, and language stack."""
        prompt = "what is the language breakdown and stars of our repository"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.REPOSITORY_INFO)
        self.assertGreaterEqual(confidence, 0.80)

    def test_general_engineering_qa(self):
        """Test general IT / software engineering questions."""
        prompt = "what is the difference between git merge and git rebase"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.GENERAL_ENGINEERING_QA)
        self.assertGreaterEqual(confidence, 0.80)

    def test_unsupported_non_it_rejection(self):
        """Test non-IT questions are caught by guardrails."""
        prompt = "how to cook Italian pizza at home"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.UNSUPPORTED_NON_IT)
        self.assertGreaterEqual(confidence, 0.90)

    def test_typo_resilience(self):
        """Test that common developer typos resolve correctly."""
        prompt = "comits by devloper alex in repositry"
        intent, confidence, entities = deterministic_intent_matcher.match(prompt)

        self.assertEqual(intent, IntentCategory.DEVELOPER_INFO)
        self.assertEqual(entities.developer_name.lower(), "alex")

    # -------------------------------------------------------------------------
    # 2. Test Master Intent Router Async Execution
    # -------------------------------------------------------------------------
    def test_router_async_execution(self):
        """Test engineering_intent_router.route returns complete classification."""
        res = asyncio.run(
            engineering_intent_router.route("show me recent commits in nexora")
        )
        self.assertEqual(res.intent, IntentCategory.COMMIT_INFO)
        self.assertFalse(res.requires_clarification)
        self.assertGreater(len(res.suggested_options), 0)

    # -------------------------------------------------------------------------
    # 3. Test API Endpoint Integration with Intent Router
    # -------------------------------------------------------------------------
    def test_endpoint_unsupported_non_it_guardrail(self):
        """Test endpoint gracefully guides users when asking non-IT questions."""
        token = self.create_mock_jwt()
        res = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "how to cook pasta"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["detected_intent"], "unsupported_non_it")
        self.assertIn("GitMonitor Engineering Intelligence Agent", data["response"])

    def test_endpoint_developer_query_resolution(self):
        """Test endpoint resolves developer velocity queries seamlessly."""
        token = self.create_mock_jwt()
        res = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "how many commit masfiqur did last week"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["detected_intent"], "developer_info")
        self.assertIn("response", data)

if __name__ == "__main__":
    unittest.main()
