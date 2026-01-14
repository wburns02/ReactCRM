"""
Database models for AI-powered call analysis.
Stores sentiment analysis, quality scoring, coaching insights, and auto-disposition results.
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


class CallAnalysis(Base):
    """
    Comprehensive AI analysis results for call recordings.
    Stores sentiment, quality scores, coaching insights, and action items.
    """
    __tablename__ = "call_analyses"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to call log
    call_log_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id"), nullable=False, unique=True, index=True)

    # ===== SENTIMENT ANALYSIS =====
    overall_sentiment = Column(String(20), nullable=True, index=True)  # positive, neutral, negative
    sentiment_score = Column(Float, nullable=True)  # -100 to 100
    sentiment_confidence = Column(Float, nullable=True)  # 0-100

    # Detailed sentiment breakdown
    customer_sentiment = Column(String(20), nullable=True)  # Customer's sentiment
    agent_sentiment = Column(String(20), nullable=True)  # Agent's sentiment
    sentiment_trajectory = Column(JSON, nullable=True)  # How sentiment changed over time
    emotional_peaks = Column(JSON, nullable=True)  # Moments of high emotion

    # ===== CALL QUALITY SCORING =====
    overall_quality_score = Column(Integer, nullable=True, index=True)  # 0-100
    quality_confidence = Column(Float, nullable=True)  # 0-100

    # Individual quality metrics
    professionalism_score = Column(Integer, nullable=True)  # 0-100
    empathy_score = Column(Integer, nullable=True)  # 0-100
    clarity_score = Column(Integer, nullable=True)  # 0-100
    resolution_score = Column(Integer, nullable=True)  # 0-100
    efficiency_score = Column(Integer, nullable=True)  # 0-100

    # Communication metrics
    agent_talk_ratio = Column(Float, nullable=True)  # 0-1 (percentage of time agent talked)
    interruption_count = Column(Integer, nullable=True)
    dead_air_seconds = Column(Float, nullable=True)
    pace_rating = Column(String(20), nullable=True)  # slow, normal, fast, rushed

    # ===== ESCALATION RISK ASSESSMENT =====
    escalation_risk = Column(String(20), nullable=True, index=True)  # low, medium, high, critical
    escalation_score = Column(Integer, nullable=True)  # 0-100
    escalation_indicators = Column(JSON, nullable=True)  # List of risk factors

    # Customer satisfaction prediction
    predicted_csat_score = Column(Integer, nullable=True)  # 1-5 scale
    csat_confidence = Column(Float, nullable=True)  # 0-100

    # ===== TOPIC EXTRACTION =====
    primary_topic = Column(String(100), nullable=True)
    topics = Column(JSON, nullable=True)  # List of identified topics
    keywords = Column(JSON, nullable=True)  # Important keywords/phrases
    entities = Column(JSON, nullable=True)  # Named entities (companies, products, etc.)

    # ===== CALL OUTCOME ANALYSIS =====
    call_outcome = Column(String(50), nullable=True)  # resolved, pending, escalated, etc.
    resolution_type = Column(String(50), nullable=True)  # immediate, scheduled, transferred
    next_action_required = Column(Boolean, nullable=True)
    follow_up_needed = Column(Boolean, nullable=True)

    # Action items and commitments
    action_items = Column(JSON, nullable=True)  # List of action items identified
    agent_commitments = Column(JSON, nullable=True)  # Promises made by agent
    customer_requests = Column(JSON, nullable=True)  # Specific customer requests

    # ===== COMPLIANCE AND POLICY =====
    policy_violations = Column(JSON, nullable=True)  # Detected policy violations
    compliance_score = Column(Integer, nullable=True)  # 0-100
    required_disclosures = Column(JSON, nullable=True)  # Legal disclosures mentioned
    script_adherence = Column(Float, nullable=True)  # 0-100

    # ===== AUTO-DISPOSITION PREDICTION =====
    predicted_disposition = Column(String(100), nullable=True)
    disposition_confidence = Column(Float, nullable=True)  # 0-100
    disposition_reasoning = Column(JSON, nullable=True)  # Factors for disposition choice
    alternative_dispositions = Column(JSON, nullable=True)  # Other likely dispositions

    # ===== COACHING INSIGHTS =====
    strengths = Column(JSON, nullable=True)  # What the agent did well
    improvement_areas = Column(JSON, nullable=True)  # Areas for improvement
    coaching_priority = Column(String(20), nullable=True)  # low, medium, high
    specific_feedback = Column(JSON, nullable=True)  # Detailed coaching suggestions

    # Training recommendations
    recommended_training = Column(JSON, nullable=True)  # Training modules to recommend
    skill_gaps = Column(JSON, nullable=True)  # Identified skill gaps

    # ===== PROCESSING METADATA =====
    analysis_model = Column(String(100), nullable=False)  # GPT model used
    processing_duration_seconds = Column(Float, nullable=True)
    processing_cost_dollars = Column(Float, nullable=True)
    analysis_version = Column(String(20), nullable=False, default='1.0')

    # Status tracking
    status = Column(String(20), nullable=False, default='completed')  # completed, partial, failed
    processing_attempts = Column(Integer, nullable=False, default=1)
    error_message = Column(Text, nullable=True)

    # Raw AI response storage
    raw_analysis_response = Column(JSON, nullable=True)
    prompt_used = Column(Text, nullable=True)
    tokens_used = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    call_log = relationship("CallLog", back_populates="analysis")

    def __repr__(self):
        return f"<CallAnalysis(call_log_id={self.call_log_id}, quality={self.overall_quality_score})>"

    @property
    def summary_scores(self) -> dict:
        """Return summary of key analysis scores."""
        return {
            "quality_score": self.overall_quality_score,
            "sentiment_score": self.sentiment_score,
            "escalation_risk": self.escalation_risk,
            "disposition_confidence": self.disposition_confidence,
            "predicted_csat": self.predicted_csat_score
        }

    @property
    def has_concerns(self) -> bool:
        """Check if analysis indicates any concerns."""
        concerns = []

        if self.overall_quality_score and self.overall_quality_score < 70:
            concerns.append("low_quality")

        if self.escalation_risk in ['high', 'critical']:
            concerns.append("escalation_risk")

        if self.sentiment_score and self.sentiment_score < -20:
            concerns.append("negative_sentiment")

        if self.predicted_csat_score and self.predicted_csat_score <= 2:
            concerns.append("low_satisfaction")

        if self.policy_violations and len(self.policy_violations) > 0:
            concerns.append("policy_violations")

        return len(concerns) > 0


class CallAnalysisMetric(Base):
    """
    Individual analysis metrics with detailed breakdown.
    Allows for granular analysis and historical trending.
    """
    __tablename__ = "call_analysis_metrics"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to analysis
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("call_analyses.id"), nullable=False, index=True)

    # Metric information
    metric_category = Column(String(50), nullable=False, index=True)  # sentiment, quality, compliance, etc.
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_confidence = Column(Float, nullable=True)

    # Contextual information
    evidence = Column(JSON, nullable=True)  # Supporting evidence/quotes
    reasoning = Column(Text, nullable=True)  # Why this score was given
    improvement_suggestion = Column(Text, nullable=True)

    # Time-based metrics
    time_segment_start = Column(Float, nullable=True)  # Start time in call
    time_segment_end = Column(Float, nullable=True)  # End time in call

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    analysis = relationship("CallAnalysis", backref="metrics")

    def __repr__(self):
        return f"<CallAnalysisMetric({self.metric_category}.{self.metric_name}={self.metric_value})>"


class AnalysisJob(Base):
    """
    Tracks AI analysis job processing for monitoring and resource management.
    Stores processing pipeline status and performance metrics.
    """
    __tablename__ = "analysis_jobs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to call log
    call_log_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id"), nullable=False, index=True)

    # Job metadata
    job_type = Column(String(50), nullable=False, default='full_analysis')  # full_analysis, sentiment_only, etc.
    priority = Column(Integer, nullable=False, default=100)  # Lower = higher priority
    analysis_modules = Column(JSON, nullable=False)  # List of analysis modules to run

    # Dependencies
    requires_transcript = Column(Boolean, nullable=False, default=True)
    transcript_job_id = Column(UUID(as_uuid=True), ForeignKey("transcription_jobs.id"), nullable=True)

    # Processing status
    status = Column(String(20), nullable=False, default='queued')  # queued, processing, completed, failed, cancelled
    attempts = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    current_step = Column(String(100), nullable=True)

    # Timing
    queued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_duration_seconds = Column(Float, nullable=True)

    # Output tracking
    output_analysis_id = Column(UUID(as_uuid=True), ForeignKey("call_analyses.id"), nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    error_step = Column(String(100), nullable=True)

    # Resource usage
    tokens_used = Column(Integer, nullable=True)
    api_calls_made = Column(Integer, nullable=True)
    api_cost_dollars = Column(Float, nullable=True)

    # Job configuration
    config = Column(JSON, nullable=True)  # Analysis configuration
    prompt_template_version = Column(String(20), nullable=True)

    # Relationships
    call_log = relationship("CallLog", backref="analysis_jobs")
    output_analysis = relationship("CallAnalysis", backref="job")

    def __repr__(self):
        return f"<AnalysisJob(call_log_id={self.call_log_id}, status={self.status})>"

    @property
    def is_complete(self) -> bool:
        """Check if job is in a final state."""
        return self.status in ['completed', 'failed', 'cancelled']


# ===== INDEXES AND CONSTRAINTS =====
# Additional indexes for performance:
# - call_analyses(call_log_id) - already unique
# - call_analyses(overall_sentiment, sentiment_score) - for sentiment queries
# - call_analyses(escalation_risk, created_at) - for risk monitoring
# - call_analysis_metrics(analysis_id, metric_category) - for metric queries
# - analysis_jobs(status, queued_at) - for job queue processing