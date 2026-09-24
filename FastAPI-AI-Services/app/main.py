from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.utils.logger import logger
from app.utils.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    global_exception_handler,
)
from app.api.router import api_v1_router
from app.db.connection import db_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Lifecycle
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode...")
    await db_manager.connect()
    
    port = settings.PORT
    logger.info(f"Server running locally at:  http://localhost:{port} or http://127.0.0.1:{port}")
    logger.info(f"Interactive Swagger Docs: http://localhost:{port}/docs")
    logger.info(f"ReDoc Documentation:     http://localhost:{port}/redoc")
    yield
    # Shutdown Lifecycle
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await db_manager.disconnect()

def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="FastAPI AI Microservice for GitHub Project Monitoring Agent.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Configure CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    # Register Routers
    app.include_router(api_v1_router)

    # Direct Root & Health Endpoints
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "service": settings.APP_NAME,
            "status": "online",
            "environment": settings.ENVIRONMENT,
            "documentation": "/docs"
        }

    @app.get("/health", tags=["Health"])
    async def health():
        return {
            "status": "ok",
            "service": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0"
        }

    # Direct /api/chat alias route
    from app.schemas.chat import ChatPromptRequest, ChatResponseEnvelope
    from app.services.chatbot_service import chatbot_service
    from app.utils.auth import get_current_user, AuthenticatedUser
    from fastapi import Depends

    @app.post("/api/chat", response_model=ChatResponseEnvelope, tags=["Chatbot"])
    async def direct_api_chat(
        request: ChatPromptRequest,
        current_user: AuthenticatedUser = Depends(get_current_user)
    ):
        return await chatbot_service.process_chat_message(request, current_user)

    return app

app = create_application()
