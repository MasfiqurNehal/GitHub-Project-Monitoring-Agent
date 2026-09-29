"""
Schemas for Engineering AI Agent Conversation Memory.
Defines turn models, session states, and follow-up resolution containers.
"""
import time
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.engineering_agent.router.schemas import ExtractedEntities, IntentCategory


class ConversationTurn(BaseModel):
    """Represents a single back-and-forth turn in an engineering agent conversation."""
    turn_id: str = Field(default_factory=lambda: f"turn-{uuid.uuid4().hex[:8]}")
    user_message: str = Field(..., description="Sanitized user query")
    agent_response: str = Field(..., description="Synthesized agent response")
    detected_intent: Optional[str] = Field(None, description="Intent category of this turn")
    selected_agent: Optional[str] = Field(None, description="Specialist agent that handled this turn")
    entities: Optional[ExtractedEntities] = Field(None, description="Extracted entities")
    resolved_repository_name: Optional[str] = None
    resolved_project_name: Optional[str] = None
    resolved_developer_name: Optional[str] = None
    timeframe: Optional[str] = None
    metrics_summary: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: float = Field(default_factory=time.time)


class ConversationSession(BaseModel):
    """
    Complete state container for a conversation session.
    Strictly scoped to (tenant_id, user_id, conversation_id).
    """
    conversation_id: str
    tenant_id: str
    user_id: str
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    turns: List[ConversationTurn] = Field(default_factory=list)
    
    # Track most recent active entities for fast antecedent lookup
    last_intent: Optional[str] = None
    last_repository_name: Optional[str] = None
    last_project_name: Optional[str] = None
    last_developer_name: Optional[str] = None
    last_timeframe: Optional[str] = None


class ResolvedFollowUpContext(BaseModel):
    """
    Result of resolving an elliptical, pronoun-based, or temporal follow-up query.
    """
    is_follow_up: bool = False
    inherited_intent: Optional[IntentCategory] = None
    inherited_repository_name: Optional[str] = None
    inherited_project_name: Optional[str] = None
    inherited_developer_name: Optional[str] = None
    updated_timeframe: Optional[str] = None
    confidence_boost: float = 0.0
    reasoning: Optional[str] = None
