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

def run_multi_turn_test():
    print("=" * 70)
    print("TESTING MULTI-TURN CONVERSATION CONTEXT RETENTION")
    print("=" * 70)

    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    conv_id = f"conv-multiturn-{int(time.time())}"

    with TestClient(app) as client:
        # ---------------------------------------------------------------------
        # TURN 1: State key facts
        # ---------------------------------------------------------------------
        prompt_1 = "I am currently monitoring a repository named 'Betopia-SaaS-Engine' which has 5 active developers."
        print(f"\n[TURN 1] User -> '{prompt_1}'")
        res_1 = client.post("/api/chat", json={"conversation_id": conv_id, "message": prompt_1}, headers=headers)
        assert res_1.status_code == 200, f"Expected 200 OK, got {res_1.status_code}"
        answer_1 = res_1.json()["data"]["answer"]
        print(f"         AI   -> '{answer_1[:80]}...'")

        # ---------------------------------------------------------------------
        # TURN 2: Ask follow-up relying on Turn 1 (developer count)
        # ---------------------------------------------------------------------
        prompt_2 = "How many active developers did I say are working on the project?"
        print(f"\n[TURN 2] User -> '{prompt_2}'")
        res_2 = client.post("/api/chat", json={"conversation_id": conv_id, "message": prompt_2}, headers=headers)
        assert res_2.status_code == 200, f"Expected 200 OK, got {res_2.status_code}"
        answer_2 = res_2.json()["data"]["answer"]
        print(f"         AI   -> '{answer_2}'")

        assert "5" in answer_2, f"Expected AI to remember '5' developers in context, got: {answer_2}"
        print("         [+] SUCCESS: AI successfully recalled context from Turn 1! ('5' developers)")

        # ---------------------------------------------------------------------
        # TURN 3: Ask follow-up relying on Turn 1 (repository name)
        # ---------------------------------------------------------------------
        prompt_3 = "And what is the exact name of the repository?"
        print(f"\n[TURN 3] User -> '{prompt_3}'")
        res_3 = client.post("/api/chat", json={"conversation_id": conv_id, "message": prompt_3}, headers=headers)
        assert res_3.status_code == 200, f"Expected 200 OK, got {res_3.status_code}"
        answer_3 = res_3.json()["data"]["answer"]
        print(f"         AI   -> '{answer_3}'")

        assert "Betopia-SaaS-Engine" in answer_3 or "Betopia" in answer_3, f"Expected repository name in answer, got: {answer_3}"
        print("         [+] SUCCESS: AI successfully recalled repository name from Turn 1! ('Betopia-SaaS-Engine')")

        # ---------------------------------------------------------------------
        # Clean up test conversation
        # ---------------------------------------------------------------------
        print(f"\nCleaning up multi-turn test conversation '{conv_id}'...")
        client.delete(f"/api/v1/chatbot/conversations/{conv_id}", headers=headers)
        print("   [+] Cleanup complete.")

    print("\n=" * 70)
    print("MULTI-TURN CONVERSATION CONTEXT TEST PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_multi_turn_test()
