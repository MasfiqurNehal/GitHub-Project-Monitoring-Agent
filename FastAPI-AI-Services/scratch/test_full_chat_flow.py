import sys
import time
from pathlib import Path
import jwt
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.main import app

def generate_test_token(user_id="usr-admin-1", email="admin1@masfiqurnehal.com"):
    now = int(time.time())
    payload = {
        "id": user_id,
        "email": email,
        "name": "Betopia Admin",
        "role": "admin",
        "organizationId": "org-masfiqurnehal",
        "type": "access",
        "iat": now,
        "exp": now + 86400
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def test_full_chat_pipeline():
    print("=" * 65)
    print("TESTING COMPLETE CHATBOT PIPELINE (Request -> AI -> DB -> Response)")
    print("=" * 65)

    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    with TestClient(app) as client:
        # Step 1: Send initial chat message without conversation_id
        print("\n1. Sending initial message to POST /api/chat...")
        req_1 = {
            "message": "Hello AI! Please introduce yourself briefly."
        }
        res_1 = client.post("/api/chat", json=req_1, headers=headers)
        print(f"   Status Code: {res_1.status_code}")
        body_1 = res_1.json()
        print(f"   Response   : {body_1}")

        assert res_1.status_code == 200, f"Expected 200 OK, got {res_1.status_code}"
        assert body_1.get("success") is True, "Expected success: True"
        
        data_1 = body_1.get("data", {})
        conv_id = data_1.get("conversation_id")
        answer_1 = data_1.get("answer")
        msg_id_1 = data_1.get("message_id")

        print(f"   [+] Conversation Created in DB: {conv_id}")
        print(f"   [+] AI Message Saved in DB     : {msg_id_1}")
        print(f"   [+] AI Answer Text             : '{answer_1[:60]}...'")

        # Step 2: Continue existing conversation using returned conversation_id
        print(f"\n2. Continuing conversation '{conv_id}' with follow-up message...")
        req_2 = {
            "conversation_id": conv_id,
            "message": "What key engineering metrics do you monitor?"
        }
        res_2 = client.post("/api/chat", json=req_2, headers=headers)
        print(f"   Status Code: {res_2.status_code}")
        body_2 = res_2.json()

        assert res_2.status_code == 200, f"Expected 200 OK, got {res_2.status_code}"
        data_2 = body_2.get("data", {})
        assert data_2.get("conversation_id") == conv_id, "Conversation ID must remain identical!"
        answer_2 = data_2.get("answer", "")

        print(f"   [+] Follow-up AI Message Saved: {data_2.get('message_id')}")
        print(f"   [+] AI Follow-up Answer Length: {len(answer_2)} chars")

        # Step 3: Fetch full conversation history from DB
        print(f"\n3. Fetching updated conversation details from GET /api/v1/chatbot/conversations/{conv_id}...")
        history_res = client.get(f"/api/v1/chatbot/conversations/{conv_id}", headers=headers)
        print(f"   Status Code: {history_res.status_code}")
        history_data = history_res.json().get("conversation", {})
        messages = history_data.get("messages", [])
        print(f"   [+] Total Messages in Conversation: {len(messages)}")
        for idx, m in enumerate(messages, 1):
            print(f"       [{idx}] {m['sender'].upper()}: (Message ID: {m['id']})")

        assert len(messages) >= 4, "Expected at least 4 messages (2 user + 2 assistant)"

        # Step 4: Clean up test conversation
        print(f"\n4. Deleting test conversation '{conv_id}'...")
        cleanup_res = client.delete(f"/api/v1/chatbot/conversations/{conv_id}", headers=headers)
        print(f"   Status Code: {cleanup_res.status_code}")
        print(f"   Response   : {cleanup_res.json()}")

    print("\n=" * 65)
    print("COMPLETE CHATBOT PIPELINE VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    test_full_chat_pipeline()
