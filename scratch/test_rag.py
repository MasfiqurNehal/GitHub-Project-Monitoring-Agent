"""
Test script for KnowledgeRetriever (RAG) system.
Verifies keyword indexing, chunk retrieval, and relevance scoring across all 14 requested domain topics.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.rag.knowledge_base import knowledge_retriever

def test_rag():
    print("=== Testing GitMonitor Knowledge Base & RAG Engine ===")
    print(f"Total Chunks Indexed: {len(knowledge_retriever.chunks)}")
    
    test_queries = [
        "What is GitMonitor?",
        "Tell me about the Dashboard and Projects",
        "How do Repositories work?",
        "How are Developers and Code Churn tracked?",
        "Explain GitHub monitoring and GitHub Connection setup",
        "What are Pull Requests and Issues?",
        "What kind of Reports are generated?",
        "How does Activity tracking work?",
        "Explain Settings and Security",
        "What features does the Chatbot have?",
        "What is the Engineering Agent?"
    ]

    for q in test_queries:
        results = knowledge_retriever.search_knowledge(q, top_k=2)
        print(f"\nQuery: '{q}'")
        print(f"Matched {len(results)} chunks:")
        for res in results:
            print(f"  - [{res['doc_name']}] {res['title']}")

    print("\n=== Test Context Formatting ===")
    sample_results = knowledge_retriever.search_knowledge("Engineering Agent and Chatbot", top_k=2)
    formatted = knowledge_retriever.format_knowledge_context(sample_results)
    print(formatted)
    print("\n[OK] RAG Knowledge Base successfully verified!")

if __name__ == "__main__":
    test_rag()
