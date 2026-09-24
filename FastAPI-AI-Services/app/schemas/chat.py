from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class HealthCheckResponse(BaseModel):
    status: str = "ok"
    service: str = "GitHub Project Monitoring FastAPI AI Microservice"
    environment: str = "development"
    version: str = "1.0.0"

class ChatPromptRequest(BaseModel):
    conversation_id: str = Field(..., description="Unique conversation session identifier")
    prompt: str = Field(..., description="User query prompt")
    user_id: Optional[str] = Field(None, description="Authenticated user ID")
    organization_id: Optional[str] = Field(None, description="Tenant organization ID")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional client context")

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

