"""
Abstract Base Class for Specialized Engineering Sub-Agents.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.engineering_agent.state.agent_state import AgentState

class BaseSpecializedAgent(ABC):
    """Abstract interface for domain-specific engineering sub-agents."""
    
    agent_id: str
    name: str
    description: str

    @abstractmethod
    async def execute(self, state: AgentState) -> None:
        """Execute the sub-agent task and mutate state in-place."""
        pass
