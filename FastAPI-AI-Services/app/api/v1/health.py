from fastapi import APIRouter
from app.schemas.chat import HealthCheckResponse
from app.config import settings

health_router = APIRouter(tags=["Health"])

@health_router.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse(
        status="ok",
        service=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
        version="1.0.0"
    )
