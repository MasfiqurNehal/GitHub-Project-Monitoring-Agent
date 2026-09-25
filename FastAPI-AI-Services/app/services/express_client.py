"""
Internal Express.js API Client Service Abstraction for FastAPI AI Backend.
Enables AI Chatbot and AI Engineering Agent to fetch live GitMonitor application data
directly from the Express.js backend without duplicating business logic.

Supported Telemetry Domains:
- Projects
- Repositories & Code Churn
- Developer Profiles & Activity
- Commits
- Pull Requests
- Issues
- Executive Reports & Daily Analytics
"""
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings
from app.utils.logger import logger

class ExpressClientException(Exception):
    """Custom exception raised when internal Express backend requests fail."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class ExpressClient:
    """
    Asynchronous HTTP Client abstraction for communicating with the Express.js backend API.
    Forwards JWT authorization headers to preserve tenant & user data isolation.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = 10.0):
        self.base_url = (base_url or settings.BACKEND_URL).rstrip("/")
        self.timeout = timeout

    def _get_headers(self, auth_token: Optional[str] = None) -> Dict[str, str]:
        """Construct HTTP headers with optional Bearer JWT auth token."""
        headers = {"Content-Type": "application/json"}
        if auth_token:
            if auth_token.startswith("Bearer "):
                headers["Authorization"] = auth_token
            else:
                headers["Authorization"] = f"Bearer {auth_token}"
        return headers

    async def _get(
        self,
        endpoint: str,
        auth_token: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute HTTP GET request against Express API."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers(auth_token)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"[ExpressClient] HTTP {response.status_code} GET '{url}': {response.text[:100]}")
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "error": f"Express API returned status {response.status_code}"
                    }
        except Exception as err:
            logger.error(f"[ExpressClient] Connection error requesting GET '{url}': {err}")
            return {
                "success": False,
                "error": f"Failed to connect to Express backend: {str(err)}"
            }

    # ==========================================
    # 1. Dashboard & Analytics Telemetry
    # ==========================================
    async def get_dashboard_overview(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch dashboard summary KPIs (projects count, repo count, developer activity)."""
        return await self._get("/dashboard/overview", auth_token=auth_token)

    async def get_daily_analytics(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch daily commit, PR, and churn analytics."""
        return await self._get("/dashboard/daily", auth_token=auth_token)

    # ==========================================
    # 2. Projects Information
    # ==========================================
    async def list_projects(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch all projects owned by organization tenant."""
        return await self._get("/projects", auth_token=auth_token)

    async def get_project_detail(self, project_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch detailed telemetry for a specific project."""
        return await self._get(f"/projects/{project_id}", auth_token=auth_token)

    async def get_project_repositories(self, project_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch repositories grouped under a specific project."""
        return await self._get(f"/projects/{project_id}/repositories", auth_token=auth_token)

    # ==========================================
    # 3. Repositories & Code Churn Information
    # ==========================================
    async def list_repositories(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch all monitored repositories."""
        return await self._get("/repositories", auth_token=auth_token)

    async def get_repository_detail(self, repository_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch details, branch metadata, and commit totals for a repository."""
        return await self._get(f"/repositories/{repository_id}", auth_token=auth_token)

    async def get_repository_churn(self, repository_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch code churn analysis (additions, deletions, modified files) for a repository."""
        return await self._get(f"/repositories/{repository_id}/churn", auth_token=auth_token)

    # ==========================================
    # 4. Developer Activity Information
    # ==========================================
    async def list_developers(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch active developer profiles and committer summaries."""
        return await self._get("/developers", auth_token=auth_token)

    async def get_developer_detail(self, developer_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch profile and contribution stats for a specific developer."""
        return await self._get(f"/developers/{developer_id}", auth_token=auth_token)

    async def get_developer_activity(self, developer_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch daily activity timeline and PR review participation for a developer."""
        return await self._get(f"/developers/{developer_id}/activity", auth_token=auth_token)

    # ==========================================
    # 5. Commits Information
    # ==========================================
    async def list_commits(self, repository_id: Optional[str] = None, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch commit history for a repository or entire dashboard."""
        endpoint = f"/repositories/{repository_id}/commits" if repository_id else "/dashboard/commits"
        return await self._get(endpoint, auth_token=auth_token)

    async def get_commit_detail(self, commit_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch single commit details and file diff stats."""
        return await self._get(f"/commits/{commit_id}", auth_token=auth_token)

    # ==========================================
    # 6. Pull Requests Information
    # ==========================================
    async def list_pull_requests(self, repository_id: Optional[str] = None, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch pull requests across all tenant repos or a specific repo."""
        endpoint = f"/repositories/{repository_id}/pull-requests" if repository_id else "/pull-requests"
        return await self._get(endpoint, auth_token=auth_token)

    async def get_pull_request_detail(self, pr_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch single pull request lifecycle status and review metrics."""
        return await self._get(f"/pull-requests/{pr_id}", auth_token=auth_token)

    # ==========================================
    # 7. Issues Information
    # ==========================================
    async def list_issues(self, repository_id: Optional[str] = None, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch issues across all tenant repos or a specific repo."""
        endpoint = f"/repositories/{repository_id}/issues" if repository_id else "/issues"
        return await self._get(endpoint, auth_token=auth_token)

    async def get_issue_detail(self, issue_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch issue detail and resolution metrics."""
        return await self._get(f"/issues/{issue_id}", auth_token=auth_token)

    # ==========================================
    # 8. Reports Information
    # ==========================================
    async def list_reports(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch generated executive reports list."""
        return await self._get("/reports", auth_token=auth_token)

    async def get_weekly_report(self, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch aggregated weekly executive summary report."""
        return await self._get("/reports/weekly", auth_token=auth_token)

# Global singleton client instance
express_client = ExpressClient()
