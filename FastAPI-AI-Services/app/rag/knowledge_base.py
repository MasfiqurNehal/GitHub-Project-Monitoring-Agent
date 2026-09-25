"""
GitMonitor Application Knowledge Base & RAG Context Adapter.
Wraps the modular RAG Pipeline (Chunker -> EmbeddingProvider -> VectorStore -> Context).
Keeps knowledge retrieval completely decoupled from chatbot business logic.
"""
from typing import List, Dict, Any, Optional
from app.rag.rag_pipeline import rag_pipeline, RAGPipeline

class KnowledgeRetriever:
    """RAG Retriever facade wrapping the modular RAG Pipeline."""

    def __init__(self, pipeline: Optional[RAGPipeline] = None):
        self.pipeline = pipeline or rag_pipeline

    def search_knowledge(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Search vector store for relevant context chunks matching user query.
        Returns top_k most relevant chunks.
        """
        res = self.pipeline.retrieve_context(query=query, top_k=top_k)
        if not res.get("is_relevant"):
            return []

        chunks = []
        for matched in res.get("matched_chunks", []):
            chunks.append({
                "title": matched["title"],
                "content": matched["content"],
                "score": matched["score"]
            })
        return chunks

    def format_knowledge_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved knowledge chunks into clean context text for LLM system prompt."""
        if not chunks:
            return ""

        formatted_blocks = ["[GITMONITOR APPLICATION KNOWLEDGE BASE]"]
        for idx, chunk in enumerate(chunks, 1):
            formatted_blocks.append(
                f"--- Reference Source {idx}: {chunk['title']} ---\n{chunk['content']}"
            )
        formatted_blocks.append("[END KNOWLEDGE BASE]")

        return "\n\n".join(formatted_blocks)

knowledge_retriever = KnowledgeRetriever()
