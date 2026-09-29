"""
Exponential Backoff Retry Strategy (Phase 16).
Handles transient errors with jitter, exponential backoff, and selective exception filtering.
"""
import time
import random
import asyncio
from typing import Callable, Any, Optional, Tuple, Type
from app.utils.logger import logger


class RetryConfig:
    """Configuration parameters for retry behavior."""
    def __init__(
        self,
        max_retries: int = 3,
        initial_backoff_sec: float = 0.2,
        max_backoff_sec: float = 2.0,
        backoff_multiplier: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)
    ):
        self.max_retries = max_retries
        self.initial_backoff_sec = initial_backoff_sec
        self.max_backoff_sec = max_backoff_sec
        self.backoff_multiplier = backoff_multiplier
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions


async def retry_async(
    func: Callable[..., Any],
    *args: Any,
    config: Optional[RetryConfig] = None,
    on_retry: Optional[Callable[[int, Exception, float], Any]] = None,
    **kwargs: Any
) -> Any:
    """
    Execute an async callable with exponential backoff retries.
    """
    cfg = config or RetryConfig()
    attempt = 0
    backoff = cfg.initial_backoff_sec

    while True:
        try:
            return await func(*args, **kwargs)
        except cfg.retryable_exceptions as err:
            attempt += 1
            if attempt > cfg.max_retries:
                logger.warning(f"[Retry] Max retry attempts ({cfg.max_retries}) exceeded for {func.__name__}. Error: {err}")
                raise

            sleep_duration = min(backoff, cfg.max_backoff_sec)
            if cfg.jitter:
                sleep_duration = sleep_duration * (0.8 + 0.4 * random.random())

            logger.info(f"[Retry] Attempt {attempt}/{cfg.max_retries} failed ({err.__class__.__name__}: {err}). Retrying in {sleep_duration:.2f}s...")
            if on_retry:
                try:
                    res = on_retry(attempt, err, sleep_duration)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception:
                    pass

            await asyncio.sleep(sleep_duration)
            backoff *= cfg.backoff_multiplier
