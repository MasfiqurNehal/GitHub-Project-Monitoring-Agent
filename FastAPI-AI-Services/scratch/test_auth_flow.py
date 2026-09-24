import sys
import time
from pathlib import Path
import jwt
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.main import app

def generate_jwt_token(user_id: str, email: str, name: str, role: str = "admin", org_id: str = "org-1"):
    now = int(time.time())
    payload = {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "organizationId": org_id,
        "type": "access",
        "iat": now,
        "exp": now + 86400  # 1 day
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def run_tests():
    print("=" * 65)
    print("AUTHENTICATION & AUTHORIZATION INTEGRATION TEST")
    print("=" * 65)

    user_alpha_id = "usr-admin-1"
    user_alpha_email = "admin1@masfiqurnehal.com"
    token_alpha = generate_jwt_token(user_alpha_id, user_alpha_email, "User Alpha", org_id="org-masfiqurnehal")

    user_beta_id = "usr-admin-2"
    user_beta_email = "admin@betopia.com"
    token_beta = generate_jwt_token(user_beta_id, user_beta_email, "User Beta", org_id="org-betopia-1")

    with TestClient(app) as client:
        # -------------------------------------------------------------------------
        # TEST 1: Unauthenticated Request
        # -------------------------------------------------------------------------
        print("\n1. Testing UNAUTHENTICATED Request (No Bearer Token)...")
        unauth_res = client.get("/api/v1/chatbot/conversations")
        print(f"   Status Code: {unauth_res.status_code}")
        print(f"   Response   : {unauth_res.json()}")
        if unauth_res.status_code == 401:
            print("   [+] SUCCESS: Unauthenticated request properly rejected with 401 Unauthorized.")
        else:
            print("   [-] FAILURE: Expected 401 Unauthorized.")

        # -------------------------------------------------------------------------
        # TEST 2: Authenticated Request (User Alpha)
        # -------------------------------------------------------------------------
        print("\n2. Testing AUTHENTICATED Request for User Alpha...")
        alpha_headers = {"Authorization": f"Bearer {token_alpha}"}
        conv_id = f"conv-test-{int(time.time())}"
        
        chat_payload = {
            "conversation_id": conv_id,
            "prompt": "Summarize the latest commits for GitHub project."
        }
        
        auth_res = client.post("/api/v1/chatbot/chat", json=chat_payload, headers=alpha_headers)
        print(f"   Status Code: {auth_res.status_code}")
        print(f"   Response   : {auth_res.json()}")
        
        if auth_res.status_code == 200 and auth_res.json().get("success"):
            print("   [+] SUCCESS: Authenticated request processed successfully.")
        else:
            print("   [-] FAILURE: Authenticated request failed.")

        # -------------------------------------------------------------------------
        # TEST 3: Access to Another User's Conversation (User Beta accessing User Alpha's conversation)
        # -------------------------------------------------------------------------
        print("\n3. Testing ACCESS TO ANOTHER USER'S CONVERSATION (User Beta -> User Alpha's Conv)...")
        beta_headers = {"Authorization": f"Bearer {token_beta}"}
        
        cross_user_res = client.get(f"/api/v1/chatbot/conversations/{conv_id}", headers=beta_headers)
        print(f"   Status Code: {cross_user_res.status_code}")
        print(f"   Response   : {cross_user_res.json()}")

        if cross_user_res.status_code in [404, 403]:
            print("   [+] SUCCESS: Access denied! User Beta cannot access User Alpha's conversation.")
        else:
            print("   [-] FAILURE: Data leak! User Beta was able to access User Alpha's conversation.")

        # -------------------------------------------------------------------------
        # TEST 4: Cleanup (User Alpha deletes conversation)
        # -------------------------------------------------------------------------
        print("\n4. Cleaning up test conversation (User Alpha deleting conversation)...")
        del_res = client.delete(f"/api/v1/chatbot/conversations/{conv_id}", headers=alpha_headers)
        print(f"   Status Code: {del_res.status_code}")
        print(f"   Response   : {del_res.json()}")

    print("\n=" * 65)
    print("AUTHENTICATION TEST COMPLETED")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
