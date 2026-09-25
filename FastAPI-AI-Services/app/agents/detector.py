"""
Engineering Agent Intent Detector & Handoff Router.
Identifies complex engineering tasks, multi-step analysis, and deep telemetry requests
that require the specialized AI Engineering Agent.

Key Detection Triggers:
1. Analyze developer activity
2. Compare repositories
3. Generate engineering reports
4. Investigate project activity
5. Perform complex GitHub analysis
6. Perform multi-step engineering tasks
"""
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from app.utils.logger import logger

@dataclass
class AgentDetectionResult:
    requires_agent: bool
    task_category: Optional[str] = None
    task_title: Optional[str] = None
    redirect_message: Optional[str] = None
    actions: Optional[List[Dict[str, str]]] = None

class BaseAgentDetector(ABC):
    """Abstract Base Class for Agent Intent Detectors."""

    @abstractmethod
    def detect_intent(self, prompt: str) -> AgentDetectionResult:
        """Detect whether prompt requires specialized autonomous agent processing."""
        pass

class EngineeringAgentDetector(BaseAgentDetector):
    """
    Detector for identifying complex engineering analysis and multi-step tasks
    that should be routed to the AI Engineering Agent.
    """

    PATTERNS: List[Dict[str, Any]] = [
        {
            "category": "developer_activity_analysis",
            "title": "Developer Activity Analysis",
            "regex": r"(analyze|evaluate|audit|track)\s+(developer|dev|committer)\s+(activity|contributions|performance|throughput|workload)"
        },
        {
            "category": "repository_comparison",
            "title": "Repository Comparison",
            "regex": r"(compare|contrast|benchmark)\s+(repositories|repos|repository)|(repo|repository)\s+(comparison|versus|vs)"
        },
        {
            "category": "report_generation",
            "title": "Engineering Report Generation",
            "regex": r"(generate|create|produce|export|build)\s+(?:\w+\s+){0,3}(report|reports|summary)"
        },
        {
            "category": "project_investigation",
            "title": "Project Activity Investigation",
            "regex": r"(investigate|deep\s+dive|audit|inspect)\s+(project|projects)\s+(activity|health|telemetry|milestone)"
        },
        {
            "category": "complex_github_analysis",
            "title": "Complex GitHub Analysis",
            "regex": r"(complex|deep|full|comprehensive)\s+(github|git)\s+(analysis|audit|diagnostics)|(analyze|diagnose)\s+(entire|all|whole)\s+(repo|repository|project)"
        },
        {
            "category": "multi_step_engineering",
            "title": "Multi-Step Autonomous Engineering",
            "regex": r"(multi-step|multi\s+step|autonomous|agent)\s+(engineering|task|refactoring|workflow|diagnosis)|run\s+(engineering\s+agent|agent)"
        }
    ]

    # Keyword combination trigger pairs
    PHRASE_TRIGGERS: List[Dict[str, Any]] = [
        {
            "category": "developer_activity_analysis",
            "title": "Developer Activity Analysis",
            "phrases": ["developer activity", "analyze developers", "developer contribution", "committer metrics"]
        },
        {
            "category": "repository_comparison",
            "title": "Repository Comparison",
            "phrases": ["compare repos", "compare repositories", "repository comparison", "repo vs repo"]
        },
        {
            "category": "report_generation",
            "title": "Engineering Report Generation",
            "phrases": ["generate report", "engineering report", "sprint report", "executive report"]
        },
        {
            "category": "project_investigation",
            "title": "Project Activity Investigation",
            "phrases": ["investigate project", "project activity", "project health audit"]
        },
        {
            "category": "complex_github_analysis",
            "title": "Complex GitHub Analysis",
            "phrases": ["complex github analysis", "deep git analysis", "full repo audit"]
        },
        {
            "category": "multi_step_engineering",
            "title": "Multi-Step Autonomous Engineering",
            "phrases": ["engineering agent", "multi-step task", "autonomous engineering"]
        }
    ]

    DEFAULT_REDIRECT_MESSAGE: str = (
        "This request involves **complex engineering analysis and multi-step processing**.\n\n"
        "The standard chatbot is designed for quick technical Q&A. For deep repository diagnostics, "
        "developer activity analysis, repository comparisons, and automated report generation, "
        "please use our specialized **GitMonitor AI Engineering Agent**!"
    )

    def detect_intent(self, prompt: str) -> AgentDetectionResult:
        """
        Analyze user prompt to determine if it requires the Engineering Agent.
        Does NOT execute the task; returns clear redirect instructions and action payload.
        """
        if not prompt or not prompt.strip():
            return AgentDetectionResult(requires_agent=False)

        text_lower = prompt.lower().strip()

        # 1. Regex pattern matching
        for item in self.PATTERNS:
            if re.search(item["regex"], text_lower):
                logger.info(f"[AgentDetector] Triggered Engineering Agent intent: '{item['category']}' (Regex)")
                return self._build_detection_result(item["category"], item["title"])

        # 2. Phrase matching
        for item in self.PHRASE_TRIGGERS:
            for phrase in item["phrases"]:
                if phrase in text_lower:
                    logger.info(f"[AgentDetector] Triggered Engineering Agent intent: '{item['category']}' (Phrase: '{phrase}')")
                    return self._build_detection_result(item["category"], item["title"])

        return AgentDetectionResult(requires_agent=False)

    def _build_detection_result(self, category: str, title: str) -> AgentDetectionResult:
        return AgentDetectionResult(
            requires_agent=True,
            task_category=category,
            task_title=title,
            redirect_message=(
                f"Your request **\"{title}\"** requires autonomous multi-step processing.\n\n"
                f"{self.DEFAULT_REDIRECT_MESSAGE}"
            ),
            actions=[
                {
                    "label": "Launch Engineering Agent",
                    "action": "redirect",
                    "target": "/agent",
                    "type": "primary"
                }
            ]
        )

agent_detector = EngineeringAgentDetector()
