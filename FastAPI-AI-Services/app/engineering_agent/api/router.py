"""
Engineering AI Agent API Router.
Mounted under /api/v1/engineering-agent.
Provides Autonomous Multi-Agent Chat Analysis and Secure, Tenant-Isolated Conversation Management (Phase 21).
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Security, HTTPException, status, Query
from fastapi.security import HTTPAuthorizationCredentials

from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.schemas.response import EngineeringAgentResponse
from app.engineering_agent.schemas.conversation import (
    CreateEngineeringConversationRequest,
    RenameEngineeringConversationRequest,
    EngineeringConversationSummary,
    EngineeringConversationDetail,
    EngineeringConversationListEnvelope,
    EngineeringConversationDetailEnvelope,
    EngineeringConversationActionResponse,
    EngineeringMessageItem
)
from app.engineering_agent.core.service import engineering_agent_service
from app.db.connection import db_manager
from app.db.engineering_repository import engineering_chat_repository
from app.utils.auth import get_current_user, AuthenticatedUser, security_bearer
from app.utils.logger import logger

engineering_agent_router = APIRouter(prefix="/engineering-agent", tags=["Engineering AI Agent"])


import json
from fastapi.responses import StreamingResponse

# =============================================================================
# 1. Agent Execution Endpoints (JSON & Server-Sent Events SSE)
# =============================================================================

@engineering_agent_router.post("/chat", response_model=EngineeringAgentResponse)
async def execute_engineering_agent(
    request: EngineeringAgentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> EngineeringAgentResponse:
    """
    Execute autonomous multi-step engineering analysis within the authenticated tenant context.
    Communicates with Express.js backend tools on behalf of the tenant.
    """
    raw_token = credentials.credentials if credentials else None
    return await engineering_agent_service.execute_agent(
        request=request,
        user=current_user,
        raw_token=raw_token
    )


@engineering_agent_router.post("/chat/stream")
async def execute_engineering_agent_stream(
    request: EngineeringAgentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
):
    """
    Execute engineering agent analysis with real-time Server-Sent Events (SSE) progress streaming (Phase 25 Part 12).
    Yields agent_started, intent_detected, tool_completed, llm_completed, and response_completed events.
    """
    raw_token = credentials.credentials if credentials else None

    async def event_generator():
        async for event in engineering_agent_service.execute_agent_stream(
            request=request,
            user=current_user,
            raw_token=raw_token
        ):
            event_type = event.get("event", "message")
            event_data = json.dumps(event.get("data", {}))
            yield f"event: {event_type}\ndata: {event_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )



# =============================================================================
# 2. Persistent Conversation Management Endpoints (Phase 21)
# =============================================================================

@engineering_agent_router.post(
    "/conversations",
    response_model=EngineeringConversationDetailEnvelope,
    status_code=status.HTTP_201_CREATED
)
async def create_engineering_conversation(
    request: CreateEngineeringConversationRequest = CreateEngineeringConversationRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EngineeringConversationDetailEnvelope:
    """
    Explicitly create a new persistent conversation session for the authenticated user and organization.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context required. Authenticated token is missing an organization identifier."
        )

    if not db_manager.session_factory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized."
        )

    async with db_manager.session_factory() as session:
        conv = await engineering_chat_repository.create_conversation(
            session=session,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            title=request.title or "New Engineering Analysis",
            project_id=request.project_id,
            repository_id=request.repository_id,
            developer_id=request.developer_id
        )
        conv_dict = conv.to_dict()
        conv_dict["messages"] = []
        return EngineeringConversationDetailEnvelope(
            success=True,
            conversation=EngineeringConversationDetail(**conv_dict),
            message="Conversation created successfully."
        )


