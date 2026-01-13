"""
Database models for call transcription data.
Stores detailed transcription results from OpenAI Whisper.
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


class CallTranscript(Base):
    """
    Detailed transcription data for call recordings.
    Stores full transcription results, segments, and processing metadata.
    """
    __tablename__ = "call_transcripts"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to call log
    call_log_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id"), nullable=False, unique=True, index=True)

    # Transcription content
    full_transcript = Column(Text, nullable=False)
    language = Column(String(10), nullable=True, default='en')
    confidence_score = Column(Float, nullable=True)  # Overall confidence 0-1

    # Processing metadata
    model_used = Column(String(100), nullable=False)  # e.g., "gpt-4o-transcribe"
    processing_duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    audio_duration_seconds = Column(Float, nullable=True)

    # Text analytics
    character_count = Column(Integer, nullable=False)
    word_count = Column(Integer, nullable=False)
    sentence_count = Column(Integer, nullable=True)
    paragraph_count = Column(Integer, nullable=True)

    # Segmented transcription (JSON array of segments)
    segments = Column(JSON, nullable=True)  # Array of {start, end, text, confidence}

    # Speaker identification (future enhancement)
    speaker_count = Column(Integer, nullable=True)
    speaker_segments = Column(JSON, nullable=True)  # Array of {start, end, speaker_id, text}

    # Quality metrics
    silence_duration_seconds = Column(Float, nullable=True)
    speech_rate_wpm = Column(Float, nullable=True)  # Words per minute
    audio_quality_score = Column(Float, nullable=True)  # 0-100

    # Processing status
    status = Column(String(20), nullable=False, default='completed')  # completed, partial, failed
    processing_attempts = Column(Integer, nullable=False, default=1)
    error_message = Column(Text, nullable=True)

    # Metadata and raw response
    raw_whisper_response = Column(JSON, nullable=True)  # Store full API response
    processing_metadata = Column(JSON, nullable=True)  # Additional processing info

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    call_log = relationship("CallLog", back_populates="transcript")

    def __repr__(self):
        return f"<CallTranscript(call_log_id={self.call_log_id}, words={self.word_count})>"

    @property
    def preview(self) -> str:
        """Return first 200 characters of transcript for preview."""
        if not self.full_transcript:
            return ""
        return (self.full_transcript[:200] + "...") if len(self.full_transcript) > 200 else self.full_transcript

    @property
    def transcript_summary(self) -> dict:
        """Return summary statistics about the transcript."""
        return {
            "character_count": self.character_count,
            "word_count": self.word_count,
            "sentence_count": self.sentence_count,
            "paragraph_count": self.paragraph_count,
            "language": self.language,
            "confidence_score": self.confidence_score,
            "speech_rate_wpm": self.speech_rate_wpm,
            "audio_duration_seconds": self.audio_duration_seconds
        }


class CallTranscriptSegment(Base):
    """
    Individual segments of call transcription with timestamps.
    Allows for precise navigation and analysis of call content.
    """
    __tablename__ = "call_transcript_segments"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to transcript
    transcript_id = Column(UUID(as_uuid=True), ForeignKey("call_transcripts.id"), nullable=False, index=True)

    # Segment metadata
    segment_index = Column(Integer, nullable=False)  # Order within transcript
    start_time_seconds = Column(Float, nullable=False, index=True)
    end_time_seconds = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)

    # Segment content
    text = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False)

    # Quality metrics
    confidence_score = Column(Float, nullable=True)  # Segment-specific confidence
    avg_logprob = Column(Float, nullable=True)  # Average log probability
    compression_ratio = Column(Float, nullable=True)  # Compression ratio from Whisper
    no_speech_prob = Column(Float, nullable=True)  # No speech probability

    # Speaker information (future enhancement)
    speaker_id = Column(String(50), nullable=True)
    speaker_confidence = Column(Float, nullable=True)

    # Segment classification
    segment_type = Column(String(50), nullable=True)  # speech, silence, noise, music
    contains_question = Column(Boolean, nullable=True)
    contains_interruption = Column(Boolean, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    transcript = relationship("CallTranscript", backref="transcript_segments")

    def __repr__(self):
        return f"<CallTranscriptSegment(start={self.start_time_seconds}, duration={self.duration_seconds})>"


class TranscriptionJob(Base):
    """
    Tracks transcription job processing for monitoring and debugging.
    Stores processing pipeline status and performance metrics.
    """
    __tablename__ = "transcription_jobs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to call log
    call_log_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id"), nullable=False, index=True)

    # Job metadata
    job_type = Column(String(50), nullable=False, default='whisper_transcription')
    priority = Column(Integer, nullable=False, default=100)  # Lower = higher priority
    max_retries = Column(Integer, nullable=False, default=3)
    timeout_seconds = Column(Integer, nullable=False, default=300)

    # Processing status
    status = Column(String(20), nullable=False, default='queued')  # queued, processing, completed, failed, cancelled
    attempts = Column(Integer, nullable=False, default=0)
    current_step = Column(String(100), nullable=True)

    # Timing
    queued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_duration_seconds = Column(Float, nullable=True)

    # Input/Output tracking
    input_audio_path = Column(Text, nullable=True)
    input_audio_url = Column(Text, nullable=True)
    input_file_size_bytes = Column(Integer, nullable=True)
    output_transcript_id = Column(UUID(as_uuid=True), ForeignKey("call_transcripts.id"), nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    error_traceback = Column(Text, nullable=True)

    # Resource usage
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Integer, nullable=True)
    api_cost_dollars = Column(Float, nullable=True)

    # Job configuration
    config = Column(JSON, nullable=True)  # Store job-specific configuration
    metadata = Column(JSON, nullable=True)  # Additional metadata

    # Relationships
    call_log = relationship("CallLog", backref="transcription_jobs")
    output_transcript = relationship("CallTranscript", backref="job")

    def __repr__(self):
        return f"<TranscriptionJob(call_log_id={self.call_log_id}, status={self.status})>"

    @property
    def is_complete(self) -> bool:
        """Check if job is in a final state."""
        return self.status in ['completed', 'failed', 'cancelled']

    @property
    def duration_minutes(self) -> Optional[float]:
        """Get processing duration in minutes."""
        if self.processing_duration_seconds:
            return self.processing_duration_seconds / 60
        return None


# ===== INDEXES AND CONSTRAINTS =====
# Additional indexes for performance:
# - call_transcripts(call_log_id) - already unique
# - call_transcript_segments(transcript_id, start_time_seconds) - for timeline queries
# - transcription_jobs(status, queued_at) - for queue processing
# - transcription_jobs(call_log_id, created_at) - for job history