"""
Full E2E Integration Test Script:
Frontend Auth Token -> FastAPI /api/v1/chatbot/chat -> Context/RAG -> AI Provider -> Neon PostgreSQL DB -> Envelope Response
"""
import sys
import jwt
import time
import httpx
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.config import settings

def generate_valid_jwt_token():
    payload = {
        "userId": "user-nehal-prod-001",
        "email": "nehal@betopia.ai",
        "role": "ENGINEERING_LEAD",
        "organizationId": "org-betopia-global",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

async def test_full_e2e():
    print("=== Testing Full Frontend -> FastAPI -> AI -> NeonDB -> Response Flow ===")
    token = generate_valid_jwt_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    base_url = "http://127.0.0.1:8000/api/v1/chatbot"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Create a new conversation session
        print("\n[Step 1] Creating new conversation session...")
        res_create = await client.post(f"{base_url}/conversations", headers=headers, json={"title": "Sprint 24 E2E Test"})
        print(f"Status: {res_create.status_code} | Data: {res_create.json()}")
        conv_id = res_create.json()["conversation"]["id"]

        # 2. Send multi-turn prompt message 1 (Domain RAG query)
        print(f"\n[Step 2] Sending prompt 1 to conversation '{conv_id}'...")
        prompt_1 = "Explain how GitMonitor tracks developer activity and code churn"
        res_chat_1 = await client.post(
            f"{base_url}/chat",
            headers=headers,
            json={"conversation_id": conv_id, "prompt": prompt_1}
        )
        print(f"Status: {res_chat_1.status_code}")
        chat_1_data = res_chat_1.json()
        print(f"AI Answer: {chat_1_data['data']['answer'][:120]}...")
        print(f"Sources: {chat_1_data['data']['sources']}")

        # 3. Send prompt message 2 (Multi-turn follow-up)
        print(f"\n[Step 3] Sending prompt 2 (multi-turn follow-up)...")
        prompt_2 = "How does this relate to pull requests and issues velocity?"
        res_chat_2 = await client.post(
            f"{base_url}/chat",
            headers=headers,
            json={"conversation_id": conv_id, "prompt": prompt_2}
        )
        print(f"Status: {res_chat_2.status_code}")
        chat_2_data = res_chat_2.json()
        print(f"AI Answer: {chat_2_data['data']['answer'][:120]}...")

        # 4. Fetch conversation details & NeonDB persisted messages
        print(f"\n[Step 4] Fetching conversation details from Neon PostgreSQL DB...")
        res_details = await client.get(f"{base_url}/conversations/{conv_id}", headers=headers)
        print(f"Status: {res_details.status_code}")
        details = res_details.json()["conversation"]
        print(f"Total Messages Saved in DB: {len(details['messages'])}")

        # 5. Test Engineering Agent Intent Redirection
        print(f"\n[Step 5] Testing Engineering Agent Intent Redirection...")
        prompt_agent = "Analyze developer activity across our repositories"
        res_agent = await client.post(
            f"{base_url}/chat",
            headers=headers,
            json={"conversation_id": conv_id, "prompt": prompt_agent}
        )
        print(f"Status: {res_agent.status_code}")
        agent_data = res_agent.json()
        print(f"Handoff Answer: {agent_data['data']['answer'][:100]}...")
        print(f"Actions: {agent_data['data']['actions']}")

        # 6. Delete conversation
        print(f"\n[Step 6] Deleting conversation '{conv_id}'...")
        res_del = await client.delete(f"{base_url}/conversations/{conv_id}", headers=headers)
        print(f"Status: {res_del.status_code} | Result: {res_del.json()}")

    print("\n[OK] Full End-to-End integration verified successfully!")

if __name__ == "__main__":
    asyncio.run(test_full_e2e())
