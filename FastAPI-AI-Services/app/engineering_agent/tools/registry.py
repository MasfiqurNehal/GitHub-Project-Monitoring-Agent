"""
Engineering Agent Read-Only Tool Registry & Dispatcher.
Enforces strict input validation, tenant context preservation, read-only safety, and error handling.
"""
import time
from typing import Dict, Any, List, Optional, Callable, Type
from pydantic import BaseModel, ValidationError

from app.engineering_agent.tools.schemas import (
    ToolResult,
    ToolDefinition,
    GetRepositoryInput,
    ListRepositoriesInput,
    GetRepositoryBranchesInput,
    GetRepositorySyncStatusInput,
    GetRepositoryCommitsInput,

    GetCommitDetailsInput,
    GetRepositoryPullRequestsInput,
    GetPullRequestDetailsInput,
    GetRepositoryIssuesInput,
    GetIssueDetailsInput,
    GetRepositoryDevelopersInput,
    GetDeveloperActivityInput,
    GetDeveloperCommitStatisticsInput,
    GetCodeImpactInput,
    GetProjectInput,
    GetProjectRepositoriesInput,
    GetProjectStatisticsInput,
    GetDashboardAnalyticsInput
)
from app.engineering_agent.tools.express_client import express_api_client
from app.utils.logger import logger


# Set of strictly prohibited write/mutation keywords
PROHIBITED_MUTATION_OPERATIONS = {
    "push", "commit", "create_branch", "delete_branch", "merge_pr",
    "merge", "create_issue", "update_issue", "delete_issue", "delete_repository",
    "create_repository", "modify_permissions", "grant_access", "revoke_access"
}


class ReadOnlyTool:
    """Encapsulates a single read-only tool definition and execution callable."""

    def __init__(
        self,
        name: str,
        description: str,
        input_model: Type[BaseModel],
        handler: Callable[..., Any]
    ):
        if name in PROHIBITED_MUTATION_OPERATIONS:
            raise ValueError(f"Security Violation: Tool '{name}' is a prohibited mutation operation.")
            
        self.name = name
        self.description = description
        self.input_model = input_model
        self.handler = handler
        self.is_read_only = True

    async def execute(
        self,
        args: Dict[str, Any],
        auth_token: Optional[str],
        tenant_id: Optional[str]
    ) -> ToolResult:
        """
        Validate inputs using Pydantic, execute handler, and return normalized ToolResult.
        """
        t0 = time.time()
        
        # 1. Validate inputs
        try:
            validated_input = self.input_model(**(args or {}))
        except ValidationError as err:
            dur = (time.time() - t0) * 1000.0
            logger.warning(f"[ToolRegistry] Validation error on '{self.name}': {err}")
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=f"Invalid arguments for {self.name}: {err.errors()}",
                duration_ms=dur,
                is_read_only=True
            )

        # 2. Execute read-only handler with tenant context
        try:
            res = await self.handler(validated_input, auth_token=auth_token, tenant_id=tenant_id)
            dur = (time.time() - t0) * 1000.0
            
            if isinstance(res, dict):
                success = res.get("success", False)
                data = res.get("data")
                # Handle empty results gracefully
                if data is None and success:
                    data = []
                error = res.get("error") if not success else None
                return ToolResult(
                    tool_name=self.name,
                    success=success,
                    data=data,
                    error=error,
                    duration_ms=dur,
                    is_read_only=True
                )
            else:
                return ToolResult(
                    tool_name=self.name,
                    success=True,
                    data=res,
                    duration_ms=dur,
                    is_read_only=True
                )
        except Exception as e:
            dur = (time.time() - t0) * 1000.0
            logger.error(f"[ToolRegistry] Unhandled error in tool '{self.name}': {str(e)}", exc_info=True)
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=f"Tool execution failed: {str(e)}",
                duration_ms=dur,
                is_read_only=True
            )


