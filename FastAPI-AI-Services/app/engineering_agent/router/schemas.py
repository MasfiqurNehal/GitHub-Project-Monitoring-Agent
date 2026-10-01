"""
Intent Routing Schemas and Taxonomy for Engineering AI Agent.
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class IntentCategory(str, Enum):
    """Supported Intent Taxonomy for GitHub Engineering Agent (Phase 26)."""
    # Core 7 Query Routing Classes (Phase 26 Part 8)
    GREETING = "greeting"
    CASUAL = "casual"
    INVALID_OR_UNCLEAR = "invalid_or_unclear"
    GENERAL_TECHNICAL = "general_technical"
    GITHUB_PROJECT_ANALYSIS = "github_project_analysis"
    GENERAL_ENGINEERING = "general_engineering"
    FOLLOW_UP = "follow_up"

    # Specific GitHub & Specialized Analytics Sub-Intents
    REPOSITORY_INFO = "repository_info"
    REPOSITORY_QUERY = "repository_info"
    PROJECT_INFO = "project_info"
    PROJECT_QUERY = "project_info"
    DEVELOPER_INFO = "developer_info"
    DEVELOPER_QUERY = "developer_info"
    COMMIT_INFO = "commit_info"
    COMMIT_QUERY = "commit_info"
    PULL_REQUEST_INFO = "pull_request_info"
    PULL_REQUEST_QUERY = "pull_request_info"
    ISSUE_INFO = "issue_info"
    ISSUE_QUERY = "issue_info"
    CODE_IMPACT = "code_impact"
    ENGINEERING_ANALYSIS = "code_impact"
    DASHBOARD_ANALYTICS = "dashboard_analytics"
    PROJECT_REPORT = "dashboard_analytics"
    CROSS_REPOSITORY_ANALYTICS = "cross_repository_analytics"
    GENERAL_ENGINEERING_QA = "general_engineering_qa"
    GENERAL_TECHNICAL_QA = "general_engineering_qa"
    FOLLOW_UP_QUERY = "follow_up_query"
    AMBIGUOUS_QUERY = "ambiguous_query"
    UNSUPPORTED_NON_IT = "unsupported_non_it"

class ExtractedEntities(BaseModel):
    """Structured entities extracted from user prompt."""
    repository_name: Optional[str] = Field(None, description="Identified or mentioned repository name/alias")
    developer_name: Optional[str] = Field(None, description="Identified developer name, login, or handle")
    project_name: Optional[str] = Field(None, description="Identified project title or alias")
    timeframe: Optional[str] = Field(None, description="Extracted time window (e.g., today, 7d, last week, 30d)")
    metric_targets: List[str] = Field(default_factory=list, description="Target metrics (commits, prs, additions, etc.)")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Custom parameters or query filters")

class IntentClassificationResult(BaseModel):
    """Full routing decision returned by the Engineering Intent Router."""
    intent: IntentCategory = Field(..., description="Classified intent category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Routing confidence score (0.0 - 1.0)")
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities, description="Extracted entities and filters")
    requires_clarification: bool = Field(False, description="True if prompt is critically ambiguous or low confidence")
    clarification_prompt: Optional[str] = Field(None, description="Clarifying question if ambiguity is detected")
    suggested_options: List[str] = Field(default_factory=list, description="Suggested quick-action options for the user")
    routing_strategy: str = Field("deterministic", description="Strategy used: 'deterministic' | 'llm' | 'hybrid'")
