"""
LangGraph / StateGraph Channels & State Schema for Engineering AI Agent.
"""
from typing import TypedDict, Optional, Dict, Any, List
from app.engineering_agent.router.schemas import ExtractedEntities, IntentCategory
from app.engineering_agent.state.agent_state import AgentState


class GraphState(TypedDict, total=False):
    """
    Channel schema for the Engineering Agent LangGraph state machine.
    Propagates authenticated tenant context, extracted entities, telemetry, and response items.
    """
    # Request & Tenant Context
    user_request: str
    tenant_id: str
    user_id: str
    auth_token: Optional[str]
    project_id: Optional[str]
    repository_id: Optional[str]
    developer_id: Optional[str]
    conversation_id: str
    message_id: str
    
    # Intent Routing & Entities
    detected_intent: Optional[str]
    confidence: float
    entities: Optional[ExtractedEntities]
    requires_clarification: bool
    clarification_prompt: Optional[str]
    suggested_options: List[str]
    
    # Multi-Agent Coordination
    selected_agent: str
    active_specialists: List[str]
    is_multi_agent_pipeline: bool
    
    # Telemetry & Tool Results
    telemetry_data: Dict[str, Any]
    metrics: List[Dict[str, Any]]
    actions: List[Dict[str, str]]
    artifacts: List[Dict[str, Any]]
    tools_executed: List[Dict[str, Any]]
    
    # Response & Telemetry
    final_response: Optional[str]
    error: Optional[str]
    execution_steps: List[str]
    
    # Data Freshness Strategy Context (Phase 8)
    freshness_metadata: Optional[Dict[str, Any]]
    data_freshness_tier: Optional[str]
    force_fresh: bool

    
    # Reference to master AgentState for backwards-compatible state tracking
    agent_state: Optional[AgentState]
