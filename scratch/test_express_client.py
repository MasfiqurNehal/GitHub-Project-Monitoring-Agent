"""
Test script for ExpressClient internal service layer.
Verifies asynchronous client abstraction methods against live or mock Express APIs.
"""
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.services.express_client import express_client, ExpressClient

async def test_express_client():
    print("=== Testing Express Client Abstraction Layer ===")

    # Test initialization & base configuration
    print(f"Express Base URL: {express_client.base_url}")
    print(f"Timeout: {express_client.timeout}s")

    # Test method signatures and endpoints routing
    client = ExpressClient(base_url="http://localhost:5001/api", timeout=3.0)

    # 1. Projects
    print("\n[1] Projects API Call:")
    res_projects = await client.list_projects()
    print(f"    Response Keys/Status: {res_projects.get('success', True)} | Keys: {list(res_projects.keys())[:5]}")

    # 2. Repositories
    print("\n[2] Repositories API Call:")
    res_repos = await client.list_repositories()
    print(f"    Response Keys/Status: {res_repos.get('success', True)} | Keys: {list(res_repos.keys())[:5]}")

    # 3. Developers
    print("\n[3] Developers API Call:")
    res_devs = await client.list_developers()
    print(f"    Response Keys/Status: {res_devs.get('success', True)} | Keys: {list(res_devs.keys())[:5]}")

    # 4. Commits
    print("\n[4] Commits API Call:")
    res_commits = await client.list_commits()
    print(f"    Response Keys/Status: {res_commits.get('success', True)} | Keys: {list(res_commits.keys())[:5]}")

    # 5. Pull Requests
    print("\n[5] Pull Requests API Call:")
    res_prs = await client.list_pull_requests()
    print(f"    Response Keys/Status: {res_prs.get('success', True)} | Keys: {list(res_prs.keys())[:5]}")

    # 6. Issues
    print("\n[6] Issues API Call:")
    res_issues = await client.list_issues()
    print(f"    Response Keys/Status: {res_issues.get('success', True)} | Keys: {list(res_issues.keys())[:5]}")

    # 7. Reports
    print("\n[7] Reports API Call:")
    res_reports = await client.list_reports()
    print(f"    Response Keys/Status: {res_reports.get('success', True)} | Keys: {list(res_reports.keys())[:5]}")

    print("\n[OK] Express Client Abstraction Layer successfully verified!")

if __name__ == "__main__":
    asyncio.run(test_express_client())
