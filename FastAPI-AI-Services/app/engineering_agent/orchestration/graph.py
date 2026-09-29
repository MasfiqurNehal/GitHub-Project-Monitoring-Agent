"""
StateGraph Implementation for Engineering AI Agent Orchestration.
Follows the LangGraph DAG architectural pattern with asynchronous node execution,
conditional edge routing, cycle guardrails, and error recovery.
"""
import time
import inspect
from typing import Dict, Any, List, Optional, Callable, Awaitable, Union
from app.engineering_agent.orchestration.state import GraphState
from app.utils.logger import logger

# Special graph termination constants
END = "__END__"
START = "__START__"

NodeCallable = Callable[[GraphState], Union[GraphState, Awaitable[GraphState]]]
RouterCallable = Callable[[GraphState], Union[str, Awaitable[str]]]


class CompiledStateGraph:
    """Compiled, executable state machine graph."""

    def __init__(
        self,
        nodes: Dict[str, NodeCallable],
        edges: Dict[str, str],
        conditional_edges: Dict[str, tuple[RouterCallable, Dict[str, str]]],
        entry_point: str,
        max_iterations: int = 25
    ):
        self.nodes = nodes
        self.edges = edges
        self.conditional_edges = conditional_edges
        self.entry_point = entry_point
        self.max_iterations = max_iterations

    async def ainvoke(self, initial_state: GraphState) -> GraphState:
        """
        Asynchronously invoke and traverse the compiled state graph.
        """
        state = dict(initial_state)
        current_node = self.entry_point
        iterations = 0

        logger.info(f"[StateGraph] Starting execution from entry node '{current_node}'")

        while current_node != END and iterations < self.max_iterations:
            iterations += 1
            if current_node not in self.nodes:
                err_msg = f"Graph execution error: Node '{current_node}' not registered in graph."
                logger.error(f"[StateGraph] {err_msg}")
                state["error"] = err_msg
                break

            node_fn = self.nodes[current_node]
            t0 = time.time()
            logger.debug(f"[StateGraph] Executing node: '{current_node}' (iteration {iterations})")

            # Execute node with error recovery
            try:
                if inspect.iscoroutinefunction(node_fn) or inspect.isawaitable(node_fn):
                    new_state = await node_fn(state)
                else:
                    new_state = node_fn(state)

                if isinstance(new_state, dict):
                    state.update(new_state)

                dur_ms = (time.time() - t0) * 1000.0
                step_log = f"Node '{current_node}' completed in {dur_ms:.1f}ms"
                if "execution_steps" not in state:
                    state["execution_steps"] = []
                state["execution_steps"].append(step_log)

            except Exception as e:
                dur_ms = (time.time() - t0) * 1000.0
                err_msg = f"Exception in node '{current_node}': {str(e)}"
                logger.error(f"[StateGraph] {err_msg}", exc_info=True)
                state["error"] = err_msg
                if "execution_steps" not in state:
                    state["execution_steps"] = []
                state["execution_steps"].append(f"Node '{current_node}' failed: {str(e)}")

            # Route to next node
            if current_node in self.conditional_edges:
                router_fn, path_map = self.conditional_edges[current_node]
                try:
                    if inspect.iscoroutinefunction(router_fn):
                        route_key = await router_fn(state)
                    else:
                        route_key = router_fn(state)

                    next_node = path_map.get(route_key, END)
                    logger.debug(f"[StateGraph] Conditional route from '{current_node}' via '{route_key}' -> '{next_node}'")
                    current_node = next_node
                except Exception as e:
                    logger.error(f"[StateGraph] Error in conditional router for '{current_node}': {str(e)}")
                    current_node = END
            elif current_node in self.edges:
                next_node = self.edges[current_node]
                logger.debug(f"[StateGraph] Static edge from '{current_node}' -> '{next_node}'")
                current_node = next_node
            else:
                # No outgoing edge; terminate execution
                logger.debug(f"[StateGraph] No outgoing edges from '{current_node}', terminating at END.")
                current_node = END

        if iterations >= self.max_iterations:
            logger.warning(f"[StateGraph] Max iterations ({self.max_iterations}) reached. Halting execution.")

        logger.info(f"[StateGraph] Execution finished in {iterations} iterations.")
        return state


class StateGraph:
    """Builder class for creating and compiling an Engineering State Graph."""

    def __init__(self, state_schema=GraphState):
        self.state_schema = state_schema
        self.nodes: Dict[str, NodeCallable] = {}
        self.edges: Dict[str, str] = {}
        self.conditional_edges: Dict[str, tuple[RouterCallable, Dict[str, str]]] = {}
        self.entry_point: Optional[str] = None

    def add_node(self, name: str, node: NodeCallable) -> "StateGraph":
        """Add a processing node to the graph."""
        if name in self.nodes:
            raise ValueError(f"Node with name '{name}' already exists in graph.")
        self.nodes[name] = node
        return self

    def add_edge(self, start_key: str, end_key: str) -> "StateGraph":
        """Add a directed static edge between two nodes."""
        self.edges[start_key] = end_key
        return self

    def add_conditional_edges(
        self,
        source: str,
        path: RouterCallable,
        path_map: Dict[str, str]
    ) -> "StateGraph":
        """Add conditional branching from a source node."""
        self.conditional_edges[source] = (path, path_map)
        return self

    def set_entry_point(self, key: str) -> "StateGraph":
        """Set the starting node of the graph."""
        self.entry_point = key
        return self

    def compile(self, max_iterations: int = 25) -> CompiledStateGraph:
        """Validate and compile the graph into an executable state machine."""
        if not self.entry_point:
            raise ValueError("Cannot compile graph without an entry point. Call set_entry_point().")
        if self.entry_point not in self.nodes:
            raise ValueError(f"Entry point '{self.entry_point}' not found in registered nodes.")

        return CompiledStateGraph(
            nodes=self.nodes,
            edges=self.edges,
            conditional_edges=self.conditional_edges,
            entry_point=self.entry_point,
            max_iterations=max_iterations
        )
