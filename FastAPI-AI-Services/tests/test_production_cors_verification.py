import os
import sys

sys.path.insert(0, os.path.abspath("."))

# Test with simulated Render environment variable
os.environ["FRONTEND_URL"] = "https://gitmonitor.masfiqurnehal.com/"

from app.config import Settings
test_settings = Settings()

print("=====================================================")
print("TESTING FASTAPI AI MICROSERVICE CORS CONFIGURATION")
print("=====================================================")
print("FRONTEND_URL configured:", test_settings.FRONTEND_URL)
print("CORS_ORIGINS count:", len(test_settings.CORS_ORIGINS))
print("CORS_ORIGINS:", test_settings.CORS_ORIGINS)

assert "https://gitmonitor.masfiqurnehal.com" in test_settings.CORS_ORIGINS
assert "https://git-hub-project-monitoring-agent.vercel.app" in test_settings.CORS_ORIGINS

from app.main import create_application
from starlette.testclient import TestClient

app = create_application()
client = TestClient(app)

endpoints_to_test = [
    "/api/v1/chatbot/chat",
    "/api/v1/engineering-agent/chat",
    "/api/v1/engineering-agent/chat/stream",
    "/api/v1/chatbot/conversations"
]

origins_to_test = [
    ("https://gitmonitor.masfiqurnehal.com", True),
    ("https://git-hub-project-monitoring-agent.vercel.app", True),
    ("http://localhost:3000", True),
    ("http://localhost:5173", True),
    ("https://preview-deploy-456.vercel.app", True),
    ("https://subdomain.masfiqurnehal.com", True),
    ("https://malicious-site.com", False)
]

total_tests = 0
passed_tests = 0

for endpoint in endpoints_to_test:
    print(f"\n--- Testing Endpoint: {endpoint} ---")
    for origin, expected_allowed in origins_to_test:
        total_tests += 1
        res = client.options(
            endpoint,
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type"
            }
        )
        acao = res.headers.get("access-control-allow-origin")
        acac = res.headers.get("access-control-allow-credentials")
        allowed = (res.status_code == 200 and acao == origin)
        test_passed = (allowed == expected_allowed)
        
        status_label = f"{res.status_code}"
        print(f"  Origin: {origin}")
        print(f"    Status: {status_label} | ACAO: {acao or 'None'} | ACAC: {acac or 'None'}")
        print(f"    Verdict: {'[PASS]' if test_passed else '[FAIL]'} (Expected {'ALLOWED' if expected_allowed else 'BLOCKED'})")
        
        if test_passed:
            passed_tests += 1

print("\n=====================================================")
print(f"Summary: {passed_tests} / {total_tests} FastAPI CORS tests passed.")
print("=====================================================")

if passed_tests != total_tests:
    sys.exit(1)
