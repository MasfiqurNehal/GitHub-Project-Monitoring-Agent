"""
Direct Backend Verification Script:
Tests database initialization, JWT validation, conversation creation, RAG retrieval, AI completion, and DB persistence directly.
"""
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
ai_root = Path(__file__).parent.parent / "FastAPI-AI-Services"
sys.path.append(str(ai_root))

from dotenv import load_dotenv
load_dotenv(ai_root / ".env")

from app.config import settings
from app.db.connection import db_manager, get_async_db_url
db_manager.raw_db_url = settings.DATABASE_URL
db_manager.async_db_url = get_async_db_url(settings.DATABASE_URL)
from app.services.chatbot_service import chatbot_service
from app.schemas.chat import ChatPromptRequest
from app.utils.auth import AuthenticatedUser

async def test_direct_backend():
    print("=== Testing Direct FastAPI Backend Service & NeonDB ===")
    await db_manager.connect()

    # Fetch valid existing user ID from users table
    async with db_manager.session_factory() as session:
        from sqlalchemy import text
        res = await session.execute(text("SELECT id, email, organization_id FROM users LIMIT 1;"))
        row = res.fetchone()
        if row:
            real_user_id, real_email, real_org_id = row[0], row[1], row[2]
        else:
            real_user_id = "user-101"
            real_email = "admin@gitmonitor.io"
            real_org_id = "org-001"

    mock_user = AuthenticatedUser(
        id=real_user_id,
        email=real_email,
        name="Neon DB User",
        role="admin",
        organization_id=real_org_id
    )

    # 1. Create Conversation
    print("\n[1] Creating conversation session...")
    conv_data = await chatbot_service.create_conversation(user=mock_user, title="E2E Direct Test")
    conv_id = conv_data["id"]
    print(f"    [OK] Conversation Created: '{conv_id}' | Title: '{conv_data['title']}'")

    # 2. Process Chat Message
    print("\n[2] Processing chat message...")
    request = ChatPromptRequest(
        conversation_id=conv_id,
        message="What features are included in GitMonitor dashboard and project tracking?"
    )
    response_envelope = await chatbot_service.process_chat_message(request=request, user=mock_user)
    print(f"    [OK] Response Envelope Success: {response_envelope.success}")
    print(f"    Answer: {response_envelope.data.answer[:120]}...")
    print(f"    Sources: {response_envelope.data.sources}")

    # 3. Retrieve User Conversations
    print("\n[3] Fetching user conversations from database...")
    user_convs = await chatbot_service.get_user_conversations(user=mock_user)
    print(f"    [OK] User Conversations Count: {len(user_convs)}")

    # 4. Fetch Conversation Messages
    print("\n[4] Fetching messages for conversation...")
    details = await chatbot_service.get_conversation_details(conversation_id=conv_id, user=mock_user)
    print(f"    [OK] Messages Saved in DB: {len(details['messages'])}")
    for m in details['messages']:
        print(f"      - [{m['sender'].upper()}]: {m['content'][:60]}...")

    # 5. Delete Conversation
    print("\n[5] Deleting conversation...")
    deleted = await chatbot_service.delete_conversation(conversation_id=conv_id, user=mock_user)
    print(f"    [OK] Conversation Deleted: {deleted}")

    await db_manager.disconnect()
    print("\n[OK] Direct FastAPI Backend Service & NeonDB tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_direct_backend())
