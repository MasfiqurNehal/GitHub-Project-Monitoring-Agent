# Phase 13: Future RAG Architecture Foundation Report

**Date:** 2026-09-29  
**Status:** Completed  
**Repository:** `FastAPI-AI-Services` / `GitHub-Project-Monitoring-Agent`  

---

## 1. Executive Summary

Phase 13 lays the architectural foundation and clean interface contracts for future **Retrieval-Augmented Generation (RAG)** within the Engineering AI Agent.

In accordance with architectural principles:
- **No full ingestion system or premature vector database infrastructure** was forced into active production.
- **Clean, decoupled interfaces** define the entire lifecycle from Knowledge Ingestion to Grounded Retrieval.
- **Strict Knowledge Provenance Segregation** ensures the agent distinguishes between 4 independent sources of truth without mixing or hallucinating telemetry data.

---

## 2. The 6-Stage RAG Pipeline Architecture

```
┌────────────────────────────────────────────────────────┐
│                   1. Knowledge Base                     │
│               (Document Registration / API)            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               2. Document Processing                   │
│         (Secret Scrubbing, Text Cleaning, Meta)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   3. Chunking                          │
│     (Header-Aware Markdown, Sliding Windows, Code)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   4. Embeddings                        │
│    (Dense Vector Representation, Batch Processing)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                 5. Vector Database                     │
│    (Multi-Tenant Scoping, Similarity Cosine/KNN)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  6. Knowledge Retriever                │
│    (Threshold Filtering, Grounded Context Bundling)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                Engineering AI Agent                    │
│    (StateGraph Context Injection & Zero-Hallucination) │
└────────────────────────────────────────────────────────┘
```

---

## 3. Strict 4-Way Knowledge Provenance Taxonomy

The Engineering Agent recognizes four distinct knowledge categories and strictly guarantees they are never mixed:

| Knowledge Category | Source & Storage Layer | Tenant Isolation | Authoritative For | Mixing Protection Rule |
|:---|:---|:---|:---|:---|
| **A. GitHub / Application Data** | Tool Layer / Neon PostgreSQL / Live GitHub APIs | Strict Tenant Scoping (`tenant_id`) | Commits, PRs, issues, velocity, code churn, developer metrics, repository status | **NEVER** routed to or replaced by RAG vectors. Must always execute deterministic tool queries. |
| **B. Company Knowledge** | Internal Tenant RAG (Runbooks, SOPs, ADRs, Docs) | Strict Multi-Tenant Isolation (`tenant_id`) | Deployment procedures, internal architectural decision records (ADRs), company policies | Only accessible by users belonging to the specific organization tenant. Foreign tenant queries are strictly blocked. |
| **C. General IT / Software Knowledge** | Global Standards Vector Store (Docs, RFCs, syntax) | Global / Shared across all tenants | Language syntax, design patterns, microservice architecture, clean code standards | Read-only global domain knowledge. Does not contain any company or tenant private data. |
| **D. LLM Parametric Knowledge** | Base Model Pre-trained Reasoning | Stateless / Ephemeral | Logical deduction, language synthesis, code formatting, natural conversation | Used strictly for reasoning and synthesis; forbidden from fabricating facts when telemetry/company data is missing. |

---

## 4. Defined Interface Contracts

All interfaces are located in [`FastAPI-AI-Services/app/engineering_agent/rag_foundation/interfaces.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/rag_foundation/interfaces.py):

### 1. `IDocumentProcessor`
```python
class IDocumentProcessor(ABC):
    @abstractmethod
    async def process_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        """Sanitizes, scrubs secrets (PATs, tokens), and standardizes incoming documents."""
        pass
```

### 2. `IDocumentChunker`
```python
class IDocumentChunker(ABC):
    @abstractmethod
    def chunk_document(self, document: KnowledgeDocument) -> List[DocumentChunk]:
        """Splits document into semantic chunks with header hierarchies and metadata."""
        pass
```

### 3. `IEmbeddingProvider`
```python
class IEmbeddingProvider(ABC):
    @property
    @abstractmethod
    def vector_dimension(self) -> int:
        pass

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        pass
```

### 4. `IVectorStore`
```python
class IVectorStore(ABC):
    @abstractmethod
    async def upsert_chunks(self, chunks: List[DocumentChunk]) -> int:
        pass

    @abstractmethod
    async def search_similar(self, query_embedding: List[float], query_params: RetrievalQuery) -> List[RetrievedChunkItem]:
        """Executes vector similarity search strictly bounded by tenant_id and source_type filters."""
        pass

    @abstractmethod
    async def delete_document_chunks(self, document_id: str, tenant_id: Optional[str] = None) -> int:
        pass

    @abstractmethod
    async def delete_tenant_knowledge(self, tenant_id: str) -> int:
        """Purges all knowledge chunks for a specific tenant (compliance / right-to-be-forgotten)."""
        pass
```

### 5. `IKnowledgeRetriever`
```python
class IKnowledgeRetriever(ABC):
    @abstractmethod
    async def retrieve_grounded_context(self, query: RetrievalQuery) -> GroundedContextBundle:
        """Retrieves and formats relevant knowledge into a grounded context bundle."""
        pass
```

### 6. `IKnowledgeBase`
```python
class IKnowledgeBase(ABC):
    @abstractmethod
    async def ingest_document(self, document: KnowledgeDocument) -> int:
        pass

    @abstractmethod
    async def retrieve(self, query: RetrievalQuery) -> GroundedContextBundle:
        pass
```

---

## 5. Provenance Routing (`KnowledgeSourceRouter`)

Located in [`FastAPI-AI-Services/app/engineering_agent/rag_foundation/source_router.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/rag_foundation/source_router.py):
- Inspects queries and intent classifications to classify which knowledge source is authoritative.
- Ensures telemetry questions ("*Show recent commits*", "*Who opened PR #12*") are routed to **`GITHUB_APPLICATION_DATA`** and do not trigger hallucinated vector retrieval.
- Routes policy/runbook queries to **`COMPANY_KNOWLEDGE`** with tenant scoping.
- Routes general IT architecture queries to **`GENERAL_IT_KNOWLEDGE`**.

---

## 6. Verification and Test Results

The test suite in [`FastAPI-AI-Services/tests/test_phase13_rag_foundation.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/tests/test_phase13_rag_foundation.py) verifies:
1. **Knowledge Source Routing**: Correct categorization of GitHub telemetry, company runbooks, IT concepts, and LLM reasoning.
2. **Document Processing**: Secret scrubbing (PATs, tokens) and content normalization.
3. **Document Chunking**: Header-aware markdown splitting and metadata preservation.
4. **Embedding Contract**: Vector dimension consistency and deterministic batch operations.
5. **Vector Store Tenant Isolation**: Multi-tenant isolation ensuring Tenant A can never retrieve Tenant B's chunks.
6. **End-to-End Pipeline**: Grounded context retrieval and bundle packaging.

### Test Execution Output:
```bash
& "C:\Users\Nehal\AppData\Local\Python\bin\python.exe" -m unittest discover tests
----------------------------------------------------------------------
Ran 119 tests in 15.510s

OK (119/119 passing across all phases)
```

---

## 7. Next Steps & Readiness
When actual document ingestion is scheduled in future phases:
- `IVectorStore` can be backed by Neon `pgvector` or Qdrant without altering the orchestrator or agent contracts.
- `IEmbeddingProvider` can bind to OpenAI / Vertex AI / HuggingFace text embeddings.
- Zero changes to existing tool execution or session memory logic will be required.
