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
                answer_text = ai_result.get("answer", "")
                if not answer_text.strip():
                    answer_text = self._synthesize_knowledge_answer(user_text, rag_context_str, rag_res.get("sources", []))
            except Exception as err:
                logger.warning(f"[ChatService] Remote AI Provider error ({err}). Utilizing expert RAG knowledge synthesis fallback.")
                answer_text = self._synthesize_knowledge_answer(user_text, rag_context_str, rag_res.get("sources", []))

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

    def _synthesize_knowledge_answer(
        self,
        prompt: str,
        rag_context: Optional[str] = None,
        sources: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Synthesizes a high-fidelity, comprehensive technical answer from retrieved RAG domain knowledge
        and built-in engineering context when the external LLM provider is unavailable or rate-limited.
        """
        prompt_lower = prompt.lower().strip()
        
        # 1. Greetings & Capabilities
        if any(w in prompt_lower for w in ["hi", "hello", "hey", "who are you", "what can you do", "help"]):
            return (
                "### 👋 Welcome to GitMonitor AI Assistant!\n\n"
                "I provide real-time intelligence and monitoring across your software engineering projects. Here is what I can help you with:\n\n"
                "• **Project & Repository Overview**: Track synchronized repositories, commit volume, and build statuses.\n"
                "• **Pull Request & Cycle Time Insights**: Monitor PR review velocity, open vs. merged PR ratios, and review bottlenecks.\n"
                "• **Developer Activity & Code Churn**: Analyze contributions, line additions/deletions, and churn ratios to spot burnout or refactor risks.\n"
                "• **Engineering Signals**: Surface stale pull requests, high-churn files, and team throughput metrics.\n\n"
                "Feel free to ask questions about your repositories, metrics, or platform workflows!"
            )

        # 2. If RAG context is available, extract and present structured domain knowledge
        if rag_context and rag_context.strip():
            cleaned = rag_context.replace("[GITMONITOR KNOWLEDGE BASE SYSTEM CONTEXT]", "")
            cleaned = cleaned.replace("[END KNOWLEDGE BASE CONTEXT]", "")
            
            sections = []
            current_section = []
            for line in cleaned.split("\n"):
                if line.startswith("--- Reference Source"):
                    if current_section:
                        sections.append("\n".join(current_section).strip())
                        current_section = []
                else:
                    current_section.append(line)
            if current_section:
                sections.append("\n".join(current_section).strip())

            response_parts = [
                f"### 📊 GitMonitor Intelligence Summary\n\nBased on GitMonitor documentation and engineering specifications for **\"{prompt}\"**:\n"
            ]
            for sec in sections[:3]:
                if sec:
                    response_parts.append(sec)

            response_parts.append(
                "\n> 💡 **Tip:** You can inspect live metrics on your **Dashboard** or **Projects** tab, or request deep multi-repo analysis via the Engineering Agent."
            )
            return "\n\n".join(response_parts)

        # 3. Topic-specific fallback synthesis
        if any(w in prompt_lower for w in ["pr", "pull request", "review", "cycle time"]):
            return (
                "### 🔄 Pull Request & Review Velocity in GitMonitor\n\n"
                "GitMonitor tracks pull requests across their full lifecycle to minimize review bottlenecks and improve developer velocity:\n\n"
                "1. **Cycle Time Tracking**: Measures time from first commit to PR creation, review latency, and time to merge.\n"
                "2. **Review Latency**: Highlights pull requests waiting for review longer than team thresholds (default: 48h).\n"
                "3. **PR Size & Review Quality**: Encourages small, incremental pull requests (<400 lines) which merge 2x faster with lower defect rates.\n"
                "4. **Engineering Signals**: Automatically surfaces stale PRs and unassigned reviews on your Dashboard.\n\n"
                "You can view detailed PR metrics in the **Pull Requests** tab of your project."
            )
        elif any(w in prompt_lower for w in ["churn", "code churn", "refactor"]):
            return (
                "### 📈 Understanding Code Churn in GitMonitor\n\n"
                "**Code Churn** measures lines of code modified, replaced, or deleted shortly after being written:\n\n"
                "• **Normal Churn (<15%)**: Typical exploratory coding, bug-fixing, and regular unit test iterations.\n"
                "• **Elevated Churn (15%-30%)**: Significant architectural refactoring, shifting requirements, or technical debt remediation.\n"
                "• **High Churn (>30%)**: Potential indicator of unclear specifications, fragile codebases, or rework fatigue.\n\n"
                "GitMonitor calculates churn by comparing `additions` vs. `deletions` across commits in your repositories."
            )
        elif any(w in prompt_lower for w in ["dora", "metric", "deploy"]):
            return (
                "### ⚡ DORA & Engineering Metrics in GitMonitor\n\n"
                "GitMonitor computes key engineering health indicators aligned with industry standards:\n\n"
                "• **Deployment Frequency**: How often code is successfully merged into release or production branches.\n"
                "• **Lead Time for Changes**: Time elapsed from first commit to production deployment.\n"
                "• **Change Failure Rate**: Percentage of deployments requiring immediate hotfix commits or rollbacks.\n"
                "• **Mean Time to Recovery (MTTR)**: Time required to restore full service after an incident.\n\n"
                "Check the **Engineering Signals** and **Dashboard Overview** to track your team's live metrics."
            )
        elif any(w in prompt_lower for w in ["auth", "token", "jwt", "login", "session"]):
            return (
                "### 🔐 Authentication Architecture in GitMonitor\n\n"
                "GitMonitor implements enterprise-grade dual-token authentication:\n\n"
                "1. **Access Token (JWT)**: Short/medium lifespan signed token verifying user identity and tenant organization access.\n"
                "2. **Refresh Token**: Long-lived secure token stored in the database with automatic rotation upon token renewal.\n"
                "3. **Transparent Session Refresh**: When an API returns `401 Unauthorized`, the client automatically calls `/api/auth/refresh` to obtain a fresh token without logging out the user.\n"
                "4. **Role-Based Access Control**: Enforces tenant-level isolation across repositories, dashboards, and AI conversations."
            )

        # 4. General default engineering response
        return (
            f"### 🤖 GitMonitor Platform Intelligence\n\n"
            f"Here is the relevant information regarding **\"{prompt}\"**:\n\n"
            "GitMonitor is an engineering intelligence and project monitoring platform that continuously monitors your GitHub repositories, pull requests, commits, and developer activity.\n\n"
            "**Key Capabilities Available:**\n"
            "• **Live Dashboard**: High-level aggregate metrics, active repositories, and engineering signals.\n"
            "• **Developer Analytics**: Individual and team throughput, commit cadence, and contribution graphs.\n"
            "• **PR Review Optimization**: Identify bottlenecks and reduce cycle time.\n"
            "• **AI & Engineering Agent**: Natural language queries and automated deep repository analysis.\n\n"
            "For more details, explore the navigation menu on the left or ask about specific metrics!"
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
