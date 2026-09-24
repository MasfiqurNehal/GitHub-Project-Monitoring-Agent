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

def run_tests():
    print("=" * 70)
    print("TESTING COMPLETE CHATBOT CONVERSATION MANAGEMENT APIS")
    print("=" * 70)

    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    with TestClient(app) as client:
        # 1. Create conversation
        print("\n1. Testing POST /api/v1/chatbot/conversations (Create Conversation)...")
        create_res = client.post("/api/v1/chatbot/conversations", json={"title": "Initial Architecture Review"}, headers=headers)
        print(f"   Status Code: {create_res.status_code}")
        body_create = create_res.json()
        assert create_res.status_code == 200 and body_create.get("success") is True
        conv = body_create.get("conversation", {})
        conv_id = conv.get("id")
        print(f"   [+] Created Conversation ID: {conv_id}, Title: '{conv.get('title')}'")

        # 2. List user's conversations
        print("\n2. Testing GET /api/v1/chatbot/conversations (List User's Conversations)...")
        list_res = client.get("/api/v1/chatbot/conversations", headers=headers)
        print(f"   Status Code: {list_res.status_code}")
        body_list = list_res.json()
        assert list_res.status_code == 200 and body_list.get("success") is True
        print(f"   [+] Active Conversations Count: {body_list.get('count')}")

        # 3. Continue conversation
        print(f"\n3. Testing POST /api/v1/chatbot/conversations/{conv_id}/chat (Continue Conversation)...")
        chat_res = client.post(f"/api/v1/chatbot/conversations/{conv_id}/chat", json={"message": "Please review project security."}, headers=headers)
        print(f"   Status Code: {chat_res.status_code}")
        body_chat = chat_res.json()
        assert chat_res.status_code == 200 and body_chat.get("success") is True
        print(f"   [+] Message Processed. AI Response ID: {body_chat['data']['message_id']}")

        # 4. Get a conversation details
        print(f"\n4. Testing GET /api/v1/chatbot/conversations/{conv_id} (Get Conversation Details)...")
        get_res = client.get(f"/api/v1/chatbot/conversations/{conv_id}", headers=headers)
        print(f"   Status Code: {get_res.status_code}")
        body_get = get_res.json()
        assert get_res.status_code == 200 and body_get.get("success") is True
        print(f"   [+] Retrieved Conversation Title: '{body_get['conversation']['title']}'")

        # 5. Get conversation messages
        print(f"\n5. Testing GET /api/v1/chatbot/conversations/{conv_id}/messages (Get Messages)...")
        msg_res = client.get(f"/api/v1/chatbot/conversations/{conv_id}/messages", headers=headers)
        print(f"   Status Code: {msg_res.status_code}")
        body_msg = msg_res.json()
        assert msg_res.status_code == 200 and body_msg.get("success") is True
        print(f"   [+] Messages Count: {body_msg.get('count')}")

        # 6. Rename conversation
        print(f"\n6. Testing PATCH /api/v1/chatbot/conversations/{conv_id} (Rename Conversation)...")
        rename_res = client.patch(f"/api/v1/chatbot/conversations/{conv_id}", json={"title": "Updated Security & Churn Review"}, headers=headers)
        print(f"   Status Code: {rename_res.status_code}")
        body_rename = rename_res.json()
        assert rename_res.status_code == 200 and body_rename.get("success") is True
        print(f"   [+] Updated Title: '{body_rename['conversation']['title']}'")

        # 7. Delete one conversation
        print(f"\n7. Testing DELETE /api/v1/chatbot/conversations/{conv_id} (Delete One Conversation)...")
        del_one_res = client.delete(f"/api/v1/chatbot/conversations/{conv_id}", headers=headers)
        print(f"   Status Code: {del_one_res.status_code}")
        assert del_one_res.status_code == 200 and del_one_res.json().get("success") is True
        print(f"   [+] Conversation '{conv_id}' deleted successfully.")

        # 8. Delete all user's conversations (Clear history)
        print("\n8. Testing DELETE /api/v1/chatbot/history (Delete All User's Conversations)...")
        clear_res = client.delete("/api/v1/chatbot/history", headers=headers)
        print(f"   Status Code: {clear_res.status_code}")
        print(f"   Response   : {clear_res.json()}")
        assert clear_res.status_code == 200 and clear_res.json().get("success") is True
        print("   [+] All user conversations cleared successfully.")

    print("\n=" * 70)
    print("ALL 8 CONVERSATION MANAGEMENT ENDPOINTS VERIFIED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
