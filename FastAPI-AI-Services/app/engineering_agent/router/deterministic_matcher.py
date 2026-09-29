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

        # 1. Extract developer names: e.g. "how many commit masfiqur did", "commits by alex", "alex's prs", "by developer alex"
        stopwords = {
            "the", "a", "an", "all", "our", "recent", "last", "this", "my",
            "project", "repo", "repository", "commits", "commit", "prs", "pr",
            "developer", "devloper", "dev", "contributor", "author", "issues",
            "review", "reviews", "code", "work", "activity", "changes", "pull"
        }
        for dev_match in re.finditer(
            r"(?:by|from|author|dev|developer)\s+(?:developer\s+|dev\s+|contributor\s+)?([a-zA-Z0-9_\-\.]+)|([a-zA-Z0-9_\-\.]+)(?:'s|\s+did|\s+pushed)",
            normalized_text,
            re.IGNORECASE
        ):
            candidate = dev_match.group(1) or dev_match.group(2)
            if candidate and candidate.lower().strip() not in stopwords:
                entities.developer_name = candidate.strip()
                break

        # 2. Extract repository mentions: e.g. "show me nexora commits", "commits in the backend repo", "hospital-management-frontend"
        repo_stopwords = {"the", "a", "an", "all", "our", "recent", "last", "this", "my", "project", "developer", "commit", "commits", "pr", "prs", "issues", "code", "repo", "repository"}
        for repo_match in re.finditer(
            r"(?:show\s+me|in|for|of|repo|repository)\s+(?:the\s+|a\s+|our\s+)?(?:repo\s+|repository\s+)?([a-zA-Z0-9_\-\.\/]+)(?:\s+commits|\s+prs|\s+repo|\s+repository|\s+issues)?",
            normalized_text,
            re.IGNORECASE
        ):
            candidate = repo_match.group(1).strip()
            if candidate.lower() not in repo_stopwords:
                entities.repository_name = candidate
                break


        # 3. Target metrics identification
        if "commit" in normalized_text:
            entities.metric_targets.append("commits")
        if "pull request" in normalized_text or "pr" in normalized_text.split():
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

        # 1. Developer Info, Velocity & Inactivity
        if (
            re.search(r"\b(developer|contributor|committer|team\s+velocity|who\s+committed|who\s+worked|top\s+contributors|inactive|activity|who\s+has\s+been)\b", norm) or
            (entities.developer_name is not None and re.search(r"\b(did|pushed|commits|activity|prs)\b", norm))
        ):
            confidence = 0.92 if entities.developer_name else 0.88
            return IntentCategory.DEVELOPER_INFO, confidence, entities

        # 2. Cross-Repository Analytics & Comparison
        if re.search(r"\b(compare|contrast|versus|vs|benchmark|cross\s+repo|across\s+repos|compare\s+all\s+repositories)\b", norm):
            return IntentCategory.CROSS_REPOSITORY_ANALYTICS, 0.90, entities

        # 3. Code Impact, Churn & Diff Analytics
        if re.search(r"\b(code\s+impact|churn|lines\s+added|lines\s+deleted|additions|deletions|top\s+files|files\s+changed|net\s+code)\b", norm):
            return IntentCategory.CODE_IMPACT, 0.88, entities

        # 4. Pull Request Info & Review Velocity
        if re.search(r"\b(pull\s+request|pull\s+requests|prs|pr\s+review|merged\s+pr|open\s+pr|turnaround\s+time|code\s+review)\b", norm):
            return IntentCategory.PULL_REQUEST_INFO, 0.89, entities

        # 5. Issue Tracking & Bug Info
        if re.search(r"\b(issue|issues|bug|bugs|ticket|tickets|open\s+issues|closed\s+issues|sla|resolution\s+time)\b", norm):
            return IntentCategory.ISSUE_INFO, 0.89, entities

        # 6. Commit Info
        if re.search(r"\b(commit|commits|commit\s+history|recent\s+commits|commit\s+log|sha|pushed\s+code)\b", norm):
            confidence = 0.90 if entities.repository_name else 0.85
            return IntentCategory.COMMIT_INFO, confidence, entities

        # 7. Project Overview & Scoped Health
        if re.search(r"\b(project|projects|project\s+health|project\s+status|connected\s+repos|milestone)\b", norm):
            return IntentCategory.PROJECT_INFO, 0.85, entities

        # 8. Dashboard Analytics & Summary
        if re.search(r"\b(dashboard|summary|kpi|overview|health\s+score|executive\s+summary|general\s+status)\b", norm):
            return IntentCategory.DASHBOARD_ANALYTICS, 0.84, entities

        # 9. Repository Info
        if re.search(r"\b(repository|repositories|repo|repos|codebase|stars|forks|default\s+branch|language\s+breakdown)\b", norm):
            return IntentCategory.REPOSITORY_INFO, 0.85, entities

        # 10. General Engineering / IT Architecture / Hardware QA
        if (
            re.search(r"\b(quantum\s+computing|qubit|processor|gaming\s+processor|best\s+cpu|intel\s+vs\s+amd|ryzen|core\s+i[3579]|gpu|ram|ssd|chipset|arm\s+vs\s+x86)\b", norm) or
            re.search(r"\b(what\s+is|how\s+to|explain|difference\s+between|architecture|rest|graphql|docker|kubernetes|ci/cd|git\s+rebase|git\s+merge|refactor|design\s+pattern|concurrency|asyncio|microservices)\b", norm)
        ):
            return IntentCategory.GENERAL_ENGINEERING_QA, 0.85, entities

        # Fallback / Ambiguous
        return None, 0.30, entities

deterministic_intent_matcher = DeterministicIntentMatcher()
