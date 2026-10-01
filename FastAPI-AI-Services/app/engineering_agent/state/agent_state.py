"""
Internal Agent Execution State Model.
Manages multi-agent workflow context, tool outputs, and reasoning steps.
"""
import time
import uuid
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class ReasoningStep:
    """Internal reasoning record (not directly exposed to client)."""
    step_number: int
    thought: str
    action: Optional[str] = None
    timestamp: float = field(default_factory=time.time)

@dataclass
class ToolExecutionResult:
    """Record of an individual tool invocation with timestamp telemetry."""
    tool_name: str
    input_args: Dict[str, Any]
    output_data: Any
    success: bool = True
    error_message: Optional[str] = None
    duration_ms: float = 0.0
    start_time: Optional[float] = None
    end_time: Optional[float] = None

@dataclass
class AgentState:
    """
    Complete state container passed across the Engineering AI Agent lifecycle.
    """
    user_request: str
    tenant_id: str
    user_id: str
    auth_token: Optional[str] = None
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    developer_id: Optional[str] = None
    conversation_id: str = field(default_factory=lambda: f"eng-conv-{uuid.uuid4().hex[:12]}")
    message_id: str = field(default_factory=lambda: f"eng-msg-{uuid.uuid4().hex[:12]}")
    detected_intent: Optional[str] = None
    selected_agent: Optional[str] = None
    memory_session: Optional[Any] = None
    recent_turns: List[Any] = field(default_factory=list)
    
    # Tool Execution & Telemetry
    tool_results: List[ToolExecutionResult] = field(default_factory=list)
    intermediate_reasoning: List[ReasoningStep] = field(default_factory=list)
    
    # Context data extracted from Express API
    project_context: Optional[Dict[str, Any]] = None
    repository_context: Optional[Dict[str, Any]] = None
    developer_context: Optional[List[Dict[str, Any]]] = None
    
    # Synthesized Output Payload
    final_response: Optional[str] = None
    metrics: List[Dict[str, Any]] = field(default_factory=list)
    artifacts: List[Dict[str, Any]] = field(default_factory=list)
    actions: List[Dict[str, Any]] = field(default_factory=list)
    
    # Lifecycle Timestamps & Timing Telemetry (Phase 26 Part 18)
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    error: Optional[str] = None
    router_duration_ms: float = 0.0
    llm_duration_ms: float = 0.0
    tool_duration_ms: float = 0.0
    total_duration_ms: float = 0.0

    def add_reasoning_step(self, thought: str, action: Optional[str] = None) -> None:
        """Record an internal intermediate reasoning step."""
        step = ReasoningStep(
            step_number=len(self.intermediate_reasoning) + 1,
            thought=thought,
            action=action
        )
        self.intermediate_reasoning.append(step)

    def record_tool_result(
        self,
        tool_name: str,
        input_args: Dict[str, Any],
        output_data: Any,
        success: bool = True,
        error_message: Optional[str] = None,
        duration_ms: float = 0.0,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> None:
        """Record the output of a tool call with timestamps."""
        res = ToolExecutionResult(
            tool_name=tool_name,
            input_args=input_args,
            output_data=output_data,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms,
            start_time=start_time,
            end_time=end_time
        )
        self.tool_results.append(res)

    def add_metric(self, label: str, value: Any, change: Optional[str] = None, color: str = "emerald") -> None:
        """Add a structured KPI to the state."""
        self.metrics.append({
            "label": label,
            "value": value,
            "change": change,
            "color": color
        })

    def add_action(self, label: str, href: Optional[str] = None, action_type: str = "link") -> None:
        """Add an actionable recommendation to the state."""
        self.actions.append({
            "label": label,
            "href": href,
            "action_type": action_type
        })

    def finalize(self) -> float:
        """Mark execution as completed and calculate duration in ms."""
        self.end_time = time.time()
        self.total_duration_ms = (self.end_time - self.start_time) * 1000.0
        if not self.tool_duration_ms and self.tool_results:
            self.tool_duration_ms = sum(t.duration_ms for t in self.tool_results)
        return self.total_duration_ms
