"""
Database models for RingCentral integration.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, String, Text, JSON, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base_class import Base


# ===== RINGCENTRAL ACCOUNT MODEL =====
class RCAccount(Base):
    """
    RingCentral OAuth account information per CRM user.
    Stores encrypted tokens and connection status.
    """
    __tablename__ = "rc_accounts"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Association with CRM user
    user_id = Column(String(255), nullable=False, unique=True, index=True)

    # OAuth credentials (will be encrypted)
    access_token = Column(Text, nullable=True)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Account information from RingCentral
    account_id = Column(String(255), nullable=True)  # RingCentral account ID
    extension_id = Column(String(255), nullable=True)  # User's extension ID
    extension_number = Column(String(50), nullable=True)  # Phone number
    account_name = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)  # RC user name
    email = Column(String(255), nullable=True)  # RC account email

    # Connection status
    is_connected = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    # Webhook subscription
    webhook_subscription_id = Column(String(255), nullable=True)
    webhook_expires_at = Column(DateTime(timezone=True), nullable=True)
    webhook_delivery_mode = Column(String(50), default="WebHook")

    # Configuration preferences
    auto_sync_enabled = Column(Boolean, default=True)
    sync_interval_minutes = Column(Integer, default=60)
    download_recordings = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    call_logs = relationship("CallLog", back_populates="rc_account", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<RCAccount(user_id={self.user_id}, extension={self.extension_number})>"


# ===== CALL LOG MODEL =====
class CallLog(Base):
    """
    Call records synchronized from RingCentral.
    Stores comprehensive call metadata and links to AI analysis.
    """
    __tablename__ = "call_logs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Association
    rc_account_id = Column(UUID(as_uuid=True), ForeignKey("rc_accounts.id"), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)

    # RingCentral identifiers
    rc_call_id = Column(String(255), unique=True, nullable=False, index=True)
    rc_session_id = Column(String(255), nullable=True, index=True)

    # Call participants
    from_number = Column(String(50), nullable=False)
    to_number = Column(String(50), nullable=False)
    from_name = Column(String(255), nullable=True)
    to_name = Column(String(255), nullable=True)

    # Call metadata
    direction = Column(String(20), nullable=False, index=True)  # 'inbound', 'outbound'
    status = Column(String(50), nullable=False)  # 'completed', 'missed', 'voicemail', etc.
    result = Column(String(50), nullable=True)  # RC's detailed result
    call_type = Column(String(50), nullable=True)  # 'voice', 'fax', etc.

    # Timing
    start_time = Column(DateTime(timezone=True), nullable=True, index=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    ring_duration_seconds = Column(Integer, nullable=True)

    # Recording information
    has_recording = Column(Boolean, default=False, nullable=False)
    recording_id = Column(String(255), nullable=True)
    recording_url = Column(Text, nullable=True)  # Public playback URL
    recording_content_uri = Column(Text, nullable=True)  # RC internal URI
    recording_downloaded = Column(Boolean, default=False)
    recording_file_path = Column(Text, nullable=True)  # Local/S3 path
    recording_duration_seconds = Column(Integer, nullable=True)
    recording_file_size_bytes = Column(Integer, nullable=True)

    # AI Processing status
    transcription_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    analysis_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    disposition_status = Column(String(20), default="pending")  # pending, auto_applied, manual_required

    # Basic AI results (for quick access)
    transcription = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    sentiment = Column(String(20), nullable=True)  # positive, neutral, negative
    sentiment_score = Column(Float, nullable=True)  # -100 to 100
    quality_score = Column(Integer, nullable=True)  # 0-100
    escalation_risk = Column(String(20), nullable=True)  # low, medium, high

    # CRM Integration
    customer_id = Column(String(255), nullable=True, index=True)
    prospect_id = Column(String(255), nullable=True, index=True)
    contact_name = Column(String(255), nullable=True)
    work_order_id = Column(String(255), nullable=True)
    ticket_id = Column(String(255), nullable=True)

    # User notes and disposition
    notes = Column(Text, nullable=True)
    disposition_id = Column(UUID(as_uuid=True), ForeignKey("call_dispositions.id"), nullable=True)
    disposition_confidence = Column(Float, nullable=True)  # AI confidence 0-100
    disposition_applied_by = Column(String(20), default="manual")  # manual, auto, suggested
    disposition_applied_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata and raw data
    call_metadata = Column(JSON, nullable=True)  # Store raw RC response
    billing_duration_seconds = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    rc_account = relationship("RCAccount", back_populates="call_logs")
    disposition = relationship("CallDisposition", backref="call_logs")

    # AI processing relationships
    transcript = relationship("CallTranscript", back_populates="call_log", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("CallAnalysis", back_populates="call_log", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CallLog(rc_call_id={self.rc_call_id}, direction={self.direction}, status={self.status})>"


# ===== CALL DISPOSITION MODEL =====
class CallDisposition(Base):
    """
    Pre-defined call outcomes for manual or auto-apply categorization.
    Configurable business rules for disposition mapping.
    """
    __tablename__ = "call_dispositions"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic information
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # positive, neutral, negative
    color = Column(String(7), default="#6B7280")  # Hex color code for UI

    # Auto-apply configuration
    auto_apply_enabled = Column(Boolean, default=False)
    auto_apply_conditions = Column(JSON, nullable=True)  # Complex conditions in JSON
    confidence_boost = Column(Integer, default=0)  # Boost confidence by X points
    priority = Column(Integer, default=100)  # Lower number = higher priority

    # Display and organization
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    display_order = Column(Integer, default=100)
    icon = Column(String(50), nullable=True)  # Icon name for UI

    # Analytics
    usage_count = Column(Integer, default=0)  # Track how often used
    auto_apply_success_rate = Column(Float, default=0.0)  # Success rate for auto-apply

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CallDisposition(name={self.name}, category={self.category})>"


# ===== RINGCENTRAL WEBHOOK EVENT MODEL =====
class RCWebhookEvent(Base):
    """
    Audit trail for RingCentral webhook deliveries and processing.
    Tracks all webhook events for debugging and monitoring.
    """
    __tablename__ = "rc_webhook_events"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Webhook metadata
    event_type = Column(String(100), nullable=False, index=True)
    event_source = Column(String(100), default="ringcentral")
    validation_token = Column(String(255), nullable=True)  # For initial validation

    # Request information
    raw_payload = Column(JSON, nullable=False)  # Full webhook body
    headers = Column(JSON, nullable=True)  # Request headers
    signature = Column(String(255), nullable=True)  # Webhook signature
    signature_valid = Column(Boolean, nullable=True)

    # Processing status
    processed = Column(Boolean, default=False, nullable=False)
    processing_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    processing_attempts = Column(Integer, default=0)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_duration_ms = Column(Integer, nullable=True)

    # Results and errors
    result_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)

    # Related entities
    related_call_id = Column(String(255), nullable=True, index=True)
    related_user_id = Column(String(255), nullable=True, index=True)
    related_session_id = Column(String(255), nullable=True)

    # Timestamps
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<RCWebhookEvent(event_type={self.event_type}, processed={self.processed})>"


# ===== CALL DISPOSITION HISTORY MODEL =====
class CallDispositionHistory(Base):
    """
    Audit trail for all call disposition changes.
    Tracks who changed what and when for compliance.
    """
    __tablename__ = "call_disposition_history"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # References
    call_log_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id"), nullable=False, index=True)
    disposition_id = Column(UUID(as_uuid=True), ForeignKey("call_dispositions.id"), nullable=True)
    previous_disposition_id = Column(UUID(as_uuid=True), nullable=True)

    # Action details
    action_type = Column(String(50), nullable=False)  # auto_applied, user_approved, user_override, manual
    applied_by_type = Column(String(50), default="user")  # system, user
    applied_by_user_id = Column(String(255), nullable=True)

    # AI decision information
    disposition_name = Column(String(255), nullable=True)  # Denormalized for history
    confidence_score = Column(Float, nullable=True)
    reasoning = Column(JSON, nullable=True)  # Store decision factors
    alternative_suggestions = Column(JSON, nullable=True)  # Other options considered

    # User input
    notes = Column(Text, nullable=True)
    override_reason = Column(String(255), nullable=True)  # Why user changed auto-applied disposition

    # Timestamps
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    call_log = relationship("CallLog", backref="disposition_history")

    def __repr__(self):
        return f"<CallDispositionHistory(action_type={self.action_type}, applied_at={self.applied_at})>"


# ===== INDEXES AND CONSTRAINTS =====
# Additional indexes will be created in migrations for:
# - call_logs(user_id, start_time) for user-specific queries
# - call_logs(customer_id) for customer call history
# - call_logs(disposition_status, created_at) for queue management
# - rc_webhook_events(event_type, received_at) for event analysis
# - call_disposition_history(call_log_id, applied_at) for audit queries