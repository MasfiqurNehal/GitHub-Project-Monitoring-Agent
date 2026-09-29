"""
String Matching & Similarity Algorithms for Entity Resolution.
Provides pure-Python, zero-dependency tokenization, slug normalization,
Levenshtein distance, Jaccard token-set similarity, and substring/prefix scoring.
"""
import re
from typing import List, Tuple, Optional, Set


def normalize_slug(text: str) -> str:
    """Normalize text into lowercase alphanumeric slug separated by dashes."""
    if not text:
        return ""
    # Strip common entity noise words
    cleaned = text.lower().strip()
    cleaned = re.sub(r"\b(repo|repository|project|developer|user|dev|branch)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")
    return cleaned


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute standard Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    v0 = list(range(len(s2) + 1))
    v1 = [0] * (len(s2) + 1)

    for i in range(len(s1)):
        v1[0] = i + 1
        for j in range(len(s2)):
            cost = 0 if s1[i] == s2[j] else 1
            v1[j + 1] = min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
        v0 = list(v1)

    return v1[len(s2)]


def levenshtein_similarity(s1: str, s2: str) -> float:
    """Compute normalized Levenshtein similarity ratio between 0.0 and 1.0."""
    s1_clean = s1.lower().strip()
    s2_clean = s2.lower().strip()
    if not s1_clean or not s2_clean:
        return 0.0
    if s1_clean == s2_clean:
        return 1.0
    dist = levenshtein_distance(s1_clean, s2_clean)
    max_len = max(len(s1_clean), len(s2_clean))
    return max(0.0, 1.0 - (dist / max_len))


def token_set_similarity(s1: str, s2: str) -> float:
    """Compute Jaccard token set similarity for word-order invariant matching."""
    tokens1 = set(re.findall(r"[a-z0-9]+", s1.lower()))
    tokens2 = set(re.findall(r"[a-z0-9]+", s2.lower()))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


def calculate_match_score(query_term: str, target_name: str, aliases: Optional[List[str]] = None) -> Tuple[float, str]:
    """
    Calculate composite confidence score (0.0 - 1.0) and match strategy type.
    """
    if not query_term or not target_name:
        return 0.0, "none"

    q_raw = query_term.lower().strip()
    t_raw = target_name.lower().strip()

    # 1. Exact raw match
    if q_raw == t_raw:
        return 1.0, "exact"

    # 2. Exact slug match
    q_slug = normalize_slug(query_term)
    t_slug = normalize_slug(target_name)
    if q_slug and t_slug and q_slug == t_slug:
        return 0.98, "exact_slug"

    # 3. Check alias list
    if aliases:
        for alias in aliases:
            if not alias:
                continue
            a_raw = alias.lower().strip()
            a_slug = normalize_slug(alias)
            if q_raw == a_raw or (q_slug and q_slug == a_slug):
                return 0.96, "alias_match"

    # 4. Prefix match (e.g. "masfiq" in "masfiqurnehal" or "nexora" in "nexora-ai")
    if t_slug and q_slug:
        if t_slug.startswith(q_slug):
            ratio = len(q_slug) / len(t_slug)
            score = 0.82 + (0.15 * ratio)  # range ~0.85 - 0.97
            return min(0.95, round(score, 3)), "prefix"
        if q_slug.startswith(t_slug):
            ratio = len(t_slug) / len(q_slug)
            score = 0.80 + (0.15 * ratio)
            return min(0.92, round(score, 3)), "prefix_superset"

    # 5. Substring match
    if q_slug and t_slug and (q_slug in t_slug or t_slug in q_slug):
        min_len = min(len(q_slug), len(t_slug))
        max_len = max(len(q_slug), len(t_slug))
        score = 0.75 + (0.15 * (min_len / max_len))
        return min(0.90, round(score, 3)), "substring"

    # 6. Token set similarity
    token_sim = token_set_similarity(query_term, target_name)
    if token_sim >= 0.70:
        return round(0.70 + (0.22 * token_sim), 3), "token_overlap"

    # 7. Fuzzy Levenshtein similarity on slugs and raw text
    lev_slug = levenshtein_similarity(q_slug, t_slug)
    lev_raw = levenshtein_similarity(q_raw, t_raw)
    best_lev = max(lev_slug, lev_raw)

    # 8. Token-level & compound slug fuzzy matching (e.g. 'nexxora' vs 'nexora-ai', 'hospital-managment' vs 'hospital-management-frontend')
    tokens_query = [t for t in re.split(r"[-_\s/]+", q_slug or q_raw) if t]
    tokens_target = [t for t in re.split(r"[-_\s/]+", t_raw) if t and t not in ("ai", "app", "ui", "api", "web")]
    
    # Check individual token match
    for tok in tokens_target:
        tok_lev = levenshtein_similarity(q_slug or q_raw, tok)
        if tok_lev > best_lev:
            best_lev = tok_lev

    # Check matching token length prefix of target
    if len(tokens_query) > 1 and len(tokens_target) >= len(tokens_query):
        t_prefix = "-".join(tokens_target[:len(tokens_query)])
        pref_lev = levenshtein_similarity(q_slug, t_prefix)
        if pref_lev > best_lev:
            best_lev = pref_lev

    if best_lev >= 0.75:
        return round(best_lev * 0.92, 3), "fuzzy"

    return round(best_lev * 0.5, 3), "low_confidence"


