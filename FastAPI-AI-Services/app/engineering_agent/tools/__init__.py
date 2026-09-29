"""
Engineering Agent Tool Layer Module.
Provides 17 strictly read-only tools for GitHub monitoring, repository metrics, developer velocity, and project analytics.
"""
from app.engineering_agent.tools.schemas import (
    ToolResult,
    ToolDefinition,
    GetRepositoryInput,
    ListRepositoriesInput,
    GetRepositoryBranchesInput,
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
from app.engineering_agent.tools.express_client import express_api_client, ExpressApiClient
from app.engineering_agent.tools.registry import tool_registry, ToolRegistry, ReadOnlyTool, PROHIBITED_MUTATION_OPERATIONS

__all__ = [
    "express_api_client",
    "ExpressApiClient",
    "tool_registry",
    "ToolRegistry",
    "ReadOnlyTool",
    "ToolResult",
    "ToolDefinition",
    "PROHIBITED_MUTATION_OPERATIONS",
    "GetRepositoryInput",
    "ListRepositoriesInput",
    "GetRepositoryBranchesInput",
    "GetRepositoryCommitsInput",
    "GetCommitDetailsInput",
    "GetRepositoryPullRequestsInput",
    "GetPullRequestDetailsInput",
    "GetRepositoryIssuesInput",
    "GetIssueDetailsInput",
    "GetRepositoryDevelopersInput",
    "GetDeveloperActivityInput",
    "GetDeveloperCommitStatisticsInput",
    "GetCodeImpactInput",
    "GetProjectInput",
    "GetProjectRepositoriesInput",
    "GetProjectStatisticsInput",
    "GetDashboardAnalyticsInput"
]
