"""
Engineering Agent Entity Resolution Module.
"""
from app.engineering_agent.entity_resolution.schemas import (
    EntityType,
    CandidateMatch,
    EntityResolutionResult
)
from app.engineering_agent.entity_resolution.algorithms import (
    normalize_slug,
    levenshtein_distance,
    levenshtein_similarity,
    token_set_similarity,
    calculate_match_score
)
from app.engineering_agent.entity_resolution.resolver import (
    EntityResolver,
    entity_resolver
)
from app.engineering_agent.entity_resolution.tenant_loader import (
    TenantEntityLoader,
    tenant_entity_loader,
    tenant_entity_cache
)

__all__ = [
    "EntityType",
    "CandidateMatch",
    "EntityResolutionResult",
    "normalize_slug",
    "levenshtein_distance",
    "levenshtein_similarity",
    "token_set_similarity",
    "calculate_match_score",
    "EntityResolver",
    "entity_resolver",
    "TenantEntityLoader",
    "tenant_entity_loader",
    "tenant_entity_cache"
]
