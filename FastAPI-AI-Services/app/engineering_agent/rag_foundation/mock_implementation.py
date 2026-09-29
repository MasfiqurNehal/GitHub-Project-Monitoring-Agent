"""
Reference In-Memory Implementation of RAG Foundation Interfaces.
Provides a complete, lightweight, zero-external-dependency realization of:
IDocumentProcessor, IDocumentChunker, IEmbeddingProvider, IVectorStore, IKnowledgeRetriever, IKnowledgeBase
Used for interface validation, testing, and contract verification.
"""
import re
import math
import hashlib
from typing import List, Optional, Dict, Any

from app.engineering_agent.rag_foundation.schemas import (
    KnowledgeDocument,
    DocumentChunk,
    RetrievalQuery,
    RetrievedChunkItem,
    GroundedContextBundle,
    KnowledgeSourceType
)
from app.engineering_agent.rag_foundation.interfaces import (
    IDocumentProcessor,
    IDocumentChunker,
    IEmbeddingProvider,
    IVectorStore,
    IKnowledgeRetriever,
    IKnowledgeBase
)
from app.engineering_agent.memory.scrubber import secret_scrubber


class StandardDocumentProcessor(IDocumentProcessor):
    """Sanitizes document text, scrubs sensitive secrets, and formats content."""

    async def process_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        raw = document.raw_content
        # 1. Scrub secrets
        sanitized = secret_scrubber.scrub(raw)
        # 2. Normalize whitespace
        cleaned = re.sub(r"\r\n", "\n", sanitized).strip()
        document.cleaned_content = cleaned
        return document


class HeaderAwareMarkdownChunker(IDocumentChunker):
    """Splits Markdown documents into semantic chunks by headers while preserving section titles."""

    def __init__(self, max_chunk_tokens: int = 500, min_chunk_tokens: int = 20):
        self.max_chunk_tokens = max_chunk_tokens
        self.min_chunk_tokens = min_chunk_tokens

    def _estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    def chunk_document(self, document: KnowledgeDocument) -> List[DocumentChunk]:
        content = document.cleaned_content or document.raw_content
        lines = content.split("\n")

        chunks: List[DocumentChunk] = []
        current_header = document.metadata.title
        current_lines: List[str] = []
        chunk_idx = 0

        for line in lines:
            if re.match(r"^#{1,3}\s+", line):
                # Save previous section if non-empty
                section_text = "\n".join(current_lines).strip()
                if section_text and self._estimate_tokens(section_text) >= self.min_chunk_tokens:
                    chunks.append(
                        DocumentChunk(
                            document_id=document.metadata.document_id,
                            tenant_id=document.metadata.tenant_id,
                            source_type=document.metadata.source_type,
                            chunk_index=chunk_idx,
                            title=f"{document.metadata.title} > {current_header}",
                            content=section_text,
                            token_count=self._estimate_tokens(section_text),
                            metadata={"doc_title": document.metadata.title, "tags": document.metadata.tags}
                        )
                    )
                    chunk_idx += 1
                    current_lines = []

                current_header = line.lstrip("#").strip()
            else:
                current_lines.append(line)

        # Append final chunk
        final_text = "\n".join(current_lines).strip()
        if final_text:
            chunks.append(
                DocumentChunk(
                    document_id=document.metadata.document_id,
                    tenant_id=document.metadata.tenant_id,
                    source_type=document.metadata.source_type,
                    chunk_index=chunk_idx,
                    title=f"{document.metadata.title} > {current_header}",
                    content=final_text,
                    token_count=self._estimate_tokens(final_text),
                    metadata={"doc_title": document.metadata.title, "tags": document.metadata.tags}
                )
            )

        return chunks


class DeterministicEmbeddingProvider(IEmbeddingProvider):
    """
    Deterministic n-gram hashing embedding provider for zero-dependency vector generation.
    Produces unit-normalized 64-dimensional float vectors.
    """

    def __init__(self, dimension: int = 64):
        self._dim = dimension

    @property
    def vector_dimension(self) -> int:
        return self._dim

    def _hash_text_to_vector(self, text: str) -> List[float]:
        norm = text.lower().strip()
        vec = [0.0] * self._dim
        words = re.findall(r"\w+", norm)
        
        for word in words:
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self._dim
            vec[idx] += 1.0

        # Unit-normalize vector
        magnitude = math.sqrt(sum(x * x for x in vec))
        if magnitude > 0:
            vec = [x / magnitude for x in vec]
        return vec

    async def generate_embedding(self, text: str) -> List[float]:
        return self._hash_text_to_vector(text)

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_text_to_vector(t) for t in texts]


