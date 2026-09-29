"""
Express Backend API Tool Client.
Communicates strictly via READ-ONLY GET requests with the Node.js / Express.js REST API layer.
Guarantees zero mutation capabilities and enforces SaaS tenant isolation by forwarding authorization headers.
"""
import time
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings
from app.utils.logger import logger


class ExpressApiClient:
    """
    HTTP client for querying Express.js endpoints with user tenant context.
    Ensures strict SaaS tenant isolation and read-only access.
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
        """Execute an authenticated READ-ONLY GET request against Express."""
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
                        "raw": res.text,
                        "duration_ms": duration_ms
                    }

                data = res.json()
                logger.info(f"[ExpressClient] GET {endpoint} -> 200 OK ({duration_ms:.1f}ms)")
                return {
                    "success": True,
                    "status_code": res.status_code,
                    "data": data.get("data", data),
                    "duration_ms": duration_ms
                }
        except httpx.RequestError as e:
            duration_ms = (time.time() - start_ts) * 1000.0
            logger.error(f"[ExpressClient] Connection error on GET {endpoint}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to connect to Express backend: {str(e)}",
                "duration_ms": duration_ms
            }

    # =========================================================================
    # 1. Repository Read-Only Tools
    # =========================================================================
    async def get_repository(self, repository_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """1. get_repository: Fetch detailed metadata, languages, and sync info for a repository."""
        return await self._get(f"/repositories/{repository_id}", auth_token, tenant_id)

    async def list_repositories(self, auth_token: Optional[str], tenant_id: Optional[str], limit: Optional[int] = None) -> Dict[str, Any]:
        """2. list_repositories: Fetch all repositories monitored by the tenant."""
        params = {"limit": limit} if limit else None
        return await self._get("/repositories", auth_token, tenant_id, params=params)

    async def get_repository_branches(self, repository_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """3. get_repository_branches: Fetch branch information and default branch for a repository."""
        repo_res = await self._get(f"/repositories/{repository_id}", auth_token, tenant_id)
        if not repo_res.get("success"):
            return repo_res
        data = repo_res.get("data", {})
        branches_data = {
            "repository_id": repository_id,
            "default_branch": data.get("default_branch") or data.get("defaultBranch") or "main",
            "branches": data.get("branches") or [data.get("default_branch") or "main"]
        }
        return {"success": True, "data": branches_data, "duration_ms": repo_res.get("duration_ms", 0)}

    async def get_repository_sync_status(self, repository_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Fetch background synchronization freshness, sync_status, and latest sync job info."""
        return await self._get(f"/repositories/{repository_id}/sync-status", auth_token, tenant_id)


    async def get_repository_commits(
        self,
        repository_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        limit: int = 50,
        page: int = 1
    ) -> Dict[str, Any]:
        """4. get_repository_commits: Fetch commit history with author info and pagination."""
        params = {"limit": limit, "page": page}
        return await self._get(f"/repositories/{repository_id}/commits", auth_token, tenant_id, params=params)

    async def get_commit_details(
        self,
        commit_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        include_changes: bool = True
    ) -> Dict[str, Any]:
        """5. get_commit_details: Fetch deep commit details, message, stats, and diff changes."""
        endpoint = f"/commits/{commit_id}/changes" if include_changes else f"/commits/{commit_id}"
        return await self._get(endpoint, auth_token, tenant_id)

    # =========================================================================
    # 2. Pull Request Read-Only Tools
    # =========================================================================
    async def get_repository_pull_requests(
        self,
        repository_id: Optional[str],
        auth_token: Optional[str],
        tenant_id: Optional[str],
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """6. get_repository_pull_requests: Fetch pull requests for a repository or tenant."""
        endpoint = f"/repositories/{repository_id}/pull-requests" if repository_id else "/pull-requests"
        params = {"status": status} if status else None
        return await self._get(endpoint, auth_token, tenant_id, params=params)

    async def get_pull_request_details(self, pull_request_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """7. get_pull_request_details: Fetch PR review timeline, turnaround time, additions/deletions."""
        return await self._get(f"/pull-requests/{pull_request_id}", auth_token, tenant_id)

    # =========================================================================
    # 3. Issue Read-Only Tools
    # =========================================================================
    async def get_repository_issues(
        self,
        repository_id: Optional[str],
        auth_token: Optional[str],
        tenant_id: Optional[str],
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """8. get_repository_issues: Fetch issues for a repository or tenant."""
        endpoint = f"/repositories/{repository_id}/issues" if repository_id else "/issues"
        params = {"status": status} if status else None
        return await self._get(endpoint, auth_token, tenant_id, params=params)

    async def get_issue_details(self, issue_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """9. get_issue_details: Fetch issue lifecycle details, labels, creator, and resolution state."""
        return await self._get(f"/issues/{issue_id}", auth_token, tenant_id)

    # =========================================================================
    # 4. Developer & Velocity Read-Only Tools
    # =========================================================================
    async def get_repository_developers(
        self,
        repository_id: Optional[str],
        auth_token: Optional[str],
        tenant_id: Optional[str]
    ) -> Dict[str, Any]:
        """10. get_repository_developers: Fetch contributors and developer rankings."""
        return await self._get("/developers", auth_token, tenant_id)

    async def get_developer_activity(
        self,
        developer_id: Optional[str],
        auth_token: Optional[str],
        tenant_id: Optional[str],
        limit: int = 50
    ) -> Dict[str, Any]:
        """11. get_developer_activity: Fetch recent activity stream for a developer or organization."""
        endpoint = f"/developers/{developer_id}/activity" if developer_id else "/activity"
        return await self._get(endpoint, auth_token, tenant_id, params={"limit": limit})

    async def get_developer_commit_statistics(
        self,
        developer_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        preset: str = "30d"
    ) -> Dict[str, Any]:
        """12. get_developer_commit_statistics: Fetch throughput, velocity, commit counts, and churn."""
        return await self._get(f"/developers/{developer_id}/analytics", auth_token, tenant_id, params={"preset": preset})

    # =========================================================================
    # 5. Code Impact & Churn Tool
    # =========================================================================
    async def get_code_impact(
        self,
        repository_id: Optional[str],
        auth_token: Optional[str],
        tenant_id: Optional[str],
        timeframe: str = "30d"
    ) -> Dict[str, Any]:
        """13. get_code_impact: Fetch lines added, deleted, churn ratio, and high impact files."""
        endpoint = f"/repositories/{repository_id}/churn" if repository_id else "/analytics/churn"
        return await self._get(endpoint, auth_token, tenant_id, params={"timeframe": timeframe})

    # =========================================================================
    # 6. Project Read-Only Tools
    # =========================================================================
    async def get_project(self, project_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """14. get_project: Fetch high-level project metadata and scope."""
        return await self._get(f"/projects/{project_id}", auth_token, tenant_id)

    async def get_project_repositories(self, project_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        """15. get_project_repositories: Fetch all repositories linked to a project."""
        return await self._get(f"/projects/{project_id}/repositories", auth_token, tenant_id)

    async def get_project_statistics(
        self,
        project_id: str,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        preset: str = "30d"
    ) -> Dict[str, Any]:
        """16. get_project_statistics: Fetch aggregated project metrics, KPIs, and developer breakdown."""
        return await self._get(f"/reports/project/{project_id}", auth_token, tenant_id, params={"preset": preset})

    # =========================================================================
    # 7. Dashboard Analytics Tool
    # =========================================================================
    async def get_dashboard_analytics(
        self,
        auth_token: Optional[str],
        tenant_id: Optional[str],
        timeframe: str = "30d"
    ) -> Dict[str, Any]:
        """17. get_dashboard_analytics: Fetch top-level dashboard telemetry and workspace health."""
        return await self._get("/dashboard/overview", auth_token, tenant_id, params={"preset": timeframe})

    # Backwards-compatible aliases
    async def list_projects(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        return await self._get("/projects", auth_token, tenant_id)

    async def get_project_detail(self, project_id: str, auth_token: Optional[str], tenant_id: Optional[str], preset: Optional[str] = "30d") -> Dict[str, Any]:
        return await self._get(f"/projects/{project_id}", auth_token, tenant_id, params={"preset": preset} if preset else None)

    async def get_repository_detail(self, repository_id: str, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        return await self.get_repository(repository_id, auth_token, tenant_id)

    async def list_developers(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        return await self.get_repository_developers(None, auth_token, tenant_id)

    async def list_pull_requests(self, auth_token: Optional[str], tenant_id: Optional[str], status: Optional[str] = None) -> Dict[str, Any]:
        return await self.get_repository_pull_requests(None, auth_token, tenant_id, status)

    async def list_issues(self, auth_token: Optional[str], tenant_id: Optional[str]) -> Dict[str, Any]:
        return await self.get_repository_issues(None, auth_token, tenant_id)

    async def list_activity(self, auth_token: Optional[str], tenant_id: Optional[str], limit: int = 50) -> Dict[str, Any]:
        return await self.get_developer_activity(None, auth_token, tenant_id, limit)


express_api_client = ExpressApiClient()
