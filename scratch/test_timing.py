import time
import httpx
import asyncio

async def test():
    print("Testing GET http://localhost:5001/api/dashboard/overview ...")
    start = time.time()
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get('http://localhost:5001/api/dashboard/overview')
        elapsed = time.time() - start
        print(f"Status: {r.status_code}")
        print(f"Time elapsed: {elapsed:.2f} seconds ({elapsed*1000:.0f} ms)")
        if r.status_code == 200:
            data = r.json().get('data', {})
            print(f"KPI Projects: {data.get('kpi', {}).get('totalProjects')}, Commits: {data.get('kpi', {}).get('totalCommits')}")

if __name__ == '__main__':
    asyncio.run(test())
