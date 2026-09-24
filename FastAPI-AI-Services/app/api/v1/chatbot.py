from fastapi import APIRouter, HTTPException
from app.schemas.chat import (
    ChatPromptRequest,
    ChatResponseEnvelope,
    TestProviderRequest,
    TestProviderResponse,
)
from app.services.chatbot_service import chatbot_service
from app.providers.ai_provider import ai_provider, AIProviderException

chatbot_router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@chatbot_router.post("/chat", response_model=ChatResponseEnvelope)
async def process_chat(request: ChatPromptRequest):
    return await chatbot_service.process_chat_message(request)

@chatbot_router.post("/test-provider", response_model=TestProviderResponse)
async def test_ai_provider(request: TestProviderRequest = TestProviderRequest()):
    """Test the configured AI provider with a test prompt."""
    try:
        messages = [
            {"role": "user", "content": request.prompt or "Hello! Please confirm that the AI provider connection is active."}
        ]
        result = await ai_provider.generate_completion(messages=messages)
        return TestProviderResponse(
            success=True,
            provider=result.get("provider", "unknown"),
            model=result.get("model", "unknown"),
            answer=result.get("answer", ""),
            latency_ms=result.get("latency_ms", 0.0),
            usage=result.get("usage"),
            message="AI Provider test request succeeded"
        )
    except AIProviderException as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=f"AI Provider error ({exc.status_code}): {exc.message}"
        )

