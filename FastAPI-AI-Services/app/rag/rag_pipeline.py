"""
Modular RAG Pipeline Orchestrator for GitMonitor.
Integrates: Documents -> Chunking -> Embeddings -> Vector Storage -> Similarity Search -> AI Context.

Design Principles:
- Pluggable EmbeddingProvider (TFIDF, API, Custom)
- Pluggable VectorStore (InMemory, PgVector, Chroma)
- Fallback to General AI Knowledge if query similarity is below threshold.
- Decoupled from Chatbot and AI Completion Provider logic.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from app.rag.document_chunker import DocumentChunker, DocumentChunk, document_chunker
from app.rag.embedding_provider import BaseEmbeddingProvider, get_embedding_provider
from app.rag.vector_store import BaseVectorStore, VectorSearchResult, get_vector_store
from app.config import settings
from app.utils.logger import logger

class RAGPipeline:
    """
    RAG Orchestrator coordinating document chunking, embedding generation,
    vector storage indexing, and similarity search context generation.
    """

    def __init__(
        self,
        docs_dir: Optional[str] = None,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        vector_store: Optional[BaseVectorStore] = None,
        chunker: Optional[DocumentChunker] = None
    ):
        if docs_dir:
            self.docs_dir = Path(docs_dir)
        else:
            self.docs_dir = Path(__file__).parent / "docs"

        self.chunker = chunker or document_chunker
        self.embedding_provider = embedding_provider or get_embedding_provider()
        self.vector_store = vector_store or get_vector_store()
        self.is_indexed = False

        self.build_index()

    def build_index(self, force: bool = False) -> None:
        """Load documentation files, chunk them, embed, and index into vector store."""
        if self.is_indexed and not force:
            return

        if not self.docs_dir.exists():
            logger.warning(f"[RAGPipeline] Documentation directory '{self.docs_dir}' does not exist.")
            return

        doc_files = list(self.docs_dir.glob("*.md"))
        logger.info(f"[RAGPipeline] Ingesting {len(doc_files)} documentation files from {self.docs_dir}...")

        all_chunks: List[DocumentChunk] = []
        for doc_path in doc_files:
            try:
                content = doc_path.read_text(encoding="utf-8")
                doc_chunks = self.chunker.chunk_markdown(content=content, doc_name=doc_path.stem)
                all_chunks.extend(doc_chunks)
            except Exception as err:
                logger.error(f"[RAGPipeline] Failed to read/chunk '{doc_path}': {err}")

        if not all_chunks:
            logger.warning("[RAGPipeline] No document chunks were created.")
            return

        # Generate vector embeddings for all chunks with title weight boost
        texts_to_embed = [f"{c.doc_name.replace('_', ' ')} {c.title} {c.title}\n{c.content}" for c in all_chunks]
        embeddings = self.embedding_provider.embed_batch(texts_to_embed)

        # Index into vector store
        self.vector_store.clear()
        self.vector_store.add_chunks(all_chunks, embeddings)
        self.is_indexed = True
        logger.info(f"[RAGPipeline] Pipeline indexing complete. Total indexed chunks: {len(all_chunks)}.")

    def retrieve_context(
        self,
        query: str,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Similarity Search & Context Assembly:
        1. Embeds user query string.
        2. Queries Vector Store for top_k results.
        3. Filters by similarity threshold.
        4. Returns formatted system context string + sources metadata if relevant.
        5. Returns empty context (triggering general LLM knowledge fallback) if no domain docs match.
        """
        if not self.is_indexed:
            self.build_index()

        k = top_k if top_k is not None else settings.RAG_TOP_K
        threshold = similarity_threshold if similarity_threshold is not None else settings.RAG_SIMILARITY_THRESHOLD

        # 1. Generate query vector embedding
        query_vector = self.embedding_provider.embed_text(query)

        # 2. Similarity search in vector store
        search_results: List[VectorSearchResult] = self.vector_store.similarity_search(
            query_embedding=query_vector,
            top_k=k,
            threshold=threshold
        )

        if not search_results:
            logger.info(f"[RAGPipeline] No domain knowledge reached similarity threshold ({threshold}) for query '{query[:30]}...'. Falling back to general AI knowledge.")
            return {
                "is_relevant": False,
                "rag_context": "",
                "sources": [],
                "matched_chunks": []
            }

        # 3. Format retrieved chunks into system context block
        formatted_blocks = ["[GITMONITOR KNOWLEDGE BASE SYSTEM CONTEXT]"]
        sources: List[Dict[str, str]] = []
        matched_chunks: List[Dict[str, Any]] = []

        for idx, res in enumerate(search_results, 1):
            chunk = res.chunk
            formatted_blocks.append(
                f"--- Reference Source {idx}: {chunk.title} (Relevance Score: {res.similarity_score:.2f}) ---\n{chunk.content}"
            )
            sources.append({
                "title": chunk.title,
                "doc_name": chunk.doc_name,
                "type": "documentation",
                "similarity": f"{res.similarity_score:.2f}"
            })
            matched_chunks.append({
                "title": chunk.title,
                "content": chunk.content,
                "score": res.similarity_score
            })

        formatted_blocks.append("[END KNOWLEDGE BASE CONTEXT]")
        rag_context = "\n\n".join(formatted_blocks)

        return {
            "is_relevant": True,
            "rag_context": rag_context,
            "sources": sources,
            "matched_chunks": matched_chunks
        }

# Global singleton RAG pipeline instance
rag_pipeline = RAGPipeline()
