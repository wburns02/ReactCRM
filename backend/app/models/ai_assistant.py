"""
AI Assistant Database Models

SQLAlchemy models for storing AI assistant conversations, messages, and context
"""

from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.database.base_class import Base


class AIConversation(Base):
    """
    AI Assistant Conversation Model

    Stores conversation metadata, settings, and overall conversation state
    """
    __tablename__ = "ai_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    title = Column(String(255), nullable=True)

    # Conversation settings
    settings = Column(JSON, nullable=False, default={})

    # Conversation status
    status = Column(String(50), default="active", nullable=False)  # active, paused, archived

    # Context snapshot
    context_snapshot = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_active_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")
    actions = relationship("AIAction", back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base):
    """
    AI Assistant Message Model

    Stores individual messages in conversations with metadata and processing info
    """
    __tablename__ = "ai_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("ai_conversations.id"), nullable=False, index=True)

    # Message content
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)

    # AI processing metadata
    confidence = Column(Float, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)

    # Message context
    message_metadata = Column(JSON, nullable=False, default={})

    # Intent and entities (from query processing)
    intent_type = Column(String(100), nullable=True)
    intent_domain = Column(String(100), nullable=True)
    intent_operation = Column(String(100), nullable=True)
    entities = Column(JSON, nullable=False, default=[])

    # Timestamp
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")
    actions = relationship("AIAction", back_populates="message", cascade="all, delete-orphan")


class AIAction(Base):
    """
    AI Assistant Action Model

    Stores suggested and executed actions with their results and audit trail
    """
    __tablename__ = "ai_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("ai_conversations.id"), nullable=False, index=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("ai_messages.id"), nullable=True, index=True)

    # Action definition
    type = Column(String(100), nullable=False)  # create, update, delete, query, navigation
    domain = Column(String(100), nullable=False)  # tickets, dispatch, customers, etc.
    operation = Column(String(100), nullable=False)  # specific operation name

    # Action payload and requirements
    payload = Column(JSON, nullable=False, default={})
    requirements = Column(JSON, nullable=False, default=[])

    # Execution status
    status = Column(String(50), default="pending", nullable=False)  # pending, executing, completed, failed, cancelled

    # Results and audit
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    executed_by = Column(String, nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)

    # Impact tracking
    confidence = Column(Float, nullable=False, default=0.0)
    estimated_impact = Column(JSON, nullable=False, default={})
    actual_impact = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    conversation = relationship("AIConversation", back_populates="actions")
    message = relationship("AIMessage", back_populates="actions")


class AIContext(Base):
    """
    AI Assistant Context Model

    Stores context snapshots for debugging and optimization
    """
    __tablename__ = "ai_contexts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)

    # Context data
    context_data = Column(JSON, nullable=False)

    # Context metadata
    page = Column(String(255), nullable=True)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)


class AIHealth(Base):
    """
    AI Assistant Health Monitoring Model

    Stores health check results and adapter status
    """
    __tablename__ = "ai_health"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Health check info
    domain = Column(String(100), nullable=False, index=True)  # tickets, dispatch, search, etc.
    status = Column(String(50), nullable=False)  # healthy, degraded, unavailable

    # Performance metrics
    response_time_ms = Column(Float, nullable=False, default=0.0)
    success_rate = Column(Float, nullable=False, default=0.0)

    # Error tracking
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, nullable=False, default=0)

    # Health details
    details = Column(JSON, nullable=False, default={})

    # Timestamp
    checked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AIAnalytics(Base):
    """
    AI Assistant Analytics Model

    Stores usage analytics and performance metrics
    """
    __tablename__ = "ai_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Event tracking
    event_type = Column(String(100), nullable=False, index=True)  # message_sent, action_executed, etc.
    user_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)

    # Event data
    event_data = Column(JSON, nullable=False, default={})

    # Performance metrics
    processing_time_ms = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    success = Column(Boolean, nullable=False, default=True)

    # Context
    domain = Column(String(100), nullable=True)
    intent_type = Column(String(100), nullable=True)

    # Timestamp
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# ===== INDEXES =====

"""
Additional indexes for performance optimization:

CREATE INDEX idx_ai_conversations_user_active ON ai_conversations(user_id, last_active_at);
CREATE INDEX idx_ai_messages_conversation_timestamp ON ai_messages(conversation_id, timestamp);
CREATE INDEX idx_ai_actions_status_domain ON ai_actions(status, domain);
CREATE INDEX idx_ai_health_domain_checked ON ai_health(domain, checked_at);
CREATE INDEX idx_ai_analytics_user_event_time ON ai_analytics(user_id, event_type, created_at);
"""