import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.connection import db_manager
from app.db.repository import chatbot_repository

async def run_db_test():
    print("=" * 65)
    print("DATABASE INTEGRATION & SAAS TENANT ISOLATION TEST")
    print("=" * 65)

    await db_manager.connect()
    
    if not db_manager.session_factory:
        print("[-] Error: Database session factory is not initialized!")
        return

    test_user_alpha = "usr-admin-1"
    test_user_beta = "usr-admin-2"
    test_org_id = "org-masfiqurnehal"

    async with db_manager.session_factory() as session:
        print(f"\n1. Creating test conversation for User Alpha ({test_user_alpha})...")
        conv_alpha = await chatbot_repository.create_conversation(
            session=session,
            user_id=test_user_alpha,
            organization_id=test_org_id,
            title="Sprint Code Churn Analysis"
        )
        print(f"   [+] Conversation Created: ID = {conv_alpha.id}, Title = '{conv_alpha.title}'")

        print("\n2. Adding messages to User Alpha's conversation...")
        msg_user = await chatbot_repository.add_message(
            session=session,
            conversation_id=conv_alpha.id,
            sender="user",
            content="Show me high churn files in repo Betopia-API."
        )
        msg_ai = await chatbot_repository.add_message(
            session=session,
            conversation_id=conv_alpha.id,
            sender="assistant",
            content="Top churn file is src/services/sync.service.ts with 45 insertions.",
            metrics=[{"label": "Churn Level", "value": "High", "color": "text-amber-400"}]
        )
        print(f"   [+] User Message Added: ID = {msg_user.id}")
        print(f"   [+] AI Response Added: ID = {msg_ai.id}")

        print("\n3. Retrieving conversations for User Alpha...")
        alpha_convs = await chatbot_repository.get_user_conversations(
            session=session,
            user_id=test_user_alpha
        )
        print(f"   [+] User Alpha has {len(alpha_convs)} active conversation(s).")
        fetched_conv = alpha_convs[0]
        print(f"   [+] Fetched Conv ID: {fetched_conv.id}, Messages Count: {len(fetched_conv.messages)}")

        print("\n4. Testing SaaS Multi-Tenant Isolation (Querying with User Beta)...")
        beta_convs = await chatbot_repository.get_user_conversations(
            session=session,
            user_id=test_user_beta
        )
        print(f"   [+] User Beta conversation count: {len(beta_convs)} (Expected: 0)")
        
        beta_direct_fetch = await chatbot_repository.get_conversation_by_id(
            session=session,
            conversation_id=conv_alpha.id,
            user_id=test_user_beta
        )
        print(f"   [+] User Beta direct fetch attempt result: {beta_direct_fetch} (Expected: None)")

        if len(beta_convs) == 0 and beta_direct_fetch is None:
            print("\n[+] SUCCESS: SaaS User Isolation Verified! User Beta cannot see User Alpha's AI history.")
        else:
            print("\n[-] FAILURE: Data leakage detected!")

        print("\n5. Cleaning up test records...")
        await chatbot_repository.delete_conversation(session, conv_alpha.id, test_user_alpha)
        print("   [+] Test conversation deleted.")

    await db_manager.disconnect()
    print("\n=" * 65)
    print("DATABASE TEST COMPLETE")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_db_test())
