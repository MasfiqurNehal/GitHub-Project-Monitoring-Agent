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
        system_platform_terms = {
            "github project monitoring agent",
            "gitmonitor",
            "github project monitoring",
            "project monitoring agent",
            "monitoring agent"
        }
        is_platform_inquiry = any(term in normalized_text for term in system_platform_terms)

        project_stopwords = {"the", "a", "an", "all", "our", "recent", "last", "this", "that", "my", "any", "which", "what", "how", "many", "there", "monitoring", "agent"}
        project_patterns = [
            r"(?:in|for|of|on|about)\s+(?:the\s+)?([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*?)\s+project\b",
            r"(?:in|for|of|on|about)\s+project\s+([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*)\b",
            r"\b([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*)\s+project\b"
        ]
        if not is_platform_inquiry and not re.search(r"\b(repository|repo|codebase)\b", normalized_text):
            for pattern in project_patterns:
                proj_match = re.search(pattern, original_text, re.IGNORECASE)
                if proj_match:
                    candidate = proj_match.group(1).strip()
                    cand_lower = candidate.lower()
                    if cand_lower not in project_stopwords and not any(w in cand_lower.split() for w in ["what", "how", "which", "are", "is", "where", "monitoring", "agent"]):
                        if original_text.lower().find(cand_lower + " project") != -1:
                            entities.project_name = f"{candidate} project"
                        else:
                            entities.project_name = candidate
                        break

        # 3. Extract repository mentions: e.g. "Tell me about Book-vibe-upgrade-V2", "commits in Nexora-AI", "did Book-vibe-upgrade-V2 have"
        repo_stopwords = {
            "the", "a", "an", "all", "our", "recent", "last", "this", "that", "my", "your",
            "developer", "commit", "commits", "pr", "prs", "issues", "code",
            "repo", "repository", "rest", "api", "graphql", "docker", "kubernetes", "sql",
            "jwt", "oauth", "git", "today", "yesterday", "report", "reports", "dashboard",
            "activity", "overview", "status", "quantum", "computer", "injection", "principles",
            "architecture", "solid", "pattern", "patterns", "microservices", "microservice",
            "monolith", "algorithm", "design", "system", "systems", "it", "them", "he", "she",
            "they", "we", "us", "our", "which", "what", "how", "many"
        }

        # Check explicit multi-word before "repository" or "repo" (e.g. "github project monitoring agent repository")
        multi_repo_match = re.search(
            r"(?:about|inspect|show\s+me|tell\s+me\s+about|for|of|in)?\s*([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*?)\s+(?:repository|repo)\b",
            original_text,
            re.IGNORECASE
        )
        if multi_repo_match:
            candidate = multi_repo_match.group(1).strip()
            words = candidate.split()
            while words and words[0].lower() in {"do", "you", "can", "could", "would", "please", "tell", "me", "about", "the", "our", "a", "an", "what", "is", "in", "how", "show"}:
                words.pop(0)
            candidate = " ".join(words)
            if candidate and candidate.lower() not in repo_stopwords:
                entities.repository_name = candidate

        # Check explicit single-word patterns
        if not entities.repository_name and not is_platform_inquiry:
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
        if not entities.repository_name and not is_platform_inquiry:
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

    def match(self, prompt: str) -> Tuple[Optional[IntentCategory], float, ExtractedEntities]:
        """
        Evaluate deterministic rules and calculate confidence score (0.0 to 1.0).
        Fast, cheap classification before expensive AI pipeline execution.
        """
        raw_trimmed = prompt.strip()
        norm = self.normalize_text(prompt)
        entities = self.extract_entities(prompt, norm)

        # 0a. Check for Simple Greetings ("hello", "hi", "hii", "good morning", etc.)
        greeting_pattern = r"^(?:h+[eiaou]+[yia]*|h+i+|h+e+y+|h+e+l+l*o+|h+o+l+a+|good\s+(?:morning|afternoon|evening|day|night)|greetings|hi\s+there|hello\s+there|hey\s+there|howdy|yo|sup|wassup|what'?s\s+up)[!.,\s]*$"
        if re.match(greeting_pattern, norm, re.IGNORECASE):
            return IntentCategory.GREETING, 1.0, entities

        # 0b. Check for Casual Interaction & Platform Overview ("who are you", "what can you do", "help", "thanks", "tell me about github project monitoring agent", etc.)
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
        if re.match(casual_pattern, norm, re.IGNORECASE):
            return IntentCategory.CASUAL, 0.95, entities

        # 0c. Check for Invalid or Garbage Input ("asdf`!@3", symbol noise, keyboard mashes)
        if self.is_unknown_or_gibberish(prompt, norm):
            return IntentCategory.INVALID_OR_UNCLEAR, 0.95, entities

        # 0d. Check for non-IT / unsupported questions
        for pattern in NON_IT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return IntentCategory.UNSUPPORTED_NON_IT, 0.95, entities

        # 1. General Conceptual IT & Technical QA (e.g., "What is quantum computing?", "What is vRAM?", "What architecture should I use for a Next.js SaaS?", "How does Redis caching work?")
        is_conceptual_qa = bool(
            re.search(r"^(?:what\s+is|what\s+are|what\s+processor|which\s+processor|what\s+architecture|how\s+does|how\s+to|explain|definition\s+of|describe|why\s+is|difference\s+between|tell\s+me\s+about\s+(?:the\s+concept\s+of|how))\b", norm) or
            re.search(r"\b(vram|ram|processor|cpu|gpu|workstation|pointer|pointers|langgraph|langchain|dependency\s+injection|inversion\s+of\s+control|quantum\s+computing|quantum\s+computer|qubits?|clean\s+architecture|solid\s+principles|design\s+patterns?|rest\s+api|graphql\s+api|docker|kubernetes|ci/cd|microservices|asyncio|event\s+loop|multithreading|deadlock|concurrency|data\s+structures?|algorithms?|tcp/ip|http|https|oauth|jwt|redis|caching|cache|next\.js|nextjs|saas|architecture)\b", norm)
        )
        is_live_telemetry_query = bool(
            re.search(r"\b(repo\b|repos\b|repository|repositories|project\b|projects\b|developer\b|developers\b|contributor\b|contributors\b|commits?\b|prs?\b|pull\s+requests?|code\s+impact|churn|lines\s+added|lines\s+deleted|issues?\b|bugs?\b|dashboard|stars|forks|default\s+branch|language\s+breakdown|velocity|milestone|how\s+many\s+commits|who\s+committed|who\s+made\s+the\s+most|who\s+worked|who\s+pushed|open\s+prs?|pr\s+turnaround|today'?s\s+report|yesterday)\b", norm) or
            entities.repository_name or entities.developer_name or entities.project_name
        )

        if is_conceptual_qa and not is_live_telemetry_query:
            return IntentCategory.GENERAL_ENGINEERING_QA, 0.95, entities

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

        # 8. Repository Info (Evaluated before Project Info if query refers to repository/repo/codebase or repo entity found)
        is_repo_query = bool(
            entities.repository_name or
            re.search(r"\b(repository|repositories|repo\b|repos\b|codebase|stars|forks|default\s+branch|language\s+breakdown)\b", norm)
        )
        is_project_query = bool(
            entities.project_name or
            re.search(r"\b(project\s+health|project\s+status|connected\s+repos|milestone)\b", norm) or
            (re.search(r"\b(project|projects)\b", norm) and not is_repo_query)
        )

        if is_repo_query and not re.search(r"\b(?:repos|repositories)\s+(?:in|of|for)\s+(?:the\s+)?project\b", norm):
            return IntentCategory.REPOSITORY_INFO, 0.90 if entities.repository_name else 0.88, entities

        # 9. Project Overview & Scoped Health (e.g., "What repositories are in test nehal project?")
        if is_project_query:
            return IntentCategory.PROJECT_INFO, 0.88, entities

        # 10. Dashboard Analytics & Project Reports (e.g., "Give me today's report", "Show dashboard summary")
        if re.search(r"\b(report|reports|today'?s\s+report|status\s+report|dashboard|summary|kpi|overview|health\s+score|executive\s+summary|general\s+status)\b", norm):
            return IntentCategory.DASHBOARD_ANALYTICS, 0.88, entities

        # 11. Fallback Repository Info (e.g., "Tell me about Book-vibe-upgrade-V2", "Show repository overview")
        if (
            entities.repository_name or
            re.search(r"\b(repository|repositories|repo|repos|codebase|stars|forks|default\s+branch|language\s+breakdown|tell\s+me\s+about)\b", norm)
        ):
            return IntentCategory.REPOSITORY_INFO, 0.88, entities

        # Fallback / Ambiguous
        return None, 0.30, entities

deterministic_intent_matcher = DeterministicIntentMatcher()
