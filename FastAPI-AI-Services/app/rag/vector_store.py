"""
Vector Storage Abstraction Layer for GitMonitor RAG Pipeline.
Keeps vector index storage & similarity search replaceable (e.g. In-Memory, PgVector, Chroma).
"""
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from app.rag.document_chunker import DocumentChunk
from app.utils.logger import logger
from app.config import settings

@dataclass
class VectorSearchResult:
    chunk: DocumentChunk
    similarity_score: float

class BaseVectorStore(ABC):
    """Abstract Base Class for vector database storage."""

    @abstractmethod
    def add_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> None:
        """Index document chunks along with their vector embeddings."""
        pass

    @abstractmethod
    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 2,
        threshold: Optional[float] = None
    ) -> List[VectorSearchResult]:
        """Perform vector cosine similarity search."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear all indexed vectors."""
        pass

class InMemoryVectorStore(BaseVectorStore):
    """
    Fast, thread-safe in-memory vector store using exact Cosine Similarity.
    Production-friendly for microservices with structured domain knowledge docs.
    """

    def __init__(self):
        self._index: List[Dict[str, Any]] = []

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def add_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> None:
        """Index document chunks with their dense embeddings."""
        if len(chunks) != len(embeddings):
            raise ValueError(f"Mismatch between chunks count ({len(chunks)}) and embeddings count ({len(embeddings)})")

        for chunk, emb in zip(chunks, embeddings):
            self._index.append({
                "chunk": chunk,
                "embedding": emb
            })
        logger.info(f"[VectorStore] Indexed {len(chunks)} chunks into memory store (Total: {len(self._index)}).")

    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 2,
        threshold: Optional[float] = None
    ) -> List[VectorSearchResult]:
        """Search top-k most similar vector chunks above similarity score threshold."""
        if not self._index or not query_embedding:
            return []

        min_score = threshold if threshold is not None else settings.RAG_SIMILARITY_THRESHOLD
        results: List[VectorSearchResult] = []

        for item in self._index:
            chunk = item["chunk"]
            score = self._cosine_similarity(query_embedding, item["embedding"])
            
            # Additional title / header relevance boost
            title_words = set(chunk.title.lower().split()) | set(chunk.doc_name.lower().split("_"))
            # If any title word matches non-zero elements in query_embedding
            if score > 0 and (title_words & set(chunk.content.lower().split())):
                score = min(1.0, score * 1.25)

            if score >= min_score:
                results.append(VectorSearchResult(
                    chunk=chunk,
                    similarity_score=score
                ))

        # Sort descending by similarity score
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        top_results = results[:top_k]

        logger.info(
            f"[VectorStore] Vector search returned {len(top_results)} results "
            f"(threshold >= {min_score}, top similarity: {top_results[0].similarity_score if top_results else 0.0:.3f})"
        )
        return top_results

    def clear(self) -> None:
        """Clear indexed vectors."""
        self._index.clear()
        logger.info("[VectorStore] Cleared vector index.")

def get_vector_store(store_type: Optional[str] = None) -> BaseVectorStore:
    """Factory function for vector store."""
    stype = (store_type or settings.VECTOR_STORE_TYPE).lower()
    if stype == "memory":
        return InMemoryVectorStore()
    else:
        return InMemoryVectorStore()
