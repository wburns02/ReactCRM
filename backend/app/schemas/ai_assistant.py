"""
AI Assistant Pydantic Schemas

Request/response schemas for AI Assistant API endpoints
"""

from pydantic import BaseModel, Field, UUID4
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# ===== ENUMS =====

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ActionType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    QUERY = "query"
    NAVIGATION = "navigation"


class ActionStatus(str, Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class IntentType(str, Enum):
    QUERY = "query"
    ACTION = "action"
    CONVERSATION = "conversation"
    NAVIGATION = "navigation"
    HELP = "help"


class AIDomain(str, Enum):
    CUSTOMER_ACTIVITY = "customer-activity"
    DISPATCH = "dispatch"
    TICKETS = "tickets"
    SCHEDULING = "scheduling"
    TECHNICIANS = "technicians"
    SEARCH = "search"
    CALLS = "calls"
    LEADS = "leads"
    PRICING = "pricing"
    DOCUMENTS = "documents"
    CONTRACTS = "contracts"
    PAYMENTS = "payments"
    COMPLIANCE = "compliance"
    REPORTS = "reports"
    INVENTORY = "inventory"


# ===== BASE SCHEMAS =====

class AIBaseSchema(BaseModel):
    """Base schema with common fields"""

    class Config:
        from_attributes = True
        use_enum_values = True


# ===== CONVERSATION SCHEMAS =====

class ConversationSettings(BaseModel):
    auto_save: bool = True
    retention_days: int = 30
    share_with_team: bool = False
    encrypt_sensitive_data: bool = True
    audit_level: Literal["basic", "standard", "detailed"] = "standard"


class ConversationCreate(BaseModel):
    user_id: str
    session_id: str
    title: Optional[str] = None
    settings: ConversationSettings = Field(default_factory=ConversationSettings)


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[ConversationStatus] = None
    settings: Optional[ConversationSettings] = None


class ConversationResponse(AIBaseSchema):
    id: UUID4
    user_id: str
    session_id: str
    title: Optional[str]
    settings: ConversationSettings
    status: ConversationStatus
    context_snapshot: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    last_active_at: datetime


# ===== MESSAGE SCHEMAS =====

class MessageMetadata(BaseModel):
    suggestions: Optional[List[Dict[str, Any]]] = []
    context: Optional[Dict[str, Any]] = {}
    processing_info: Optional[Dict[str, Any]] = {}


class EntityExtracted(BaseModel):
    type: str
    value: str
    confidence: float
    metadata: Optional[Dict[str, Any]] = {}


class MessageCreate(BaseModel):
    conversation_id: UUID4
    role: MessageRole
    content: str
    confidence: Optional[float] = None
    metadata: MessageMetadata = Field(default_factory=MessageMetadata)
    intent_type: Optional[IntentType] = None
    intent_domain: Optional[AIDomain] = None
    intent_operation: Optional[str] = None
    entities: List[EntityExtracted] = []


class MessageResponse(AIBaseSchema):
    id: UUID4
    conversation_id: UUID4
    role: MessageRole
    content: str
    confidence: Optional[float]
    processing_time_ms: Optional[int]
    metadata: MessageMetadata
    intent_type: Optional[IntentType]
    intent_domain: Optional[AIDomain]
    intent_operation: Optional[str]
    entities: List[EntityExtracted]
    timestamp: datetime


# ===== ACTION SCHEMAS =====

class ActionRequirement(BaseModel):
    type: Literal["permission", "data", "confirmation"]
    description: str
    satisfied: bool
    details: Optional[Dict[str, Any]] = {}


class ActionEstimatedImpact(BaseModel):
    time_saved_minutes: Optional[int] = None
    customer_satisfaction: Optional[str] = None
    revenue_impact: Optional[float] = None
    efficiency_gain: Optional[float] = None


class ActionCreate(BaseModel):
    conversation_id: UUID4
    message_id: Optional[UUID4] = None
    type: ActionType
    domain: AIDomain
    operation: str
    payload: Dict[str, Any]
    requirements: List[ActionRequirement] = []
    confidence: float = 0.0
    estimated_impact: ActionEstimatedImpact = Field(default_factory=ActionEstimatedImpact)


class ActionUpdate(BaseModel):
    status: Optional[ActionStatus] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    actual_impact: Optional[Dict[str, Any]] = None


class ActionResponse(AIBaseSchema):
    id: UUID4
    conversation_id: UUID4
    message_id: Optional[UUID4]
    type: ActionType
    domain: AIDomain
    operation: str
    payload: Dict[str, Any]
    requirements: List[ActionRequirement]
    status: ActionStatus
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    executed_by: Optional[str]
    executed_at: Optional[datetime]
    confidence: float
    estimated_impact: ActionEstimatedImpact
    actual_impact: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


# ===== QUERY PROCESSING SCHEMAS =====

class QueryRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID4] = None
    context: Optional[Dict[str, Any]] = None
    stream: bool = False


