"""
Reliability Metrics & Telemetry Tracker (Phase 16).
Tracks and measures:
  - Agent response latency
  - LLM latency
  - Tool latency
  - GitHub API latency
  - Express API latency
  - Neon query latency
  - Graph execution time
"""
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ExecutionMetrics(BaseModel):
    """Structured latency and performance telemetry for an agent execution."""
    agent_response_latency_ms: float = Field(0.0, description="Total end-to-end request response latency")
    graph_execution_time_ms: float = Field(0.0, description="StateGraph traversal time in milliseconds")
    llm_latency_ms: float = Field(0.0, description="Cumulative LLM API latency")
    tool_latency_ms: float = Field(0.0, description="Cumulative tool execution latency")
    github_api_latency_ms: float = Field(0.0, description="Cumulative live GitHub API latency")
    express_api_latency_ms: float = Field(0.0, description="Cumulative Express REST API latency")
    neon_query_latency_ms: float = Field(0.0, description="Estimated/measured database query latency")
    
    total_tool_calls_count: int = Field(0, description="Total number of tool calls executed")
    cache_hits_count: int = Field(0, description="Number of deduplicated tool calls served from cache")
    retry_count: int = Field(0, description="Number of transient retry attempts made")
    graph_steps_count: int = Field(0, description="Number of graph state transitions")
    
    breakdown_by_tool: Dict[str, float] = Field(default_factory=dict, description="Latency breakdown per tool name")
    breakdown_by_node: Dict[str, float] = Field(default_factory=dict, description="Latency breakdown per StateGraph node")


class ReliabilityMetricsTracker:
    """
    Context-bound latency and telemetry accumulator.
    """

    def __init__(self):
        self._start_time: float = time.time()
        self._graph_start_time: Optional[float] = None
        self._metrics = ExecutionMetrics()

    def start_graph(self) -> None:
        """Mark start of StateGraph execution."""
        self._graph_start_time = time.time()

    def record_node_execution(self, node_name: str, duration_ms: float) -> None:
        """Record latency for an individual StateGraph node."""
        self._metrics.graph_steps_count += 1
        current = self._metrics.breakdown_by_node.get(node_name, 0.0)
        self._metrics.breakdown_by_node[node_name] = round(current + duration_ms, 2)

    def record_llm_call(self, duration_ms: float) -> None:
        """Record latency spent on an LLM inference call."""
        self._metrics.llm_latency_ms = round(self._metrics.llm_latency_ms + duration_ms, 2)

    def record_tool_call(
        self,
        tool_name: str,
        duration_ms: float,
        is_cache_hit: bool = False,
        express_latency_ms: Optional[float] = None,
        github_latency_ms: Optional[float] = None,
        neon_latency_ms: Optional[float] = None
    ) -> None:
        """Record detailed metrics for a tool execution."""
        self._metrics.total_tool_calls_count += 1
        if is_cache_hit:
            self._metrics.cache_hits_count += 1
        
        self._metrics.tool_latency_ms = round(self._metrics.tool_latency_ms + duration_ms, 2)
        current = self._metrics.breakdown_by_tool.get(tool_name, 0.0)
        self._metrics.breakdown_by_tool[tool_name] = round(current + duration_ms, 2)

        if express_latency_ms is not None:
            self._metrics.express_api_latency_ms = round(self._metrics.express_api_latency_ms + express_latency_ms, 2)
        if github_latency_ms is not None:
            self._metrics.github_api_latency_ms = round(self._metrics.github_api_latency_ms + github_latency_ms, 2)
        if neon_latency_ms is not None:
            self._metrics.neon_query_latency_ms = round(self._metrics.neon_query_latency_ms + neon_latency_ms, 2)

    def record_retry(self) -> None:
        """Record a retry event on transient failure."""
        self._metrics.retry_count += 1

    def finalize(self) -> ExecutionMetrics:
        """Calculate total elapsed times and produce normalized ExecutionMetrics snapshot."""
        now = time.time()
        self._metrics.agent_response_latency_ms = round((now - self._start_time) * 1000.0, 2)
        if self._graph_start_time:
            self._metrics.graph_execution_time_ms = round((now - self._graph_start_time) * 1000.0, 2)
        else:
            self._metrics.graph_execution_time_ms = self._metrics.agent_response_latency_ms
            
        return self._metrics
