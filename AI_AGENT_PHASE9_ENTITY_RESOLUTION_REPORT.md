# AI Agent Phase 9: Entity Resolution Report

**Generated Date:** September 29, 2026  
**Status:** Complete & Verified  
**Target Module:** `FastAPI-AI-Services/app/engineering_agent/entity_resolution/`  
**Test Suite:** `FastAPI-AI-Services/tests/test_phase9_entity_resolution.py` (9/9 tests passing, 100/100 total test suite passing)

---

## 1. Executive Summary

Phase 9 implements the **Entity Resolution & Disambiguation Engine** for the Engineering AI Agent. The engine matches noisy natural language phrases, spelling mistakes, casing differences, aliases, and partial slugs to canonical tenant-scoped entities:

- **Repositories** (*"Nexora AI"*, *"nexora-ai"*, *"nexora"*, *"nexora ai repo"* → `nexora-ai`)
- **Developers** (*"masfiq"*, *"Masfiqur"*, *"MasfiqurNehal"* → `MasfiqurNehal`)
- **Projects** (*"Nexora Monitoring Platform"*, *"nexora"*, *"Nexora"* → `prj-1`)
- **Branches** (*"main"*, *"master"*, *"develop"*, *"feat/agent"*)
- **Organizations / Tenants**

The engine enforces a strict **Ambiguity Collision Guard**: it never silently guesses between multiple matching candidates. If multiple close matches exist (e.g. searching *"backend"* with `backend-api`, `backend-service`, `auth-backend`), the system triggers a clarification prompt with user-friendly display names, omitting internal database UUIDs.

```
                           Raw User Prompt
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    Intent Router &      │
                    │   Entity Extraction     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Tenant Entity Loader   │
                    │  (TTL-Cached Fast Path) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Composite Matcher     │
                    │ - Slug Normalization    │
                    │ - Levenshtein Distance  │
                    │ - Token-Set Jaccard     │
                    │ - Prefix & Substring    │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │ Clear Winner (Confidence >= 0.70)             │ Ambiguous Matches (Margin < 0.12)
         ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     Entity Resolved             │             │   Ambiguity Clarification Node  │
│ - repository_id updated         │             │ "I found 3 repositories matching│
│ - project_id updated            │             │  'backend'. Which one do you    │
│ - Proceeds to Specialist Agent  │             │  mean?" (Human-readable options)│
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Similarity & Matching Algorithms

### 2.1 String Matching Pipeline (`algorithms.py`)
1. **Slug Normalization (`normalize_slug`)**:
   - Strips entity noise words (`repo`, `repository`, `project`, `developer`, `branch`).
   - Normalizes non-alphanumeric separators into uniform lowercase slugs (e.g. `"Nexora AI Repo"` → `"nexora-ai"`).
2. **Exact & Slug Matching**:
   - Case-insensitive raw match = `1.0` confidence.
   - Normalized slug match = `0.98` confidence.
   - Alias list match = `0.96` confidence.
3. **Prefix & Substring Matching**:
   - Prefix match (e.g. `"masfiq"` in `"MasfiqurNehal"`) = `0.85 - 0.95` confidence.
   - Substring match (e.g. `"nexora"` in `"nexora-ai"`) = `0.80 - 0.90` confidence.
4. **Token-Set Jaccard Similarity (`token_set_similarity`)**:
   - Order-invariant token set matching (e.g. `"Platform Nexora AI"` matches `"Nexora AI Platform"` with `1.0` score).
5. **Fuzzy Levenshtein Similarity (`levenshtein_similarity`)**:
   - Dynamic programming edit distance calculating normalized ratio $1.0 - \frac{\text{dist}}{\max(\text{len}_1, \text{len}_2)}$.
   - Multi-token compound prefix fuzzy matching (e.g. `"hospital-managment"` matches `"hospital-management-frontend"` with `0.95` similarity).

---

## 3. Ambiguity & Disambiguation Guard

When a query phrase matches multiple entities with high confidence and minimal score difference ($\Delta < 0.12$):

1. **Silent Guessing Prohibited**: The engine refuses to pick a random or arbitrary candidate.
2. **Structured Clarification Generated**:
   ```
   "I found 3 repositories matching 'backend'. Which one do you mean?"
   ```
3. **Safe Suggested Options**:
   - Options are formatted using human-readable names (`backend-api`, `backend-service`, `auth-backend`).
   - Raw database UUIDs (e.g. `repo-491a-81...`) are **never** exposed to the user.
4. **StateGraph Routing**: The state machine automatically routes directly to `clarification_node`, presenting the user with quick-selection options.

---

## 4. Tenant-Scoped Entity Resolution

- **Tenant Isolation Invariant**: Entity searches query **only** the authenticated organization's repositories, projects, and contributors.
- **In-Memory TTL Cache (`TenantEntityCache`)**:
  - Entity catalogs are cached for 60 seconds per tenant (`tenant_id:entity_type`).
  - Enables sub-millisecond entity resolution without redundant network hops to Express.

---

## 5. Test Suite & Verification Results

A dedicated test suite was implemented in `FastAPI-AI-Services/tests/test_phase9_entity_resolution.py`.

### Test Summary:
| # | Test Case | Target Feature | Result |
|---|---|---|---|
| 1 | `test_normalize_slug` | Slug cleaning and noise token removal | **PASS** |
| 2 | `test_levenshtein_and_token_similarity` | Fuzzy edit distance and token-set similarity | **PASS** |
| 3 | `test_repository_resolution_variations` | Exact, slug, and natural language variations | **PASS** |
| 4 | `test_repository_typo_resilience` | Typo tolerance on single and compound slugs | **PASS** |
| 5 | `test_developer_resolution_variations` | Developer handle, name, and prefix matching | **PASS** |
| 6 | `test_project_resolution` | Project title, slug, and alias resolution | **PASS** |
| 7 | `test_branch_resolution` | Branch name resolution | **PASS** |
| 8 | `test_ambiguous_repository_disambiguation` | Ambiguity detection and option generation without UUID exposure | **PASS** |
| 9 | `test_stategraph_routes_to_clarification_on_ambiguity` | End-to-end StateGraph routing on ambiguous match | **PASS** |

### Complete Regression Run:
- **FastAPI AI Suite:** `100/100 passed` across all 9 phases (`test_phase1` through `test_phase9`).
- **Express Backend:** `npx tsc --noEmit` passed with 0 errors.
- **Next.js Frontend:** `npx tsc --noEmit` passed with 0 errors.

---

## 6. Next Steps & Readiness

Phase 9 is complete and verified. The entity resolution engine connects into the existing FastAPI endpoint `POST /api/v1/engineering-agent/chat`.
