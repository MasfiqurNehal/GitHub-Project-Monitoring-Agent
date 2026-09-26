import asyncio
import httpx

async def test():
    headers = {
        'Authorization': 'Bearer sk_754fd8b1130b0db4c90479e91acfac0c4b4c363ed93201dd3afdca28fa3a1297',
        'Content-Type': 'application/json'
    }
    models = [
        "auto",
        "Ornith 1.5 - betopia",
        "z-ai/glm-5.3-flash",
        "Qwen 3.6-betopia",
        "gpt-5.6-luna",
        "meituan/longcat-2.0",
        "qwen/qwen3.7-plus",
        "qwen/qwen3.7-flash",
        "openai/gpt-5.4-mini",
        "openai/gpt-5.6-luna-pro",
        "qwen3.6-35b-a3b",
        "openai/gpt-oss-20b:free",
        "minimax/minimax-m3",
        "deepseek/deepseek-v4-flash",
        "deepseek/deepseek-v4-pro",
        "z-ai/glm-5.2",
        "moonshotai/kimi-k2.6",
        "gpt-5.4-nano",
        "gpt-5.4-mini",
    ]
    async with httpx.AsyncClient(timeout=6.0) as client:
        for m in models:
            payload = {
                'model': m,
                'messages': [{'role': 'user', 'content': 'Hi'}],
                'max_tokens': 10
            }
            try:
                r = await client.post('https://api.betopia.ai/v1/chat/completions', headers=headers, json=payload)
                if r.status_code == 200:
                    print(f"SUCCESS! Model: {m} -> 200 OK: {r.text[:100]}")
                else:
                    print(f"Model: {m:25} -> Status: {r.status_code}")
            except Exception as e:
                print(f"Model: {m:25} -> Error: {e}")

if __name__ == '__main__':
    asyncio.run(test())
