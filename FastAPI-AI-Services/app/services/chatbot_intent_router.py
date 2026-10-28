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
    GREETING_PATTERN = r"^(?:h+[eiaou]+[yia]*|h+i+|h+e+y+|h+e+l+l*o+|h+o+l+a+|good\s+(?:morning|afternoon|evening|day|night)|greetings|hi\s+there|hello\s+there|hey\s+there|howdy|yo|sup|wassup|what'?s\s+up|thanks|thank\s+you|thx|ty|bye|goodbye|ping)[!.,\s]*$"

    @staticmethod
    def is_unknown_or_gibberish(raw: str, norm: str) -> bool:
        """Accurately detect random keyboard mashing, symbol noise, and unrecognizable gibberish."""
        raw_trimmed = raw.strip()
        if not raw_trimmed:
            return True

        words = re.findall(r"[a-z0-9]+", norm)
        if not words:
            return True

        common_words = {
            "what", "how", "who", "why", "where", "when", "which", "can", "could", "would", "should",
            "show", "tell", "list", "get", "view", "is", "are", "about", "explain", "describe", "definition",
            "repo", "repos", "repository", "repositories", "project", "projects", "developer", "developers",
            "contributor", "contributors", "commit", "commits", "pr", "prs", "pull", "issue", "issues",
            "code", "churn", "branch", "git", "github", "docker", "redis", "api", "help", "hi", "hello"
        }
        if any(w in common_words for w in words):
            return False

        if all(w.isdigit() for w in words):
            return True

        if re.search(r"(.)\1{3,}", raw_trimmed):
            return True

        if re.search(r"([a-z]{2,4})\1{2,}", norm):
            return True

        keyboard_walks = [
            "asdf", "fdsa", "jkl;", "lkjh", "hjkl", "zxcv", "vcxz",
            "qwerty", "qwer", "rewq", "poiu", "uiop", "mnbv", "xcvb"
        ]
        for kw in keyboard_walks:
            if kw in norm:
                return True

        safe_abbrs = {"prs", "pr", "src", "pkg", "cmd", "cfg", "mgr", "sync", "async", "cpu", "gpu", "ssh", "ssl", "tls", "jwt", "sql", "sdk", "npm", "cli", "vram", "ci", "cd"}
        for w in words:
            if w in safe_abbrs or w.isdigit():
                continue
            if re.search(r"[bcdfghjklmnpqrstvwxyz]{4,}", w):
                return True
            if len(w) >= 3 and not re.search(r"[aeiouy]", w):
                return True

        if len(words) == 1 and len(words[0]) <= 8:
            if words[0] not in safe_abbrs:
                vowels = len(re.findall(r"[aeiouy]", words[0]))
                consonants = len(words[0]) - vowels
                if vowels == 0 or consonants >= 4:
                    return True

        return False

    # Live Data Domain Matchers
    LIVE_REPO_PATTERNS = [
        r"how many (repos|repositories)",
        r"show (me )?(my )?(connected )?repositories",
        r"list (my )?(all )?repositories",
        r"connected repos",
        r"monitored repos",
        r"which repositories",
        r"(?:tell\s+me\s+about|about|inspect|stats\s+for)\s+.*?(?:repository|repo)\b",
        r".*?\s+(?:repository|repo)\b",
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
        r"(?:do\s+you\s+)?tell\s+me\s+about\s+(?:the\s+)?(?:github\s+project\s+monitoring\s+agent|gitmonitor|this\s+platform|this\s+agent)",
        r"what\s+is\s+(?:the\s+)?(?:github\s+project\s+monitoring\s+agent|gitmonitor)",
        r"what\s+can\s+(?:you|this\s+agent|gitmonitor)\s+do",
    ]

    def route(self, prompt: str) -> ChatbotIntentResult:
        raw = prompt.strip()
        lower = raw.lower()

        # Check greetings first using robust regex
        if re.match(self.GREETING_PATTERN, lower):
            return ChatbotIntentResult(
                category=ChatbotIntentCategory.GREETING,
                preset_response=(
                    "### Hello! 👋 Welcome to GitMonitor AI Assistant\n\n"
                    "I can help you monitor repositories, inspect developer velocity, track commit & PR trends, "
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

        # Garbage / Unrecognized Input check
        if self.is_unknown_or_gibberish(raw, lower):
            return ChatbotIntentResult(
                category=ChatbotIntentCategory.GARBAGE,
                preset_response=(
                    "### ❓ Unrecognized Input\n\n"
                    "I couldn't quite understand your message. It looks like random characters or an unrecognized query.\n\n"
                    "**I'm here to help you monitor and analyze your GitHub projects:**\n"
                    "- 📁 **Repositories**: View connected codebases, branches, and code activity\n"
                    "- 👥 **Developers**: Track team contributions, commit velocity, and PR reviews\n"
                    "- 🔀 **Pull Requests & Issues**: Check open PRs, review turnaround, and bug reports\n"
                    "- 💡 **Engineering Advice**: Ask about Git workflows, Docker, CI/CD, and architecture\n\n"
                    "*Feel free to try asking a question like \"Show active repositories\" or \"Who made the most commits?\"*"
                )
            )

        # Default: General Software Engineering / Technical query for LLM
        return ChatbotIntentResult(
            category=ChatbotIntentCategory.GENERAL_KNOWLEDGE
        )

chatbot_intent_router = ChatbotIntentRouter()
