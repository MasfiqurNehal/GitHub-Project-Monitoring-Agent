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
from app.services.context_manager import context_manager
from app.rag.knowledge_base import knowledge_retriever
from app.rag.rag_pipeline import rag_pipeline
from app.services.topic_guard import topic_guard
from app.agents.detector import agent_detector
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
        user_text = (request.message or request.prompt or "").strip()
        if not user_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message or prompt content cannot be empty."
            )

        logger.info(f"[ChatService] User '{user.email}' ({user.id}) prompt: '{user_text[:40]}...'")

        if not db_manager.session_factory:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection pool is not initialized."
            )

        async with db_manager.session_factory() as session:
            # 1. Check if conversation exists & belongs to user
            existing_conv = None
            if request.conversation_id:
                existing_conv = await chatbot_repository.get_conversation_by_id(
                    session=session,
                    conversation_id=request.conversation_id,
                    user_id=user.id
                )

            if not existing_conv:
                # Derive title from prompt
                title = user_text[:35] + ("..." if len(user_text) > 35 else "")
                existing_conv = await chatbot_repository.create_conversation(
                    session=session,
                    user_id=user.id,
                    organization_id=user.organization_id,
                    title=title,
                    custom_id=request.conversation_id
                )

            # 2. Save user prompt message
            await chatbot_repository.add_message(
                session=session,
                conversation_id=existing_conv.id,
                sender="user",
                content=user_text
            )

            # 3. Validate user topic (allow technical/domain, refuse off-topic non-technical)
            topic_res = topic_guard.validate_prompt(user_text)
            if not topic_res.is_allowed:
                logger.info(f"[ChatService] User prompt refused by TopicGuard (category: '{topic_res.category}')")
                ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
                refusal_answer = topic_res.refusal_message or topic_guard.POLITE_REFUSAL_MESSAGE

                await chatbot_repository.add_message(
                    session=session,
                    conversation_id=existing_conv.id,
                    sender="assistant",
                    content=refusal_answer,
                    sources=[{"title": "System Policy", "type": "policy"}],
                    custom_id=ai_msg_id
                )

                return ChatResponseEnvelope(
                    success=True,
                    data=ChatResponseData(
                        message_id=ai_msg_id,
                        conversation_id=existing_conv.id,
                        answer=refusal_answer,
                        metrics=[{"label": "Scope", "value": "Refused", "color": "text-rose-400"}],
                        sources=[{"title": "System Scope Policy", "type": "policy"}],
                        actions=[]
                    ),
                    message="Prompt refused by domain scope guardrails."
                )

            # 4. Engineering Agent Intent Detection: Check if prompt requires complex agent processing
            agent_res = agent_detector.detect_intent(user_text)
            if agent_res.requires_agent:
                logger.info(f"[ChatService] Engineering Agent intent detected for task: '{agent_res.task_category}'")
                ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
                redirect_answer = agent_res.redirect_message or agent_detector.DEFAULT_REDIRECT_MESSAGE
                actions = agent_res.actions or []

                await chatbot_repository.add_message(
                    session=session,
                    conversation_id=existing_conv.id,
                    sender="assistant",
                    content=redirect_answer,
                    sources=[{"title": f"Engineering Agent Handoff ({agent_res.task_title})", "type": "agent_redirect"}],
                    custom_id=ai_msg_id
                )

                return ChatResponseEnvelope(
                    success=True,
                    data=ChatResponseData(
                        message_id=ai_msg_id,
                        conversation_id=existing_conv.id,
                        answer=redirect_answer,
                        metrics=[{"label": "Agent Required", "value": agent_res.task_title or "Engineering Agent", "color": "text-sky-400"}],
                        sources=[{"title": f"Engineering Agent Handoff ({agent_res.task_title})", "type": "agent_redirect"}],
                        actions=actions
                    ),
                    message="Request requires Engineering Agent processing."
                )

            # Retrieve conversation history
            history_messages = await chatbot_repository.get_conversation_messages(
                session=session,
                conversation_id=existing_conv.id,
                user_id=user.id
            )

            # 4. Modular RAG Pipeline: Vector similarity search against GitMonitor domain knowledge
            rag_res = rag_pipeline.retrieve_context(query=user_text)
            rag_context_str = rag_res.get("rag_context", "") if rag_res.get("is_relevant") else None

            # Exclude current message from history to avoid duplication
            previous_history = history_messages[:-1] if history_messages else []

            messages_for_ai = context_manager.build_context(
                history_messages=previous_history,
                current_prompt=user_text,
                rag_context=rag_context_str
            )

            # 4. Generate AI Completion
            try:
                ai_result = await ai_provider.generate_completion(messages=messages_for_ai)
                answer_text = ai_result.get("answer", "I could not generate a response.")
            except AIProviderException as err:
                logger.error(f"[ChatService] AI Provider error: {err.message}")
                answer_text = f"AI Provider Error: {err.message}"

            # 5. Save AI assistant response
            ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
            
            # Map retrieved RAG sources for client envelope
            sources = rag_res.get("sources", []) if rag_res.get("is_relevant") else [
                {"title": "General AI Knowledge", "type": "llm_knowledge"}
            ]

            await chatbot_repository.add_message(
                session=session,
                conversation_id=existing_conv.id,
                sender="assistant",
                content=answer_text,
                sources=sources,
                custom_id=ai_msg_id
            )

            response_data = ChatResponseData(
                message_id=ai_msg_id,
                conversation_id=existing_conv.id,
                answer=answer_text,
                metrics=[
                    {"label": "Status", "value": "Online", "color": "text-emerald-400"}
                ],
                sources=sources,
                actions=[]
            )

            return ChatResponseEnvelope(
                success=True,
                data=response_data,
                message="Response generated successfully"
            )

    async def create_conversation(
        self,
        user: AuthenticatedUser,
        title: Optional[str] = "New Conversation"
    ) -> Dict[str, Any]:
        """Create a new conversation record owned by current user."""
        if not db_manager.session_factory:
            raise HTTPException(status_code=500, detail="Database connection pool uninitialized")
        async with db_manager.session_factory() as session:
            conv = await chatbot_repository.create_conversation(
                session=session,
                user_id=user.id,
                organization_id=user.organization_id,
                title=title or "New Conversation"
            )
            return conv.to_dict()

    async def rename_conversation(
        self,
        conversation_id: str,
        user: AuthenticatedUser,
        new_title: str
    ) -> Dict[str, Any]:
        """Rename a conversation owned by current user."""
        if not db_manager.session_factory:
            raise HTTPException(status_code=500, detail="Database connection pool uninitialized")
        async with db_manager.session_factory() as session:
            conv = await chatbot_repository.rename_conversation(
                session=session,
                conversation_id=conversation_id,
                user_id=user.id,
                new_title=new_title
            )
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            return conv.to_dict()

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

    async def get_conversation_messages(
        self,
        conversation_id: str,
        user: AuthenticatedUser
    ) -> List[Dict[str, Any]]:
        """Fetch messages for a conversation owned by current user."""
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
            return [m.to_dict() for m in messages]

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
