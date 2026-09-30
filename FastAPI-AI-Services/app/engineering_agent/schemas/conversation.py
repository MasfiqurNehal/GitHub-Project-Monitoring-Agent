"""
Pydantic Schemas for Engineering AI Agent Persistent Conversations & Messages (Phase 21).
Enforces Tenant and User Scoping, Strict Validation, and Multi-Agent Telemetry Structure.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CreateEngineeringConversationRequest(BaseModel):
    """Payload for creating a new Engineering Agent conversation."""
    title: Optional[str] = Field(default="New Engineering Analysis", max_length=255, description="Initial conversation title")
    project_id: Optional[str] = Field(default=None, max_length=64, description="Optional associated project identifier")
    repository_id: Optional[str] = Field(default=None, max_length=64, description="Optional associated repository identifier")
    developer_id: Optional[str] = Field(default=None, max_length=64, description="Optional associated developer identifier")


class RenameEngineeringConversationRequest(BaseModel):
    """Payload for updating an Engineering Agent conversation title."""
    title: str = Field(min_length=1, max_length=255, description="Updated conversation title")


class EngineeringMessageItem(BaseModel):
    """Structured representation of an individual message in an engineering conversation."""
    id: str
    conversation_id: str
    organization_id: str
    user_id: str
    sender: str
    content: str
    detected_intent: Optional[str] = None
    selected_agent: Optional[str] = None
    metrics: Optional[List[Dict[str, Any]]] = None
    artifacts: Optional[List[Dict[str, Any]]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    tools_executed: Optional[List[Dict[str, Any]]] = None
    execution_time_ms: Optional[float] = None
    created_at: Optional[str] = None


class EngineeringConversationSummary(BaseModel):
    """Summary representation of an engineering conversation for list views."""
    id: str
    organization_id: str
    user_id: str
    title: str
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    developer_id: Optional[str] = None
    is_pinned: bool = False
    is_deleted: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages_count: int = 0


class EngineeringConversationDetail(BaseModel):
    """Detailed representation of an engineering conversation including ordered messages."""
    id: str
    organization_id: str
    user_id: str
    title: str
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    developer_id: Optional[str] = None
    is_pinned: bool = False
    is_deleted: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages_count: int = 0
    messages: List[EngineeringMessageItem] = []


class EngineeringConversationListEnvelope(BaseModel):
    """Response envelope for listing engineering conversations."""
    success: bool = True
    conversations: List[EngineeringConversationSummary] = []
    count: int = 0
    message: str = "Conversations retrieved successfully."


class EngineeringConversationDetailEnvelope(BaseModel):
    """Response envelope for single conversation details."""
    success: bool = True
    conversation: Optional[EngineeringConversationDetail] = None
    message: str = "Conversation retrieved successfully."


class EngineeringConversationActionResponse(BaseModel):
    """Response envelope for mutation actions (delete/clear)."""
    success: bool = True
    message: str = "Action completed successfully."
    conversation_id: Optional[str] = None
