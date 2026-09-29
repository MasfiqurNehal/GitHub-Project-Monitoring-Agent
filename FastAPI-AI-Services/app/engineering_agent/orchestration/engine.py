"""
Engineering Agent Graph Engine.
Constructs and compiles the full DAG state machine.
"""
from app.engineering_agent.orchestration.graph import StateGraph, CompiledStateGraph, END
from app.engineering_agent.orchestration.nodes import (
    validate_context_node,
    route_intent_node,
    guardrail_reject_node,
    clarification_node,
    repository_node,
    commit_node,
    pull_request_node,
    issue_node,
    developer_node,
    project_node,
    analytics_node,
    multi_agent_composite_node,
    general_it_knowledge_node,
    aggregate_results_node,
    generate_response_node,
    route_after_intent
)


def build_engineering_agent_graph() -> CompiledStateGraph:
    """
    Constructs the Engineering Agent LangGraph state machine.
    """
    graph = StateGraph()

    # 1. Register all nodes
    graph.add_node("validate_context", validate_context_node)
    graph.add_node("route_intent", route_intent_node)
    graph.add_node("guardrail_reject", guardrail_reject_node)
    graph.add_node("clarification", clarification_node)
    graph.add_node("repository_agent", repository_node)
    graph.add_node("commit_agent", commit_node)
    graph.add_node("pull_request_agent", pull_request_node)
    graph.add_node("issue_agent", issue_node)
    graph.add_node("developer_agent", developer_node)
    graph.add_node("project_agent", project_node)
    graph.add_node("analytics_agent", analytics_node)
    graph.add_node("general_it_knowledge", general_it_knowledge_node)
    graph.add_node("multi_agent_composite", multi_agent_composite_node)
    graph.add_node("aggregate_results", aggregate_results_node)
    graph.add_node("generate_response", generate_response_node)

    # 2. Set entry point
    graph.set_entry_point("validate_context")

    # 3. Static edge: validate_context -> route_intent
    graph.add_edge("validate_context", "route_intent")

    # 4. Conditional routing after intent classification
    graph.add_conditional_edges(
        source="route_intent",
        path=route_after_intent,
        path_map={
            "guardrail": "guardrail_reject",
            "clarification": "clarification",
            "repository": "repository_agent",
            "commit": "commit_agent",
            "pull_request": "pull_request_agent",
            "issue": "issue_agent",
            "developer": "developer_agent",
            "project": "project_agent",
            "analytics": "analytics_agent",
            "general_it_knowledge": "general_it_knowledge",
            "multi_agent": "multi_agent_composite"
        }
    )

    # 5. Guardrail and Clarification lead to graph END
    graph.add_edge("guardrail_reject", END)
    graph.add_edge("clarification", END)

    # 6. Specialist agent nodes converge to aggregate_results
    graph.add_edge("repository_agent", "aggregate_results")
    graph.add_edge("commit_agent", "aggregate_results")
    graph.add_edge("pull_request_agent", "aggregate_results")
    graph.add_edge("issue_agent", "aggregate_results")
    graph.add_edge("developer_agent", "aggregate_results")
    graph.add_edge("project_agent", "aggregate_results")
    graph.add_edge("analytics_agent", "aggregate_results")
    graph.add_edge("general_it_knowledge", "aggregate_results")
    graph.add_edge("multi_agent_composite", "aggregate_results")

    # 7. Aggregate results -> Generate Response -> END
    graph.add_edge("aggregate_results", "generate_response")
    graph.add_edge("generate_response", END)

    return graph.compile()


compiled_engineering_graph = build_engineering_agent_graph()
