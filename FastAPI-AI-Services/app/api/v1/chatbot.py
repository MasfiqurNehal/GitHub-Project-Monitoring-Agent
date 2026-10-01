"""
Chatbot API Endpoints.
All routes strictly require authentication via JWT Bearer tokens and enforce user-level data isolation.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.chat import (
    ChatPromptRequest,
    ChatResponseEnvelope,
    CreateConversationRequest,
    RenameConversationRequest,
    ConversationResponseEnvelope,
    ConversationListEnvelope,
    MessageListEnvelope,
    TestProviderRequest,
    TestProviderResponse,
)
from app.services.chatbot_service import chatbot_service
from app.providers.ai_provider import ai_provider, AIProviderException
from app.utils.auth import get_current_user, AuthenticatedUser

chatbot_router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# 1. Send chat message / Continue conversation
@chatbot_router.post("/chat", response_model=ChatResponseEnvelope)
async def process_chat(
    request: ChatPromptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Process user prompt and return AI completion.
    Binds conversation ownership to current_user.id.
    """
    return await chatbot_service.process_chat_message(request, current_user)


# 2. Create a new conversation session explicitly
@chatbot_router.post("/conversations", response_model=ConversationResponseEnvelope)
async def create_conversation(
    request: CreateConversationRequest = CreateConversationRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Explicitly create a new conversation session for the authenticated user.
    """
    conv = await chatbot_service.create_conversation(current_user, request.title)
    return ConversationResponseEnvelope(
        success=True,
        conversation=conv,
        message="Conversation created successfully."
    )


# 3. List all active conversations owned by user
@chatbot_router.get("/conversations", response_model=ConversationListEnvelope)
async def get_user_conversations(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieve all conversation history records owned by the authenticated user.
    """
    convs = await chatbot_service.get_user_conversations(current_user)
    return ConversationListEnvelope(
        success=True,
        conversations=convs,
        count=len(convs),
        message="Conversations retrieved successfully."
    )


# 4. Get a specific conversation session
@chatbot_router.get("/conversations/{conversation_id}", response_model=ConversationResponseEnvelope)
async def get_conversation_details(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Fetch details & message history for a specific conversation.
    Enforces user ownership: Returns 404 if access denied.
    """
    details = await chatbot_service.get_conversation_details(conversation_id, current_user)
    return ConversationResponseEnvelope(
        success=True,
        conversation=details,
        message="Conversation details retrieved successfully."
    )


# 5. Get conversation messages
@chatbot_router.get("/conversations/{conversation_id}/messages", response_model=MessageListEnvelope)
async def get_conversation_messages(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Fetch messages for a specific conversation session.
    """
    messages = await chatbot_service.get_conversation_messages(conversation_id, current_user)
    return MessageListEnvelope(
        success=True,
        conversation_id=conversation_id,
        messages=messages,
        count=len(messages),
        message="Messages retrieved successfully."
    )


# 6. Continue specific conversation session
@chatbot_router.post("/conversations/{conversation_id}/chat", response_model=ChatResponseEnvelope)
async def continue_conversation_chat(
    conversation_id: str,
    request: ChatPromptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Continue conversation session specified in URL path.
    """
    request.conversation_id = conversation_id
    return await chatbot_service.process_chat_message(request, current_user)


# 7. Rename conversation title
@chatbot_router.patch("/conversations/{conversation_id}", response_model=ConversationResponseEnvelope)
async def rename_conversation(
    conversation_id: str,
    request: RenameConversationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Rename a conversation session title.
    """
    conv = await chatbot_service.rename_conversation(conversation_id, current_user, request.title)
    return ConversationResponseEnvelope(
        success=True,
        conversation=conv,
        message="Conversation renamed successfully."
    )


# 8. Delete one conversation
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


# 9. Clear all conversations history
@chatbot_router.delete("/history")
async def clear_chat_history(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Clear all conversation history owned by the authenticated user.
    """
    count = await chatbot_service.clear_user_history(current_user)
    return {"success": True, "cleared_count": count, "message": f"Cleared {count} conversation records."}


# 10. Safe Configuration Diagnostic Endpoint (Never prints secret values)
@chatbot_router.get("/config-status")
async def get_config_status(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Diagnostic report for environment variable status.
    NEVER exposes raw API keys or secrets.
    """
    from app.config import settings
    return {
        "success": True,
        "environment": settings.ENVIRONMENT,
        "config": {
            "AI_PROVIDER": "configured" if settings.AI_PROVIDER else "missing",
            "AI_BASE_URL": "configured" if settings.AI_BASE_URL else "missing",
            "AI_API_KEY": "configured" if settings.AI_API_KEY else "missing",
            "AI_MODEL": settings.AI_MODEL if settings.AI_MODEL else "missing",
            "DATABASE_URL": "configured" if settings.DATABASE_URL else "missing",
            "JWT_SECRET": "configured" if settings.JWT_SECRET else "missing",
        }
    }


# 11. Test provider connectivity
@chatbot_router.post("/test-provider", response_model=TestProviderResponse)
async def test_ai_provider(
    request: TestProviderRequest = TestProviderRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Test the configured AI provider with an authenticated test prompt."""
    try:
        test_prompt = request.prompt or "Reply with exactly: CHATBOT_LLM_OK"
        messages = [
            {"role": "user", "content": test_prompt}
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

