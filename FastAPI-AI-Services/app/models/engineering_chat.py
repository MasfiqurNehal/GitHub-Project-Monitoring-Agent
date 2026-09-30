"""
SQLAlchemy Database ORM Models for Engineering AI Agent Conversations & Messages.
Mapped to Neon PostgreSQL database tables (engineering_conversations, engineering_messages).
Enforces SaaS Multi-Tenant Isolation, User Scoping, and Rich Multi-Agent Telemetry Persistence.
"""
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship

from app.db.connection import Base


class EngineeringConversationModel(Base):
    """SQLAlchemy ORM model for Engineering AI Agent conversation sessions."""
    __tablename__ = "engineering_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Engineering Analysis")
    project_id = Column(String(36), nullable=True, index=True)
    repository_id = Column(String(36), nullable=True, index=True)
    developer_id = Column(String(36), nullable=True, index=True)
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationship to messages
    messages = relationship(
        "EngineeringMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="EngineeringMessageModel.created_at"
    )

    def to_dict(self) -> Dict[str, Any]:
        msg_count = 0
        try:
            if hasattr(self, "messages") and self.messages is not None:
                msg_count = len(self.messages)
        except Exception:
            msg_count = 0

        return {
            "id": self.id,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "title": self.title,
            "project_id": self.project_id,
            "repository_id": self.repository_id,
            "developer_id": self.developer_id,
            "is_pinned": bool(self.is_pinned) if self.is_pinned is not None else False,
            "is_deleted": bool(self.is_deleted) if self.is_deleted is not None else False,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "messages_count": msg_count
        }


class EngineeringMessageModel(Base):
    """SQLAlchemy ORM model for individual multi-agent messages in an engineering conversation."""
    __tablename__ = "engineering_messages"
    __table_args__ = (
        CheckConstraint(
            "sender IN ('user', 'assistant', 'system')",
            name="chk_eng_msg_sender"
        ),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(
        String(36),
        ForeignKey("engineering_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    organization_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # 'user' | 'assistant' | 'system'
    content = Column(Text, nullable=False)
    detected_intent = Column(String(100), nullable=True)
    selected_agent = Column(String(100), nullable=True)
    metrics_json = Column(JSON, nullable=True)
    artifacts_json = Column(JSON, nullable=True)
    actions_json = Column(JSON, nullable=True)
    tools_executed_json = Column(JSON, nullable=True)
    execution_time_ms = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    # Relationship to conversation
    conversation = relationship("EngineeringConversationModel", back_populates="messages")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "organization_id": self.organization_id,
            "user_id": self.user_id,
            "sender": self.sender,
            "content": self.content,
            "detected_intent": self.detected_intent,
            "selected_agent": self.selected_agent,
            "metrics": self.metrics_json,
            "artifacts": self.artifacts_json,
            "actions": self.actions_json,
            "tools_executed": self.tools_executed_json,
            "execution_time_ms": float(self.execution_time_ms) if self.execution_time_ms is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
