"""
Phase 13: Future RAG Architecture Foundation Tests.

Tests the decoupled interfaces, schemas, knowledge provenance separation,
chunking, embedding contracts, vector stores, and retrieval mechanisms.
"""

import unittest
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


class TestPhase13RAGFoundation(unittest.IsolatedAsyncioTestCase):
    """Unit tests for Phase 13 RAG interfaces and provenance segregation."""

    def setUp(self):
        self.processor = StandardDocumentProcessor()
        self.chunker = HeaderAwareMarkdownChunker(max_chunk_tokens=100, min_chunk_tokens=5)
        self.embedder = DeterministicEmbeddingProvider(dimension=64)
        self.vector_store = InMemoryVectorStore()
        self.retriever = StandardKnowledgeRetriever(
            vector_store=self.vector_store,
            embedding_provider=self.embedder,
        )
        self.kb = ModularKnowledgeBase(
            processor=self.processor,
            chunker=self.chunker,
            embedder=self.embedder,
            vector_store=self.vector_store,
            retriever=self.retriever,
        )
        self.source_router = KnowledgeSourceRouter()

    def test_knowledge_source_routing_provenance_separation(self):
        """Ensure distinct knowledge sources are never mixed."""
        # 1. Telemetry / Live GitHub queries -> GITHUB_APPLICATION_DATA
        res_gh_1 = self.source_router.classify("Show latest commit in Nexora AI")
        self.assertEqual(res_gh_1.primary_source, KnowledgeSourceType.GITHUB_APPLICATION_DATA)
        self.assertFalse(res_gh_1.rag_retrieval_required)

        res_gh_2 = self.source_router.classify("Who opened pull request #42 yesterday?")
        self.assertEqual(res_gh_2.primary_source, KnowledgeSourceType.GITHUB_APPLICATION_DATA)
        self.assertFalse(res_gh_2.rag_retrieval_required)

        # 2. Company SOPs / Internal docs -> COMPANY_KNOWLEDGE
        res_comp_1 = self.source_router.classify("What is our deployment runbook for production?")
        self.assertEqual(res_comp_1.primary_source, KnowledgeSourceType.COMPANY_KNOWLEDGE)
        self.assertTrue(res_comp_1.rag_retrieval_required)

        res_comp_2 = self.source_router.classify("Explain the internal architectural decision record (ADR) for auth.")
        self.assertEqual(res_comp_2.primary_source, KnowledgeSourceType.COMPANY_KNOWLEDGE)
        self.assertTrue(res_comp_2.rag_retrieval_required)

        # 3. General IT & Software Engineering -> GENERAL_IT_KNOWLEDGE
        res_it_1 = self.source_router.classify("What is the circuit breaker pattern in distributed microservices?")
        self.assertEqual(res_it_1.primary_source, KnowledgeSourceType.GENERAL_IT_KNOWLEDGE)
        self.assertTrue(res_it_1.rag_retrieval_required)

        res_it_2 = self.source_router.classify("Explain how docker container networking works.")
        self.assertEqual(res_it_2.primary_source, KnowledgeSourceType.GENERAL_IT_KNOWLEDGE)
        self.assertTrue(res_it_2.rag_retrieval_required)

        # 4. LLM Synthesis / Reasoning -> LLM_PARAMETRIC_KNOWLEDGE
        res_llm = self.source_router.classify("Write a python function to compute fibonacci numbers recursively.")
        self.assertEqual(res_llm.primary_source, KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE)
        self.assertFalse(res_llm.rag_retrieval_required)

    async def test_document_processor_sanitization_and_metadata(self):
        """Verify document processor scrubs secrets and standardizes text."""
        raw_content = "Runbook SOP: deploy with token ghp_123456789012345678901234567890123456 to cluster."
        meta = DocumentMetadata(
            document_id="doc-sop-01",
            source_type=KnowledgeSourceType.COMPANY_KNOWLEDGE,
            title="Production Deployment SOP",
            tenant_id="tenant-alpha",
        )
        doc = KnowledgeDocument(metadata=meta, raw_content=raw_content)

        processed = await self.processor.process_document(doc)
        self.assertNotIn("ghp_123456789012345678901234567890123456", processed.cleaned_content)
        self.assertIn("[REDACTED_GITHUB_PAT]", processed.cleaned_content)

    def test_document_chunker_structure_preservation(self):
        """Verify chunker extracts sections and preserves metadata."""
        markdown_doc = """# Production Setup Guide
This document explains our environment variables and prerequisites in detail for all team engineers.

## Step 1: Pre-flight Checks
Verify all dependencies and system prerequisites are installed before executing scripts.

## Step 2: Deployment
Run the release pipeline deployment script to begin rollout.
"""
        meta = DocumentMetadata(
            document_id="doc-guide-01",
            source_type=KnowledgeSourceType.COMPANY_KNOWLEDGE,
            title="Setup Guide",
            tenant_id="tenant-alpha",
        )
        doc = KnowledgeDocument(metadata=meta, raw_content=markdown_doc, cleaned_content=markdown_doc)

        chunks = self.chunker.chunk_document(doc)
        self.assertGreater(len(chunks), 0)
        for chunk in chunks:
            self.assertEqual(chunk.document_id, "doc-guide-01")
            self.assertEqual(chunk.tenant_id, "tenant-alpha")
            self.assertEqual(chunk.source_type, KnowledgeSourceType.COMPANY_KNOWLEDGE)

    async def test_embedding_provider_contract(self):
        """Verify embedding provider generates vectors with matching dimensions."""
        vector = await self.embedder.generate_embedding("Production release pipeline")
        self.assertEqual(len(vector), 64)
        self.assertEqual(self.embedder.vector_dimension, 64)

        batch_vectors = await self.embedder.generate_embeddings_batch(["First doc chunk", "Second doc chunk"])
        self.assertEqual(len(batch_vectors), 2)
        self.assertEqual(len(batch_vectors[0]), 64)
        self.assertEqual(len(batch_vectors[1]), 64)

    async def test_vector_store_tenant_isolation_and_similarity(self):
        """Verify vector store strictly respects tenant scoping in search."""
        # Tenant A chunk
        chunk_a = DocumentChunk(
            chunk_id="chk-a-1",
            document_id="doc-a-1",
            tenant_id="tenant-alpha",
            source_type=KnowledgeSourceType.COMPANY_KNOWLEDGE,
            chunk_index=0,
            title="Tenant Alpha Release Key",
            content="Tenant Alpha secret release deployment key and schedule.",
            embedding=await self.embedder.generate_embedding("Tenant Alpha secret release deployment key and schedule."),
        )
        # Tenant B chunk
        chunk_b = DocumentChunk(
            chunk_id="chk-b-1",
            document_id="doc-b-1",
            tenant_id="tenant-beta",
            source_type=KnowledgeSourceType.COMPANY_KNOWLEDGE,
            chunk_index=0,
            title="Tenant Beta Release Key",
            content="Tenant Beta release deployment protocol and keys.",
            embedding=await self.embedder.generate_embedding("Tenant Beta release deployment protocol and keys."),
        )

        await self.vector_store.upsert_chunks([chunk_a, chunk_b])

        # Query as Tenant Alpha
        query_vec = await self.embedder.generate_embedding("release deployment protocol")
        results_a = await self.vector_store.search_similar(
            query_embedding=query_vec,
            query_params=RetrievalQuery(
                query_text="release deployment protocol",
                tenant_id="tenant-alpha",
                source_types=[KnowledgeSourceType.COMPANY_KNOWLEDGE],
                similarity_threshold=0.01,
            )
        )

        self.assertTrue(len(results_a) > 0)
        for item in results_a:
            self.assertEqual(item.chunk.tenant_id, "tenant-alpha")
            self.assertNotEqual(item.chunk.tenant_id, "tenant-beta")

        # Query as Tenant Beta
        results_b = await self.vector_store.search_similar(
            query_embedding=query_vec,
            query_params=RetrievalQuery(
                query_text="release deployment protocol",
                tenant_id="tenant-beta",
                source_types=[KnowledgeSourceType.COMPANY_KNOWLEDGE],
                similarity_threshold=0.01,
            )
        )

        self.assertTrue(len(results_b) > 0)
        for item in results_b:
            self.assertEqual(item.chunk.tenant_id, "tenant-beta")
            self.assertNotEqual(item.chunk.tenant_id, "tenant-alpha")

    async def test_full_knowledge_base_ingestion_and_grounded_retrieval(self):
        """Verify end-to-end ingestion and grounded context assembly."""
        doc = KnowledgeDocument(
            metadata=DocumentMetadata(
                document_id="doc-runbook-prod",
                source_type=KnowledgeSourceType.COMPANY_KNOWLEDGE,
                title="Incident Response Runbook",
                tenant_id="tenant-prod",
            ),
            raw_content="""# Incident Response Runbook
In case of database outage, notify on-call DevOps lead immediately and trigger failover to secondary cluster.
""",
        )

        num_chunks = await self.kb.ingest_document(doc)
        self.assertGreater(num_chunks, 0)

        query = RetrievalQuery(
            query_text="database outage failover procedure",
            tenant_id="tenant-prod",
            source_types=[KnowledgeSourceType.COMPANY_KNOWLEDGE],
            similarity_threshold=0.01,
            top_k=2,
        )

        bundle = await self.kb.retrieve(query)
        self.assertEqual(bundle.source_type, KnowledgeSourceType.COMPANY_KNOWLEDGE)
        self.assertTrue(bundle.is_grounded)
        self.assertGreater(len(bundle.matched_chunks), 0)
        self.assertIn("outage", bundle.matched_chunks[0].chunk.content.lower())
        self.assertIn("DevOps", bundle.formatted_context)


if __name__ == "__main__":
    unittest.main()
