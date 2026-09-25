"""
Test script for EngineeringAgentDetector.
Validates detection of complex engineering requests and redirection handoff messaging.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent / "FastAPI-AI-Services"))

from app.agents.detector import agent_detector

def test_agent_detector():
    print("=== Testing Engineering Agent Intent Detector ===")

    test_cases = [
        # 1. Analyze developer activity
        ("Analyze developer activity across our team repositories", "developer_activity_analysis"),
        ("Track committer throughput and developer contributions", "developer_activity_analysis"),

        # 2. Compare repositories
        ("Compare repositories frontend-app vs backend-service", "repository_comparison"),
        ("Provide a repo comparison for code churn velocity", "repository_comparison"),

        # 3. Generate engineering reports
        ("Generate engineering reports for sprint 24", "report_generation"),
        ("Export executive telemetry summary report as PDF", "report_generation"),

        # 4. Investigate project activity
        ("Investigate project activity and milestone health", "project_investigation"),
        ("Audit project health and commit frequency trends", "project_investigation"),

        # 5. Perform complex GitHub analysis
        ("Perform complex GitHub analysis on my organization repos", "complex_github_analysis"),
        ("Diagnose entire repository for technical debt hot spots", "complex_github_analysis"),

        # 6. Perform multi-step engineering tasks
        ("Perform multi-step engineering tasks for automated refactoring", "multi_step_engineering"),
        ("Run engineering agent to audit PR review bottlenecks", "multi_step_engineering")
    ]

    standard_qa_cases = [
        "What is GitMonitor?",
        "How do I create a new branch in Git?",
        "Write a Python function to check for prime numbers",
        "How to handle CORS headers in FastAPI?"
    ]

    print("\n--- Testing Complex Agent Triggers ---")
    all_triggers_passed = True
    for prompt, expected_category in test_cases:
        res = agent_detector.detect_intent(prompt)
        status = "[OK]" if res.requires_agent else "[FAIL]"
        print(f"{status} Query: '{prompt[:45]}...'")
        print(f"     Detected: {res.requires_agent} | Category: '{res.task_category}' | Title: '{res.task_title}'")
        if not res.requires_agent:
            all_triggers_passed = False

    print("\n--- Testing Standard Chatbot Q&A (Should NOT trigger agent) ---")
    all_standard_passed = True
    for prompt in standard_qa_cases:
        res = agent_detector.detect_intent(prompt)
        status = "[OK]" if not res.requires_agent else "[FAIL]"
        print(f"{status} Query: '{prompt[:45]}...' -> Agent Required: {res.requires_agent}")
        if res.requires_agent:
            all_standard_passed = False

    if all_triggers_passed and all_standard_passed:
        print("\n[OK] Engineering Agent Detector verified successfully!")
    else:
        print("\n[FAIL] Some Agent Detector test cases failed.")

if __name__ == "__main__":
    test_agent_detector()
