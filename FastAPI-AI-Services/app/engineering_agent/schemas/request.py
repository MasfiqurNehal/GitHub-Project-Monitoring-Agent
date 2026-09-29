"""
Request Schemas for Engineering AI Agent.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class EngineeringAgentRequest(BaseModel):
    """Input payload for the Engineering AI Agent."""
    message: str = Field(..., min_length=1, max_length=10000, description="User instruction, prompt, or analytical query")
    project_id: Optional[str] = Field(None, description="Optional target project ID to scope the analysis")
    repository_id: Optional[str] = Field(None, description="Optional target repository ID to scope the analysis")
    conversation_id: Optional[str] = Field(None, description="Optional session or conversation ID for multi-turn tracking")
    tenant_id: Optional[str] = Field(None, description="Optional explicit organization/tenant ID override")
    user_id: Optional[str] = Field(None, description="Optional explicit user ID")
    agent_mode: Optional[str] = Field("auto", description="Execution mode: auto, deep_analysis, velocity, report, comparison")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional custom filtering or tool parameters")

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Analyze commit velocity and pull request review turnaround for our frontend repository.",
                "project_id": "prj-1790588404060",
                "repository_id": "repo-fe-12345",
                "agent_mode": "auto",
                "parameters": {
                    "timeframe": "30d"
                }
            }
        }
    }
