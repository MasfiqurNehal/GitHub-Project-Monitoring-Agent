# AI_AGENT_PHASE0_AUDIT.md

## 1. Executive Summary & Audit Overview

This document presents the **Phase 0 Read-Only Architecture Audit** for integrating a new **Engineering AI Agent / Multi-Agent System** into the existing **GitHub Project Monitoring SaaS Application**.

The primary objective of this audit is to inspect all existing system layers (Frontend, Express Backend, Neon PostgreSQL, FastAPI AI Microservice, and GitHub Integration) to establish clean, non-destructive architectural boundaries.

### Core Non-Negotiable Requirements:
1. **Existing AI Chatbot**: Must remain completely separate, intact, and functional.
2. **SaaS Multi-Tenancy**: Must enforce tenant isolation derived from verified JWT session context.
3. **No Breaking Changes**: Existing REST endpoints, database schemas, and GitHub synchronizations must not be altered or broken.

---

## 2. Current Architecture

```mermaid
graph TD
    subgraph Frontend Layer [Next.js 14 App Router]
        FE_Agent["AI Workspace (/ai)"]
        FE_Chat["Floating Chatbot Widget"]
        FE_Dashboard["Dashboard / Projects / Repos / Devs"]
    end

    subgraph Backend Core [Node.js + Express.js - Port 5001]
        AuthMiddleware["requireTenantAuth Middleware"]
        ExpressRoutes["REST API Routes (/api/*)"]
        SyncWorker["GitHub App Sync Engine & Scheduler"]
    end

    subgraph Data & Storage
        NeonDB[("Neon PostgreSQL DB")]
        RedisQueue[("Redis (Queues & Cache)")]
    end

    subgraph AI Microservice Layer [Python FastAPI - Port 8000]
        FastAPIAuth["JWT Auth Dependency (get_current_user)"]
        ChatbotService["Existing Chatbot (RAG + Docs)"]
        EngineeringAgent["[NEW] Engineering AI Agent (Multi-Agent)"]
    end

    subgraph External APIs
        GitHubApp["GitHub REST / GraphQL / Webhook API"]
        LLMProvider["Betopia / OpenAI / Gemini LLM API"]
    end

    FE_Agent -->|JWT Bearer Token| FastAPIAuth
    FE_Chat -->|JWT Bearer Token| FastAPIAuth
    FastAPIAuth --> ChatbotService
    FastAPIAuth --> EngineeringAgent
    EngineeringAgent -->|Tool Invocations (HTTP)| ExpressRoutes
    EngineeringAgent -->|LLM Reasoning & Function Calling| LLMProvider
    ChatbotService -->|LLM Chat Completions| LLMProvider
    ExpressRoutes --> NeonDB
    SyncWorker --> GitHubApp
    SyncWorker --> NeonDB
    SyncWorker --> RedisQueue
```

---

## 3. Existing Relevant Files & Inspection Results

### 1. FastAPI Folder Structure
- **Location**: `FastAPI-AI-Services/`
- **Structure**:
  - `app/main.py`: Entrypoint with CORS, lifespan handlers, and router inclusion.
  - `app/config.py`: Centralized Pydantic settings (`DATABASE_URL`, `JWT_SECRET`, `BACKEND_URL`, `AI_PROVIDER`).
  - `app/api/router.py`: API v1 router mounting `/api/v1/health` and `/api/v1/chatbot`.
  - `app/api/v1/chatbot.py`: Chatbot endpoints (`/chat`, `/conversations`).
  - `app/api/v1/health.py`: Health check endpoint.
  - `app/services/chatbot_service.py`: Chatbot orchestration and context management.
  - `app/models/chat.py`: SQLAlchemy models (`chatbot_conversations`, `chatbot_messages`).
  - `app/rag/`: Documentation knowledge base, TF-IDF vector store, and retriever.
  - `app/agents/detector.py`: Intent detection regex router (`EngineeringAgentDetector`).
  - `app/utils/auth.py`: JWT decoding and `AuthenticatedUser` dependency.

### 2. Existing Chatbot Implementation
- **Separation**: The existing chatbot is a conversational, single-turn/multi-turn RAG assistant designed for quick knowledge queries and documentation search.
- **Data Stores**:
  - PostgreSQL tables: `chatbot_conversations`, `chatbot_messages`.
  - Frontend floating widget: browser `localStorage` (`gitmonitor_chatbot_sessions_v1`).
