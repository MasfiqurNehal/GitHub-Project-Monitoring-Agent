"""
Deterministic Rule & Entity Extraction Engine for Engineering Agent Router.
Fast, typo-resilient pattern matching without unnecessary LLM overhead.
"""
import re
from typing import Optional, Dict, Any, List, Tuple

from app.engineering_agent.router.schemas import (
    IntentCategory,
    ExtractedEntities,
    IntentClassificationResult
)

# Common typo normalizer
TYPO_MAPPINGS = {
    r"\b(comit|comits|commt|commts|comited|commited)\b": "commit",
    r"\b(repositry|repositiries|repoo|repp|reposs)\b": "repository",
    r"\b(devloper|devlopers|deveoper|develepor|develepors|contributer|contributers)\b": "developer",
    r"\b(pullreq|pullrequest|pullrequests|pr's)\b": "pull request",
    r"\b(isue|isues|issuse|issuses|tickt|tickts)\b": "issue",
    r"\b(projct|projcts|projek|prj)\b": "project",
    r"\b(anlyz|analize|anlyze|evalute|audit)\b": "analyze",
    r"\b(chrun|addtions|deltions)\b": "churn",
}

TIMEFRAME_PATTERNS = [
    (r"\b(last\s+5\s+min(?:ute)?s?|5\s+mins?|last\s+10\s+mins?|last\s+hour|just\s+now|right\s+now|live)\b", "live"),
    (r"\b(today|now)\b", "today"),
    (r"\b(yesterday)\b", "yesterday"),
    (r"\b(this\s+week|current\s+week|7d|last\s+7\s+days)\b", "7d"),
    (r"\b(last\s+week|previous\s+week)\b", "last_week"),
    (r"\b(this\s+month|current\s+month|30d|last\s+30\s+days)\b", "30d"),
    (r"\b(last\s+month|previous\s+month|past\s+month)\b", "last_month"),
    (r"\b(last\s+quarter|previous\s+quarter|past\s+90\s+days?|90d)\b", "last_quarter"),
    (r"\b(last\s+year|previous\s+year|past\s+year|in\s+202[0-9])\b", "last_year"),
    (r"\b(this\s+year|all\s+time|alltime|historical)\b", "all"),
]


NON_IT_PATTERNS = [
    r"\b(recipe|cook|cooking|bake|food|pasta|pizza|cake|chocolate|soup|curry|salad|dinner|lunch|breakfast)\b",
    r"\b(tourist|tourism|vacation|sightseeing|travel|hotel|resort|flight|ticket\s+booking|trip\s+to|visit\s+to)\b",
    r"\b(weather|temperature|forecast|rain\s+today|sunny\s+today|humidity|climate|weather\s+in)\b",
    r"\b(football|soccer|cricket|nba|nfl|tennis|super\s+bowl|olympics|sports\s+match|world\s+cup)\b",
    r"\b(movie|cinema|actor|actress|hollywood|bollywood|song|lyrics|singer|album|celebrity|gossip)\b",
    r"\b(horoscope|astrology|zodiac|fortune|joke|dating|relationship)\b",
    r"\b(president|capital\s+of|who\s+won\s+the\s+election|who\s+won|stock\s+price\s+of)\b",
]

