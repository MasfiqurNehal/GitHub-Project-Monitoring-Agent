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
from app.utils.logger import logger

GENERAL_IT_SYSTEM_PROMPT = """You are a Principal Software Architect and Computer Systems Engineer serving as the technical knowledge specialist for the GitMonitor AI Agent.

Your responsibilities:
1. Provide accurate, clear, and comprehensive explanations on software engineering, computer science theory, hardware, processors, computing architectures, and IT infrastructure.
2. Structure your answers with clear sections, code/architecture snippets where helpful, and trade-off comparisons.
3. Do NOT invent mock repository telemetry or claim to have inspected internal private repository code unless telemetry data was explicitly provided.
4. Maintain a professional, authoritative, yet approachable tone.
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
        greeting_pattern = r"^(?:hello|hi|hey|good\s+(?:morning|afternoon|evening|day)|greetings|hi\s+there|hello\s+there|howdy|yo)[!.,\s]*$"
        import re
        if re.match(greeting_pattern, norm_query, re.IGNORECASE):
            greeting_msg = "Hello! 👋 How can I help you today?"
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": greeting_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[
                    {"label": "View Repositories", "href": "/repositories"},
                    {"label": "Explore Projects", "href": "/projects"},
                ],
                summary="Responded to greeting.",
                tools_used=[],
                duration_ms=(time.time() - t0) * 1000.0
            )

        # Fast deterministic path 2: Casual questions ("who are you", "what can you do")
        casual_pattern = r"^(?:how\s+are\s+you|who\s+are\s+you|what\s+can\s+you\s+do|help\s+me|what\s+is\s+your\s+name|tell\s+me\s+a\s+joke|thanks|thank\s+you|nice\s+to\s+meet\s+you)[!.,\s]*$"
        if re.match(casual_pattern, norm_query, re.IGNORECASE):
            casual_msg = (
                "I am your **Engineering AI Agent**.\n\n"
                "I specialize in analyzing software projects, tracking developer velocity, inspecting pull requests, "
                "evaluating commit history, and answering technical software engineering queries."
            )
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": casual_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[
                    {"label": "Explore Dashboard", "href": "/dashboard"},
                    {"label": "View Repositories", "href": "/repositories"}
                ],
                summary="Responded to casual inquiry.",
                tools_used=[],
                duration_ms=(time.time() - t0) * 1000.0
            )

        # Fast deterministic path 3: Invalid / Unclear Input ("asdf`!@3")
        if (
            re.search(r"[`~!@#$%^&*()_+\-=\[{\]\};:'\",<>/]{2,}", user_query) and
            not any(w in norm_query.split() for w in ["what", "how", "who", "why", "where", "show", "tell", "list", "get", "view", "is", "are", "about"])
        ) or (
            len(user_query) <= 12 and not re.search(r"[aeiouAEIOU]", user_query) and not user_query.replace(" ", "").isdigit()
        ):
            unclear_msg = "I’m not sure what you’d like to ask. You can ask me about GitHub repositories, commits, pull requests, developers, project activity, or general technical topics."
            return SpecialistExecutionResult(
                agent_id=self.agent_id,
                agent_name=self.name,
                success=True,
                data={"query": user_query, "explanation": unclear_msg, "source": "Deterministic Fast Router"},
                metrics=[],
                actions=[{"label": "View Repositories", "href": "/repositories"}],
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
