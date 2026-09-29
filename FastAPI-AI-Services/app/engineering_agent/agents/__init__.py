"""
Engineering Agent Multi-Agent Orchestration & Specialist Sub-Agents Module.
Contains the 7 domain-specific specialist agents:
1. RepositoryAgent
2. CommitAgent
3. PullRequestAgent
4. IssueAgent
5. DeveloperAgent
6. ProjectAgent
7. AnalyticsAgent
"""
from app.engineering_agent.agents.base import BaseSpecialistAgent
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.agents.repository_agent import repository_agent, RepositoryAgent
from app.engineering_agent.agents.commit_agent import commit_agent, CommitAgent
from app.engineering_agent.agents.pull_request_agent import pull_request_agent, PullRequestAgent
from app.engineering_agent.agents.issue_agent import issue_agent, IssueAgent
from app.engineering_agent.agents.developer_agent import developer_agent, DeveloperAgent
from app.engineering_agent.agents.project_agent import project_agent, ProjectAgent
from app.engineering_agent.agents.analytics_agent import analytics_agent, AnalyticsAgent
from app.engineering_agent.agents.general_it_agent import general_it_agent, GeneralITKnowledgeAgent
from app.engineering_agent.agents.registry import specialist_registry, SpecialistAgentRegistry
from app.engineering_agent.agents.orchestrator import engineering_orchestrator, EngineeringOrchestrator

__all__ = [
    "BaseSpecialistAgent",
    "SpecialistExecutionResult",
    "repository_agent",
    "RepositoryAgent",
    "commit_agent",
    "CommitAgent",
    "pull_request_agent",
    "PullRequestAgent",
    "issue_agent",
    "IssueAgent",
    "developer_agent",
    "DeveloperAgent",
    "project_agent",
    "ProjectAgent",
    "analytics_agent",
    "AnalyticsAgent",
    "general_it_agent",
    "GeneralITKnowledgeAgent",
    "specialist_registry",
    "SpecialistAgentRegistry",
    "engineering_orchestrator",
    "EngineeringOrchestrator",
]
