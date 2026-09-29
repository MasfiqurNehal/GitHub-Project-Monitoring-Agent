"""
Express Backend API Tool Client.
Communicates with the Node.js / Express.js REST API layer on behalf of the authenticated tenant.
"""
import time
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings
from app.utils.logger import logger

class ExpressApiClient:
    """
    HTTP client for querying Express.js endpoints with user tenant context.
    Ensures strict SaaS tenant isolation by forwarding authorization headers.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.BACKEND_URL).rstrip("/")
        self.timeout = 15.0

    def _get_headers(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if auth_token:
            clean_token = auth_token.replace("Bearer ", "").strip()
            headers["Authorization"] = f"Bearer {clean_token}"
        if tenant_id:
            headers["x-tenant-id"] = tenant_id
        return headers

    async def _get(
        self,
        endpoint: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute an authenticated GET request against Express."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers(auth_token, tenant_id)
        start_ts = time.time()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=headers, params=params)
                duration_ms = (time.time() - start_ts) * 1000.0

                if res.status_code >= 400:
                    logger.warning(f"[ExpressClient] GET {endpoint} returned {res.status_code} ({duration_ms:.1f}ms): {res.text[:120]}")
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "error": f"Backend API returned status {res.status_code}",
                        "raw": res.text
                    }

                data = res.json()
                logger.info(f"[ExpressClient] GET {endpoint} -> 200 OK ({duration_ms:.1f}ms)")
                return {
                    "success": True,
                    "status_code": res.status_code,
                    "data": data.get("data", data)
                }
        except httpx.RequestError as e:
            logger.error(f"[ExpressClient] Connection error on GET {endpoint}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to connect to Express backend: {str(e)}"
            }

    async def list_projects(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Fetch all projects owned by the tenant."""
        return await self._get("/projects", auth_token, tenant_id)

    async def get_project_detail(
        self,
        project_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        preset: Optional[str] = "30d"
    ) -> Dict[str, Any]:
        """Fetch aggregated metrics, repositories, developers, and commits for a project."""
        params = {"preset": preset} if preset else None
        return await self._get(f"/projects/{project_id}", auth_token, tenant_id, params=params)

    async def list_repositories(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Fetch all repositories monitored by the tenant."""
        return await self._get("/repositories", auth_token, tenant_id)

    async def get_repository_detail(
        self,
        repository_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch detailed commit history, languages, and sync info for a repository."""
        return await self._get(f"/repositories/{repository_id}", auth_token, tenant_id)

    async def list_developers(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Fetch developer productivity rankings and commit statistics."""
        return await self._get("/developers", auth_token, tenant_id)

    async def list_pull_requests(
        self,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch PR velocity and review telemetry."""
        params = {"status": status} if status else None
        return await self._get("/pull-requests", auth_token, tenant_id, params=params)

    async def list_issues(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Fetch active and closed issues."""
        return await self._get("/issues", auth_token, tenant_id)

    async def list_activity(self, auth_token: Optional[str], tenant_id: Optional[str], limit: int = 50) -> Dict[str, Any]:
        """Fetch recent real-time engineering activity stream."""
        return await self._get("/activity", auth_token, tenant_id, params={"limit": limit})

express_api_client = ExpressApiClient()
