"""
Authentication & JWT Verification Middleware for FastAPI AI Services.
Integrates directly with the existing Express.js Backend JWT token system.
"""
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.logger import logger

security_bearer = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    """Pydantic model representing an authenticated SaaS user."""
    id: str = Field(..., description="Authenticated user ID")
    email: str = Field(..., description="User email address")
    name: Optional[str] = Field(None, description="User full name")
    role: str = Field("admin", description="User authorization role")
    organization_id: Optional[str] = Field(None, description="SaaS organization tenant ID")
    token: Optional[str] = Field(None, description="Raw Bearer JWT token")

def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT access token issued by the Express.js auth service.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True}
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("[AUTH] Token verification failed: Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as err:
        logger.warning(f"[AUTH] Token verification failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature or payload.",
            headers={"WWW-Authenticate": "Bearer"}
        )


def verify_authenticated_user(token: str) -> AuthenticatedUser:
    """Extract and validate the AuthenticatedUser from raw JWT string."""
    payload = decode_jwt_token(token)

    # Extract user ID (supports 'id', 'user_id', 'userId', or 'sub')
    user_id = payload.get("id") or payload.get("user_id") or payload.get("userId") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing valid user identifier.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    email = payload.get("email") or f"{user_id}@user.local"
    name = payload.get("name") or payload.get("email", "").split("@")[0] or "User"
    role = payload.get("role") or "user"
    organization_id = payload.get("organizationId") or payload.get("organization_id")

    return AuthenticatedUser(
        id=user_id,
        email=email,
        name=name,
        role=role,
        organization_id=organization_id,
        token=token
    )



async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> AuthenticatedUser:
    """
    FastAPI Dependency: Requires a valid Bearer token in the Authorization header.
    Returns the authenticated user details.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or invalid header scheme.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return verify_authenticated_user(credentials.credentials)


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> Optional[AuthenticatedUser]:
    """
    FastAPI Dependency: Optionally extracts current user if token is present.
    Returns None if no token provided.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        return verify_authenticated_user(credentials.credentials)
    except HTTPException:
        return None
