"""
Clean Interface Definitions for the Future RAG Architecture Foundation.
Defines the contract for:
Knowledge Base ➔ Document Processing ➔ Chunking ➔ Embeddings ➔ Vector Database ➔ Retriever ➔ Engineering Agent
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from app.engineering_agent.rag_foundation.schemas import (
    KnowledgeDocument,
    DocumentChunk,
    RetrievalQuery,
    RetrievedChunkItem,
    GroundedContextBundle,
    KnowledgeSourceType
)


class IDocumentProcessor(ABC):
    """
    Interface for document pre-processing and sanitization.
    Transforms raw input formats (Markdown, PDF text, OpenAPI) into clean, secret-free text.
    """

    @abstractmethod
    async def process_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        """Sanitizes, cleans, and extracts structured metadata from raw documents."""
        pass


class IDocumentChunker(ABC):
    """
    Interface for splitting sanitized documents into discrete semantic chunks.
    """

    @abstractmethod
    def chunk_document(self, document: KnowledgeDocument) -> List[DocumentChunk]:
        """Splits document into chunks with preserved metadata and source tracking."""
        pass


class IEmbeddingProvider(ABC):
    """
    Interface for computing dense vector representations of text and code chunks.
    """

    @property
    @abstractmethod
    def vector_dimension(self) -> int:
        """Returns the embedding vector dimensionality (e.g. 384, 768, 1536)."""
        pass

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Computes vector embedding for a single text string."""
        pass

    @abstractmethod
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation for high-throughput ingestion."""
        pass


class IVectorStore(ABC):
    """
    Interface for vector database operations with strict tenant isolation.
    Can be backed by Pinecone, pgvector (Neon PostgreSQL), Qdrant, Milvus, or In-Memory stores.
    """

    @abstractmethod
    async def upsert_chunks(self, chunks: List[DocumentChunk]) -> int:
        """Inserts or updates chunks with their vector embeddings."""
        pass

    @abstractmethod
    async def search_similar(self, query_embedding: List[float], query_params: RetrievalQuery) -> List[RetrievedChunkItem]:
        """Executes vector similarity search strictly bounded by tenant_id and source_type filters."""
        pass

    @abstractmethod
    async def delete_document_chunks(self, document_id: str, tenant_id: Optional[str] = None) -> int:
        """Deletes all chunks associated with a document."""
        pass

    @abstractmethod
    async def delete_tenant_knowledge(self, tenant_id: str) -> int:
        """Purges all knowledge chunks for a specific tenant (compliance / right-to-be-forgotten)."""
        pass


class IKnowledgeRetriever(ABC):
    """
    Interface for high-level retrieval and grounded context assembly for the Engineering Agent.
    Coordinates embedding computation, vector search, similarity thresholding, and prompt context formatting.
    """

    @abstractmethod
    async def retrieve_grounded_context(self, query: RetrievalQuery) -> GroundedContextBundle:
        """Retrieves and formats relevant knowledge into a grounded context bundle."""
        pass


class IKnowledgeBase(ABC):
    """
    Top-level Knowledge Base facade interface.
    Manages document registration, ingestion pipelines, and retrieval dispatch.
    """

    @abstractmethod
    async def ingest_document(self, document: KnowledgeDocument) -> int:
        """Full pipeline execution: Process ➔ Chunk ➔ Embed ➔ Store."""
        pass

    @abstractmethod
    async def retrieve(self, query: RetrievalQuery) -> GroundedContextBundle:
        """Retrieval execution: Query ➔ Embed ➔ Search ➔ Format."""
        pass
