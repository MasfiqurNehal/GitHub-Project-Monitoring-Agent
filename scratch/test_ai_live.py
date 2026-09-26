import asyncio
import httpx

async def test():
    headers = {
        'Authorization': 'Bearer sk_754fd8b1130b0db4c90479e91acfac0c4b4c363ed93201dd3afdca28fa3a1297',
        'Content-Type': 'application/json'
    }
    # Test with openai/gpt-oss-20b:free and its ID
    for model_name in ['openai/gpt-oss-20b:free', 'a824e7d5-96a4-4c29-93a6-4373f2f014db']:
        print(f"\n--- Testing model: {model_name} ---")
        payload = {
            'model': model_name,
            'messages': [{'role': 'user', 'content': 'Hello! Give a 1-sentence reply.'}],
            'max_tokens': 50
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                r = await client.post('https://api.betopia.ai/v1/chat/completions', headers=headers, json=payload)
                print('Status:', r.status_code)
                print('Response:', r.text[:300])
            except Exception as e:
                print('Error:', e)

if __name__ == '__main__':
    asyncio.run(test())