- **Route Prefix**: `/api/v1/chatbot/*`

### 3. Existing FastAPI Routes
- `GET /` & `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/chatbot/chat`
- `POST /api/v1/chatbot/conversations`
- `GET /api/v1/chatbot/conversations`
- `GET /api/v1/chatbot/conversations/{id}`
- `DELETE /api/v1/chatbot/conversations/{id}`

### 4. Existing Environment Configuration
- `PORT`: `8000`
- `BACKEND_URL`: `http://localhost:5001/api`
- `DATABASE_URL`: Connection string to Neon PostgreSQL
- `JWT_SECRET`: `super-secret-jwt-key-github-monitoring-agent` (Matching Express backend)
- `JWT_ALGORITHM`: `HS256`
- `AI_PROVIDER`: `betopia` / `openai` / `gemini`
- `AI_BASE_URL`: `https://api.betopia.ai/v1`
- `AI_MODEL`: `auto`

### 5. Existing Express API Contracts
All Express endpoints return standardized JSON envelopes:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: "message" }`
- Authentication header required: `Authorization: Bearer <JWT_TOKEN>`

### 6. Existing Authentication Flow & Tenant Identifiers
- User logs in via `POST /api/auth/login` on Express.
- Express issues a signed JWT containing payload: `{ id, email, role, organizationId }`.
- FastAPI's `app/utils/auth.py` (`get_current_user`) decodes the same JWT using shared `JWT_SECRET`.
- The user's `organizationId` is extracted into `current_user.organization_id`.

### 7. Existing GitHub API Integration
- Handled exclusively in `GitHub-Backend/src/github/` using GitHub App installation tokens, webhooks, and Octokit.
- Background sync scheduler in `syncScheduler.service.ts` updates Neon PostgreSQL tables asynchronously.

### 8. Existing Repository, Project, and Developer APIs
- `GET /api/projects`: List tenant projects with aggregated counts.
- `GET /api/projects/:id`: Get project details with attached repositories, developers, commit trends, PRs, issues, and code additions/deletions.
- `GET /api/repositories`: List repositories accessible to tenant.
- `GET /api/repositories/:id`: Detailed commit logs, language breakdown, sync status.
- `GET /api/developers`: Active developers, commit volume, PR reviews, additions/deletions.
- `GET /api/pull-requests`: Open, merged, and closed PRs with review cycle metrics.
- `GET /api/issues`: Open/closed issues with resolution times.
- `GET /api/activity`: Real-time audit events.

### 9. Existing Database Access Patterns
- **Express Backend**: Node `pg` Pool parameterized SQL queries + Prisma schema.
- **FastAPI AI Service**: Async SQLAlchemy engine (`asyncpg`) + connection pool manager.

### 10. Existing Frontend Engineering Agent Page
- **Page Route**: `/ai` (`GitHub-Frontend/src/app/ai/page.tsx`).
- **Hook**: `src/hooks/use-ai-agent.ts`.
- **API Client**: `src/lib/api/ai.ts` communicating with FastAPI on `http://localhost:8000`.

### 11. Existing Logging & Error Handling
- **FastAPI**: Custom structured logger (`app.utils.logger.logger`), exception handlers for `StarletteHTTPException`, `RequestValidationError`, and global unhandled exceptions.
- **Express**: Winston structured logger writing to console and `logs/logger.txt`.

### 12. Existing Tests & Verification Suites
- `GitHub-Backend/scratch/test_phase8_e2e_scenarios.ts` (18/18 E2E test scenarios verified).
- `GitHub-Backend/scratch/test_phase8_qa.ts` (Full project management validation suite).

