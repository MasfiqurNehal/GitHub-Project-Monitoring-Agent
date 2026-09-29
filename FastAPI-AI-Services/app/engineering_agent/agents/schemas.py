"""
Input and Output Schemas for Engineering Specialist Agents.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SpecialistExecutionResult(BaseModel):
    """Normalized output from a specialist sub-agent execution."""
    agent_id: str = Field(..., description="Unique identifier of the specialist agent")
    agent_name: str = Field(..., description="Human-readable name of the specialist agent")
    success: bool = Field(True, description="True if telemetry gathering and analysis succeeded")
    data: Dict[str, Any] = Field(default_factory=dict, description="Structured aggregated telemetry collected by tools")
    metrics: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted numerical KPI metrics")
    actions: List[Dict[str, str]] = Field(default_factory=list, description="Recommended UI navigation actions")
    summary: Optional[str] = Field(None, description="Specialist synthesis or status note")
    tools_used: List[str] = Field(default_factory=list, description="List of tool names executed by the specialist")
    duration_ms: float = Field(0.0, description="Total execution duration in milliseconds")
    error: Optional[str] = Field(None, description="Error message if execution encountered failures")
