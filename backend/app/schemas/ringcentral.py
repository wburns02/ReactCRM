"""
Pydantic schemas for RingCentral API endpoints.
These schemas match the frontend TypeScript interfaces exactly.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from uuid import UUID


# ===== RESPONSE SCHEMAS =====

class RCStatusResponse(BaseModel):
    """Response schema for RingCentral connection status."""
    connected: bool
    configured: bool = False
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    extension: Optional[str] = None
    user_name: Optional[str] = None
    message: Optional[str] = None
    last_sync_at: Optional[str] = None

    class Config:
        from_attributes = True


class CallRecordResponse(BaseModel):
    """Response schema for call records - matches frontend CallRecord interface."""
    id: str
    rc_call_id: Optional[str] = None
    from_number: str
    to_number: str
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    direction: str
    status: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_seconds: Optional[int] = None
    has_recording: bool = False
    recording_url: Optional[str] = None
    transcription: Optional[str] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    customer_id: Optional[str] = None
    contact_name: Optional[str] = None
    notes: Optional[str] = None
    disposition: Optional[str] = None
    disposition_confidence: Optional[float] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class CallListResponse(BaseModel):
    """Paginated response for call lists."""
    items: List[CallRecordResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool


class DispositionResponse(BaseModel):
    """Response schema for call dispositions."""
    id: str
    name: str
    description: Optional[str] = None
    category: str  # positive, neutral, negative
    color: str = "#6B7280"
    is_active: bool = True
    is_default: bool = False
    icon: Optional[str] = None
    auto_apply_enabled: bool = False

    class Config:
        from_attributes = True


class ExtensionResponse(BaseModel):
    """Response schema for RingCentral extensions."""
    id: str
    extension_number: str
    name: str
    email: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class WebhookEventResponse(BaseModel):
    """Response schema for webhook events."""
    id: str
    event_type: str
    processed: bool
    processing_status: str
    received_at: str
    processing_duration_ms: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# ===== REQUEST SCHEMAS =====

class InitiateCallRequest(BaseModel):
    """Request schema for initiating outbound calls."""
    to_number: str = Field(..., description="Phone number to call")
    from_number: Optional[str] = Field(None, description="Caller ID override")
    customer_id: Optional[str] = Field(None, description="Associated customer ID")
    prospect_id: Optional[str] = Field(None, description="Associated prospect ID")
    work_order_id: Optional[str] = Field(None, description="Associated work order ID")


class SyncCallsRequest(BaseModel):
    """Request schema for syncing calls from RingCentral."""
    hours_back: int = Field(24, description="Number of hours to look back", ge=1, le=168)  # Max 1 week
    force_refresh: bool = Field(False, description="Force refresh even if recently synced")


class UpdateCallRequest(BaseModel):
    """Request schema for updating call information."""
    disposition: Optional[str] = Field(None, description="Disposition name or ID")
    notes: Optional[str] = Field(None, description="Call notes")
    customer_id: Optional[str] = Field(None, description="Link to customer")
    prospect_id: Optional[str] = Field(None, description="Link to prospect")
    work_order_id: Optional[str] = Field(None, description="Link to work order")


class CreateDispositionRequest(BaseModel):
    """Request schema for creating new dispositions."""
    name: str = Field(..., description="Disposition name", max_length=100)
    description: Optional[str] = Field(None, description="Disposition description")
    category: str = Field(..., description="Disposition category", regex="^(positive|neutral|negative)$")
    color: str = Field("#6B7280", description="Hex color code", regex="^#[0-9A-Fa-f]{6}$")
    auto_apply_enabled: bool = Field(False, description="Enable auto-apply")
    auto_apply_conditions: Optional[Dict[str, Any]] = Field(None, description="Auto-apply conditions")


class UpdateDispositionRequest(BaseModel):
    """Request schema for updating dispositions."""
    name: Optional[str] = Field(None, description="Disposition name", max_length=100)
    description: Optional[str] = Field(None, description="Disposition description")
    category: Optional[str] = Field(None, description="Disposition category", regex="^(positive|neutral|negative)$")
    color: Optional[str] = Field(None, description="Hex color code", regex="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = Field(None, description="Active status")
    auto_apply_enabled: Optional[bool] = Field(None, description="Enable auto-apply")
    auto_apply_conditions: Optional[Dict[str, Any]] = Field(None, description="Auto-apply conditions")


class DispositionRecommendationRequest(BaseModel):
    """Request schema for disposition recommendations."""
    call_id: str = Field(..., description="Call ID to analyze")
    force_reprocess: bool = Field(False, description="Force reprocessing of AI analysis")


class ApplyDispositionRequest(BaseModel):
    """Request schema for applying disposition recommendations."""
    disposition_id: Optional[str] = Field(None, description="Specific disposition ID to apply")
    notes: Optional[str] = Field(None, description="Additional notes")
    override_reason: Optional[str] = Field(None, description="Reason for overriding auto-suggestion")


# ===== AI ANALYSIS SCHEMAS =====

class CallSentimentResult(BaseModel):
    """Schema for call sentiment analysis results."""
    overall_sentiment: str  # positive, neutral, negative
    sentiment_score: float = Field(..., description="Sentiment score -100 to 100")
    confidence: float = Field(..., description="Confidence 0-100")
    emotions_detected: List[Dict[str, Any]] = []
    key_moments: List[Dict[str, Any]] = []
    topics_discussed: List[str] = []
    customer_satisfaction_indicator: int = Field(..., description="1-10 scale")
    escalation_risk: str = Field(..., description="low, medium, high")
    summary: str
    action_items: List[str] = []
    coaching_tips: List[str] = []


class CallQualityScore(BaseModel):
    """Schema for call quality scoring results."""
    overall_score: int = Field(..., description="Overall quality score 0-100")
    categories: Dict[str, int] = Field(..., description="Category scores")
    improvements: List[str] = []
    strengths: List[str] = []


class AgentCoaching(BaseModel):
    """Schema for agent coaching insights."""
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    suggested_phrases: List[str] = []
    overall_rating: int = Field(..., description="1-5 stars")


class DispositionRecommendation(BaseModel):
    """Schema for AI disposition recommendation."""
    recommended_disposition: str
    confidence: float = Field(..., description="Confidence 0-100")
    reasoning: List[str] = []
    auto_apply_eligible: bool
    requires_review: bool
    alternative_dispositions: List[Dict[str, Any]] = []


# ===== TRANSCRIPTION SCHEMAS =====

class TranscriptionRequest(BaseModel):
    """Request schema for transcribing call recordings."""
    call_id: str
    recording_url: Optional[str] = None
    force_retranscribe: bool = False


class TranscriptionResponse(BaseModel):
    """Response schema for transcription results."""
    call_id: str
    status: str  # pending, processing, completed, failed
    transcript_text: Optional[str] = None
    confidence_score: Optional[float] = None
    language_detected: Optional[str] = None
    processing_duration_ms: Optional[int] = None
    error_message: Optional[str] = None


# ===== WEBHOOK SCHEMAS =====

class RingCentralWebhookEvent(BaseModel):
    """Schema for incoming RingCentral webhook events."""
    timestamp: str
    subscriptionId: str
    ownerId: Optional[str] = None
    body: Dict[str, Any]
    event: Optional[str] = None
    uuid: Optional[str] = None


class WebhookValidationRequest(BaseModel):
    """Schema for webhook validation requests."""
    validation_token: str


# ===== FILTER SCHEMAS =====

class CallFilters(BaseModel):
    """Schema for call filtering parameters."""
    direction: Optional[str] = Field(None, description="inbound, outbound")
    status: Optional[str] = Field(None, description="completed, missed, etc.")
    customer_id: Optional[str] = Field(None, description="Filter by customer")
    date_from: Optional[datetime] = Field(None, description="Start date filter")
    date_to: Optional[datetime] = Field(None, description="End date filter")
    has_recording: Optional[bool] = Field(None, description="Filter by recording availability")
    sentiment: Optional[str] = Field(None, description="positive, neutral, negative")
    disposition_status: Optional[str] = Field(None, description="pending, auto_applied, manual_required")
    search: Optional[str] = Field(None, description="Search in notes, numbers, names")


class PaginationParams(BaseModel):
    """Schema for pagination parameters."""
    page: int = Field(1, description="Page number", ge=1)
    page_size: int = Field(20, description="Items per page", ge=1, le=100)


# ===== ERROR SCHEMAS =====

class ErrorResponse(BaseModel):
    """Standard error response schema."""
    detail: str
    status_code: int
    error_code: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ValidationErrorResponse(BaseModel):
    """Validation error response schema."""
    detail: str = "Validation error"
    status_code: int = 422
    errors: List[Dict[str, Any]]


# ===== BATCH OPERATION SCHEMAS =====

class BatchTranscriptionRequest(BaseModel):
    """Request schema for batch transcription operations."""
    call_ids: List[str] = Field(..., description="List of call IDs to process")
    priority: str = Field("normal", description="Processing priority")


class BatchAnalysisRequest(BaseModel):
    """Request schema for batch AI analysis."""
    call_ids: List[str] = Field(..., description="List of call IDs to analyze")
    analysis_types: List[str] = Field(["sentiment", "quality", "coaching"], description="Types of analysis")


class BatchOperationResponse(BaseModel):
    """Response schema for batch operations."""
    job_id: str
    status: str  # queued, processing, completed, failed
    total_items: int
    processed_items: int = 0
    failed_items: int = 0
    estimated_completion: Optional[str] = None