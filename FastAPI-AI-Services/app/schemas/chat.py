from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator

class HealthCheckResponse(BaseModel):
    status: str = "ok"
    service: str = "GitHub Project Monitoring FastAPI AI Microservice"
    environment: str = "development"
    version: str = "1.0.0"

class ChatPromptRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Optional conversation session identifier")
    message: Optional[str] = Field(None, description="User query message")
    prompt: Optional[str] = Field(None, description="User query prompt (alias)")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional client context")

    @model_validator(mode="before")
    @classmethod
    def sync_message_prompt(cls, data: Any) -> Any:
        if isinstance(data, dict):
            text = data.get("message") or data.get("prompt") or ""
            data["message"] = text
            data["prompt"] = text
        return data

class ChatResponseData(BaseModel):
    message_id: str
    conversation_id: str
    answer: str
    metrics: Optional[List[Dict[str, Any]]] = None
    sources: Optional[List[Dict[str, Any]]] = None
    actions: Optional[List[Dict[str, Any]]] = None

class ChatResponseEnvelope(BaseModel):
    success: bool = True
    data: ChatResponseData
    message: Optional[str] = "Response generated successfully"

class TestProviderRequest(BaseModel):
    prompt: Optional[str] = Field("Hello! Please confirm that the AI provider connection is active.", description="Test prompt")

class TestProviderResponse(BaseModel):
    success: bool = True
    provider: str
    model: str
    answer: str
    latency_ms: float
    usage: Optional[Dict[str, Any]] = None
    message: str = "AI Provider test completed successfully"

# ==============================================================================
# CONVERSATION MANAGEMENT SCHEMAS
# ==============================================================================

class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field("New Conversation", description="Optional conversation title")

class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="New title for the conversation")

class ConversationSchema(BaseModel):
    id: str
    user_id: str
    organization_id: Optional[str] = None
    title: str
    is_pinned: bool = False
    is_deleted: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages_count: int = 0

class MessageSchema(BaseModel):
    id: str
    conversation_id: str
    sender: str
    content: str
    metrics: Optional[List[Dict[str, Any]]] = None
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[str] = None

class ConversationResponseEnvelope(BaseModel):
    success: bool = True
    conversation: Dict[str, Any]
    message: Optional[str] = "Operation successful"

class ConversationListEnvelope(BaseModel):
    success: bool = True
    conversations: List[Dict[str, Any]]
    count: int
    message: Optional[str] = "Conversations retrieved successfully"

class MessageListEnvelope(BaseModel):
    success: bool = True
    conversation_id: str
    messages: List[Dict[str, Any]]
    count: int
    message: Optional[str] = "Messages retrieved successfully"


