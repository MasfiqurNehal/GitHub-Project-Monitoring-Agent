# Phase 19 — Engineering Agent Persistent Conversation Audit & Architecture Design

**Audit Date**: September 30, 2026  
**Auditor**: Antigravity Core AI Engineering Assistant  
**Target System**: GitMonitor Engineering AI Agent (FastAPI AI Microservice + LangGraph Multi-Agent Orchestrator + Next.js Frontend)  
**Phase Status**: **PHASE 19 STATUS: COMPLETE (AUDIT & DESIGN ONLY)**

---

## 1. Current Conversation Architecture

The GitMonitor platform currently features two parallel conversation flows:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Next.js Frontend                                      │
│                                                                                        │
│  [A] Legacy Floating Chatbot (/components/ai/FloatingChatbot.tsx)                      │
│      └─► Calls legacy /api/v1/chatbot/chat                                             │
│                                                                                        │
│  [B] Engineering AI Agent Workspace (/app/ai/page.tsx & /components/ai/chat-drawer.tsx) │
│      ├─► Calls /api/v1/engineering-agent/chat (for message processing)                  │
│      └─► Calls /api/v1/chatbot/conversations (for listing/loading conversations)       │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────────────────────┐
│ Legacy Chatbot Backend          │   │ Engineering Agent Backend                        │
│ (/api/v1/chatbot)               │   │ (/api/v1/engineering-agent)                      │
│                                 │   │                                                  │
│ - ChatbotService                │   │ - EngineeringAgentService                        │
│ - ChatbotRepository             │   │ - LangGraph StateGraph (6 nodes, 8 sub-agents)   │
│ - PostgreSQL DB Persistent:     │   │ - ExpressApiClient Read-Only Tools               │
│   • chatbot_conversations       │   │ - ConversationMemoryStore                        │
│   • chatbot_messages            │   │   • IN-MEMORY ONLY (Python Heap: Dict/OrderedDict)│
│                                 │   │   • Scrubbed turns (72h TTL)                     │
│                                 │   │   • ZERO DATABASE PERSISTENCE                    │
└─────────────────────────────────┘   └──────────────────────────────────────────────────┘
```

---

## 2. Current Persistence Behavior

| Action / Event | Current System Behavior | Persistence Outcome |
|---|---|---|
| **User sends prompt in `/ai`** | Processed by LangGraph; response generated; turn added to `conversation_memory_store` in-memory dictionary. | **Lost on restart** (stored only in Python process heap and React local state). |
| **New Chat Created** | Local React state creates a temporary `conv-<timestamp>` ID. No DB record is created until a legacy chatbot endpoint is invoked. | **Volatile** (not saved to PostgreSQL). |
| **Browser Refresh (`F5`)** | React state resets. `useAIAgent()` calls `fetchUserConversations()` (`GET /api/v1/chatbot/conversations`), which queries PostgreSQL `chatbot_conversations`. | **History Disappears**: Engineering Agent chats were never written to PostgreSQL, so the sidebar returns empty or shows old simple chatbot chats. |
| **Tab Change / Navigation** | React state is discarded if navigating between unmounted pages unless cached in memory. | **History Disappears**. |
| **User Logout / Login** | Auth token is cleared and renewed. React state reinitializes. `GET /api/v1/chatbot/conversations` returns only legacy chatbot entries. | **History Disappears**. |
| **FastAPI Microservice Restart** | Python heap memory is cleared. `ConversationMemoryStore._store` dictionary is wiped. | **Complete Data Loss**. |

---

## 3. Exact Reason History Disappears

The conversation loss stems from an **asymmetric architecture disconnect between execution and persistence**:

1. **Execution Disconnect**:
   [`EngineeringAgentService.execute_agent()`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/core/service.py#L132-L153) appends conversation turns **strictly to `conversation_memory_store`**, which is an in-memory Python `OrderedDict`. It **never interacts with PostgreSQL or any SQLAlchemy database session**.
2. **Persistence Mismatch**:
   The frontend API client [`src/lib/api/ai.ts`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Frontend/src/lib/api/ai.ts#L75-L168) fetches and deletes conversations by calling `/api/v1/chatbot/conversations`, which reads from the PostgreSQL `chatbot_conversations` table used only by the legacy simple chatbot.
3. **Absence of Dedicated Endpoints**:
   `/api/v1/engineering-agent/` has only two endpoints: `POST /chat` and `GET /health`. It lacks conversation listing (`GET /conversations`), session detail fetching (`GET /conversations/{id}`), title renaming (`PATCH /conversations/{id}`), and session deletion (`DELETE /conversations/{id}`).

---

## 4. Current ConversationMemoryStore Behavior

- **File**: [`app/engineering_agent/memory/store.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/memory/store.py)
- **Data Structure**: `self._store: Dict[str, ConversationSession] = OrderedDict()`
- **Partitioning**: Composite key `"{tenant_id}:{user_id}:{conversation_id}"`
- **Scrubbing**: [`SecretScrubber`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/memory/scrubber.py) removes Bearer tokens, GitHub App private keys, and passwords before storing.
- **Windowing**: Retains the last `max_turns = 10` per session; evicts sessions older than `ttl_seconds = 72 * 3600` (72 hours).
- **Classification**: **Process-scoped, In-memory only.**

