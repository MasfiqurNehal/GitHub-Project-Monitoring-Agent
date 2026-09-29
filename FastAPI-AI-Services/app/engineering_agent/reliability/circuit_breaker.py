"""
Circuit Breaker Pattern Implementation (Phase 16).
Protects against cascading failures when downstream services (Express Backend, GitHub APIs, LLM endpoints) are failing.
"""
import time
import asyncio
from enum import Enum
from typing import Callable, Any, Optional, Dict
from app.utils.logger import logger


class CircuitState(str, Enum):
    """Current state of the circuit breaker."""
    CLOSED = "closed"        # Normal execution; passing all calls
    OPEN = "open"            # Failing fast; rejecting calls immediately
    HALF_OPEN = "half_open"  # Probing service with limited trial calls


class CircuitBreakerOpenError(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    def __init__(self, name: str, recovery_time_remaining: float):
        self.name = name
        self.recovery_time_remaining = recovery_time_remaining
        super().__init__(
            f"Circuit breaker '{name}' is OPEN. Downstream service unavailable. "
            f"Retry in {recovery_time_remaining:.1f}s."
        )


class CircuitBreaker:
    """
    Asynchronous Circuit Breaker state machine.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout_sec: float = 20.0,
        half_open_success_threshold: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.half_open_success_threshold = half_open_success_threshold

        self._state: CircuitState = CircuitState.CLOSED
        self._consecutive_failures: int = 0
        self._consecutive_successes: int = 0
        self._last_state_change: float = time.time()
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Returns the current state, checking if OPEN state has expired into HALF_OPEN."""
        now = time.time()
        if self._state == CircuitState.OPEN:
            if now - self._last_state_change >= self.recovery_timeout_sec:
                self._state = CircuitState.HALF_OPEN
                self._last_state_change = now
                self._consecutive_successes = 0
                logger.info(f"[CircuitBreaker:{self.name}] Transitioned from OPEN to HALF_OPEN (probing)")
        return self._state

    async def record_success(self) -> None:
        """Record a successful execution."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._consecutive_successes += 1
                if self._consecutive_successes >= self.half_open_success_threshold:
                    self._state = CircuitState.CLOSED
                    self._consecutive_failures = 0
                    self._last_state_change = time.time()
                    logger.info(f"[CircuitBreaker:{self.name}] Service recovered. Transitioned from HALF_OPEN to CLOSED")
            elif self._state == CircuitState.CLOSED:
                self._consecutive_failures = 0

    async def record_failure(self, error: Optional[Exception] = None) -> None:
        """Record a failed execution."""
        async with self._lock:
            self._consecutive_failures += 1
            now = time.time()
            if self._state == CircuitState.HALF_OPEN or self._consecutive_failures >= self.failure_threshold:
                self._state = CircuitState.OPEN
                self._last_state_change = now
                logger.warning(
                    f"[CircuitBreaker:{self.name}] Failure threshold reached ({self._consecutive_failures} failures). "
                    f"Tripping circuit to OPEN for {self.recovery_timeout_sec}s. Error: {error}"
                )

    async def execute(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """
        Execute an asynchronous callable protected by the circuit breaker.
        """
        current_state = self.state
        if current_state == CircuitState.OPEN:
            remaining = max(0.0, self.recovery_timeout_sec - (time.time() - self._last_state_change))
            raise CircuitBreakerOpenError(self.name, remaining)

        try:
            res = await func(*args, **kwargs)
            await self.record_success()
            return res
        except Exception as e:
            await self.record_failure(e)
            raise


# Pre-configured circuit breakers for key external subsystems
express_circuit_breaker = CircuitBreaker("express_backend", failure_threshold=5, recovery_timeout_sec=15.0)
llm_circuit_breaker = CircuitBreaker("llm_provider", failure_threshold=4, recovery_timeout_sec=20.0)