@engineering_agent_router.get(
    "/conversations",
    response_model=EngineeringConversationListEnvelope
)
async def list_engineering_conversations(
    current_user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> EngineeringConversationListEnvelope:
    """
    List all active (non-deleted) conversations owned by the authenticated user in their organization.
    Ordered by updated_at DESC for ChatGPT-style recency.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context required. Authenticated token is missing an organization identifier."
        )

    if not db_manager.session_factory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized."
        )

    async with db_manager.session_factory() as session:
        convs = await engineering_chat_repository.list_conversations(
            session=session,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            limit=limit,
            offset=offset
        )
        summaries = [EngineeringConversationSummary(**c.to_dict()) for c in convs]
        return EngineeringConversationListEnvelope(
            success=True,
            conversations=summaries,
            count=len(summaries),
            message="Conversations retrieved successfully."
        )


@engineering_agent_router.get(
    "/conversations/{conversation_id}",
    response_model=EngineeringConversationDetailEnvelope
)
async def get_engineering_conversation_details(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EngineeringConversationDetailEnvelope:
    """
    Fetch complete metadata and ordered message history for a conversation.
    Enforces strict tenant and user ownership.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context required. Authenticated token is missing an organization identifier."
        )

    if not db_manager.session_factory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized."
        )

    async with db_manager.session_factory() as session:
        conv = await engineering_chat_repository.get_conversation(
            session=session,
            conversation_id=conversation_id,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            include_messages=True
        )
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )

        conv_dict = conv.to_dict()
        conv_dict["messages"] = [
            EngineeringMessageItem(**m.to_dict())
            for m in (conv.messages or [])
        ]
        return EngineeringConversationDetailEnvelope(
            success=True,
            conversation=EngineeringConversationDetail(**conv_dict),
            message="Conversation details retrieved successfully."
        )


@engineering_agent_router.patch(
    "/conversations/{conversation_id}",
    response_model=EngineeringConversationDetailEnvelope
)
async def rename_engineering_conversation(
    conversation_id: str,
    request: RenameEngineeringConversationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EngineeringConversationDetailEnvelope:
    """
    Rename an engineering conversation title.
    Updates the updated_at timestamp without triggering agent execution.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context required. Authenticated token is missing an organization identifier."
        )

    if not db_manager.session_factory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized."
        )

    async with db_manager.session_factory() as session:
        updated_conv = await engineering_chat_repository.rename_conversation(
            session=session,
            conversation_id=conversation_id,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            new_title=request.title.strip()
        )
        if not updated_conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )

        conv_dict = updated_conv.to_dict()
        conv_dict["messages"] = [
            EngineeringMessageItem(**m.to_dict())
            for m in (updated_conv.messages or [])
        ]
        return EngineeringConversationDetailEnvelope(
            success=True,
            conversation=EngineeringConversationDetail(**conv_dict),
            message="Conversation renamed successfully."
        )


@engineering_agent_router.delete(
    "/conversations/{conversation_id}",
    response_model=EngineeringConversationActionResponse
)
async def delete_engineering_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> EngineeringConversationActionResponse:
    """
    Soft-delete an engineering conversation (sets is_deleted=True).
    The conversation will no longer appear in active lists.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context required. Authenticated token is missing an organization identifier."
        )

    if not db_manager.session_factory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized."
        )

    async with db_manager.session_factory() as session:
        success = await engineering_chat_repository.soft_delete_conversation(
            session=session,
            conversation_id=conversation_id,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied."
            )

        return EngineeringConversationActionResponse(
            success=True,
            message="Conversation deleted successfully.",
            conversation_id=conversation_id
        )


# =============================================================================
# 3. Microservice Health Check
# =============================================================================

@engineering_agent_router.get("/health")
async def engineering_agent_health():
    """Health check for Engineering AI Agent microservice."""
    return {
        "status": "online",
        "module": "engineering_agent",
        "version": "1.0.0",
        "capabilities": [
            "developer_activity_analysis",
            "repository_comparison",
            "report_generation",
            "project_investigation",
            "telemetry_aggregation",
            "persistent_conversations"
        ]
    }
