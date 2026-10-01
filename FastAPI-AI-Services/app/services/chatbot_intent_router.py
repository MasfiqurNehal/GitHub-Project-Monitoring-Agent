"""
Lightweight Chatbot Intent Router for Floating Chatbot.
Classifies user queries into 5 categories to avoid expensive agent/LLM calls when unneeded:
- GREETING: Fast conversational greeting (no LLM/DB overhead).
- GARBAGE: Unclear or gibberish input (friendly guided response).
- LIVE_DATA: Queries requesting live projects, repositories, developers, commits, PRs, issues.
- APP_KNOWLEDGE: Questions about GitHub Monitoring platform capabilities & workflows.
- GENERAL_KNOWLEDGE: General software engineering concepts (LLM completion).
"""
import re
from enum import Enum
from typing import Dict, Any, Optional

class ChatbotIntentCategory(str, Enum):
    GREETING = "GREETING"
    GARBAGE = "GARBAGE"
    LIVE_DATA = "LIVE_DATA"
    APP_KNOWLEDGE = "APP_KNOWLEDGE"
    GENERAL_KNOWLEDGE = "GENERAL_KNOWLEDGE"

class ChatbotIntentResult:
    def __init__(
        self,
        category: ChatbotIntentCategory,
        live_data_domain: Optional[str] = None,
        preset_response: Optional[str] = None
    ):
        self.category = category
        self.live_data_domain = live_data_domain
        self.preset_response = preset_response

class ChatbotIntentRouter:
    # Casual Greetings
    GREETING_WORDS = {
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "greetings", "thanks", "thank you", "bye", "goodbye", "ping"
    }

    # Invalid / Garbage Inputs
    GARBAGE_PATTERNS = [
        r"^[a-zA-Z]{1,3}$",  # e.g., 'sdf', 'asd', 'df'
        r"^[^a-zA-Z0-9\s]+$",  # e.g., '!@#$', '...'
        r"^[bcdfghjklmnpqrstvwxyz]{4,}$",  # consonants gibberish e.g., 'qwerty'
        r"^[0-9]+$",  # pure numbers without context e.g., '123'
    ]

    # Live Data Domain Matchers
    LIVE_REPO_PATTERNS = [
        r"how many (repos|repositories)",
        r"show (me )?(my )?(connected )?repositories",
        r"list (my )?(all )?repositories",
        r"connected repos",
        r"monitored repos",
        r"which repositories",
    ]

    LIVE_PROJECT_PATTERNS = [
        r"how many projects",
        r"show (me )?(my )?projects",
        r"list (my )?projects",
        r"connected projects",
        r"what projects",
    ]

    LIVE_DEV_PATTERNS = [
        r"how many developers",
        r"which developers",
        r"show (me )?developers",
        r"list (my )?developers",
        r"who (is|are) (the )?active developers",
        r"active developers",
    ]

    LIVE_COMMIT_PATTERNS = [
        r"how many commits",
        r"show (me )?commits",
        r"recent commits",
        r"commits today",
        r"who made the most commits",
    ]

    LIVE_PR_PATTERNS = [
        r"how many (pull requests|prs)",
        r"show (open |merged )?(pull requests|prs)",
        r"list (open |merged )?(pull requests|prs)",
        r"open prs",
        r"pull request status",
    ]

    LIVE_ISSUE_PATTERNS = [
        r"how many issues",
        r"show (open |closed )?issues",
        r"list issues",
    ]

    APP_KNOWLEDGE_PATTERNS = [
        r"what is (this )?github monitoring",
        r"how does (this )?(platform|bot|system) work",
        r"how (do|can) i (add|connect) a repository",
        r"how do i (add|connect) repo",
        r"what can this (system|platform|bot) monitor",
        r"how do i generate reports",
        r"what are webhooks",
    ]

    def route(self, prompt: str) -> ChatbotIntentResult:
        raw = prompt.strip()
        lower = raw.lower()

        # Check exact greeting words first
        if lower in self.GREETING_WORDS:
            return ChatbotIntentResult(
                category=ChatbotIntentCategory.GREETING,
                preset_response=(
                    "Hello! 👋 I am your **GitMonitor AI Assistant**.\n\n"
                    "I can help you explore repository activity, developer velocity, commit trends, "
                    "or answer software engineering questions. How can I assist you today?"
                )
            )

        # Check for single-word greetings embedded (e.g. "hi there")
        words = lower.split()
        if len(words) <= 2 and words[0] in self.GREETING_WORDS:
            return ChatbotIntentResult(
                category=ChatbotIntentCategory.GREETING,
                preset_response=(
                    "Hello! 👋 I am your **GitMonitor AI Assistant**.\n\n"
                    "I can help you explore repository activity, developer velocity, commit trends, "
                    "or answer software engineering questions. How can I assist you today?"
                )
            )

        # Check Live Application Data Intents BEFORE garbage checks
        for pat in self.LIVE_REPO_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="repositories"
                )

        for pat in self.LIVE_PROJECT_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="projects"
                )

        for pat in self.LIVE_DEV_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="developers"
                )

        for pat in self.LIVE_COMMIT_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="commits"
                )

        for pat in self.LIVE_PR_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="pull_requests"
                )

        for pat in self.LIVE_ISSUE_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.LIVE_DATA,
                    live_data_domain="issues"
                )

        # Check App Knowledge Intent
        for pat in self.APP_KNOWLEDGE_PATTERNS:
            if re.search(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.APP_KNOWLEDGE
                )

        # Garbage check: short gibberish like "sdf", "!@#$", "qwerty", "asdf123"
        if len(lower) <= 3 and lower not in self.GREETING_WORDS:
            return ChatbotIntentResult(
                category=ChatbotIntentCategory.GARBAGE,
                preset_response=(
                    "I’m not sure what you’re asking yet. You can ask me about repositories, projects, "
                    "developers, commits, pull requests, issues, or how the GitHub Monitoring platform works."
                )
            )

        for pat in self.GARBAGE_PATTERNS:
            if re.match(pat, lower):
                return ChatbotIntentResult(
                    category=ChatbotIntentCategory.GARBAGE,
                    preset_response=(
                        "I’m not sure what you’re asking yet. You can ask me about repositories, projects, "
                        "developers, commits, pull requests, issues, or how the GitHub Monitoring platform works."
                    )
                )

        # Default: General Software Engineering / Technical query for LLM
        return ChatbotIntentResult(
            category=ChatbotIntentCategory.GENERAL_KNOWLEDGE
        )

chatbot_intent_router = ChatbotIntentRouter()