class DeterministicIntentMatcher:
    """Fast regex and heuristic matcher for engineering intent routing."""

    def normalize_text(self, text: str) -> str:
        """Normalize typos and clean punctuation."""
        cleaned = text.lower().strip()
        for pattern, replacement in TYPO_MAPPINGS.items():
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
        return cleaned

    def extract_timeframe(self, text: str) -> Optional[str]:
        """Extract standardized timeframe tokens from text."""
        for pattern, token in TIMEFRAME_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return token
        return None

    def extract_entities(self, original_text: str, normalized_text: str) -> ExtractedEntities:
        """Extract repositories, developers, project names, and timeframes."""
        entities = ExtractedEntities()
        entities.timeframe = self.extract_timeframe(normalized_text)

    def extract_entities(self, original_text: str, normalized_text: str) -> ExtractedEntities:
        """Extract repositories, developers, project names, and timeframes."""
        entities = ExtractedEntities()
        entities.timeframe = self.extract_timeframe(normalized_text)

        # 1. Extract developer names: e.g. "how many commit masfiqur did", "commits by alex", "alex's prs", "comits by devloper alex"
        dev_stopwords = {
            "the", "a", "an", "all", "our", "recent", "last", "this", "that", "my", "your",
            "project", "repo", "repository", "commits", "commit", "prs", "pr",
            "developer", "devloper", "dev", "contributor", "author", "issues",
            "review", "reviews", "code", "work", "activity", "changes", "pull",
            "made", "why", "how", "what", "which", "who", "when", "where",
            "today", "yesterday", "did", "have", "has", "had", "pushed", "committed", "is", "are",
            "it", "he", "she", "they", "them", "his", "her", "their", "our", "we"
        }
        for dev_match in re.finditer(
            r"(?:by|from|author|dev|developer)\s+(?:developer\s+|dev\s+|contributor\s+)?([a-zA-Z0-9_\-\.]+)|([a-zA-Z0-9_\-\.]+)(?:'s|\s+did|\s+pushed|\s+committed)",
            normalized_text,
            re.IGNORECASE
        ):
            candidate = dev_match.group(1) or dev_match.group(2)
            if candidate and candidate.lower().strip() not in dev_stopwords:
                entities.developer_name = candidate.strip()
                break

        # 2. Extract project name: e.g. "in the test nehal project", "on test nehal project", "for project alpha"
        project_stopwords = {"the", "a", "an", "all", "our", "recent", "last", "this", "that", "my", "any", "which", "what", "how", "many", "there"}
        project_patterns = [
            r"(?:in|for|of|on|about)\s+(?:the\s+)?([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*?)\s+project\b",
            r"(?:in|for|of|on|about)\s+project\s+([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*)\b",
            r"\b([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*)\s+project\b"
        ]
        for pattern in project_patterns:
            proj_match = re.search(pattern, original_text, re.IGNORECASE)
            if proj_match:
                candidate = proj_match.group(1).strip()
                if candidate.lower() not in project_stopwords and not any(w in candidate.lower().split() for w in ["what", "how", "which", "are", "is", "where"]):
                    if original_text.lower().find(candidate.lower() + " project") != -1:
                        entities.project_name = f"{candidate} project"
                    else:
                        entities.project_name = candidate
                    break

        # 3. Extract repository mentions: e.g. "Tell me about Book-vibe-upgrade-V2", "commits in Nexora-AI", "did Book-vibe-upgrade-V2 have"
        repo_stopwords = {
            "the", "a", "an", "all", "our", "recent", "last", "this", "that", "my", "your",
            "project", "developer", "commit", "commits", "pr", "prs", "issues", "code",
            "repo", "repository", "rest", "api", "graphql", "docker", "kubernetes", "sql",
            "jwt", "oauth", "git", "today", "yesterday", "report", "reports", "dashboard",
            "activity", "overview", "status", "quantum", "computer", "injection", "principles",
            "architecture", "solid", "pattern", "patterns", "microservices", "microservice",
            "monolith", "algorithm", "design", "system", "systems", "it", "them", "he", "she",
            "they", "we", "us", "our", "which", "what", "how", "many"
        }

        # Check explicit patterns
        repo_patterns = [
            r"\b(?:tell\s+me\s+about|about|inspect|stats\s+for)\s+(?:the\s+|a\s+|our\s+)?(?:repo\s+|repository\s+)?([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)?)\b",
            r"\b(?:show\s+me|in|for|of|on)\s+(?:the\s+|a\s+|our\s+)?(?:repo\s+|repository\s+)?([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)?)(?:\s+commits|\s+prs|\s+repo|\s+repository|\s+issues|\s+have|\s+had)?\b",
            r"\b(?:did|does)\s+([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)?)\s+(?:have|had|contain|receive)\b"
        ]
        for pat in repo_patterns:
            repo_match = re.search(pat, original_text, re.IGNORECASE)
            if repo_match:
                candidate = repo_match.group(1).strip()
                if candidate.lower() not in repo_stopwords:
                    if not (entities.project_name and candidate.lower() in entities.project_name.lower()):
                        entities.repository_name = candidate
                        break

        # If still not found, check if a capitalized hyphenated token exists (e.g. Book-vibe-upgrade-V2, Dead-ZONE, Nexora-AI)
        if not entities.repository_name:
            for token in re.findall(r"\b[A-Za-z0-9]+-[A-Za-z0-9_\-]+\b", original_text):
                if token.lower() not in repo_stopwords:
                    if not (entities.project_name and token.lower() in entities.project_name.lower()):
                        entities.repository_name = token
                        break

        # 4. Target metrics identification
        if "commit" in normalized_text:
            entities.metric_targets.append("commits")
        if "pull request" in normalized_text or "pr" in normalized_text.split() or "prs" in normalized_text.split():
            entities.metric_targets.append("pull_requests")
        if "issue" in normalized_text or "bug" in normalized_text:
            entities.metric_targets.append("issues")
        if "churn" in normalized_text or "addition" in normalized_text or "deletion" in normalized_text:
            entities.metric_targets.append("code_churn")

        return entities

    def match(self, prompt: str) -> Tuple[Optional[IntentCategory], float, ExtractedEntities]:
        """
        Evaluate deterministic rules and calculate confidence score (0.0 to 1.0).
        """
        norm = self.normalize_text(prompt)
        entities = self.extract_entities(prompt, norm)

        # 0. Check for non-IT / unsupported questions
        for pattern in NON_IT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return IntentCategory.UNSUPPORTED_NON_IT, 0.95, entities

        # 1. General Conceptual IT & Technical QA (e.g., "What is a pointer?", "What is LangGraph?", "What is dependency injection?", "What is an API?", "What is a quantum computer?")
        # Route directly to LLM if query is a conceptual question without specific live repository metrics
        is_conceptual_qa = bool(
            re.search(r"^(?:what\s+is|what\s+are|how\s+to|explain|definition\s+of|describe|how\s+does|why\s+is|difference\s+between|tell\s+me\s+about\s+(?:the\s+concept\s+of|how))\b", norm) or
            re.search(r"\b(pointer|pointers|langgraph|langchain|dependency\s+injection|inversion\s+of\s+control|quantum\s+computing|quantum\s+computer|qubits?|clean\s+architecture|solid\s+principles|design\s+patterns?|rest\s+api|graphql\s+api|docker|kubernetes|ci/cd|microservices|asyncio|event\s+loop|multithreading|deadlock|concurrency|data\s+structures?|algorithms?|tcp/ip|http|https|oauth|jwt)\b", norm)
        )
        is_live_telemetry_query = bool(
            re.search(r"\b(repo\b|repos\b|repository|repositories|project\b|projects\b|developer\b|developers\b|contributor\b|contributors\b|commits?\b|prs?\b|pull\s+requests?|code\s+impact|churn|lines\s+added|lines\s+deleted|issues?\b|bugs?\b|dashboard|stars|forks|default\s+branch|language\s+breakdown|velocity|milestone|how\s+many\s+commits|who\s+committed|who\s+made\s+the\s+most|who\s+worked|who\s+pushed|open\s+prs?|pr\s+turnaround|today'?s\s+report|yesterday)\b", norm) or
            entities.repository_name or entities.developer_name or entities.project_name
        )

        if is_conceptual_qa and not is_live_telemetry_query:
            return IntentCategory.GENERAL_ENGINEERING_QA, 0.92, entities

        # 2. Engineering Analysis & Root Cause (e.g., "Why did commit activity decrease?", "Why did velocity drop?")
        if (
            re.search(r"\bwhy\s+did\s+.*?(?:decrease|drop|slow|fall|increase|change|drop\s+off|go\s+down)\b", norm) or
            re.search(r"\b(root\s+cause|bottleneck|code\s+impact|churn|lines\s+added|lines\s+deleted|why\s+is\s+velocity)\b", norm)
        ):
            return IntentCategory.CODE_IMPACT, 0.90, entities

        # 3. Pull Request Info & Review Velocity (e.g., "Show open pull requests", "What about open PRs?")
        if re.search(r"\b(open\s+pull\s+requests?|open\s+prs?|pull\s+request|pull\s+requests|prs\b|pr\s+review|merged\s+prs?|turnaround\s+time|code\s+review)\b", norm):
            return IntentCategory.PULL_REQUEST_INFO, 0.90, entities

        # 4. Developer Info & Leaderboard (e.g., "Which developer made the most commits today?", "Who pushed code?")
        if (
            re.search(r"\b(developer|contributor|committer|team\s+velocity|who\s+committed|who\s+worked|top\s+contributors?|which\s+developer|who\s+made\s+the\s+most|inactive|activity|who\s+has\s+been)\b", norm) or
            (entities.developer_name is not None and re.search(r"\b(did|pushed|commits|activity|prs)\b", norm))
        ):
            confidence = 0.92 if entities.developer_name else 0.88
            return IntentCategory.DEVELOPER_INFO, confidence, entities

        # 5. Cross-Repository Analytics & Comparison
        if re.search(r"\b(compare|contrast|versus|vs|benchmark|cross\s+repo|across\s+repos|compare\s+all\s+repositories)\b", norm):
            return IntentCategory.CROSS_REPOSITORY_ANALYTICS, 0.90, entities

        # 6. Issue Tracking & Bug Info
        if re.search(r"\b(issue|issues|bug|bugs|ticket|tickets|open\s+issues|closed\s+issues|sla|resolution\s+time)\b", norm):
            return IntentCategory.ISSUE_INFO, 0.89, entities

        # 7. Commit Info (e.g., "How many commits did Book-vibe-upgrade-V2 have today?", "recent commits")
        if re.search(r"\b(commit|commits|commit\s+history|recent\s+commits|commit\s+log|sha|pushed\s+code)\b", norm):
            confidence = 0.90 if entities.repository_name else 0.85
            return IntentCategory.COMMIT_INFO, confidence, entities

        # 8. Project Overview & Scoped Health (e.g., "What repositories are in test nehal project?")
        if re.search(r"\b(project|projects|project\s+health|project\s+status|connected\s+repos|milestone)\b", norm):
            return IntentCategory.PROJECT_INFO, 0.88, entities

        # 9. Dashboard Analytics & Project Reports (e.g., "Give me today's report", "Show dashboard summary")
        if re.search(r"\b(report|reports|today'?s\s+report|status\s+report|dashboard|summary|kpi|overview|health\s+score|executive\s+summary|general\s+status)\b", norm):
            return IntentCategory.DASHBOARD_ANALYTICS, 0.88, entities

        # 10. Repository Info (e.g., "Tell me about Book-vibe-upgrade-V2", "Show repository overview")
        if (
            entities.repository_name or
            re.search(r"\b(repository|repositories|repo|repos|codebase|stars|forks|default\s+branch|language\s+breakdown|tell\s+me\s+about)\b", norm)
        ):
            return IntentCategory.REPOSITORY_INFO, 0.88, entities

        # Fallback / Ambiguous
        return None, 0.30, entities

deterministic_intent_matcher = DeterministicIntentMatcher()
