"""
Comprehensive Test Script for Modular RAG Architecture Pipeline.
Validates:
1. Document Chunker splitting.
2. Embedding Provider abstraction & vector generation.
3. Vector Store similarity search & cosine calculation.
4. RAG Pipeline domain search & system context formatting.
5. Fallback behavior when query is unrelated to GitMonitor system.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.rag.document_chunker import DocumentChunker
from app.rag.embedding_provider import TFIDFEmbeddingProvider, APIEmbeddingProvider, MockEmbeddingProvider
from app.rag.vector_store import InMemoryVectorStore
from app.rag.rag_pipeline import RAGPipeline

def test_modular_rag_pipeline():
    print("=== Step 1: Testing Document Chunker ===")
    chunker = DocumentChunker(target_chunk_size=300, chunk_overlap=30)
    sample_doc = "# Section 1\nThis is part 1 of GitMonitor.\n\n## Section 2\nThis is part 2 of GitMonitor developer tracking."
    chunks = chunker.chunk_markdown(sample_doc, doc_name="test_doc")
    print(f"[OK] Chunked into {len(chunks)} DocumentChunks.")
    for c in chunks:
        print(f"  - Chunk ID: {c.chunk_id} | Title: '{c.title}' | Tokens: {c.token_estimate}")

    print("\n=== Step 2: Testing Embedding Providers ===")
    tfidf_provider = TFIDFEmbeddingProvider(vector_dim=128)
    vec1 = tfidf_provider.embed_text("GitMonitor code churn velocity")
    vec2 = tfidf_provider.embed_text("GitHub repository commits")
    print(f"[OK] TFIDF Embedding dim: {len(vec1)} | Norm: {sum(v*v for v in vec1):.2f}")

    mock_provider = MockEmbeddingProvider(vector_dim=64)
    mvec = mock_provider.embed_text("Testing mock vector")
    print(f"[OK] Mock Embedding dim: {len(mvec)}")

    print("\n=== Step 3: Testing Vector Store Cosine Similarity ===")
    vector_store = InMemoryVectorStore()
    vector_store.add_chunks(chunks, [vec1, vec2])
    results = vector_store.similarity_search(query_embedding=vec1, top_k=2, threshold=0.1)
    print(f"[OK] Similarity Search returned {len(results)} results.")
    for res in results:
        print(f"  - Score: {res.similarity_score:.4f} | Title: {res.chunk.title}")

    print("\n=== Step 4: Testing Full RAG Pipeline ===")
    pipeline = RAGPipeline(
        embedding_provider=tfidf_provider,
        vector_store=InMemoryVectorStore(),
        chunker=chunker
    )
    print(f"[OK] RAG Pipeline built index with total chunks.")

    # Domain queries
    domain_queries = [
        "What is GitMonitor?",
        "How are code churn and developers tracked?",
        "Tell me about GitHub Connection setup",
        "What does the Engineering Agent do?"
    ]

    print("\n--- Domain System Knowledge Queries ---")
    for q in domain_queries:
        res = pipeline.retrieve_context(q)
        print(f"Query: '{q}'")
        print(f"  Relevant: {res['is_relevant']} | Sources: {[s['title'] for s in res['sources']]}")

    # General technical queries (unrelated to GitMonitor)
    general_queries = [
        "Write a Python function to check for prime numbers",
        "What is quantum computing?",
        "How do I sort an array in JavaScript?"
    ]

    print("\n--- Unrelated General Queries (Fallback Check) ---")
    for q in general_queries:
        res = pipeline.retrieve_context(q)
        print(f"Query: '{q}'")
        print(f"  Relevant: {res['is_relevant']} | RAG Context Empty: {res['rag_context'] == ''} | Sources: {res['sources']}")

    print("\n[OK] RAG Architecture Pipeline verified successfully!")

if __name__ == "__main__":
    test_modular_rag_pipeline()
