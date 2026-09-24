from fastapi import APIRouter
from app.api.v1.health import health_router
from app.api.v1.chatbot import chatbot_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(chatbot_router)
