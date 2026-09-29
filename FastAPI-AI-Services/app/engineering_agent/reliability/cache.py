"""
Tool Execution Cache & Call Deduplication Engine (Phase 16).
Prevents redundant, expensive identical tool calls during multi-agent orchestration.
Strictly respects tenant isolation.
"""
import time
import json
import hashlib
import asyncio
from typing import Dict, Any, Optional
from collections import OrderedDict

from app.engineering_agent.tools.schemas import ToolResult
from app.utils.logger import logger


class ToolCallCache:
    """
    In-memory, tenant-scoped tool call cache with TTL and LRU capacity bounds.
    """

    def __init__(self, max_entries: int = 500, default_ttl_sec: float = 60.0):
        self.max_entries = max_entries
        self.default_ttl_sec = default_ttl_sec
        # Key -> (ToolResult, timestamp)
        self._cache: Dict[str, tuple[ToolResult, float]] = OrderedDict()
        self._lock = asyncio.Lock()

    def _generate_cache_key(self, tenant_id: Optional[str], tool_name: str, args: Dict[str, Any]) -> str:
        """Construct deterministic hash key including tenant isolation."""
        tenant_str = (tenant_id or "global").strip()
        args_str = json.dumps(args, sort_keys=True, default=str)
        args_hash = hashlib.sha256(args_str.encode("utf-8")).hexdigest()[:16]
        return f"{tenant_str}:{tool_name}:{args_hash}"

    async def get(self, tenant_id: Optional[str], tool_name: str, args: Dict[str, Any]) -> Optional[ToolResult]:
        """Retrieve cached result if valid and not expired."""
        key = self._generate_cache_key(tenant_id, tool_name, args)
        now = time.time()

        async with self._lock:
            if key in self._cache:
                result, ts = self._cache[key]
                if now - ts <= self.default_ttl_sec:
                    # Move to end (LRU)
                    self._cache.move_to_end(key)
                    logger.info(f"[ToolCache] Cache HIT for tool '{tool_name}' (tenant: {tenant_id})")
                    return result
                else:
                    del self._cache[key]
        return None

    async def set(
        self,
        tenant_id: Optional[str],
        tool_name: str,
        args: Dict[str, Any],
        result: ToolResult,
        ttl_sec: Optional[float] = None
    ) -> None:
        """Store tool result in cache."""
        if not result.success:
            return  # Do not cache error responses

        key = self._generate_cache_key(tenant_id, tool_name, args)
        now = time.time()

        async with self._lock:
            if len(self._cache) >= self.max_entries:
                self._cache.popitem(last=False)  # Evict oldest LRU entry

            self._cache[key] = (result, now)
            logger.debug(f"[ToolCache] Cached result for '{tool_name}' ({key})")

    async def clear(self) -> None:
        """Flush the cache."""
        async with self._lock:
            self._cache.clear()


tool_execution_cache = ToolCallCache()
