import asyncio
import json
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.providers.ai_provider import AIProviderFactory, AIProviderException

async def run_test():
    print("=" * 65)
    print("TESTING AI PROVIDER INTEGRATION")
    print("=" * 65)
    print(f"  AI_PROVIDER : {settings.AI_PROVIDER}")
    print(f"  AI_BASE_URL : {settings.AI_BASE_URL}")
    print(f"  AI_MODEL    : {settings.AI_MODEL}")
    print(f"  AI_API_KEY  : {'*' * (len(settings.AI_API_KEY) - 4) + settings.AI_API_KEY[-4:] if settings.AI_API_KEY else '(Empty)'}")
    print("-" * 65)

    provider = AIProviderFactory.get_provider()
    
    test_messages = [
        {"role": "user", "content": "Hello! Reply with a 1-sentence confirmation that you are working properly."}
    ]

    print("\nSending test prompt to AI Provider...")
    try:
        response = await provider.generate_completion(messages=test_messages)
        print("\n[+] SUCCESSFUL RESPONSE RECEIVED!")
        print(f"  Provider   : {response.get('provider')}")
        print(f"  Model      : {response.get('model')}")
        print(f"  Latency    : {response.get('latency_ms')} ms")
        print(f"  Answer     : {response.get('answer')}")
        if response.get("usage"):
            print(f"  Usage      : {json.dumps(response.get('usage'))}")
    except AIProviderException as err:
        print("\n[-] PROVIDER ERROR OCCURRED:")
        print(f"  Status Code: {err.status_code}")
        print(f"  Message    : {err.message}")
    except Exception as err:
        print(f"\n[-] UNEXPECTED ERROR: {err}")

if __name__ == "__main__":
    asyncio.run(run_test())
