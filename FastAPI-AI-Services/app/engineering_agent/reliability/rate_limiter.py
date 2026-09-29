"""
Tenant-Scoped Rate Limiter (Phase 16).
Implements sliding-window token bucket algorithm to protect against noisy-neighbor starvation.
"""
import time
import asyncio
from typing import Dict, Tuple
from app.utils.logger import logger


class TenantRateLimiter:
    """
    Sliding window rate limiter per tenant organization.
    """

    def __init__(self, max_requests_per_minute: int = 60, burst_capacity: int = 15):
        self.max_rpm = max_requests_per_minute
        self.burst_capacity = burst_capacity
        self.refill_rate = max_requests_per_minute / 60.0  # tokens per second
        # tenant_id -> (current_tokens, last_refill_timestamp)
        self._buckets: Dict[str, Tuple[float, float]] = {}
        self._lock = asyncio.Lock()

    async def check_rate_limit(self, tenant_id: str) -> Tuple[bool, float]:
        """
        Check if a request is allowed for the tenant.
        Returns (is_allowed, retry_after_seconds).
        """
        now = time.time()
        tenant_key = (tenant_id or "default").strip()

        async with self._lock:
            tokens, last_time = self._buckets.get(tenant_key, (float(self.burst_capacity), now))
            
            # Refill tokens based on elapsed time
            elapsed = now - last_time
            tokens = min(float(self.burst_capacity), tokens + elapsed * self.refill_rate)

            if tokens >= 1.0:
                self._buckets[tenant_key] = (tokens - 1.0, now)
                return True, 0.0
            else:
                self._buckets[tenant_key] = (tokens, now)
                needed = 1.0 - tokens
                retry_after = round(needed / self.refill_rate, 2)
                logger.warning(f"[RateLimiter] Rate limit exceeded for tenant '{tenant_id}'. Retry after {retry_after}s")
                return False, max(0.1, retry_after)

    async def reset(self) -> None:
        """Reset rate limiter state."""
        async with self._lock:
            self._buckets.clear()


tenant_rate_limiter = TenantRateLimiter(max_requests_per_minute=120, burst_capacity=20)