class AIResponseProcessing(BaseModel):
    duration_ms: int
    cache_hit: bool
    model_version: str
    domains_involved: List[AIDomain]


class ActionableInsight(BaseModel):
    type: Literal["risk", "opportunity", "optimization", "information"]
    title: str
    description: str
    priority: Literal["low", "medium", "high", "urgent"]
    confidence: float
    estimated_impact: Optional[Dict[str, Any]] = None


class AIResponse(BaseModel):
    id: str
    conversation_id: str
    timestamp: datetime

    # Primary result
    primary_result: Any
    confidence: float
    completeness: float
    freshness: float

    # Actionable insights and suggestions
    actionable_insights: List[ActionableInsight]
    suggested_actions: List[ActionResponse]
    follow_up_questions: List[str]

    # Processing metadata
    processing: AIResponseProcessing


# ===== CONTEXT SCHEMAS =====

class UserContext(BaseModel):
    id: str
    role: str
    permissions: List[str]
    preferences: Dict[str, Any]


class AppContext(BaseModel):
    current_page: str
    current_entity: Optional[Dict[str, Any]] = None
    session_data: Dict[str, Any]


class DomainContext(BaseModel):
    customers: Optional[List[Dict[str, Any]]] = None
    work_orders: Optional[List[Dict[str, Any]]] = None
    tickets: Optional[List[Dict[str, Any]]] = None
    technicians: Optional[List[Dict[str, Any]]] = None


class SessionContext(BaseModel):
    conversation_history: List[Dict[str, Any]]
    recent_queries: List[str]
    active_tasks: List[Dict[str, Any]]


class AIContextRequest(BaseModel):
    user_id: str
    session_id: str
    page: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None


class AIContextResponse(BaseModel):
    user: UserContext
    app: AppContext
    domain: DomainContext
    session: SessionContext


# ===== HEALTH SCHEMAS =====

class HealthCheckResponse(BaseModel):
    domain: AIDomain
    status: HealthStatus
    response_time_ms: float
    success_rate: float
    last_error: Optional[str]
    error_count: int
    details: Dict[str, Any]
    checked_at: datetime


class OverallHealthResponse(BaseModel):
    overall_status: HealthStatus
    domains: Dict[AIDomain, HealthCheckResponse]
    summary: Dict[str, Any]
    checked_at: datetime


# ===== ANALYTICS SCHEMAS =====

class AnalyticsEventCreate(BaseModel):
    event_type: str
    user_id: str
    session_id: str
    event_data: Dict[str, Any]
    processing_time_ms: Optional[float] = None
    confidence_score: Optional[float] = None
    success: bool = True
    domain: Optional[AIDomain] = None
    intent_type: Optional[IntentType] = None


class AnalyticsResponse(BaseModel):
    total_events: int
    success_rate: float
    average_response_time: float
    most_common_intents: List[Dict[str, Any]]
    domain_usage: Dict[AIDomain, int]
    error_summary: Dict[str, Any]
    time_period: str


# ===== STREAMING SCHEMAS =====

class StreamChunk(BaseModel):
    type: Literal["partial", "action", "insight", "complete", "error"]
    data: Any
    timestamp: datetime


# ===== PAGINATION =====

class PaginationParams(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    skip: int
    limit: int
    has_next: bool


# ===== CONVERSATION LIST SCHEMAS =====

class ConversationListResponse(AIBaseSchema):
    id: UUID4
    title: Optional[str]
    status: ConversationStatus
    message_count: int
    last_message_preview: Optional[str]
    last_active_at: datetime
    created_at: datetime


class ConversationListPaginated(PaginatedResponse):
    items: List[ConversationListResponse]