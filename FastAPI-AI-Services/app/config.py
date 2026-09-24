import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "GitHub Project Monitoring FastAPI AI Microservice"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    BACKEND_URL: str = "http://localhost:5001/api"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5001",
    ]
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: str = ""

    # AI Provider Settings
    AI_PROVIDER: str = "betopia"
    AI_BASE_URL: str = "https://api.betopia.ai/v1"
    AI_API_KEY: str = ""
    AI_MODEL: str = "auto"
    AI_TIMEOUT_SECONDS: float = 30.0

    # Security & Auth Settings
    JWT_SECRET: str = "super-secret-jwt-key-github-monitoring-agent"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
