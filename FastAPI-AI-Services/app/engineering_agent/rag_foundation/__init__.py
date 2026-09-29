"""
Engineering AI Agent RAG Architecture Foundation.
Defines clean, extensible interfaces and data provenance contracts for:
Knowledge Base ➔ Document Processing ➔ Chunking ➔ Embeddings ➔ Vector Database ➔ Retriever ➔ Engineering Agent
"""
from app.engineering_agent.rag_foundation.schemas import (
    KnowledgeSourceType,
    DocumentType,
    DocumentMetadata,
    KnowledgeDocument,
    DocumentChunk,
    RetrievalQuery,
    RetrievedChunkItem,
    GroundedContextBundle,
)
from app.engineering_agent.rag_foundation.interfaces import (
    IDocumentProcessor,
    IDocumentChunker,
    IEmbeddingProvider,
    IVectorStore,
    IKnowledgeRetriever,
    IKnowledgeBase,
)
from app.engineering_agent.rag_foundation.source_router import (
    knowledge_source_router,
    KnowledgeSourceRouter,
    SourceClassificationResult,
)
from app.engineering_agent.rag_foundation.mock_implementation import (
    StandardDocumentProcessor,
    HeaderAwareMarkdownChunker,
    DeterministicEmbeddingProvider,
    InMemoryVectorStore,
    StandardKnowledgeRetriever,
    ModularKnowledgeBase,
)

__all__ = [
    "KnowledgeSourceType",
    "DocumentType",
    "DocumentMetadata",
    "KnowledgeDocument",
    "DocumentChunk",
    "RetrievalQuery",
    "RetrievedChunkItem",
    "GroundedContextBundle",
    "IDocumentProcessor",
    "IDocumentChunker",
    "IEmbeddingProvider",
    "IVectorStore",
    "IKnowledgeRetriever",
    "IKnowledgeBase",
    "knowledge_source_router",
    "KnowledgeSourceRouter",
    "SourceClassificationResult",
    "StandardDocumentProcessor",
    "HeaderAwareMarkdownChunker",
    "DeterministicEmbeddingProvider",
    "InMemoryVectorStore",
    "StandardKnowledgeRetriever",
    "ModularKnowledgeBase",
]
