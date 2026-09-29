"""
Base Specialist Agent Abstract Interface.
All specialist agents inherit from BaseSpecialistAgent and execute strictly through the Phase 5 tool layer.
"""
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.tools import tool_registry, ToolResult
from app.engineering_agent.router.schemas import ExtractedEntities
from app.utils.logger import logger


class BaseSpecialistAgent(ABC):
    """
    Abstract Base Class for Engineering Specialist Agents.
    Executes domain-specific workflows strictly via read-only tools.
    """
    agent_id: str
    name: str
    description: str

    @abstractmethod
    async def analyze(
        self,
        state: AgentState,
        entities: Optional[ExtractedEntities] = None
    ) -> SpecialistExecutionResult:
        """
        Execute domain-specific telemetry gathering and structured analysis.
        """
        pass

    async def call_tool(
        self,
        tool_name: str,
        args: Dict[str, Any],
        state: AgentState
    ) -> ToolResult:
        """
        Execute a tool via tool_registry and record its result in AgentState.
        """
        res = await tool_registry.execute_tool(
            name=tool_name,
            args=args,
            auth_token=state.auth_token,
            tenant_id=state.tenant_id
        )
        state.record_tool_result(
            tool_name=tool_name,
            input_args=args,
            output_data=res.data,
            success=res.success,
            error_message=res.error,
            duration_ms=res.duration_ms
        )
        return res
