"""
Chatbot API Endpoints.
All routes strictly require authentication via JWT Bearer tokens and enforce user-level data isolation.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.chat import (
    ChatPromptRequest,
    ChatResponseEnvelope,
    TestProviderRequest,
    TestProviderResponse,
)
from app.services.chatbot_service import chatbot_service
from app.providers.ai_provider import ai_provider, AIProviderException
from app.utils.auth import get_current_user, AuthenticatedUser

chatbot_router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@chatbot_router.post("/chat", response_model=ChatResponseEnvelope)
async def process_chat(
    request: ChatPromptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Process user prompt and return AI completion.
    Requires Bearer JWT token. Binds conversation ownership to current_user.id.
    """
    return await chatbot_service.process_chat_message(request, current_user)


@chatbot_router.get("/conversations")
async def get_user_conversations(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieve all conversation history records owned by the authenticated user.
    Strictly isolated: User A only receives User A's conversations.
    """
    convs = await chatbot_service.get_user_conversations(current_user)
    return {"success": True, "conversations": convs, "count": len(convs)}


@chatbot_router.get("/conversations/{conversation_id}")
async def get_conversation_details(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Fetch details & message history for a specific conversation.
    Returns 404/403 if the conversation does not belong to the current authenticated user.
    """
    details = await chatbot_service.get_conversation_details(conversation_id, current_user)
    return {"success": True, "conversation": details}


@chatbot_router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Delete a conversation session owned by the authenticated user.
    """
    success = await chatbot_service.delete_conversation(conversation_id, current_user)
    return {"success": success, "message": "Conversation deleted successfully."}


@chatbot_router.delete("/history")
async def clear_chat_history(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Clear all conversation history owned by the authenticated user.
    """
    count = await chatbot_service.clear_user_history(current_user)
    return {"success": True, "cleared_count": count, "message": f"Cleared {count} conversation records."}


@chatbot_router.post("/test-provider", response_model=TestProviderResponse)
async def test_ai_provider(
    request: TestProviderRequest = TestProviderRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Test the configured AI provider with an authenticated test prompt."""
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
            message=f"AI Provider test request succeeded for user {current_user.email}"
        )
    except AIProviderException as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=f"AI Provider error ({exc.status_code}): {exc.message}"
        )
