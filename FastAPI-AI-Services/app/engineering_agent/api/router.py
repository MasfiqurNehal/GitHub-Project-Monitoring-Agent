"""
Engineering AI Agent API Router.
Mounted under /api/v1/engineering-agent.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Security, Header
from fastapi.security import HTTPAuthorizationCredentials

from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.schemas.response import EngineeringAgentResponse
from app.engineering_agent.core.service import engineering_agent_service
from app.utils.auth import get_current_user, AuthenticatedUser, security_bearer

engineering_agent_router = APIRouter(prefix="/engineering-agent", tags=["Engineering AI Agent"])

@engineering_agent_router.post("/chat", response_model=EngineeringAgentResponse)
async def execute_engineering_agent(
    request: EngineeringAgentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> EngineeringAgentResponse:
    """
    Execute autonomous multi-step engineering analysis within the authenticated tenant context.
    Communicates with Express.js backend tools on behalf of the tenant.
    """
    raw_token = credentials.credentials if credentials else None
    return await engineering_agent_service.execute_agent(
        request=request,
        user=current_user,
        raw_token=raw_token
    )

@engineering_agent_router.get("/health")
async def engineering_agent_health():
    """Health check for Engineering AI Agent microservice."""
    return {
        "status": "online",
        "module": "engineering_agent",
        "version": "1.0.0",
        "capabilities": [
            "developer_activity_analysis",
            "repository_comparison",
            "report_generation",
            "project_investigation",
            "telemetry_aggregation"
        ]
    }
