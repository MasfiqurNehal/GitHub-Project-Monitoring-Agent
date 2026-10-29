import os
from typing import List, Union, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "GitHub Project Monitoring FastAPI AI Microservice"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    BACKEND_URL: str = "https://github-project-monitoring-agent.onrender.com/api" if (os.getenv("RENDER") or os.getenv("ENVIRONMENT") == "production") else "http://localhost:5001/api"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5001",
        "https://git-hub-project-monitoring-agent.vercel.app",
        "https://github-project-monitoring-agent.vercel.app",
        "https://github-project-monitoring-agent.onrender.com",
    ]

    @field_validator("BACKEND_URL", mode="before")
    @classmethod
    def assemble_backend_url(cls, v: Any) -> str:
        default_url = "https://github-project-monitoring-agent.onrender.com/api" if (os.getenv("RENDER") or os.getenv("ENVIRONMENT") == "production") else "http://localhost:5001/api"
        if not v or not isinstance(v, str) or not v.strip():
            return default_url
        clean_url = v.strip().rstrip("/")
        if not clean_url.endswith("/api"):
            clean_url = f"{clean_url}/api"
        return clean_url

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        default_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5001",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5001",
            "https://git-hub-project-monitoring-agent.vercel.app",
            "https://github-project-monitoring-agent.vercel.app",
            "https://github-project-monitoring-agent.onrender.com",
        ]
        if not v:
            return default_origins
        if isinstance(v, str):
            if v.strip().startswith("[") and v.strip().endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return list(set(default_origins + [str(i).strip().rstrip("/") for i in parsed if str(i).strip()]))
                except Exception:
                    pass
            origins = [item.strip().rstrip("/") for item in v.split(",") if item.strip()]
            return list(set(default_origins + origins))
        elif isinstance(v, (list, tuple, set)):
            return list(set(default_origins + [str(item).strip().rstrip("/") for item in v if str(item).strip()]))
        return default_origins
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: str = ""

    # AI Provider Settings (Chatbot)
    AI_PROVIDER: str = "gemini"
    AI_BASE_URL: str = "https://generativelanguage.googleapis.com"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-2.5-flash"
    AI_TIMEOUT_SECONDS: float = 30.0

    # ============================================================
    # ENGINEERING AGENT LLM CONFIGURATION (Strictly Isolated)
    # ============================================================
    ENGINEERING_AGENT_LLM_PROVIDER: str = "gemini"
    ENGINEERING_AGENT_LLM_BASE_URL: str = "https://generativelanguage.googleapis.com"
    ENGINEERING_AGENT_LLM_API_KEY: str = ""
    ENGINEERING_AGENT_LLM_MODEL: str = "gemini-2.5-flash"
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
        "and extract actionable insights from Git data. Maintain context across multi-turn conversations. "
        "IMPORTANT: If the user provides unknown text, gibberish, typos, or unrecognizable words (e.g., 'asdfaw', 'qwerty', '!@#$'), "
        "do NOT assume they want to analyze a repository or demand a repository URL. Instead, politely state that the input "
        "was not understood, briefly state your capabilities, and provide 2-3 sample questions they can ask."
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
