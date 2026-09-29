"""
Entity Resolution Schemas & Data Models for Engineering AI Agent.
Defines entity taxonomy, candidate matches, confidence scoring, and disambiguation envelopes.
"""
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    """Supported Entity Types for Resolution."""
    REPOSITORY = "repository"
    PROJECT = "project"
    DEVELOPER = "developer"
    BRANCH = "branch"
    ORGANIZATION = "organization"


class CandidateMatch(BaseModel):
    """An individual matched candidate entity with match metadata and confidence."""
    entity_id: str = Field(..., description="Internal system ID or unique slug")
    entity_name: str = Field(..., description="Canonical entity name (e.g., 'nexora-ai')")
    display_name: str = Field(..., description="User-friendly display name (e.g., 'Nexora AI')")
    entity_type: EntityType = Field(..., description="Type of entity")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Match confidence score (0.0 to 1.0)")
    match_type: str = Field(..., description="Matching strategy ('exact', 'slug', 'prefix', 'fuzzy', 'alias')")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context (e.g. full_name, repo_id, role)")


class EntityResolutionResult(BaseModel):
    """Result envelope for an entity resolution attempt."""
    entity_type: EntityType
    raw_query_term: str = Field(..., description="The raw phrase extracted from user prompt")
    resolved_entity: Optional[CandidateMatch] = Field(None, description="Definitive resolved entity if confidence is high")
    is_ambiguous: bool = Field(False, description="True if multiple close candidates match")
    candidates: List[CandidateMatch] = Field(default_factory=list, description="List of all ranked candidates")
    clarification_needed: bool = Field(False, description="True if user must clarify between multiple candidates")
    clarification_message: Optional[str] = Field(None, description="Human-friendly clarification question without raw UUIDs")
    suggested_options: List[str] = Field(default_factory=list, description="Human-readable candidate options for the user")
