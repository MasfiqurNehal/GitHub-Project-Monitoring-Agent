"""
Chatbot Business Logic Service Layer.
Coordinates AI completion generation, database persistence, and user authorization checks.
"""
import time
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from app.db.connection import db_manager
from app.db.repository import chatbot_repository
from app.providers.ai_provider import ai_provider, AIProviderException
from app.schemas.chat import ChatPromptRequest, ChatResponseData, ChatResponseEnvelope
from app.utils.auth import AuthenticatedUser
from app.utils.logger import logger

class ChatbotService:
    async def process_chat_message(
        self,
        request: ChatPromptRequest,
        user: AuthenticatedUser
    ) -> ChatResponseEnvelope:
        """
        Process user chat request:
        1. Validates or creates conversation owned by user.id.
        2. Saves user prompt message to DB.
        3. Invokes AI Provider.
        4. Saves AI assistant response message to DB.
        5. Returns structured ChatResponseEnvelope.
        """
        logger.info(f"[ChatService] User '{user.email}' ({user.id}) prompt: '{request.prompt[:40]}...'")

        if not db_manager.session_factory:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection pool is not initialized."
            )

        async with db_manager.session_factory() as session:
            # 1. Check if conversation exists & belongs to user
            conv_id = request.conversation_id
            existing_conv = await chatbot_repository.get_conversation_by_id(
                session=session,
                conversation_id=conv_id,
                user_id=user.id
            )

            if not existing_conv:
                # Derive title from prompt
                title = request.prompt[:35] + ("..." if len(request.prompt) > 35 else "")
                existing_conv = await chatbot_repository.create_conversation(
                    session=session,
                    user_id=user.id,
                    organization_id=user.organization_id,
                    title=title,
                    custom_id=conv_id
                )

            # 2. Save user prompt message
            await chatbot_repository.add_message(
                session=session,
                conversation_id=existing_conv.id,
                sender="user",
                content=request.prompt
            )

            # 3. Build context & fetch historical messages
            history_messages = await chatbot_repository.get_conversation_messages(
                session=session,
                conversation_id=existing_conv.id,
                user_id=user.id
            )

            messages_for_ai: List[Dict[str, str]] = []
            messages_for_ai.append({
                "role": "system",
                "content": "You are GitMonitor AI Assistant, an expert engineering analytics assistant for GitHub projects."
            })
            for m in history_messages[-10:]:
                role = "assistant" if m.sender == "assistant" else "user"
                messages_for_ai.append({"role": role, "content": m.content})

            # 4. Generate AI Completion
            try:
                ai_result = await ai_provider.generate_completion(messages=messages_for_ai)
                answer_text = ai_result.get("answer", "I could not generate a response.")
            except AIProviderException as err:
                logger.error(f"[ChatService] AI Provider error: {err.message}")
                answer_text = f"AI Provider Error: {err.message}"

            # 5. Save AI assistant response
            ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
            await chatbot_repository.add_message(
                session=session,
                conversation_id=existing_conv.id,
                sender="assistant",
                content=answer_text,
                custom_id=ai_msg_id
            )

            response_data = ChatResponseData(
                message_id=ai_msg_id,
                conversation_id=existing_conv.id,
                answer=answer_text,
                metrics=[
                    {"label": "Status", "value": "Online", "color": "text-emerald-400"}
                ],
                sources=[
                    {"title": "GitMonitor Analytics", "type": "database"}
                ],
                actions=[]
            )

            return ChatResponseEnvelope(
                success=True,
                data=response_data,
                message="Response generated successfully"
            )

    async def get_user_conversations(self, user: AuthenticatedUser) -> List[Dict[str, Any]]:
        """Fetch all conversations owned by current authenticated user."""
        if not db_manager.session_factory:
            return []
        async with db_manager.session_factory() as session:
            convs = await chatbot_repository.get_user_conversations(
                session=session,
                user_id=user.id,
                organization_id=user.organization_id
            )
            return [c.to_dict() for c in convs]

    async def get_conversation_details(
        self,
        conversation_id: str,
        user: AuthenticatedUser
    ) -> Dict[str, Any]:
        """
        Fetch conversation details & messages.
        Enforces strict authorization: Returns 404 if conversation is not owned by user.
        """
        if not db_manager.session_factory:
            raise HTTPException(status_code=500, detail="Database uninitialized")
        
        async with db_manager.session_factory() as session:
            conv = await chatbot_repository.get_conversation_by_id(
                session=session,
                conversation_id=conversation_id,
                user_id=user.id
            )
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            
            messages = await chatbot_repository.get_conversation_messages(
                session=session,
                conversation_id=conversation_id,
                user_id=user.id
            )

            res = conv.to_dict()
            res["messages"] = [m.to_dict() for m in messages]
            return res

    async def delete_conversation(self, conversation_id: str, user: AuthenticatedUser) -> bool:
        """Delete conversation owned by current user."""
        if not db_manager.session_factory:
            return False
        async with db_manager.session_factory() as session:
            success = await chatbot_repository.delete_conversation(
                session=session,
                conversation_id=conversation_id,
                user_id=user.id
            )
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            return True

    async def clear_user_history(self, user: AuthenticatedUser) -> int:
        """Clear all conversation history owned by current user."""
        if not db_manager.session_factory:
            return 0
        async with db_manager.session_factory() as session:
            count = await chatbot_repository.clear_user_history(
                session=session,
                user_id=user.id,
                organization_id=user.organization_id
            )
            return count

chatbot_service = ChatbotService()
