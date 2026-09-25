"""
Topic Guardrail & Intent Classification Service for GitMonitor Chatbot.
Enforces technical & domain scope validation before invoking LLM completions.

Allowed Technical Scopes:
1. GitMonitor-related questions
2. Programming questions (Python, JS/TS, C++, Java, Go, Rust, SQL, HTML/CSS, etc.)
3. Software engineering questions (Architecture, design patterns, testing, refactoring)
4. IT / Computer Science questions (OS, networking, security, algorithms)
5. Git / GitHub questions (Commits, branches, PRs, actions, webhooks)
6. API questions (REST, GraphQL, gRPC, HTTP methods, headers)
7. Database questions (SQL, PostgreSQL, NoSQL, ORMs, queries, indexing)
8. Cloud / DevOps / Development questions (Docker, K8s, CI/CD, AWS, Azure, Linux)

Politely refuses non-technical / unrelated questions.
"""
import re
from dataclasses import dataclass
from typing import List, Set, Optional

from app.utils.logger import logger

@dataclass
class TopicValidationResult:
    is_allowed: bool
    category: str
    refusal_message: Optional[str] = None

class TopicGuard:
    """Validator class to check if a user prompt falls into allowed technical scopes."""

    TECHNICAL_KEYWORDS: Set[str] = {
        # 1. GitMonitor Domain
        "gitmonitor", "dashboard", "repository", "repositories", "developer", "developers",
        "churn", "telemetry", "pr", "prs", "pull_request", "pull request", "issue", "issues",
        "engineering agent", "chatbot", "webhook", "webhooks", "organization", "project", "projects",

        # 2. Programming & Languages
        "code", "coding", "program", "programming", "python", "javascript", "js", "typescript", "ts",
        "java", "c++", "cpp", "c#", "golang", "go", "rust", "ruby", "php", "swift", "kotlin", "html",
        "css", "sql", "bash", "shell", "powershell", "function", "class", "variable", "array", "object",
        "string", "list", "dict", "loop", "if", "else", "try", "catch", "exception", "async", "await",
        "syntax", "compiler", "interpreter", "type", "interface", "generic", "enum", "struct",

        # 3. Software Engineering
        "architecture", "design pattern", "refactor", "refactoring", "clean code", "unit test",
        "testing", "mock", "tdd", "bdd", "ci/cd", "agile", "scrum", "sprint", "code review",
        "dependency", "framework", "library", "sdk", "orm", "mvc", "solid", "microservice",

        # 4. IT & Computer Science
        "computer", "computing", "cpu", "ram", "memory", "storage", "disk", "operating system", "os",
        "linux", "windows", "ubuntu", "debian", "process", "thread", "concurrency", "parallel",
        "network", "networking", "ip", "tcp", "udp", "dns", "http", "https", "socket", "port",
        "security", "encryption", "hash", "jwt", "auth", "oauth", "tls", "ssl", "algorithm",
        "data structure", "binary tree", "graph", "sorting", "complexity", "big o",

        # 5. Git & GitHub
        "git", "github", "gitlab", "bitbucket", "commit", "branch", "merge", "rebase", "checkout",
        "cherry-pick", "push", "pull", "fetch", "clone", "stash", "repo", "diff", "conflict",
        "fork", "head", "tag", "release", "action", "actions", "workflow",

        # 6. APIs
        "api", "apis", "rest", "restful", "graphql", "grpc", "endpoint", "endpoints", "payload",
        "json", "xml", "yaml", "header", "headers", "status code", "post", "get", "put", "delete",
        "patch", "request", "response", "cors", "swagger", "openapi",

        # 7. Databases
        "database", "db", "postgres", "postgresql", "mysql", "sqlite", "mongodb", "redis",
        "dynamodb", "neon", "table", "schema", "column", "row", "index", "query", "select",
        "insert", "update", "join", "foreign key", "primary key", "transaction", "migration",

        # 8. Cloud & DevOps & Development
        "cloud", "devops", "docker", "container", "kubernetes", "k8s", "aws", "azure", "gcp",
        "server", "client", "host", "domain", "ssl", "nginx", "apache", "env", "environment",
        "deploy", "deployment", "pipeline", "build", "npm", "pip", "maven", "gradle", "node"
    }

    CODE_SYNTAX_PATTERNS: List[str] = [
        r"def\s+[a-zA-Z_]", r"function\s+[a-zA-Z_]", r"class\s+[a-zA-Z_]",
        r"import\s+[a-zA-Z_]", r"from\s+[a-zA-Z_]\s+import", r"const\s+[a-zA-Z_]",
        r"let\s+[a-zA-Z_]", r"var\s+[a-zA-Z_]", r"SELECT\s+.+\s+FROM", r"INSERT\s+INTO",
        r"git\s+[a-z]+", r"npm\s+[a-z]+", r"docker\s+[a-z]+", r"curl\s+",
        r"https?://", r"\{\s*[\"'][a-zA-Z0-9_]+[\"']\s*:"
    ]

    OFF_TOPIC_KEYWORDS: Set[str] = {
        "recipe", "recipes", "cake", "cook", "cooking", "bake", "baking", "dish", "food", "restaurant",
        "movie", "movies", "actor", "actress", "cinema", "song", "music", "celebrity", "gossip",
        "weather", "forecast", "rain", "temperature", "climate", "horoscope", "astrology", "zodiac",
        "fifa", "football", "soccer", "basketball", "baseball", "tennis", "olympics", "match", "score",
        "fashion", "dress", "makeup", "skincare", "dating", "relationship", "love", "romance",
        "travel", "hotel", "flight", "tourism", "vacation", "politics", "president", "election",
        "joke", "riddle", "poem", "fiction", "novel", "horoscope", "astrology"
    }

    POLITE_REFUSAL_MESSAGE: str = (
        "I am GitMonitor AI Assistant, specifically designed to help with GitMonitor, software engineering, "
        "programming, Git/GitHub, APIs, databases, cloud, DevOps, and IT topics.\n\n"
        "I cannot answer non-technical or unrelated questions. Please ask me any technical question, code snippet, "
        "or query regarding your GitMonitor repositories and software projects!"
    )

    def validate_prompt(self, prompt: str) -> TopicValidationResult:
        """
        Validate whether the user prompt falls into allowed technical categories or off-topic non-technical queries.
        """
        if not prompt or not prompt.strip():
            return TopicValidationResult(is_allowed=True, category="empty")

        text_lower = prompt.lower()
        words = set(re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text_lower))

        # 1. Check code syntax regex patterns
        for pattern in self.CODE_SYNTAX_PATTERNS:
            if re.search(pattern, prompt, re.IGNORECASE):
                logger.info(f"[TopicGuard] Allowed: Matched code syntax pattern '{pattern}'")
                return TopicValidationResult(is_allowed=True, category="code_syntax")

        # 2. Count technical vs off-topic matches
        tech_matches = words.intersection(self.TECHNICAL_KEYWORDS)
        off_topic_matches = words.intersection(self.OFF_TOPIC_KEYWORDS)

        # 3. Decision logic
        if off_topic_matches and len(off_topic_matches) >= len(tech_matches):
            logger.info(f"[TopicGuard] Refused off-topic query. Matched off-topic words: {off_topic_matches}")
            return TopicValidationResult(
                is_allowed=False,
                category="off_topic",
                refusal_message=self.POLITE_REFUSAL_MESSAGE
            )

        if tech_matches:
            logger.info(f"[TopicGuard] Allowed: Technical query. Matched terms: {list(tech_matches)[:5]}")
            return TopicValidationResult(is_allowed=True, category="technical")

        # 4. Fallback for general questions (short questions without explicit off-topic triggers)
        # If no explicit off-topic keyword was matched, allow general technical exploration
        if not off_topic_matches:
            return TopicValidationResult(is_allowed=True, category="general_technical_intent")

        return TopicValidationResult(
            is_allowed=False,
            category="unrelated",
            refusal_message=self.POLITE_REFUSAL_MESSAGE
        )

topic_guard = TopicGuard()
