"""
Domain Router for Engineering AI Agent (Phase 14).
Categorizes queries into:
  - Category A: GITHUB_APPLICATION_DATA (Commits, PRs, developers, repositories, velocity, churn)
  - Category B: ENGINEERING_IT_KNOWLEDGE (Software engineering, IT architectures, algorithms, hardware, computing concepts)
  - Category C: NON_IT_GENERAL (Tourism, recipes, weather, sports, general entertainment)
"""
import re
from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from app.engineering_agent.router.schemas import IntentCategory


class QuestionDomainCategory(str, Enum):
    """Categorical domain taxonomy for incoming questions."""
    GITHUB_APPLICATION = "github_application"          # Category A: Live/synced repository metrics and developer telemetry
    ENGINEERING_IT_KNOWLEDGE = "engineering_it_knowledge"  # Category B: General IT, CS theory, software design, hardware
    NON_IT_GENERAL = "non_it_general"                  # Category C: Out-of-scope non-technical queries


@dataclass
class DomainRoutingDecision:
    """Decision details produced by the Domain Router."""
    domain: QuestionDomainCategory
    matched_intent: IntentCategory
    confidence: float
    explanation: str
    requires_tools: bool
    requires_guardrail: bool


class DomainRouter:
    """
    Distinguishes between GitHub telemetry questions, IT/Software knowledge questions,
    and out-of-domain general questions.
    """

    # Non-IT keywords and patterns (Category C)
    NON_IT_PATTERNS = [
        r"\b(tourist|tourism|vacation|sightseeing|travel|hotel|resort|flight|ticket\s+booking)\b",
        r"\b(recipe|cook|cooking|bake|baking|ingredient|cake|chocolate|pizza|pasta|soup|curry|salad|dinner|lunch|breakfast)\b",
        r"\b(weather|temperature|forecast|rain\s+today|sunny\s+today|humidity|climate)\b",
        r"\b(world\s+cup|football|soccer|cricket|nba|nfl|tennis|super\s+bowl|olympics|sports\s+match)\b",
        r"\b(movie|cinema|actor|actress|hollywood|bollywood|song|lyrics|singer|album|celebrity|gossip)\b",
        r"\b(dating|relationship|horoscope|astrology|zodiac|fortune|joke|funny\s+story)\b",
        r"\b(capital\s+of|president\s+of|prime\s+minister\s+of|who\s+won\s+the\s+election)\b",
    ]

    # General Engineering, IT & Hardware keywords and patterns (Category B)
    ENGINEERING_IT_PATTERNS = [
        # Computing, Hardware, Architecture
        r"\b(quantum\s+computing|qubit|quantum\s+supremacy|quantum\s+algorithms?)\b",
        r"\b(processor|cpu|gpu|ram|ssd|nvme|chipset|motherboard|socket|clock\s+speed|overclocking)\b",
        r"\b(gaming\s+processor|best\s+cpu\s+for|intel\s+vs\s+amd|ryzen|core\s+i[3579]|apple\s+silicon|m[1234]\s+chip)\b",
        r"\b(arm\s+vs\s+x86|risc-v|instruction\s+set|cache\s+hierarchy|l1\s+l2\s+l3\s+cache)\b",
        # Software engineering, design patterns, architectures
        r"\b(what\s+is\s+(?:docker|kubernetes|graphql|rest|oauth|jwt|solid|clean\s+code|design\s+pattern|grpc|redis|kafka))\b",
        r"\b(difference\s+between\s+(?:sql\s+and\s+nosql|rest\s+and\s+graphql|monolith\s+and\s+microservices|tcp\s+and\s+udp))\b",
        r"\b(git\s+rebase\s+vs\s+git\s+merge|git\s+cherry-pick|git\s+bisect|how\s+git\s+works\s+internally)\b",
        r"\b(circuit\s+breaker\s+pattern|saga\s+pattern|cqrs|event\s+sourcing|event-driven\s+architecture)\b",
        r"\b(garbage\s+collection|v8\s+engine|jvm|memory\s+leak|concurrency|asyncio|event\s+loop|multithreading|mutex|deadlock)\b",
        r"\b(big\s+o|time\s+complexity|space\s+complexity|binary\s+search\s+tree|dijkstra|dynamic\s+programming)\b",
        r"\b(cyber\s+security|penetration\s+testing|sql\s+injection|xss|csrf|zero\s+trust|public\s+key\s+cryptography)\b",
    ]

    # GitHub / Application telemetry keywords (Category A)
    GITHUB_APP_PATTERNS = [
        r"\b(how\s+many\s+commits|who\s+committed|who\s+pushed|commit\s+history|latest\s+commit|recent\s+commits)\b",
        r"\b(open\s+prs?|pull\s+requests?|merged\s+prs?|pr\s+turnaround|review\s+velocity|code\s+review)\b",
        r"\b(developer\s+velocity|code\s+churn|lines\s+added|lines\s+deleted|top\s+contributors?|author\s+metrics)\b",
        r"\b(our\s+repositories|repo\s+status|branches\s+in|project\s+health|project\s+dashboard|connected\s+repos)\b",
        r"\b(show\s+(?:commits|prs|issues|repositories|developers|metrics|analytics|dashboard))\b",
    ]

    def classify_domain(self, query: str, detected_intent: Optional[IntentCategory] = None) -> DomainRoutingDecision:
        """
        Classify a query into Category A, B, or C with structured routing flags.
        """
        norm = query.lower().strip()

        # 1. Category C Check: Non-IT General Questions
        for pattern in self.NON_IT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return DomainRoutingDecision(
                    domain=QuestionDomainCategory.NON_IT_GENERAL,
                    matched_intent=IntentCategory.UNSUPPORTED_NON_IT,
                    confidence=0.96,
                    explanation="Query is unrelated to software engineering, IT, or repository monitoring.",
                    requires_tools=False,
                    requires_guardrail=True,
                )

        if detected_intent == IntentCategory.UNSUPPORTED_NON_IT:
            return DomainRoutingDecision(
                domain=QuestionDomainCategory.NON_IT_GENERAL,
                matched_intent=IntentCategory.UNSUPPORTED_NON_IT,
                confidence=0.95,
                explanation="Intent previously marked as unsupported non-IT.",
                requires_tools=False,
                requires_guardrail=True,
            )

        # 2. Category A Check: Telemetry / GitHub Application Data
        if detected_intent in (
            IntentCategory.REPOSITORY_INFO,
            IntentCategory.COMMIT_INFO,
            IntentCategory.PULL_REQUEST_INFO,
            IntentCategory.ISSUE_INFO,
            IntentCategory.DEVELOPER_INFO,
            IntentCategory.PROJECT_INFO,
            IntentCategory.DASHBOARD_ANALYTICS,
            IntentCategory.CROSS_REPOSITORY_ANALYTICS,
            IntentCategory.CODE_IMPACT,
        ):
            return DomainRoutingDecision(
                domain=QuestionDomainCategory.GITHUB_APPLICATION,
                matched_intent=detected_intent,
                confidence=0.92,
                explanation="Query requires factual repository telemetry and tool execution.",
                requires_tools=True,
                requires_guardrail=False,
            )

        for pattern in self.GITHUB_APP_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return DomainRoutingDecision(
                    domain=QuestionDomainCategory.GITHUB_APPLICATION,
                    matched_intent=detected_intent or IntentCategory.DASHBOARD_ANALYTICS,
                    confidence=0.90,
                    explanation="Query targets monitored GitHub repository telemetry or team activity.",
                    requires_tools=True,
                    requires_guardrail=False,
                )

        # 3. Category B Check: Engineering / IT Knowledge
        for pattern in self.ENGINEERING_IT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return DomainRoutingDecision(
                    domain=QuestionDomainCategory.ENGINEERING_IT_KNOWLEDGE,
                    matched_intent=IntentCategory.GENERAL_ENGINEERING_QA,
                    confidence=0.90,
                    explanation="Query targets software engineering, hardware, or computer science knowledge.",
                    requires_tools=False,
                    requires_guardrail=False,
                )

        # General conceptual questions default to Category B (General Engineering QA)
        if re.search(r"\b(what\s+is|how\s+to|explain|difference\s+between|why\s+does|how\s+does)\b", norm):
            return DomainRoutingDecision(
                domain=QuestionDomainCategory.ENGINEERING_IT_KNOWLEDGE,
                matched_intent=IntentCategory.GENERAL_ENGINEERING_QA,
                confidence=0.82,
                explanation="Conceptual question routed to configured LLM engineering knowledge capability.",
                requires_tools=False,
                requires_guardrail=False,
            )

        # Default fallback
        return DomainRoutingDecision(
            domain=QuestionDomainCategory.ENGINEERING_IT_KNOWLEDGE,
            matched_intent=IntentCategory.GENERAL_ENGINEERING_QA,
            confidence=0.75,
            explanation="Defaulted to General Engineering / IT Knowledge synthesis.",
            requires_tools=False,
            requires_guardrail=False,
        )


domain_router = DomainRouter()
