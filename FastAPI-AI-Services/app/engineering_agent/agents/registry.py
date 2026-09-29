"""
Specialist Agents Registry & Dispatcher.
Maps Intent Categories to the 7 specialized read-only sub-agents.
"""
from typing import Dict, List, Optional

from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.repository_agent import repository_agent
from app.engineering_agent.agents.commit_agent import commit_agent
from app.engineering_agent.agents.pull_request_agent import pull_request_agent
from app.engineering_agent.agents.issue_agent import issue_agent
from app.engineering_agent.agents.developer_agent import developer_agent
from app.engineering_agent.agents.project_agent import project_agent
from app.engineering_agent.agents.analytics_agent import analytics_agent
from app.engineering_agent.agents.general_it_agent import general_it_agent
from app.engineering_agent.router.schemas import IntentCategory
from app.utils.logger import logger


class SpecialistAgentRegistry:
    """Registry managing domain-specific engineering specialist agents."""

    def __init__(self):
        self._agents: Dict[str, BaseSpecialistAgent] = {
            repository_agent.agent_id: repository_agent,
            commit_agent.agent_id: commit_agent,
            pull_request_agent.agent_id: pull_request_agent,
            issue_agent.agent_id: issue_agent,
            developer_agent.agent_id: developer_agent,
            project_agent.agent_id: project_agent,
            analytics_agent.agent_id: analytics_agent,
            general_it_agent.agent_id: general_it_agent,
        }

        # Intent to Specialist Agent mapping
        self._intent_mapping: Dict[IntentCategory, BaseSpecialistAgent] = {
            IntentCategory.REPOSITORY_INFO: repository_agent,
            IntentCategory.COMMIT_INFO: commit_agent,
            IntentCategory.PULL_REQUEST_INFO: pull_request_agent,
            IntentCategory.ISSUE_INFO: issue_agent,
            IntentCategory.DEVELOPER_INFO: developer_agent,
            IntentCategory.CODE_IMPACT: commit_agent,
            IntentCategory.PROJECT_INFO: project_agent,
            IntentCategory.DASHBOARD_ANALYTICS: analytics_agent,
            IntentCategory.CROSS_REPOSITORY_ANALYTICS: analytics_agent,
            IntentCategory.GENERAL_ENGINEERING_QA: general_it_agent,
        }

    def get_agent(self, agent_id: str) -> Optional[BaseSpecialistAgent]:
        """Retrieve a specialist agent by ID."""
        return self._agents.get(agent_id)

    def get_agent_for_intent(self, intent: IntentCategory) -> BaseSpecialistAgent:
        """Retrieve the primary specialist agent responsible for the classified intent."""
        return self._intent_mapping.get(intent, analytics_agent)

    def list_agents(self) -> List[BaseSpecialistAgent]:
        """List all 7 registered specialist agents."""
        return list(self._agents.values())


specialist_registry = SpecialistAgentRegistry()
