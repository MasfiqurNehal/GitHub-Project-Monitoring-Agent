"""
Master Test Suite for FastAPI Chatbot Backend.
Runs all production validation checks across RAG Pipeline, Topic Guard, Agent Detector, Express Client, and Direct DB operations.
"""
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
workspace_root = Path(__file__).parent.parent
ai_root = workspace_root / "FastAPI-AI-Services"
sys.path.append(str(workspace_root))
sys.path.append(str(ai_root))

from dotenv import load_dotenv
load_dotenv(ai_root / ".env")

from app.config import settings

from scratch.test_rag_pipeline import test_modular_rag_pipeline
from scratch.test_topic_guard import test_topic_guard
from scratch.test_agent_detector import test_agent_detector
from scratch.test_express_client import test_express_client
from scratch.test_backend_direct import test_direct_backend

async def main():
    print("==================================================================")
    print("      GITMONITOR FASTAPI AI BACKEND MASTER TEST SUITE            ")
    print("==================================================================")

    # Test 1: RAG Pipeline
    print("\n>>> Running Test 1: Modular RAG Pipeline Architecture")
    test_modular_rag_pipeline()

    # Test 2: Topic Guardrails
    print("\n>>> Running Test 2: Chatbot Topic Guardrails & Intent Scope")
    test_topic_guard()

    # Test 3: Engineering Agent Intent Detector
    print("\n>>> Running Test 3: Engineering Agent Intent Detector")
    test_agent_detector()

    # Test 4: Express Client Layer
    print("\n>>> Running Test 4: Internal Express API Client Abstraction")
    await test_express_client()

    # Test 5: Direct Neon PostgreSQL DB & Chatbot Flow
    print("\n>>> Running Test 5: Neon DB Connection & Chatbot Flow")
    await test_direct_backend()

    print("\n==================================================================")
    print("    [OK] ALL 5 MASTER CHATBOT BACKEND TESTS PASSED SUCCESSFULLY!  ")
    print("==================================================================")

if __name__ == "__main__":
    asyncio.run(main())