class InMemoryVectorStore(IVectorStore):
    """
    In-memory vector store with multi-tenant filtering and cosine similarity ranking.
    """

    def __init__(self):
        self._chunks: Dict[str, DocumentChunk] = {}

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        mag_a = math.sqrt(sum(a * a for a in vec_a))
        mag_b = math.sqrt(sum(b * b for b in vec_b))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)

    async def upsert_chunks(self, chunks: List[DocumentChunk]) -> int:
        for chunk in chunks:
            self._chunks[chunk.chunk_id] = chunk
        return len(chunks)

    async def search_similar(self, query_embedding: List[float], query_params: RetrievalQuery) -> List[RetrievedChunkItem]:
        scored: List[Tuple[float, DocumentChunk]] = []

        for chunk in self._chunks.values():
            # 1. Source type filter
            if chunk.source_type not in query_params.source_types:
                continue

            # 2. Strict tenant isolation for company knowledge
            if chunk.source_type == KnowledgeSourceType.COMPANY_KNOWLEDGE:
                if chunk.tenant_id != query_params.tenant_id:
                    continue  # Block foreign tenant access

            if not chunk.embedding:
                continue

            score = self._cosine_similarity(query_embedding, chunk.embedding)
            if score >= query_params.similarity_threshold:
                scored.append((score, chunk))

        # Sort descending by similarity score
        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = scored[:query_params.top_k]

        return [
            RetrievedChunkItem(chunk=item[1], similarity_score=round(item[0], 4), rank=idx + 1)
            for idx, item in enumerate(top_items)
        ]

    async def delete_document_chunks(self, document_id: str, tenant_id: Optional[str] = None) -> int:
        keys_to_delete = [
            cid for cid, chk in self._chunks.items()
            if chk.document_id == document_id and (tenant_id is None or chk.tenant_id == tenant_id)
        ]
        for k in keys_to_delete:
            del self._chunks[k]
        return len(keys_to_delete)

    async def delete_tenant_knowledge(self, tenant_id: str) -> int:
        keys_to_delete = [cid for cid, chk in self._chunks.items() if chk.tenant_id == tenant_id]
        for k in keys_to_delete:
            del self._chunks[k]
        return len(keys_to_delete)


class StandardKnowledgeRetriever(IKnowledgeRetriever):
    """
    Coordinates embedding generation, vector search, and grounded context assembly.
    """

    def __init__(self, vector_store: IVectorStore, embedding_provider: IEmbeddingProvider):
        self.vector_store = vector_store
        self.embedding_provider = embedding_provider

    async def retrieve_grounded_context(self, query: RetrievalQuery) -> GroundedContextBundle:
        query_embedding = await self.embedding_provider.generate_embedding(query.query_text)
        matches = await self.vector_store.search_similar(query_embedding, query)

        if not matches:
            return GroundedContextBundle(
                source_type=query.source_types[0] if query.source_types else KnowledgeSourceType.COMPANY_KNOWLEDGE,
                matched_chunks=[],
                formatted_context="",
                is_grounded=False,
                citation_references=[]
            )

        context_lines = [f"[GROUNDED KNOWLEDGE BASE ({matches[0].chunk.source_type.value.upper()})]"]
        citations = []

        for item in matches:
            context_lines.append(f"--- Document: {item.chunk.title} (Relevance: {item.similarity_score:.2f}) ---")
            context_lines.append(item.chunk.content)
            citations.append(item.chunk.title)

        context_lines.append("[END KNOWLEDGE BASE]")

        return GroundedContextBundle(
            source_type=matches[0].chunk.source_type,
            matched_chunks=matches,
            formatted_context="\n\n".join(context_lines),
            is_grounded=True,
            citation_references=citations
        )


class ModularKnowledgeBase(IKnowledgeBase):
    """Complete modular knowledge base orchestrating all 6 pipeline stages."""

    def __init__(
        self,
        processor: IDocumentProcessor,
        chunker: IDocumentChunker,
        embedder: IEmbeddingProvider,
        vector_store: IVectorStore,
        retriever: IKnowledgeRetriever
    ):
        self.processor = processor
        self.chunker = chunker
        self.embedder = embedder
        self.vector_store = vector_store
        self.retriever = retriever

    async def ingest_document(self, document: KnowledgeDocument) -> int:
        processed_doc = await self.processor.process_document(document)
        chunks = self.chunker.chunk_document(processed_doc)
        
        # Compute embeddings for all chunks
        for chunk in chunks:
            chunk.embedding = await self.embedder.generate_embedding(chunk.content)
            
        return await self.vector_store.upsert_chunks(chunks)

    async def retrieve(self, query: RetrievalQuery) -> GroundedContextBundle:
        return await self.retriever.retrieve_grounded_context(query)
