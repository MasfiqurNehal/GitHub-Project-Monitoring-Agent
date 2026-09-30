"""
Neon PostgreSQL Async Database Connection Manager using SQLAlchemy & asyncpg.
"""
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings
from app.utils.logger import logger

Base = declarative_base()

def get_async_db_url(url: str) -> str:
    """Ensure database connection string uses asyncpg driver and compatible SSL query params."""
    if not url:
        return ""
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Convert sslmode to ssl for asyncpg
    if "sslmode=require" in url:
        url = url.replace("sslmode=require", "ssl=require")
    if "channel_binding=" in url:
        url = url.replace("&channel_binding=require", "").replace("channel_binding=require&", "").replace("channel_binding=require", "")

    return url

class DatabaseManager:
    def __init__(self):
        self.raw_db_url = settings.DATABASE_URL
        self.async_db_url = get_async_db_url(self.raw_db_url)
        self.engine = None
        self.session_factory = None

    async def connect(self):
        if not self.async_db_url:
            logger.warning("DATABASE_URL is not configured. Database disabled.")
            return

        logger.info("Initializing Neon PostgreSQL Async Connection Engine...")
        self.engine = create_async_engine(
            self.async_db_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        self.session_factory = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        logger.info("Neon PostgreSQL Async Connection Engine initialized successfully.")

    async def disconnect(self):
        if self.engine:
            logger.info("Closing Neon PostgreSQL Async Connection Engine...")
            await self.engine.dispose()
            logger.info("Neon PostgreSQL Async Connection Engine closed.")

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        if not self.session_factory:
            raise RuntimeError("Database session factory is not initialized.")
        async with self.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

db_manager = DatabaseManager()
