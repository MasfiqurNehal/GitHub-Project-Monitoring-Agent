"""
Test script for TopicGuard Service.
Validates the 8 allowed technical question categories vs disallowed off-topic questions.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.services.topic_guard import topic_guard

def test_topic_guard():
    print("=== Testing TopicGuard Scope Validation ===")

    allowed_test_cases = [
        # 1. GitMonitor-related
        ("How does GitMonitor track repository code churn?", "GitMonitor Domain"),
        ("What features are available on the GitMonitor dashboard?", "GitMonitor Domain"),

        # 2. Programming
        ("Write a Python function to sort a list using quicksort", "Programming"),
        ("How do interfaces work in TypeScript?", "Programming"),

        # 3. Software engineering
        ("What are the core principles of SOLID software architecture?", "Software Engineering"),
        ("How to write effective unit tests and mock dependencies?", "Software Engineering"),

        # 4. IT/computer
        ("Explain how TCP/IP handshakes work in computer networking", "IT/Computer Science"),
        ("What is the difference between a process and a thread in OS?", "IT/Computer Science"),

        # 5. Git/GitHub
        ("How to resolve a git merge conflict step-by-step?", "Git/GitHub"),
        ("Explain GitHub Actions workflow trigger syntax", "Git/GitHub"),

        # 6. API
        ("What is the difference between REST and GraphQL APIs?", "API"),
        ("How to handle CORS headers in HTTP requests?", "API"),

        # 7. Database
        ("Write a SQL query to join users and orders tables", "Database"),
        ("How does indexing improve PostgreSQL query performance?", "Database"),

        # 8. Cloud/devops/development
        ("How to write a multi-stage Dockerfile for Node.js?", "Cloud/DevOps"),
        ("What is Kubernetes pod auto-scaling?", "Cloud/DevOps")
    ]

    disallowed_test_cases = [
        "Give me a recipe for baking a chocolate cake",
        "Who won the FIFA World Cup yesterday?",
        "What is today's weather forecast in London?",
        "Which movie is best to watch this weekend?",
        "Give me relationship advice about my girlfriend",
        "What is my daily horoscope for Gemini?"
    ]

    print("\n--- Testing Allowed Categories (1 to 8) ---")
    all_allowed_passed = True
    for prompt, category in allowed_test_cases:
        res = topic_guard.validate_prompt(prompt)
        status = "[OK]" if res.is_allowed else "[FAIL]"
        print(f"{status} [{category}] Query: '{prompt[:45]}...' -> Allowed: {res.is_allowed}")
        if not res.is_allowed:
            all_allowed_passed = False

    print("\n--- Testing Disallowed Off-Topic Categories ---")
    all_disallowed_passed = True
    for prompt in disallowed_test_cases:
        res = topic_guard.validate_prompt(prompt)
        status = "[OK]" if not res.is_allowed else "[FAIL]"
        print(f"{status} Query: '{prompt[:45]}...' -> Refused: {not res.is_allowed}")
        if res.is_allowed:
            all_disallowed_passed = False
            print(f"   Refusal Message Preview: {res.refusal_message[:60]}...")

    if all_allowed_passed and all_disallowed_passed:
        print("\n[OK] TopicGuard question handling rules verified successfully!")
    else:
        print("\n[FAIL] Some TopicGuard test cases failed.")

if __name__ == "__main__":
    test_topic_guard()
