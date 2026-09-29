"""
Schemas and Input Models for Engineering Agent Read-Only Tool Layer.
Enforces strict input validation and structured execution outputs.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ToolResult(BaseModel):
    """Standardized output envelope returned by any tool execution."""
    tool_name: str = Field(..., description="Name of the executed tool")
    success: bool = Field(..., description="True if the execution completed without unhandled errors")
    data: Optional[Any] = Field(default=None, description="Structured result data from the backend")
    error: Optional[str] = Field(default=None, description="Human-readable error description if failed")
    duration_ms: float = Field(default=0.0, description="Execution latency in milliseconds")
    is_read_only: bool = Field(default=True, description="Strictly True for all Engineering Agent tools")


class ToolDefinition(BaseModel):
    """Metadata describing a tool and its JSON schema for LLM agent selection."""
    name: str
    description: str
    parameters: Dict[str, Any]
    is_read_only: bool = True


# =============================================================================
# Input Validation Models for the 17 Read-Only Tools
# =============================================================================

class GetRepositoryInput(BaseModel):
    """Input for retrieving detailed repository metadata and sync stats."""
    repository_id: str = Field(..., min_length=1, description="Unique identifier or UUID of the repository")


class ListRepositoriesInput(BaseModel):
    """Input for listing all repositories monitored in the tenant."""
    limit: Optional[int] = Field(50, ge=1, le=200, description="Maximum number of repositories to return")


class GetRepositoryBranchesInput(BaseModel):
    """Input for inspecting repository branches and default branch."""
    repository_id: str = Field(..., min_length=1, description="Repository ID")


class GetRepositoryCommitsInput(BaseModel):
    """Input for retrieving commit history for a repository."""
    repository_id: str = Field(..., min_length=1, description="Repository ID")
    limit: Optional[int] = Field(50, ge=1, le=100, description="Maximum commits to return")
    page: Optional[int] = Field(1, ge=1, description="Pagination page index")


class GetCommitDetailsInput(BaseModel):
    """Input for fetching deep commit details and file diffs."""
    commit_id: str = Field(..., min_length=1, description="Commit ID or SHA hash")
    include_changes: Optional[bool] = Field(True, description="Whether to include modified file diff stats")


class GetRepositoryPullRequestsInput(BaseModel):
    """Input for listing pull requests associated with a repository."""
    repository_id: Optional[str] = Field(None, description="Optional target repository ID to filter PRs")
    status: Optional[str] = Field(None, description="Filter by status: open, closed, merged")
    limit: Optional[int] = Field(50, ge=1, le=100, description="Maximum PRs to return")


class GetPullRequestDetailsInput(BaseModel):
    """Input for fetching deep pull request details, reviews, and turnaround time."""
    pull_request_id: str = Field(..., min_length=1, description="Pull Request ID or number")


class GetRepositoryIssuesInput(BaseModel):
    """Input for listing issues associated with a repository or organization."""
    repository_id: Optional[str] = Field(None, description="Optional target repository ID to filter issues")
    status: Optional[str] = Field(None, description="Filter by status: open, closed")
    limit: Optional[int] = Field(50, ge=1, le=100, description="Maximum issues to return")


class GetIssueDetailsInput(BaseModel):
    """Input for fetching deep issue details and resolution lifecycle."""
    issue_id: str = Field(..., min_length=1, description="Issue ID or number")


class GetRepositoryDevelopersInput(BaseModel):
    """Input for listing contributors and developers in the organization/repository."""
    repository_id: Optional[str] = Field(None, description="Optional repository ID to filter contributors")


class GetDeveloperActivityInput(BaseModel):
    """Input for retrieving developer recent activity feed and timelines."""
    developer_id: Optional[str] = Field(None, description="Optional target developer ID or login")
    limit: Optional[int] = Field(50, ge=1, le=100, description="Maximum events to return")


class GetDeveloperCommitStatisticsInput(BaseModel):
    """Input for calculating developer throughput, commits, and churn statistics."""
    developer_id: str = Field(..., min_length=1, description="Developer ID or login handle")
    preset: Optional[str] = Field("30d", description="Timeframe preset: 7d, 30d, 90d, all")


class GetCodeImpactInput(BaseModel):
    """Input for retrieving code impact, additions, deletions, and churn analysis."""
    repository_id: Optional[str] = Field(None, description="Optional repository ID to scope code churn")
    timeframe: Optional[str] = Field("30d", description="Timeframe for code churn analysis")


class GetProjectInput(BaseModel):
    """Input for retrieving high-level project metadata and scope."""
    project_id: str = Field(..., min_length=1, description="Target project ID")


class GetProjectRepositoriesInput(BaseModel):
    """Input for retrieving all repositories linked to a project."""
    project_id: str = Field(..., min_length=1, description="Target project ID")


class GetProjectStatisticsInput(BaseModel):
    """Input for calculating aggregated project metrics and KPI benchmarks."""
    project_id: str = Field(..., min_length=1, description="Target project ID")
    preset: Optional[str] = Field("30d", description="Timeframe preset: 7d, 30d, 90d, all")


class GetDashboardAnalyticsInput(BaseModel):
    """Input for retrieving top-level SaaS tenant engineering health and telemetry."""
    timeframe: Optional[str] = Field("30d", description="Timeframe preset: 7d, 30d, 90d, all")
