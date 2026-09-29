"""
Entity Resolver Engine for Engineering AI Agent.
Resolves repositories, projects, developers, branches, and organizations
with typo resilience, casing normalization, partial name matching, and ambiguity disambiguation.
"""
from typing import Dict, Any, List, Optional, Tuple

from app.engineering_agent.entity_resolution.schemas import (
    EntityType,
    CandidateMatch,
    EntityResolutionResult
)
from app.engineering_agent.entity_resolution.algorithms import (
    normalize_slug,
    calculate_match_score
)
from app.utils.logger import logger


class EntityResolver:
    """
    Multi-entity resolution and disambiguation engine.
    Ensures that names, typos, and partial phrases resolve to verified tenant entities.
    """

    CONFIDENCE_THRESHOLD = 0.65
    HIGH_CONFIDENCE_THRESHOLD = 0.82
    AMBIGUITY_MARGIN = 0.12

    # =========================================================================
    # 1. Repository Resolution
    # =========================================================================
    def resolve_repository(
        self,
        query_term: str,
        repositories: List[Dict[str, Any]]
    ) -> EntityResolutionResult:
        """
        Resolve repository name/alias against tenant's repository catalogue.
        """
        if not query_term or not repositories:
            return EntityResolutionResult(
                entity_type=EntityType.REPOSITORY,
                raw_query_term=query_term or ""
            )

        candidates: List[CandidateMatch] = []

        for repo in repositories:
            repo_id = str(repo.get("id") or repo.get("repository_id") or "")
            name = repo.get("name") or repo.get("repository_name") or ""
            full_name = repo.get("full_name") or repo.get("fullName") or name
            display_name = repo.get("full_name") or name

            # Aliases: short name, full name, slug
            aliases = [name, full_name, repo.get("alias")]

            score_name, mtype_name = calculate_match_score(query_term, name, aliases)
            score_full, mtype_full = calculate_match_score(query_term, full_name, aliases)

            best_score = max(score_name, score_full)
            best_type = mtype_name if best_score == score_name else mtype_full

            if best_score >= self.CONFIDENCE_THRESHOLD:
                candidates.append(
                    CandidateMatch(
                        entity_id=repo_id,
                        entity_name=name,
                        display_name=display_name,
                        entity_type=EntityType.REPOSITORY,
                        confidence=best_score,
                        match_type=best_type,
                        metadata={
                            "full_name": full_name,
                            "default_branch": repo.get("default_branch") or "main",
                            "is_private": repo.get("is_private", False)
                        }
                    )
                )

        # Sort descending by confidence
        candidates.sort(key=lambda c: c.confidence, reverse=True)

        return self._evaluate_candidates(
            entity_type=EntityType.REPOSITORY,
            query_term=query_term,
            candidates=candidates
        )

    # =========================================================================
    # 2. Project Resolution
    # =========================================================================
    def resolve_project(
        self,
        query_term: str,
        projects: List[Dict[str, Any]]
    ) -> EntityResolutionResult:
        """
        Resolve project name/slug against tenant's monitored projects.
        """
        if not query_term or not projects:
            return EntityResolutionResult(
                entity_type=EntityType.PROJECT,
                raw_query_term=query_term or ""
            )

        candidates: List[CandidateMatch] = []

        for proj in projects:
            proj_id = str(proj.get("id") or proj.get("project_id") or "")
            name = proj.get("name") or proj.get("project_name") or ""
            display_name = name

            aliases = [proj.get("slug"), proj.get("alias")]
            score, match_type = calculate_match_score(query_term, name, aliases)

            if score >= self.CONFIDENCE_THRESHOLD:
                candidates.append(
                    CandidateMatch(
                        entity_id=proj_id,
                        entity_name=name,
                        display_name=display_name,
                        entity_type=EntityType.PROJECT,
                        confidence=score,
                        match_type=match_type,
                        metadata={"description": proj.get("description", "")}
                    )
                )

        candidates.sort(key=lambda c: c.confidence, reverse=True)

        return self._evaluate_candidates(
            entity_type=EntityType.PROJECT,
            query_term=query_term,
            candidates=candidates
        )

    # =========================================================================
    # 3. Developer Resolution
    # =========================================================================
    def resolve_developer(
        self,
        query_term: str,
        developers: List[Dict[str, Any]]
    ) -> EntityResolutionResult:
        """
        Resolve developer name, login handle, or alias against tenant contributors.
        """
        if not query_term or not developers:
            return EntityResolutionResult(
                entity_type=EntityType.DEVELOPER,
                raw_query_term=query_term or ""
            )

        candidates: List[CandidateMatch] = []

        for dev in developers:
            dev_id = str(dev.get("id") or dev.get("developer_id") or "")
            login = dev.get("login") or dev.get("username") or dev.get("github_username") or ""
            name = dev.get("name") or dev.get("display_name") or login
            display_name = f"{name} (@{login})" if (name and login and name.lower() != login.lower()) else (name or login)

            aliases = [login, name, dev.get("email")]
            score_login, mtype_login = calculate_match_score(query_term, login, aliases)
            score_name, mtype_name = calculate_match_score(query_term, name, aliases)

            best_score = max(score_login, score_name)
            best_type = mtype_login if best_score == score_login else mtype_name

            if best_score >= self.CONFIDENCE_THRESHOLD:
                candidates.append(
                    CandidateMatch(
                        entity_id=dev_id or login,
                        entity_name=login or name,
                        display_name=display_name,
                        entity_type=EntityType.DEVELOPER,
                        confidence=best_score,
                        match_type=best_type,
                        metadata={"login": login, "name": name, "email": dev.get("email")}
                    )
                )

        candidates.sort(key=lambda c: c.confidence, reverse=True)

        return self._evaluate_candidates(
            entity_type=EntityType.DEVELOPER,
            query_term=query_term,
            candidates=candidates
        )

    # =========================================================================
    # 4. Branch Resolution
    # =========================================================================
    def resolve_branch(
        self,
        query_term: str,
        available_branches: List[str]
    ) -> EntityResolutionResult:
        """
        Resolve branch name (e.g. 'main', 'master', 'feat/agent') for a repository.
        """
        if not query_term or not available_branches:
            return EntityResolutionResult(
                entity_type=EntityType.BRANCH,
                raw_query_term=query_term or ""
            )

        candidates: List[CandidateMatch] = []

        for br in available_branches:
            score, match_type = calculate_match_score(query_term, br)
            if score >= self.CONFIDENCE_THRESHOLD:
                candidates.append(
                    CandidateMatch(
                        entity_id=br,
                        entity_name=br,
                        display_name=br,
                        entity_type=EntityType.BRANCH,
                        confidence=score,
                        match_type=match_type
                    )
                )

        candidates.sort(key=lambda c: c.confidence, reverse=True)

        return self._evaluate_candidates(
            entity_type=EntityType.BRANCH,
            query_term=query_term,
            candidates=candidates
        )

    # =========================================================================
    # 5. Ambiguity Evaluation & Disambiguation Generator
    # =========================================================================
    def _evaluate_candidates(
        self,
        entity_type: EntityType,
        query_term: str,
        candidates: List[CandidateMatch]
    ) -> EntityResolutionResult:
        """
        Evaluate candidate matches, detecting ambiguous collisions and formulating clean options.
        """
        if not candidates:
            return EntityResolutionResult(
                entity_type=entity_type,
                raw_query_term=query_term,
                resolved_entity=None,
                is_ambiguous=False,
                candidates=[]
            )

        # Exact / High-confidence single match
        top = candidates[0]
        if len(candidates) == 1:
            return EntityResolutionResult(
                entity_type=entity_type,
                raw_query_term=query_term,
                resolved_entity=top,
                is_ambiguous=False,
                candidates=candidates
            )

        second = candidates[1]

        # Check for ambiguity: multiple close candidates without a clear winner
        is_exact_top = top.confidence >= 0.98
        score_diff = top.confidence - second.confidence

        if not is_exact_top and score_diff < self.AMBIGUITY_MARGIN:
            top_options = [c.display_name for c in candidates[:4]]
            plural_name = f"{entity_type.value}ies" if entity_type.value.endswith("y") else f"{entity_type.value}s"
            
            clarification_msg = (
                f"I found {len(candidates)} {plural_name} matching '{query_term}'. "
                f"Which one do you mean?"
            )

            logger.info(
                f"[EntityResolver] Ambiguous resolution for '{query_term}' ({entity_type.value}). "
                f"Top scores: {top.confidence:.2f} vs {second.confidence:.2f}"
            )

            return EntityResolutionResult(
                entity_type=entity_type,
                raw_query_term=query_term,
                resolved_entity=None,
                is_ambiguous=True,
                candidates=candidates,
                clarification_needed=True,
                clarification_message=clarification_msg,
                suggested_options=top_options
            )

        # Clear winner
        return EntityResolutionResult(
            entity_type=entity_type,
            raw_query_term=query_term,
            resolved_entity=top,
            is_ambiguous=False,
            candidates=candidates
        )


entity_resolver = EntityResolver()
