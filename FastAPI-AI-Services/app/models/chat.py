"""
SQLAlchemy Database ORM Models for Chatbot Conversations & Messages.
Mapped to Neon PostgreSQL database tables (chatbot_conversations, chatbot_messages).
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.db.connection import Base

class ConversationModel(Base):
    """SQLAlchemy ORM model for chatbot conversation sessions."""
    __tablename__ = "chatbot_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    organization_id = Column(String(36), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationship to messages
    messages = relationship(
        "MessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="MessageModel.created_at"
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "title": self.title,
            "is_pinned": self.is_pinned,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "messages_count": len(self.messages) if self.messages else 0
        }


class MessageModel(Base):
    """SQLAlchemy ORM model for individual messages in a conversation."""
    __tablename__ = "chatbot_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(
        String(36),
        ForeignKey("chatbot_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender = Column(String(20), nullable=False)  # 'user' | 'assistant' | 'system'
    content = Column(Text, nullable=False)
    metrics_json = Column(JSON, nullable=True)
    sources_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    # Relationship to conversation
    conversation = relationship("ConversationModel", back_populates="messages")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender": self.sender,
            "content": self.content,
            "metrics": self.metrics_json,
            "sources": self.sources_json,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
