"""
General IT and Software Engineering Knowledge Specialist Agent (Phase 14).
Answers computer science theory, software design patterns, system architectures,
hardware/processor queries, and developer concepts using configured LLM parametric capabilities.
Guarantees zero database fabrication or mock telemetry generation.
"""
import time
from typing import Dict, Any, List, Optional

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import ExtractedEntities
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.engineering_agent.router.deterministic_matcher import deterministic_intent_matcher
from app.utils.logger import logger

GENERAL_IT_SYSTEM_PROMPT = """You are a Principal Software Architect and Computer Systems Engineer serving as the technical knowledge specialist for the GitMonitor AI Agent.

Your responsibilities:
1. Provide accurate, clear, and comprehensive explanations on software engineering, computer science theory, hardware, processors, computing architectures, and IT infrastructure.
2. Structure your answers with clear sections, code/architecture snippets where helpful, and trade-off comparisons.
3. Do NOT invent mock repository telemetry or claim to have inspected internal private repository code unless telemetry data was explicitly provided.
4. Maintain a professional, authoritative, yet approachable tone.
5. If the user's input is unrecognizable gibberish, a keyboard mash, random characters, or completely unknown/unintelligible words (e.g., 'asdfaw', 'qwerty', '!@#$'), DO NOT assume they want to analyze a repository or ask them for a repository URL. Instead, politely inform the user that their input was not understood, briefly state what GitMonitor can assist with, and provide 2-3 sample engineering questions they can ask.
"""