---

## 5. Current Database Support

- **Database Engine**: Neon PostgreSQL 16
- **Connection**: Managed via SQLAlchemy Async Engine + `asyncpg` in [`app/db/connection.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/db/connection.py).
- **Connection Pool**: `db_manager.get_session()` provides an `AsyncSession` context manager for transactional database operations.
- **Migration Engine**: Versioned SQL migrations in [`GitHub-Backend/database/migrations/`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/database/migrations/).

---

## 6. Existing Relevant Tables & Models

### Existing PostgreSQL Tables (Migration 024)

```sql
-- Migration 024: chatbot_conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration 024: chatbot_messages
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metrics_json JSONB,
    sources_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Existing SQLAlchemy Models
- Located in [`app/models/chat.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/models/chat.py):
  - `ConversationModel` mapped to `chatbot_conversations`
  - `MessageModel` mapped to `chatbot_messages`

---

## 7. Existing Frontend Conversation Behavior

- **Hook**: [`useAIAgent()`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Frontend/src/hooks/use-ai-agent.ts) initializes with `DEFAULT_WELCOME_THREAD` (`id: conv-<timestamp>`).
- **Sidebar Component**: [`ConversationList.tsx`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Frontend/src/components/ai/ConversationList.tsx) renders a flat list without date grouping, rename options, or message count indicators.
- **Message Component**: [`ChatMessage.tsx`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Frontend/src/components/ai/ChatMessage.tsx) formats timestamps with `toLocaleTimeString('en-US')`.
- **Title Generation**: First message slices `promptText.slice(0, 35)` in local React state only.

---

## 8. Existing API Behavior

| Method & Route | Consumer | Handler Service | Database Persisted? |
|---|---|---|---|
| `POST /api/v1/engineering-agent/chat` | Engineering Agent UI | `EngineeringAgentService` | **NO** (In-memory `ConversationMemoryStore`) |
| `GET /api/v1/chatbot/conversations` | `useAIAgent()` initial load | `ChatbotService` | **YES** (reads `chatbot_conversations`) |
| `GET /api/v1/chatbot/conversations/{id}` | `useAIAgent()` session select | `ChatbotService` | **YES** (reads `chatbot_messages`) |
| `POST /api/v1/chatbot/conversations` | `createNewConversationApi()` | `ChatbotService` | **YES** (creates `chatbot_conversations`) |
| `DELETE /api/v1/chatbot/conversations/{id}`| `deleteConversationApi()` | `ChatbotService` | **YES** (soft-deletes `chatbot_conversations`) |
| `PATCH /api/v1/chatbot/conversations/{id}` | None in Engineering UI | `ChatbotService` | **YES** (renames `chatbot_conversations`) |

---

## 9. Tenant Isolation Analysis

```
Tenant Context Enforcement:
Request Header -> Authorization: Bearer <JWT>
  └─► JWT decoded -> user.id + user.organization_id (Cryptographically Verified)
        └─► Database Scoping:
              WHERE organization_id = :authenticated_org_id 
                AND user_id = :authenticated_user_id
                AND is_deleted = false
```

- **Cross-Tenant Guarantees**:
  1. A user from Organization A cannot list, view, modify, or delete conversations belonging to Organization B because every query filters by `organization_id` derived directly from the authenticated JWT.
  2. If a user attempts to supply a foreign `organization_id` or `conversation_id`, the repository returns `404 Not Found` or raises `403 Forbidden`.
  3. Soft-deleted conversations (`is_deleted = true`) are filtered out of all user-facing queries.

---

## 10. Missing Functionality

1. **Persistent Storage for Engineering Agent**: No database read/write hooks in `EngineeringAgentService`.
2. **Engineering Agent Conversation API**: Lack of dedicated `/api/v1/engineering-agent/conversations` REST endpoints.
3. **Structured Agent Metadata Persistence**: `metrics`, `artifacts`, `actions`, `tools_executed`, `detected_intent`, and `selected_agent` need persistent storage.
4. **ChatGPT-Style Sidebar**: Absence of date grouping (Today, Yesterday, Previous 7 Days, Older) and sorting by `updated_at DESC`.
5. **Inline Conversation Rename**: Frontend UI lacks rename interaction (pencil icon/inline edit) hooked to a persistence endpoint.
6. **Unified Message Timestamps**: Inconsistent timestamp formatting between server UTC ISO strings and client relative time.

---

## 11. Recommended Data Model

### Option Analysis

- **Option A (Reuse `chatbot_conversations` & `chatbot_messages`)**: Add an `agent_mode` or `conversation_type` column (`'chatbot'` vs `'engineering_agent'`) and store rich agent data inside `metrics_json` / `sources_json` / `metadata_json`.
- **Option B (Dedicated New Tables: `engineering_conversations` & `engineering_messages`)**: Completely separate table schemas tailored for the multi-agent system.

### Recommended Approach: **Dedicated Tables via New Migration `034_create_engineering_agent_conversations.sql`**

*Rationale*: Keeps the legacy Chatbot table schema untouched, avoids migration coupling, prevents column collisions, and provides full schema support for rich multi-agent telemetry without bloating legacy chatbot tables.

```sql
-- Migration 034: Create Dedicated Engineering Agent Conversations & Messages Tables
CREATE TABLE IF NOT EXISTS engineering_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Engineering Analysis',
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE SET NULL,
    developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eng_conv_org_user ON engineering_conversations(organization_id, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eng_conv_deleted ON engineering_conversations(is_deleted);

CREATE TABLE IF NOT EXISTS engineering_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES engineering_conversations(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    detected_intent VARCHAR(100),
    selected_agent VARCHAR(100),
    metrics_json JSONB,
    artifacts_json JSONB,
    actions_json JSONB,
    tools_executed_json JSONB,
    execution_time_ms NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eng_msg_conv_created ON engineering_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_eng_msg_org_user ON engineering_messages(organization_id, user_id);
```

---

## 12. Recommended API Design

Add dedicated endpoints under `/api/v1/engineering-agent/conversations`:

```
POST   /api/v1/engineering-agent/conversations              -> Create empty conversation
GET    /api/v1/engineering-agent/conversations              -> List conversations (sorted updated_at DESC)
GET    /api/v1/engineering-agent/conversations/{id}         -> Fetch conversation details & message history
PATCH  /api/v1/engineering-agent/conversations/{id}         -> Rename conversation title
DELETE /api/v1/engineering-agent/conversations/{id}         -> Soft delete conversation (is_deleted = true)
POST   /api/v1/engineering-agent/chat                       -> Execute agent & automatically persist turn
```

---

## 13. Recommended Frontend Changes

1. **API Client (`src/lib/api/ai.ts`)**:
   - Point `fetchUserConversations`, `fetchConversationDetails`, `createNewConversationApi`, `deleteConversationApi`, and new `renameConversationApi` to `/api/v1/engineering-agent/conversations`.
2. **Sidebar (`ConversationList.tsx`)**:
   - Add date section headers: **Today**, **Yesterday**, **Previous 7 Days**, **Older**.
   - Add inline title rename (double click or edit button) and delete modal confirmation.
   - Show active indicator and relative timestamp (e.g., "10m ago", "Yesterday").
3. **Hook (`use-ai-agent.ts`)**:
   - Ensure `activeConversationId` is created on backend upon the first user message if starting from an empty state.
   - On conversation selection, fetch full messages from backend and populate state.
   - On new message, update `updated_at` locally and reorder active conversation to the top.

---

## 14. Recommended LangGraph Conversation-Context Strategy

- **Context Assembly**: When a conversation is loaded or continued, fetch the last $N=6$ message turns from the persistent database into `GraphState["recent_turns"]`.
- **Token Budget Guard**: Truncate past agent outputs if cumulative context exceeds `MAX_CONTEXT_TOKENS = 3000`.
- **Contextual Entity Memory**: Pass resolved entities (`last_repository_name`, `last_developer_name`, `last_timeframe`) from the latest turn to `DeterministicIntentMatcher` to resolve follow-up queries (e.g., *"What about yesterday?"*).

---

## 15. Rename Design

- **Endpoint**: `PATCH /api/v1/engineering-agent/conversations/{conversation_id}` with `{ "title": "Updated Title" }`.
- **Behavior**: Updates `title` and `updated_at` in the database.
- **Safety**: Does **not** trigger LLM or tool execution.
- **UI**: Immediate optimistic UI update; reverts on network failure.

---

## 16. Delete Design

- **Endpoint**: `DELETE /api/v1/engineering-agent/conversations/{conversation_id}`.
- **Behavior**: Sets `is_deleted = true` (Soft delete).
- **Isolation**: Strictly verifies `organization_id` and `user_id`. Returns `404` if unowned.
- **UI**: Removes thread from sidebar immediately and resets active conversation to a new chat.

---

## 17. Timestamp Design

- **Source of Truth**: Database server timestamps (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`).
- **Response Format**: ISO 8601 UTC strings (`2026-09-30T03:30:00.000Z`).
- **Frontend Display**:
  - Sidebar: Relative date headers ("Today", "Yesterday", "Sep 27, 2026").
  - Messages: Contextual time ("Today at 10:42 AM", "Yesterday at 4:20 PM").

---

## 18. Migration Requirements

- **Migration File Needed**: `034_create_engineering_agent_conversations.sql`
- **Execution Strategy**: Standard Node.js migration runner in `GitHub-Backend`.
- **Constraint**: No changes to migrations `001` through `033`.

---

## 19. Security Considerations

1. **Multi-Tenant Scoping**: All database queries must enforce `WHERE organization_id = :tenant_id AND user_id = :user_id`.
2. **Secret Scrubbing**: All messages pass through `SecretScrubber` before being persisted to the database.
3. **IDOR Defense**: Conversation IDs must be random UUIDs/hashes to prevent enumeration.

---

## 20. Backward Compatibility Considerations

1. **Zero Impact on Chatbot**: Legacy Chatbot routes (`/api/v1/chatbot/*`) and tables remain 100% operational.
2. **Zero Impact on Express Tools**: Tool clients remain strictly read-only HTTP GET.
3. **Graceful Fallback**: If database session fails, agent execution completes and falls back to in-memory memory with a logged warning.

---

## 21. Exact Files That Would Need Modification (In Future Implementation Phase)

1. `FastAPI-AI-Services/app/models/engineering_chat.py` (New SQLAlchemy models)
2. `FastAPI-AI-Services/app/db/engineering_repository.py` (New DB repository)
3. `FastAPI-AI-Services/app/engineering_agent/api/router.py` (Add conversation endpoints)
4. `FastAPI-AI-Services/app/engineering_agent/core/service.py` (Wire DB persistence in `execute_agent`)
5. `GitHub-Backend/database/migrations/034_create_engineering_agent_conversations.sql` (New migration)
6. `GitHub-Frontend/src/lib/api/ai.ts` (Update conversation endpoints)
7. `GitHub-Frontend/src/hooks/use-ai-agent.ts` (Connect persistent flow)
8. `GitHub-Frontend/src/components/ai/ConversationList.tsx` (Date grouping + rename UI)

---

## 22. Exact Files That Must Remain Untouched

- `FastAPI-AI-Services/app/services/chatbot_service.py`
- `FastAPI-AI-Services/app/api/v1/chatbot.py`
- `FastAPI-AI-Services/app/engineering_agent/orchestration/graph.py`
- `FastAPI-AI-Services/app/engineering_agent/tools/express_client.py`
- `FastAPI-AI-Services/app/engineering_agent/agents/*` (All 8 sub-agents)
- `GitHub-Backend/database/migrations/001_*.sql` through `033_*.sql`
- `GitHub-Backend/src/controllers/*`
- `GitHub-Frontend/src/components/ai/FloatingChatbot.tsx`

---

## 23. Recommended Implementation Phases (Phases 20+)

- **Phase 20**: Database Migration & SQLAlchemy Models for Engineering Agent.
- **Phase 21**: FastAPI Conversation Repository & REST Endpoints.
- **Phase 22**: Integration with `EngineeringAgentService` & LangGraph Context Loader.
- **Phase 23**: Frontend Sidebar Date Grouping, Rename, and Delete Polish.
- **Phase 24**: End-to-End Regression & Persistence Validation.

---

## 24. Testing Strategy

1. **Unit Tests**: Test `EngineeringChatRepository` CRUD operations with tenant scoping.
2. **Security Tests**: Test IDOR prevention (User A cannot read/rename/delete User B's conversations).
3. **Integration Tests**: Test conversation creation, turn persistence, and `updated_at` ordering.
4. **E2E Scenario Tests**: Multi-turn conversation continuation across simulated browser refresh.

---

## 25. Acceptance Criteria

1. Conversations and messages persist across browser refresh, logout/login, and service restarts.
2. Sidebar displays date-grouped sections (Today, Yesterday, Previous 7 Days, Older) sorted by `updated_at DESC`.
3. User can rename conversation titles with instant persistence.
4. User can soft-delete conversations without affecting other data.
5. Previous conversation context is loaded and used accurately by LangGraph.
6. Multi-tenant isolation is 100% preserved.
7. Legacy Chatbot continues to function without regressions.

---

## AUDIT CONCLUSION & INFRASTRUCTURE READINESS STATEMENT

### **AUDIT STATUS: PASS (AUDIT & DESIGN COMPLETE)**

### **Infrastructure Readiness Statement**:
> The existing platform possesses all core database connectivity (`Neon PostgreSQL + asyncpg`), JWT authentication, and tenant extraction infrastructure. However, **new database tables (`engineering_conversations`, `engineering_messages`) via a dedicated migration (`034_create_engineering_agent_conversations.sql`) and dedicated REST endpoints under `/api/v1/engineering-agent/conversations` are required** to achieve full persistent ChatGPT-style conversation capabilities without compromising or coupling with the legacy chatbot.
