"""
Production Reliability Module for Engineering AI Agent (Phase 16).
Provides:
  - Latency & Telemetry Tracker (Metrics)
  - Circuit Breakers (Fault Isolation)
  - Exponential Backoff Retry Strategy
  - Tool Call Deduplication & Cache
  - Tenant Rate Limiter
"""
from app.engineering_agent.reliability.metrics import (
    ExecutionMetrics,
    ReliabilityMetricsTracker,
)
from app.engineering_agent.reliability.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenError,
    express_circuit_breaker,
    llm_circuit_breaker,
)
from app.engineering_agent.reliability.retry import (
    retry_async,
    RetryConfig,
)
from app.engineering_agent.reliability.cache import (
    ToolCallCache,
    tool_execution_cache,
)
from app.engineering_agent.reliability.rate_limiter import (
    TenantRateLimiter,
    tenant_rate_limiter,
)

__all__ = [
    "ExecutionMetrics",
    "ReliabilityMetricsTracker",
    "CircuitBreaker",
    "CircuitState",
    "CircuitBreakerOpenError",
    "express_circuit_breaker",
    "llm_circuit_breaker",
    "retry_async",
    "RetryConfig",
    "ToolCallCache",
    "tool_execution_cache",
    "TenantRateLimiter",
    "tenant_rate_limiter",
]