### 13. Existing Dependency Files
- `FastAPI-AI-Services/requirements.txt`:
  - `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `python-dotenv`, `requests`, `httpx`, `sqlalchemy`, `asyncpg`, `psycopg2-binary`, `PyJWT`.
  - *LangGraph / LangChain status*: Not currently listed in `requirements.txt`. A modular multi-agent system can be cleanly implemented natively or with lightweight agent orchestration libraries.

---

## 4. Existing Chatbot Architecture

The current chatbot architecture consists of:
1. **Prompt Ingestion**: `POST /api/v1/chatbot/chat`.
2. **Intent & Topic Guard**: `app/services/topic_guard.py` checks for allowed GitHub & engineering topics.
3. **Domain RAG Retrieval**: `app/rag/knowledge_base.py` performs TF-IDF similarity searches across markdown guides in `app/rag/docs/`.
4. **Context Construction**: `app/services/context_manager.py` builds the LLM prompt with sliding window conversation history.
5. **AI Provider Dispatch**: `app/providers/ai_provider.py` sends completions to Betopia/OpenAI/Gemini.
6. **Persistence**: Saves user & assistant messages to `chatbot_conversations` and `chatbot_messages`.

---

## 5. Recommended Engineering Agent Location & Architecture

To guarantee complete separation from the chatbot:

### Proposed Directory Layout:
```
FastAPI-AI-Services/app/
├── agents/
│   ├── __init__.py
│   ├── detector.py                       (Existing Intent Detector - Preserved)
│   └── engineering/                       (NEW DEDICATED MULTI-AGENT MODULE)
│       ├── __init__.py
│       ├── orchestrator.py               (Main Multi-Agent Coordinator)
│       ├── state.py                      (Agent Execution State & History)
│       ├── prompts.py                    (System Prompts for Specialized Sub-Agents)
│       ├── subagents/
│       │   ├── __init__.py
│       │   ├── code_analysis_agent.py   (Deep commit & diff inspection)
│       │   ├── developer_agent.py       (Velocity, workload & review analysis)
│       │   ├── project_health_agent.py  (Cross-repo aggregation & SLA risks)
│       │   └── report_agent.py          (Executive summary & metric exports)
│       └── tools/
│           ├── __init__.py
│           ├── express_client.py        (Authenticated HTTP client calling Express API)
│           └── database_tools.py        (Direct tenant-scoped async SQL analytics)
├── api/v1/
│   ├── health.py                         (Preserved)
│   ├── chatbot.py                        (Preserved - UNTOUCHED)
│   └── agent.py                          (NEW ROUTER - /api/v1/agent/*)
```

---

## 6. Authentication, Tenant Flow & Tool Execution

### Request Authentication Flow:
1. User interacts with `/ai` workspace page.
2. Next.js frontend sends request with `Authorization: Bearer <JWT_TOKEN>` to `POST /api/v1/agent/run`.
3. FastAPI's `get_current_user` extracts `user.id` and `user.organization_id`.
4. The Engineering Agent initializes an execution context scoped strictly to `user.organization_id`.
5. When sub-agents invoke Express API tools via `express_client.py`, the user's Bearer token and `organization_id` are forwarded in the HTTP headers.
6. Express enforces multi-tenant boundaries on every tool invocation.

---

## 7. Risks & Mitigation Strategies

| Risk | Mitigation |
| :--- | :--- |
| **Accidental Chatbot Regression** | Keep `/api/v1/chatbot/*` routes, `chatbot_service.py`, and `app/models/chat.py` isolated. |
| **Agent Execution Timeouts** | Utilize `httpx.AsyncClient` with streaming progress updates or async execution job IDs. |
| **Cross-Tenant Data Leaks** | Enforce `organization_id` on all direct SQL queries and tool invocations. |
| **API Rate Limits** | Implement caching for repeated tool calls within the same agent session. |

---

## 8. Files That Must NOT Be Modified

The following existing components must remain untouched:
- `FastAPI-AI-Services/app/api/v1/chatbot.py`
- `FastAPI-AI-Services/app/services/chatbot_service.py`
- `FastAPI-AI-Services/app/models/chat.py`
- `GitHub-Backend/src/` (All Express controllers, services, and routes)
- `GitHub-Backend/database/migrations/` (All existing 33 SQL migration files)
- `GitHub-Frontend/src/components/ai/FloatingChatbot.tsx`

---

## 9. Phase 0 Audit Conclusion

```text
PHASE 0 STATUS: PASS
```

The system architecture, dependency landscape, authentication mechanisms, and API contracts have been fully audited. All implementation boundaries are clear and safe for the Engineering AI Agent development.
