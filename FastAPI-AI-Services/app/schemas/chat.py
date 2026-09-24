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