class ToolRegistry:
    """Central registry and execution dispatcher for Engineering Agent tools."""

    def __init__(self):
        self._tools: Dict[str, ReadOnlyTool] = {}
        self._register_default_tools()

    def register(self, tool: ReadOnlyTool) -> None:
        """Register a read-only tool."""
        self._tools[tool.name] = tool
        logger.debug(f"[ToolRegistry] Registered read-only tool: '{tool.name}'")

    def get_tool(self, name: str) -> Optional[ReadOnlyTool]:
        """Retrieve a tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[ReadOnlyTool]:
        """List all registered tools."""
        return list(self._tools.values())

    def get_tool_definitions(self) -> List[ToolDefinition]:
        """Export tool definitions with JSON schemas for LLM tool calling."""
        defs = []
        for tool in self._tools.values():
            schema = tool.input_model.model_json_schema()
            defs.append(
                ToolDefinition(
                    name=tool.name,
                    description=tool.description,
                    parameters=schema,
                    is_read_only=True
                )
            )
        return defs

    async def execute_tool(
        self,
        name: str,
        args: Dict[str, Any],
        auth_token: Optional[str],
        tenant_id: Optional[str]
    ) -> ToolResult:
        """Dispatch a tool execution by name with tenant context."""
        if name in PROHIBITED_MUTATION_OPERATIONS:
            return ToolResult(
                tool_name=name,
                success=False,
                error=f"Access Denied: Tool '{name}' is a prohibited mutation action. Engineering Agent is strictly read-only.",
                duration_ms=0.0,
                is_read_only=True
            )

        tool = self.get_tool(name)
        if not tool:
            return ToolResult(
                tool_name=name,
                success=False,
                error=f"Unknown tool: '{name}'.",
                duration_ms=0.0,
                is_read_only=True
            )

        return await tool.execute(args, auth_token=auth_token, tenant_id=tenant_id)

    # -------------------------------------------------------------------------
    # Tool Handlers Registration (17 Tools)
    # -------------------------------------------------------------------------
    def _register_default_tools(self):
        # 1. get_repository
        self.register(
            ReadOnlyTool(
                name="get_repository",
                description="Fetch detailed metadata, sync statistics, default branch, and languages for a repository.",
                input_model=GetRepositoryInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 2. list_repositories
        self.register(
            ReadOnlyTool(
                name="list_repositories",
                description="Fetch all repositories monitored within the authenticated tenant.",
                input_model=ListRepositoriesInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.list_repositories(
                    auth_token=auth_token, tenant_id=tenant_id, limit=inp.limit
                )
            )
        )

        # 3. get_repository_branches
        self.register(
            ReadOnlyTool(
                name="get_repository_branches",
                description="Fetch branch names and default branch for a monitored repository.",
                input_model=GetRepositoryBranchesInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_branches(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # get_repository_sync_status
        self.register(
            ReadOnlyTool(
                name="get_repository_sync_status",
                description="Fetch background synchronization freshness, sync_status, and latest sync job info.",
                input_model=GetRepositorySyncStatusInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_sync_status(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )


        # 4. get_repository_commits
        self.register(
            ReadOnlyTool(
                name="get_repository_commits",
                description="Fetch commit history and author information for a repository.",
                input_model=GetRepositoryCommitsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_commits(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id,
                    limit=inp.limit, page=inp.page
                )
            )
        )

        # 5. get_commit_details
        self.register(
            ReadOnlyTool(
                name="get_commit_details",
                description="Fetch deep commit details, message, stats, and file diff changes.",
                input_model=GetCommitDetailsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_commit_details(
                    commit_id=inp.commit_id, auth_token=auth_token, tenant_id=tenant_id,
                    include_changes=inp.include_changes
                )
            )
        )

        # 6. get_repository_pull_requests
        self.register(
            ReadOnlyTool(
                name="get_repository_pull_requests",
                description="Fetch pull requests with optional status filtering for a repository or tenant.",
                input_model=GetRepositoryPullRequestsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_pull_requests(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id,
                    status=inp.status
                )
            )
        )

        # 7. get_pull_request_details
        self.register(
            ReadOnlyTool(
                name="get_pull_request_details",
                description="Fetch deep pull request review timeline, turnaround time, additions/deletions, and comments.",
                input_model=GetPullRequestDetailsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_pull_request_details(
                    pull_request_id=inp.pull_request_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 8. get_repository_issues
        self.register(
            ReadOnlyTool(
                name="get_repository_issues",
                description="Fetch issues for a repository or organization with optional status filtering.",
                input_model=GetRepositoryIssuesInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_issues(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id,
                    status=inp.status
                )
            )
        )

        # 9. get_issue_details
        self.register(
            ReadOnlyTool(
                name="get_issue_details",
                description="Fetch deep issue details, labels, author, and resolution state.",
                input_model=GetIssueDetailsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_issue_details(
                    issue_id=inp.issue_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 10. get_repository_developers
        self.register(
            ReadOnlyTool(
                name="get_repository_developers",
                description="Fetch contributors and developer activity rankings for the organization.",
                input_model=GetRepositoryDevelopersInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_repository_developers(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 11. get_developer_activity
        self.register(
            ReadOnlyTool(
                name="get_developer_activity",
                description="Fetch real-time activity stream and event timeline for a developer or organization.",
                input_model=GetDeveloperActivityInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_developer_activity(
                    developer_id=inp.developer_id, auth_token=auth_token, tenant_id=tenant_id,
                    limit=inp.limit
                )
            )
        )

        # 12. get_developer_commit_statistics
        self.register(
            ReadOnlyTool(
                name="get_developer_commit_statistics",
                description="Fetch developer throughput, velocity metrics, commit distribution, and churn.",
                input_model=GetDeveloperCommitStatisticsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_developer_commit_statistics(
                    developer_id=inp.developer_id, auth_token=auth_token, tenant_id=tenant_id,
                    preset=inp.preset
                )
            )
        )

        # 13. get_code_impact
        self.register(
            ReadOnlyTool(
                name="get_code_impact",
                description="Fetch lines added, deleted, churn ratio, and high impact files for a repository or tenant.",
                input_model=GetCodeImpactInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_code_impact(
                    repository_id=inp.repository_id, auth_token=auth_token, tenant_id=tenant_id,
                    timeframe=inp.timeframe
                )
            )
        )

        # 14. get_project
        self.register(
            ReadOnlyTool(
                name="get_project",
                description="Fetch high-level project metadata, description, and status.",
                input_model=GetProjectInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_project(
                    project_id=inp.project_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 15. get_project_repositories
        self.register(
            ReadOnlyTool(
                name="get_project_repositories",
                description="Fetch all repositories assigned to a specific project.",
                input_model=GetProjectRepositoriesInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_project_repositories(
                    project_id=inp.project_id, auth_token=auth_token, tenant_id=tenant_id
                )
            )
        )

        # 16. get_project_statistics
        self.register(
            ReadOnlyTool(
                name="get_project_statistics",
                description="Fetch aggregated KPI benchmarks, commit totals, developer counts, and activity trends for a project.",
                input_model=GetProjectStatisticsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_project_statistics(
                    project_id=inp.project_id, auth_token=auth_token, tenant_id=tenant_id,
                    preset=inp.preset
                )
            )
        )

        # 17. get_dashboard_analytics
        self.register(
            ReadOnlyTool(
                name="get_dashboard_analytics",
                description="Fetch workspace overview telemetry, active developers count, commits, and open PR totals.",
                input_model=GetDashboardAnalyticsInput,
                handler=lambda inp, auth_token, tenant_id: express_api_client.get_dashboard_analytics(
                    auth_token=auth_token, tenant_id=tenant_id, timeframe=inp.timeframe
                )
            )
        )


tool_registry = ToolRegistry()
