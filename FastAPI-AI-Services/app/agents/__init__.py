"""
Agents Package for GitMonitor FastAPI AI Microservice.
Provides Agent Detection, Handoff Routing, and future Autonomous Engineering Agent modules.
"""
from app.agents.detector import agent_detector, EngineeringAgentDetector, AgentDetectionResult

__all__ = ["agent_detector", "EngineeringAgentDetector", "AgentDetectionResult"]
