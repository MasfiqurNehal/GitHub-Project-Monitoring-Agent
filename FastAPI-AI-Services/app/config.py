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

    # AI Provider Settings (Chatbot)
    AI_PROVIDER: str = "betopia"
    AI_BASE_URL: str = "https://api.betopia.ai/v1"
    AI_API_KEY: str = ""
    AI_MODEL: str = "auto"
    AI_TIMEOUT_SECONDS: float = 30.0

    # ============================================================
    # ENGINEERING AGENT LLM CONFIGURATION (Strictly Isolated)
    # ============================================================
    ENGINEERING_AGENT_LLM_PROVIDER: str = ""
    ENGINEERING_AGENT_LLM_BASE_URL: str = ""
    ENGINEERING_AGENT_LLM_API_KEY: str = ""
    ENGINEERING_AGENT_LLM_MODEL: str = ""
    ENGINEERING_AGENT_LLM_TIMEOUT: float = 45.0
    ENGINEERING_AGENT_LLM_MAX_RETRIES: int = 2

    # Security & Auth Settings
    JWT_SECRET: str = "super-secret-jwt-key-github-monitoring-agent"
    JWT_ALGORITHM: str = "HS256"

    # Context Window & History Limits
    MAX_CONTEXT_MESSAGES: int = 10
    MAX_CONTEXT_TOKENS: int = 3000
    SYSTEM_PROMPT: str = (
        "You are GitMonitor AI Assistant, an expert engineering analytics assistant for GitHub projects. "
        "Help users analyze repositories, interpret commit/PR activity, summarize trends, spot potential issues, "
        "and extract actionable insights from Git data. Maintain context across multi-turn conversations."
    )

    # RAG Knowledge Base Architecture Settings
    EMBEDDING_PROVIDER: str = "tfidf"  # Options: 'tfidf', 'api', 'mock'
    VECTOR_STORE_TYPE: str = "memory"  # Options: 'memory'
    RAG_SIMILARITY_THRESHOLD: float = 0.35  # Threshold to distinguish GitMonitor domain queries vs general AI knowledge
    RAG_TOP_K: int = 2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
