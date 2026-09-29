"""
Tenant Entity Loader & In-Memory TTL Cache.
Loads tenant-scoped repositories, projects, and developers from Express backend for entity resolution.
"""
import time
from typing import Dict, Any, List, Optional
from app.engineering_agent.tools.express_client import express_api_client
from app.utils.logger import logger


class TenantEntityCache:
    """
    In-memory cache for tenant repositories, projects, and developers.
    Ensures sub-millisecond entity resolution without redundant network overhead.
    """

    CACHE_TTL_SECONDS = 60.0

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache_key(self, tenant_id: str, entity_type: str) -> str:
        return f"{tenant_id}:{entity_type}"

    def get(self, tenant_id: str, entity_type: str) -> Optional[List[Dict[str, Any]]]:
        key = self._get_cache_key(tenant_id, entity_type)
        entry = self._cache.get(key)
        if entry:
            if time.time() - entry["timestamp"] < self.CACHE_TTL_SECONDS:
                return entry["data"]
            del self._cache[key]
        return None

    def set(self, tenant_id: str, entity_type: str, data: List[Dict[str, Any]]):
        key = self._get_cache_key(tenant_id, entity_type)
        self._cache[key] = {
            "data": data,
            "timestamp": time.time()
        }

    def clear(self):
        self._cache.clear()


tenant_entity_cache = TenantEntityCache()


class TenantEntityLoader:
    """
    Loads verified tenant entities from the Express backend with tenant isolation.
    """

    async def get_tenant_repositories(
        self,
        tenant_id: str,
        auth_token: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Fetch repositories monitored within the tenant."""
        cached = tenant_entity_cache.get(tenant_id, "repositories")
        if cached is not None:
            return cached

        res = await express_api_client.list_repositories(auth_token=auth_token, tenant_id=tenant_id, limit=100)
        data = res.get("data", []) if res.get("success") else []
        if isinstance(data, list):
            tenant_entity_cache.set(tenant_id, "repositories", data)
            return data
        return []

    async def get_tenant_projects(
        self,
        tenant_id: str,
        auth_token: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Fetch projects registered in the tenant."""
        cached = tenant_entity_cache.get(tenant_id, "projects")
        if cached is not None:
            return cached

        res = await express_api_client.list_projects(auth_token=auth_token, tenant_id=tenant_id)
        data = res.get("data", []) if res.get("success") else []
        if isinstance(data, list):
            tenant_entity_cache.set(tenant_id, "projects", data)
            return data
        return []

    async def get_tenant_developers(
        self,
        tenant_id: str,
        auth_token: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Fetch developers/contributors recorded in the tenant."""
        cached = tenant_entity_cache.get(tenant_id, "developers")
        if cached is not None:
            return cached

        res = await express_api_client.get_repository_developers(repository_id=None, auth_token=auth_token, tenant_id=tenant_id)
        data = res.get("data", []) if res.get("success") else []
        if isinstance(data, list):
            tenant_entity_cache.set(tenant_id, "developers", data)
            return data
        return []


tenant_entity_loader = TenantEntityLoader()