class GeneralITKnowledgeAgent(BaseSpecialistAgent):
    """
    Specialist agent for Category B (Engineering & IT Knowledge Questions).
    Leverages configured LLM capabilities for software/IT/hardware questions.
    """
    agent_id = "general_it_agent"
    name = "General IT & Software Engineering Specialist"
    description = "Specialist for computer systems, software architecture, hardware, and engineering theory."

    async def analyze(
        self,
        state: AgentState,
        entities: Optional[ExtractedEntities] = None
    ) -> SpecialistExecutionResult:
        """
        Synthesize authoritative IT / software engineering knowledge using LLM provider,
        or handle greetings/casual/invalid queries deterministically for ultra-fast startup.
        """
        t0 = time.time()
        user_query = state.user_request.strip()
        norm_query = user_query.lower()

        # Fast deterministic path 1: Greetings ("hello", "hi", "good morning")
        import re

        # Fast deterministic path 1: Greetings ("hello", "hi", "hii", "good morning")
        greeting_pattern = r"^(?:h+[eiaou]+[yia]*|h+i+|h+e+y+|h+e+l+l*o+|h+o+l+a+|good\s+(?:morning|afternoon|evening|day|night)|greetings|hi\s+there|hello\s+there|hey\s+there|howdy|yo|sup|wassup|what'?s\s+up)[!.,\s]*$"
        if re.match(greeting_pattern, norm_query, re.IGNORECASE):
            greeting_msg = (
                "### Hello! 👋 Welcome to GitMonitor Engineering Intelligence\n\n"
                "I am your **AI Engineering Agent**. I can help you monitor and analyze your GitHub repositories, code activity, and developer velocity.\n\n"
                "**Here are key things I can help you with:**\n"
                "- 📊 **Developer Velocity**: Track commit counts, PR reviews, and team workload\n"
                "- 🔍 **Repository Analytics**: Code churn, additions/deletions, and top modified files\n"
                "- 🔀 **Pull Requests**: Open PRs, review turnaround times, and merge velocity\n"
                "- ⚡ **Architecture & IT QA**: Deep technical guidance on system architecture, algorithms, and Git best practices\n\n"
                "How can I assist you with your projects, repositories, or technical questions today?"
            )
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": greeting_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[
                    {"label": "Explore Dashboard", "href": "/dashboard"},
                    {"label": "View Repositories", "href": "/repositories"},
                    {"label": "Developer Velocity", "href": "/developers"},
                ],
                summary="Responded to greeting.",
                tools_used=[],
                duration_ms=(time.time() - t0) * 1000.0
            )

        # Fast deterministic path 2: Casual questions ("who are you", "what can you do", "help", "thanks", "tell me about GitHub Project Monitoring Agent")
        casual_pattern = (
            r"^(?:how\s+are\s+you(?:\s+doing)?|how'?s\s+it\s+going|who\s+are\s+(?:you|u)|what\s+are\s+(?:you|u)|"
            r"what\s+(?:can\s+you|can\s+u|do\s+you)\s+do|help(?:\s+me)?|can\s+(?:you|u)\s+help(?:\s+me)?|"
            r"what(?:'s|\s+is)\s+your\s+name|tell\s+me\s+a\s+joke|thanks|thank\s+you|thx|ty|cheers|nice\s+to\s+meet\s+you|"
            r"(?:do\s+you\s+)?tell\s+me\s+about\s+(?:the\s+)?(?:github\s+project\s+monitoring\s+agent|gitmonitor|this\s+platform|this\s+agent|yourself)|"
            r"what\s+is\s+(?:the\s+)?(?:github\s+project\s+monitoring\s+agent|gitmonitor|this\s+platform|this\s+agent)|"
            r"tell\s+me\s+about\s+(?:the\s+)?(?:platform|system|agent)|"
            r"what\s+(?:does|can)\s+(?:the\s+)?(?:github\s+project\s+monitoring\s+agent|gitmonitor)\s+do)"
            r"(?!\s*(?:repository|repo\b))"
            r"[!.,\s\?]*$"
        )
        if re.match(casual_pattern, norm_query, re.IGNORECASE) or any(term in norm_query for term in ["github project monitoring agent", "gitmonitor"]) and not any(w in norm_query for w in ["repo", "repository", "commits", "prs", "pull requests"]):
            if any(w in norm_query for w in ["thank", "thx", "ty", "cheers"]):
                casual_msg = (
                    "You're very welcome! 😊 Let me know if there's anything else you need help with regarding "
                    "your repositories, pull requests, or code analytics."
                )
            elif any(w in norm_query for w in ["github project monitoring agent", "gitmonitor", "platform", "system"]):
                casual_msg = (
                    "### 🤖 GitHub Project Monitoring Agent (GitMonitor Intelligence)\n\n"
                    "The **GitHub Project Monitoring Agent** is an autonomous engineering intelligence platform that provides real-time visibility, automated telemetry auditing, and predictive developer velocity across your connected GitHub repositories.\n\n"
                    "**🌟 Core Capabilities & Specialist Agents:**\n"
                    "- 📊 **Repository Intelligence (Repository Specialist)**: Track codebase activity, sync health, default branches, languages, and star metrics\n"
                    "- ⚡ **Developer Velocity (Developer Specialist)**: Measure individual throughput, active commit cadence, review participation, and workload balance\n"
                    "- 🔀 **Pull Request Auditing (PR Specialist)**: Monitor open PRs, review turnaround times, merge cycles, and detect reviewer bottlenecks\n"
                    "- 📈 **Code Impact & Churn (Analytics Specialist)**: Track line additions, deletions, net impact, and high-churn hotspot files\n"
                    "- 🧠 **Engineering Consultation (General IT Specialist)**: Deep software design, architecture patterns, SOLID principles, and Git best practices\n\n"
                    "**💡 Example Questions You Can Ask:**\n"
                    "- *\"Tell me about the GitHub-Project-Monitoring-Agent repository\"*\n"
                    "- *\"Who are our most active contributors this week?\"*\n"
                    "- *\"Show open pull requests and review turnaround time\"*\n"
                    "- *\"What is our code churn ratio?\"*\n"
                    "- *\"How does Redis caching work in microservices?\"*"
                )
            else:
                casual_msg = (
                    "### 🤖 GitMonitor Engineering Intelligence Agent\n\n"
                    "I am an autonomous AI engineering intelligence agent integrated with your GitHub repositories.\n\n"
                    "**What I Can Do:**\n"
                    "- 📈 **Engineering Analytics**: Analyze project health, code churn, and team velocity\n"
                    "- 👥 **Developer Performance**: Benchmark review turnaround and active contributor stats\n"
                    "- 🔀 **Pull Request Auditing**: Identify review bottlenecks and inspect open PRs\n"
                    "- 🧠 **Technical & Architectural Guidance**: Answer in-depth software engineering, system design, and IT questions\n\n"
                    "Feel free to ask a question about any connected repository, developer, or software engineering concept!"
                )
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": casual_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[
                    {"label": "Explore Dashboard", "href": "/dashboard"},
                    {"label": "View Repositories", "href": "/repositories"},
                    {"label": "Developer Velocity", "href": "/developers"}
                ],
                summary="Responded to casual inquiry.",
                tools_used=[],
                duration_ms=(time.time() - t0) * 1000.0
            )

        # Fast deterministic path 3: Invalid / Unclear Input ("asdf ;lkjh zxcv", "asdfaw", "!@#$")
        if deterministic_intent_matcher.is_unknown_or_gibberish(user_query, norm_query):
            unclear_msg = (
                "### ❓ Unrecognized Query\n\n"
                "I couldn't quite understand your message. It appears to be random characters, keyboard mashing, or an unrecognized inquiry.\n\n"
                "**I am your GitMonitor Engineering Intelligence Agent.** I specialize in analyzing GitHub repositories, tracking engineering velocity, and answering software architecture questions.\n\n"
                "**Here are some examples of what you can ask me:**\n"
                "- 📊 **Developer Velocity**: *\"Who are the most active contributors?\"*\n"
                "- 🔍 **Repository Analytics**: *\"Show commits for repository...\"* or *\"What is our code churn?\"*\n"
                "- 🔀 **Pull Requests**: *\"List open pull requests\"* or *\"What is our PR review turnaround time?\"*\n"
                "- ⚡ **Technical Concepts**: *\"Explain microservices vs monolith\"* or *\"How does Redis caching work?\"*\n\n"
                "How can I assist you with your projects, codebases, or technical questions?"
            )
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": unclear_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[
                    {"label": "Explore Dashboard", "href": "/dashboard"},
                    {"label": "View Repositories", "href": "/repositories"},
                    {"label": "Developer Velocity", "href": "/developers"}
                ],
                summary="Handled invalid/unclear input.",
                tools_used=[],
                duration_ms=(time.time() - t0) * 1000.0
            )

        messages = [
            {"role": "system", "content": GENERAL_IT_SYSTEM_PROMPT},
            {"role": "user", "content": f"Please answer the following engineering/IT inquiry:\n\n{user_query}"}
        ]

        try:
            provider = agent_llm_factory.get_provider()
            completion = await provider.complete(messages=messages, temperature=0.3, max_tokens=1000)
            answer_text = completion.content.strip()
            duration_ms = (time.time() - t0) * 1000.0

            # Structured actions for UI exploration
            actions = [
                {"label": "Explore Dashboard", "href": "/dashboard"},
                {"label": "View Repositories", "href": "/repositories"},
                {"label": "Ask about Git Workflow", "href": "/engineering-agent"}
            ]

            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={
                    "query": user_query,
                    "explanation": answer_text,
                    "source": "LLM Engineering Knowledge (Parametric)",
                    "knowledge_type": "general_it_software"
                },
                metrics=[],
                actions=actions,
                summary=f"Generated technical explanation for '{user_query[:50]}...'",
                tools_used=[],
                duration_ms=duration_ms
            )

        except LLMError as e:
            duration_ms = (time.time() - t0) * 1000.0
            logger.warning(f"[GeneralITKnowledgeAgent] LLM completion failed: {e.message}")
            fallback_text = (
                f"### 💻 Technical Engineering Overview\n\n"
                f"Your query regards **{user_query}**.\n\n"
                f"As an Engineering Intelligence Agent, I can analyze software systems, system architectures, "
                f"and computer hardware principles. Please feel free to refine your question."
            )
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": fallback_text, "source": "LLM Engineering Knowledge (Parametric)"},
                metrics=[],
                actions=[{"label": "Explore Dashboard", "href": "/dashboard"}],
                summary="Provided fallback technical response.",
                tools_used=[],
                duration_ms=duration_ms
            )


general_it_agent = GeneralITKnowledgeAgent()
