"""
Phase 16: Production Reliability Test Suite.

Validates:
1. Latency & Telemetry Measurement (Agent, LLM, Tool, Express, GitHub, Neon, Graph)
2. Circuit Breaker State Machine & Fault Isolation
3. Exponential Backoff Retry Strategy
4. Tool Call Deduplication & Tenant-Isolated Caching
5. Tenant-Scoped Rate Limiting & 429 Rejection
6. Loop Guardrails & Maximum Graph Steps
"""
import time
import asyncio
import unittest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from app.engineering_agent.reliability import (
    ExecutionMetrics,
    ReliabilityMetricsTracker,
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenError,
    retry_async,
    RetryConfig,
    ToolCallCache,
    tool_execution_cache,
    TenantRateLimiter,
    tenant_rate_limiter,
)
from app.engineering_agent.tools import tool_registry, ToolResult
from app.engineering_agent.core.service import engineering_agent_service
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.orchestration.graph import StateGraph
from app.utils.auth import AuthenticatedUser


class TestPhase16ProductionReliability(unittest.IsolatedAsyncioTestCase):
    """Rigorous test suite for reliability, latency tracking, resilience, and caching."""

    # -------------------------------------------------------------------------
    # 1. Latency & Telemetry Measurement Tracker
    # -------------------------------------------------------------------------
    def test_01_reliability_metrics_tracker_measurements(self):
        """Verify tracker measures all 7 latency dimensions and node/tool breakdowns."""
        tracker = ReliabilityMetricsTracker()
        tracker.start_graph()

        # Simulate node executions
        tracker.record_node_execution("validate_context", 12.5)
        tracker.record_node_execution("route_intent", 45.0)

        # Simulate LLM call
        tracker.record_llm_call(150.0)

        # Simulate Tool executions
        tracker.record_tool_call(
            tool_name="get_repository",
            duration_ms=65.0,
            is_cache_hit=False,
            express_latency_ms=60.0,
            github_latency_ms=0.0,
            neon_latency_ms=25.0
        )
        tracker.record_tool_call(
            tool_name="get_repository",
            duration_ms=0.5,
            is_cache_hit=True
        )

        metrics = tracker.finalize()

        self.assertGreater(metrics.agent_response_latency_ms, 0.0)
        self.assertEqual(metrics.llm_latency_ms, 150.0)
        self.assertEqual(metrics.tool_latency_ms, 65.5)
        self.assertEqual(metrics.express_api_latency_ms, 60.0)
        self.assertEqual(metrics.neon_query_latency_ms, 25.0)
        self.assertEqual(metrics.total_tool_calls_count, 2)
        self.assertEqual(metrics.cache_hits_count, 1)
        self.assertEqual(metrics.graph_steps_count, 2)
        self.assertIn("get_repository", metrics.breakdown_by_tool)
        self.assertIn("validate_context", metrics.breakdown_by_node)

    # -------------------------------------------------------------------------
    # 2. Circuit Breaker State Machine & Fault Isolation
    # -------------------------------------------------------------------------
    async def test_02_circuit_breaker_transitions_and_trip(self):
        """Verify circuit breaker trips to OPEN on repeated failures and fails fast."""
        cb = CircuitBreaker("test_service", failure_threshold=3, recovery_timeout_sec=0.5)
        self.assertEqual(cb.state, CircuitState.CLOSED)

        failing_mock = AsyncMock(side_effect=RuntimeError("Downstream DB Connection Failed"))

        # Trigger 3 failures
        for _ in range(3):
            with self.assertRaises(RuntimeError):
                await cb.execute(failing_mock)

        # 4th call should trip circuit and raise CircuitBreakerOpenError immediately
        self.assertEqual(cb.state, CircuitState.OPEN)
        with self.assertRaises(CircuitBreakerOpenError) as ctx:
            await cb.execute(failing_mock)
        self.assertIn("test_service", str(ctx.exception))

        # Wait for recovery timeout (0.5s) to test HALF_OPEN state
        await asyncio.sleep(0.55)
        self.assertEqual(cb.state, CircuitState.HALF_OPEN)

        # Successful execution in HALF_OPEN resets circuit to CLOSED
        success_mock = AsyncMock(return_value={"status": "ok"})
        res = await cb.execute(success_mock)
        self.assertEqual(res, {"status": "ok"})
        # 2nd success confirms recovery
        res2 = await cb.execute(success_mock)
        self.assertEqual(cb.state, CircuitState.CLOSED)

    # -------------------------------------------------------------------------
    # 3. Exponential Backoff Retry Strategy
    # -------------------------------------------------------------------------
    async def test_03_retry_strategy_with_backoff(self):
        """Verify retry_async attempts transient retries and succeeds."""
        attempts = 0

        async def flaky_api_call():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise TimeoutError("Transient network timeout")
            return "SUCCESS_DATA"

        cfg = RetryConfig(
            max_retries=3,
            initial_backoff_sec=0.05,
            max_backoff_sec=0.2,
            jitter=False,
            retryable_exceptions=(TimeoutError,)
        )

        result = await retry_async(flaky_api_call, config=cfg)
        self.assertEqual(result, "SUCCESS_DATA")
        self.assertEqual(attempts, 3)

    # -------------------------------------------------------------------------
    # 4. Tool Call Deduplication & Tenant-Isolated Caching
    # -------------------------------------------------------------------------
    async def test_04_tool_call_caching_and_deduplication(self):
        """Verify identical tool calls within same tenant are cached and deduplicated."""
        cache = ToolCallCache(default_ttl_sec=30.0)

        tool_result = ToolResult(
            tool_name="get_repository",
            success=True,
            data={"name": "backend-repo", "commits_count": 42},
            duration_ms=45.0
        )

        args = {"repository_id": "repo-alpha-1"}

        # Initial lookup is None
        self.assertIsNone(await cache.get("tenant-alpha", "get_repository", args))

        # Store in cache
        await cache.set("tenant-alpha", "get_repository", args, tool_result)

        # Second lookup returns cached result
        cached = await cache.get("tenant-alpha", "get_repository", args)
        self.assertIsNotNone(cached)
        self.assertEqual(cached.data["name"], "backend-repo")

        # Cross-Tenant isolation check: Tenant Beta must NOT get Tenant Alpha's cached result
        beta_cached = await cache.get("tenant-beta", "get_repository", args)
        self.assertIsNone(beta_cached)

    # -------------------------------------------------------------------------
    # 5. Tenant Rate Limiter & HTTP 429 Rejection
    # -------------------------------------------------------------------------
    async def test_05_tenant_rate_limiter_burst_and_rejection(self):
        """Verify rate limiter blocks requests exceeding burst capacity and sets retry-after."""
        limiter = TenantRateLimiter(max_requests_per_minute=60, burst_capacity=3)

        # First 3 requests allowed (burst capacity)
        allowed1, _ = await limiter.check_rate_limit("tenant-acme")
        allowed2, _ = await limiter.check_rate_limit("tenant-acme")
        allowed3, _ = await limiter.check_rate_limit("tenant-acme")
        self.assertTrue(allowed1)
        self.assertTrue(allowed2)
        self.assertTrue(allowed3)

        # 4th request exceeds burst capacity
        allowed4, retry_after = await limiter.check_rate_limit("tenant-acme")
        self.assertFalse(allowed4)
        self.assertGreater(retry_after, 0.0)

        # Different tenant has independent bucket
        allowed_other, _ = await limiter.check_rate_limit("tenant-other")
        self.assertTrue(allowed_other)

    async def test_06_service_rejects_rate_limit_exceeded(self):
        """Verify service layer returns HTTP 429 on rate limit exhaustion."""
        user = AuthenticatedUser(id="user-busy", email="busy@org.com", organization_id="org-busy-tenant")
        request = EngineeringAgentRequest(message="Show commits")

        # Exhaust bucket
        for _ in range(25):
            await tenant_rate_limiter.check_rate_limit("org-busy-tenant")

        with self.assertRaises(HTTPException) as ctx:
            await engineering_agent_service.execute_agent(request=request, user=user)

        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Rate limit exceeded", ctx.exception.detail)

        # Reset rate limiter
        await tenant_rate_limiter.reset()

    # -------------------------------------------------------------------------
    # 6. Infinite Loop Guardrails & Maximum Graph Steps
    # -------------------------------------------------------------------------
    async def test_07_graph_max_iterations_loop_prevention(self):
        """Verify StateGraph halts at max_iterations to prevent infinite loops."""
        graph = StateGraph()
        steps = 0

        async def cycling_node(state):
            nonlocal steps
            steps += 1
            return {"step": steps}

        graph.add_node("step_a", cycling_node)
        graph.add_node("step_b", cycling_node)
        graph.set_entry_point("step_a")
        graph.add_edge("step_a", "step_b")
        graph.add_edge("step_b", "step_a")  # Cycle

        compiled = graph.compile(max_iterations=15)
        res = await compiled.ainvoke({})

        self.assertEqual(steps, 15)
        self.assertEqual(res["step"], 15)


if __name__ == "__main__":
    unittest.main()
