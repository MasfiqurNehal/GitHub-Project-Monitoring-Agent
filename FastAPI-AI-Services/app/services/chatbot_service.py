"""
Chatbot Business Logic Service Layer for Floating Chatbot.
Coordinates intent routing, live application data fetching via Express backend,
AI completion generation, database persistence, and user authorization checks.
"""
import time
import uuid
import traceback
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from app.db.connection import db_manager
from app.db.repository import chatbot_repository
from app.providers.ai_provider import ai_provider, AIProviderException
from app.services.context_manager import context_manager
from app.services.express_client import express_client
from app.services.chatbot_intent_router import (
    chatbot_intent_router,
    ChatbotIntentCategory,
    ChatbotIntentResult
)
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
        3. Routes query through ChatbotIntentRouter (Greeting, Garbage, Live Data, App Knowledge, General Knowledge).
        4. Executes appropriate lightweight handler or live data tool.
        5. Saves AI assistant response message to DB.
        6. Returns structured ChatResponseEnvelope.
        """
        user_text = (request.message or request.prompt or "").strip()
        if not user_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message or prompt content cannot be empty."
            )

        logger.info(f"[ChatService] User '{user.email}' ({user.id}) prompt: '{user_text[:40]}...'")

        conv_id = request.conversation_id or f"conv-{uuid.uuid4().hex[:12]}"
        try:
            # 1. Intent Routing
            intent: ChatbotIntentResult = chatbot_intent_router.route(user_text)
            logger.info(f"[ChatService] Routed intent category: '{intent.category}' (domain: '{intent.live_data_domain}')")

            answer_text = ""
            sources = [{"title": "GitMonitor Platform Intelligence", "type": "system"}]

            if db_manager.session_factory:
                async with db_manager.session_factory() as session:
                    existing_conv = None
                    if request.conversation_id:
                        existing_conv = await chatbot_repository.get_conversation_by_id(
                            session=session,
                            conversation_id=request.conversation_id,
                            user_id=user.id
                        )

                    if not existing_conv:
                        title = user_text[:35] + ("..." if len(user_text) > 35 else "")
                        existing_conv = await chatbot_repository.create_conversation(
                            session=session,
                            user_id=user.id,
                            organization_id=user.organization_id,
                            title=title,
                            custom_id=request.conversation_id
                        )
                    conv_id = existing_conv.id

                    await chatbot_repository.add_message(
                        session=session,
                        conversation_id=existing_conv.id,
                        sender="user",
                        content=user_text
                    )

                    if intent.category == ChatbotIntentCategory.GREETING or intent.category == ChatbotIntentCategory.GARBAGE:
                        answer_text = intent.preset_response or "Hello! How can I assist you today?"
                        sources = [{"title": "Chatbot Assistant", "type": "preset"}]

                    elif intent.category == ChatbotIntentCategory.LIVE_DATA:
                        answer_text = await self._fetch_and_format_live_data(intent.live_data_domain, user)
                        sources = [{"title": f"Live {intent.live_data_domain.capitalize()} Telemetry", "type": "live_telemetry"}]

                    elif intent.category == ChatbotIntentCategory.APP_KNOWLEDGE:
                        answer_text = await self._generate_app_knowledge_answer(user_text, user)
                        sources = [{"title": "GitMonitor Documentation & Workflows", "type": "platform_docs"}]

                    else: # GENERAL_KNOWLEDGE
                        answer_text = await self._generate_general_knowledge_answer(session, existing_conv.id, user_text, user)
                        sources = [{"title": "General AI Technical Knowledge", "type": "llm_completion"}]

                    ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
                    await chatbot_repository.add_message(
                        session=session,
                        conversation_id=existing_conv.id,
                        sender="assistant",
                        content=answer_text,
                        sources=sources,
                        custom_id=ai_msg_id
                    )

            else:
                # Session factory uninitialized mode (e.g. lightweight unit test / memory execution)
                if intent.category == ChatbotIntentCategory.GREETING or intent.category == ChatbotIntentCategory.GARBAGE:
                    answer_text = intent.preset_response or "Hello! How can I assist you today?"
                    sources = [{"title": "Chatbot Assistant", "type": "preset"}]
                elif intent.category == ChatbotIntentCategory.LIVE_DATA:
                    answer_text = await self._fetch_and_format_live_data(intent.live_data_domain, user)
                    sources = [{"title": f"Live {intent.live_data_domain.capitalize()} Telemetry", "type": "live_telemetry"}]
                elif intent.category == ChatbotIntentCategory.APP_KNOWLEDGE:
                    answer_text = await self._generate_app_knowledge_answer(user_text, user)
                    sources = [{"title": "GitMonitor Documentation & Workflows", "type": "platform_docs"}]
                else:
                    answer_text = await self._generate_general_knowledge_answer(None, conv_id, user_text, user)
                    sources = [{"title": "General AI Technical Knowledge", "type": "llm_completion"}]

                ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"

            response_data = ChatResponseData(
                message_id=ai_msg_id,
                conversation_id=conv_id,
                answer=answer_text,
                metrics=[
                    {"label": "Intent", "value": intent.category, "color": "text-sky-400"}
                ],
                sources=sources,
                actions=[]
            )

            return ChatResponseEnvelope(
                success=True,
                data=response_data,
                message="Response generated successfully"
            )


        except HTTPException:
            raise
        except Exception as err:
            logger.error(f"[ChatService] Unhandled error during process_chat_message: {err}\n{traceback.format_exc()}")
            safe_message = "Sorry, I couldn't process that request right now. Please try again."
            ai_msg_id = f"msg-{uuid.uuid4().hex[:12]}"
            return ChatResponseEnvelope(
                success=True,
                data=ChatResponseData(
                    message_id=ai_msg_id,
                    conversation_id=conv_id,
                    answer=safe_message,
                    metrics=[{"label": "Status", "value": "Error", "color": "text-rose-400"}],
                    sources=[{"title": "System Diagnostic", "type": "error"}],
                    actions=[]
                ),
                message="An error occurred while generating the response."
            )


    async def _fetch_and_format_live_data(self, domain: Optional[str], user: AuthenticatedUser) -> str:
        """Fetch live telemetry from Express backend API and format human-readable Markdown response."""
        auth_token = getattr(user, "token", None)

        if domain == "repositories":
            res = await express_client.list_repositories(auth_token=auth_token)
            repos = res.get("data", []) if isinstance(res.get("data"), list) else res.get("repositories", [])
            count = len(repos)
            if count == 0:
                return (
                    "### 📁 Connected Repositories\n\n"
                    "There are currently **0** repositories connected to your organization account.\n\n"
                    "To add or connect a repository, navigate to **Settings → GitHub Integration** or the **Repositories** page."
                )
            repo_items = [f"- **{r.get('name', 'Repository')}** (`{r.get('fullName', r.get('full_name', ''))}`)" for r in repos[:10]]
            list_str = "\n".join(repo_items)
            more_str = f"\n\n_...and {count - 10} more repositories._" if count > 10 else ""
            return (
                f"### 📁 Connected Repositories ({count})\n\n"
                f"You currently have **{count}** active repository/repositories connected to your organization:\n\n"
                f"{list_str}{more_str}\n\n"
                "You can view detailed commit churn and branch analytics in the **Repositories** tab."
            )

        elif domain == "projects":
            res = await express_client.list_projects(auth_token=auth_token)
            projects = res.get("data", []) if isinstance(res.get("data"), list) else res.get("projects", [])
            count = len(projects)
            if count == 0:
                return (
                    "### 🚀 Active Projects\n\n"
                    "There are currently **0** active projects in your organization.\n\n"
                    "You can create a new project on the **Projects** page."
                )
            proj_items = [f"- **{p.get('name', 'Project')}**: {p.get('description', 'No description provided.')}" for p in projects[:10]]
            list_str = "\n".join(proj_items)
            return (
                f"### 🚀 Active Projects ({count})\n\n"
                f"You currently have **{count}** active project(s):\n\n"
                f"{list_str}\n\n"
                "Manage project assignments and linked repositories in the **Projects** tab."
            )

        elif domain == "developers":
            res = await express_client.list_developers(auth_token=auth_token)
            devs = res.get("data", []) if isinstance(res.get("data"), list) else res.get("developers", [])
            count = len(devs)
            if count == 0:
                return (
                    "### 👥 Active Developers\n\n"
                    "There are currently **0** developer profiles recorded for your organization's connected repositories."
                )
            dev_items = [f"- **{d.get('name', d.get('username', 'Developer'))}** ({d.get('email', 'No email')})" for d in devs[:10]]
            list_str = "\n".join(dev_items)
            return (
                f"### 👥 Monitored Developers ({count})\n\n"
                f"There are **{count}** developer profile(s) actively contributing across your repositories:\n\n"
                f"{list_str}\n\n"
                "Detailed developer velocity and PR review metrics are available on the **Developers** page."
            )

        elif domain == "commits":
            res = await express_client.list_commits(auth_token=auth_token)
            commits = res.get("data", []) if isinstance(res.get("data"), list) else res.get("commits", [])
            count = len(commits)
            return (
                f"### 📝 Commit Telemetry ({count})\n\n"
                f"There are **{count}** recorded commit(s) across your connected repositories.\n\n"
                "You can inspect commit timelines, code churn ratios, and file diffs on your **Dashboard** or **Repositories** page."
            )

        elif domain == "pull_requests":
            res = await express_client.list_pull_requests(auth_token=auth_token)
            prs = res.get("data", []) if isinstance(res.get("data"), list) else res.get("pullRequests", res.get("pull_requests", []))
            count = len(prs)
            return (
                f"### 🔀 Pull Request Telemetry ({count})\n\n"
                f"There are currently **{count}** pull request(s) tracked across your connected repositories.\n\n"
                "You can monitor PR review latency and cycle times in the **Pull Requests** tab."
            )

        elif domain == "issues":
            res = await express_client.list_issues(auth_token=auth_token)
            issues = res.get("data", []) if isinstance(res.get("data"), list) else res.get("issues", [])
            count = len(issues)
            return (
                f"### 🐛 Issues Telemetry ({count})\n\n"
                f"There are currently **{count}** issue(s) tracked across your connected projects.\n\n"
                "Inspect issue status breakdown and resolution metrics in the **Issues** tab."
            )

        # Fallback for general dashboard overview
        res = await express_client.get_dashboard_overview(auth_token=auth_token)
        overview = res.get("data", {}) if isinstance(res.get("data"), dict) else res
        return (
            "### 📊 GitMonitor Live Overview\n\n"
            f"• **Active Projects**: {overview.get('projectsCount', overview.get('projects_count', 0))}\n"
            f"• **Connected Repositories**: {overview.get('repositoriesCount', overview.get('repositories_count', 0))}\n"
            f"• **Active Developers**: {overview.get('developersCount', overview.get('developers_count', 0))}\n\n"
            "View real-time telemetry graphs on your **Dashboard**."
        )

    async def _generate_app_knowledge_answer(self, prompt: str, user: AuthenticatedUser) -> str:
        """Generate formatted response for questions about GitMonitor platform setup and features."""
        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are GitMonitor AI Assistant. Explain GitMonitor platform capabilities, repository setup, "
                        "developer metrics, webhooks, and reporting workflows clearly using markdown headings and bullet points."
                    )
                },
                {"role": "user", "content": prompt}
            ]
            res = await ai_provider.generate_completion(messages=messages)
            answer = res.get("answer", "").strip()
            if answer:
                return answer
        except Exception as err:
            logger.warning(f"[ChatService] AI Provider error for app knowledge query: {err}")

        # Fallback structured answer if LLM is offline
        return (
            "### 🤖 What is GitHub Monitoring Platform?\n\n"
            "**GitMonitor** is an engineering intelligence platform that tracks software development velocity, repository health, and team contributions in real time.\n\n"
            "#### Key Features:\n"
            "• **Repository Telemetry**: Track commit volume, additions/deletions, and code churn ratios.\n"
            "• **Developer Activity**: Monitor individual developer contributions, commit patterns, and PR review velocity.\n"
            "• **Pull Request Analytics**: Identify review latency, cycle times, and stale PRs.\n"
            "• **Automated Reports**: Generate daily, weekly, and monthly engineering summaries.\n\n"
            "#### How to connect a repository:\n"
            "1. Navigate to **Settings → GitHub Integration**.\n"
            "2. Install the GitHub App or authenticate your organization account.\n"
            "3. Select repositories to monitor and trigger initial synchronization."
        )

    async def _generate_general_knowledge_answer(
        self,
        session: Any,
        conversation_id: str,
        prompt: str,
        user: AuthenticatedUser
    ) -> str:
        """Generate response for general technical/engineering questions with multi-turn conversation context."""
        # 1. Fetch conversation message history for multi-turn context
        history_messages = []
        if session:
            history_messages = await chatbot_repository.get_conversation_messages(
                session=session,
                conversation_id=conversation_id,
                user_id=user.id
            )
        previous_history = history_messages[:-1] if history_messages else []


        # 2. Build context
        messages_for_ai = context_manager.build_context(
            history_messages=previous_history,
            current_prompt=prompt,
            rag_context=None
        )

        # 3. Call AI Provider
        try:
            res = await ai_provider.generate_completion(messages=messages_for_ai)
            answer = res.get("answer", "").strip()
            if answer:
                return answer
        except Exception as err:
            logger.warning(f"[ChatService] AI Provider completion failed for general knowledge query: {err}")

        # Fallback structured technical answer if LLM provider fails
        return (
            f"### 💡 Technical Information: {prompt}\n\n"
            "Here is the technical concept overview:\n\n"
            "• **Definition**: A software engineering mechanism or standard component.\n"
            "• **Usage**: Commonly utilized across modern application development and cloud architecture.\n"
            "• **Best Practice**: Ensure robust error handling, proper security scoping, and clear API boundaries.\n\n"
            "_Note: The remote AI model is currently operating in local fallback mode._"
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
        """Fetch conversation details & messages enforcing ownership."""
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
