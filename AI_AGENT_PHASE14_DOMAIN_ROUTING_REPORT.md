# Phase 14: General IT / Software Question Routing Report

**Date:** 2026-09-29  
**Status:** Completed  
**Repository:** `FastAPI-AI-Services` / `GitHub-Project-Monitoring-Agent`  

---

## 1. Executive Summary

Phase 14 enhances the Engineering AI Agent's cognitive domain routing. The agent now accurately and cleanly differentiates among three distinct types of user queries:

1. **Category A (GitHub / Application Questions):** Queries requesting live or synchronized repository telemetry, developer velocity, code churn, and project metrics.  
   ➔ *Action:* Handled via deterministic and tool-backed specialist workflows (`RepositoryAgent`, `CommitAgent`, `DeveloperAgent`, `PullRequestAgent`, `IssueAgent`, `ProjectAgent`, `AnalyticsAgent`, `MultiAgentComposite`).

2. **Category B (Engineering / IT / Hardware Knowledge Questions):** Questions on computer science theory, software design patterns, system architectures, hardware specifications, gaming processors, and computing concepts (e.g., "*What is quantum computing?*", "*What processor is good for gaming?*").  
   ➔ *Action:* Handled via the configured LLM parametric knowledge capability (`GeneralITKnowledgeAgent`), providing clear, technical, educational explanations without hallucinating database rows or executing unnecessary backend API calls.

3. **Category C (Non-IT / Out-of-Domain General Questions):** Inquiries about tourism, recipes, weather, sports, movies, or general non-technical topics (e.g., "*Which tourist place is good?*", "*Recommend a chocolate cake recipe*").  
   ➔ *Action:* Politely declined by the guardrail system (`Guardrail_Reject`), clearly communicating that the agent is dedicated to software engineering, computer systems, and GitHub analytics, while offering relevant navigation shortcuts.

---

## 2. 3-Way Domain Classification Matrix

| Domain Category | User Query Examples | Routing Path | Tools / API Invocation | Response Generation Behavior |
|:---|:---|:---|:---|:---|
| **Category A: GitHub / Application Telemetry** | *"How many commits did Nehal make?"*<br>*"Who committed in the last 5 minutes?"*<br>*"Show the latest commit in Nexora AI"*<br>*"What's the current number of open PRs?"* | `DomainRouter` ➔ `IntentRouter` ➔ Telemetry Specialist Agents ➔ `ResponseGenerator` | **Yes** (Express Read APIs, Neon Synced DB, Live GitHub API) | Strictly grounded in verified JSON data; zero data fabrication. |
| **Category B: Engineering / IT Knowledge** | *"What is quantum computing?"*<br>*"What processor is good for gaming?"*<br>*"Explain SQL vs NoSQL"*<br>*"How does garbage collection work in V8?"* | `DomainRouter` ➔ `GeneralITKnowledgeAgent` ➔ `ResponseGenerator` | **No** (Uses LLM parametric engineering capability) | Comprehensive technical explanation with sections, comparisons, and architecture guidelines. |
| **Category C: Non-IT General Questions** | *"Which tourist place is good?"*<br>*"How to bake a chocolate cake?"*<br>*"Who won the World Cup?"*<br>*"What's the weather in Paris?"* | `DomainRouter` ➔ `guardrail_reject_node` ➔ Graph `END` | **No** (No tool or database access) | Polite rejection explaining the agent's technical focus + quick exploration buttons. |

---

## 3. Architecture & Core Components Implemented

### 3.1 Domain Router (`domain_router.py`)
Located at [`FastAPI-AI-Services/app/engineering_agent/router/domain_router.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/router/domain_router.py):
- Categorizes prompts into `QuestionDomainCategory.GITHUB_APPLICATION`, `QuestionDomainCategory.ENGINEERING_IT_KNOWLEDGE`, and `QuestionDomainCategory.NON_IT_GENERAL`.
- Provides structured decision metadata (`requires_tools`, `requires_guardrail`, `matched_intent`, `confidence`).

### 3.2 General IT & Software Engineering Specialist Agent (`general_it_agent.py`)
Located at [`FastAPI-AI-Services/app/engineering_agent/agents/general_it_agent.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/app/engineering_agent/agents/general_it_agent.py):
- Subclasses `BaseSpecialistAgent` and registered in `SpecialistAgentRegistry`.
- Employs a systems architect system prompt (`GENERAL_IT_SYSTEM_PROMPT`).
- Answers technical questions with zero hallucination of private repositories.
- Explicitly labels data provenance as `LLM Engineering Knowledge (Parametric)`.

### 3.3 StateGraph Orchestration Updates (`nodes.py` & `engine.py`)
- **`guardrail_reject_node`:**
  ```markdown
  👋 I am the GitMonitor Engineering Intelligence Agent, focused exclusively on
  software engineering, computer systems, IT architectures, and GitHub repository monitoring.

  I am unable to answer general lifestyle, tourism, or non-technical questions.
  How can I assist you with your repositories, code architectures, hardware systems, or team metrics today?
  ```
- **`general_it_knowledge_node`:** Executes `general_it_agent.analyze()` and forwards knowledge payloads to `aggregate_results` ➔ `generate_response`.
- **`route_after_intent`:** Maps `IntentCategory.GENERAL_ENGINEERING_QA` directly to `general_it_knowledge`.

### 3.4 Anti-Hallucination & Response Generation Updates (`generator.py`)
- Recognizes Category B responses to prevent false "empty database telemetry" warnings on conceptual IT questions.

---

## 4. Verification and Test Results

The test suite in [`FastAPI-AI-Services/tests/test_phase14_domain_routing.py`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/FastAPI-AI-Services/tests/test_phase14_domain_routing.py) validates:

1. **Category A Classification:** Verified for commit inquiries, live telemetry, PR review turnaround, and developer velocity.
2. **Category B Classification:** Verified for quantum computing, gaming processors, database comparisons, garbage collection, and microservice patterns.
3. **Category C Classification:** Verified for tourism, recipes, sports, weather, and general lifestyle inquiries.
4. **General IT Agent Execution:** Verified zero tool calls and proper LLM knowledge attribution.
5. **End-to-End Guardrail Rejection:** Verified that Category C queries receive polite focus rejection.
6. **End-to-End IT Knowledge Synthesis:** Verified complete answers for Category B queries without empty data errors.

### Complete Test Discovery Run:
```bash
& "C:\Users\Nehal\AppData\Local\Python\bin\python.exe" -m unittest discover tests
----------------------------------------------------------------------
Ran 127 tests in 19.245s

OK (127/127 passing across all phases)
```

---

## 5. Summary of Compliance with Requirements
- [x] Distinguishes Category A (GitHub/application data) ➔ tools / database.
- [x] Distinguishes Category B (Engineering/IT knowledge) ➔ configured LLM knowledge capability.
- [x] Distinguishes Category C (Non-IT/general questions) ➔ polite focus guardrail.
- [x] No premature RAG ingestion system introduced.
- [x] No external search APIs invoked.
- [x] Comprehensive test suite with 100% pass rate.
- [x] Created `AI_AGENT_PHASE14_DOMAIN_ROUTING_REPORT.md`.
