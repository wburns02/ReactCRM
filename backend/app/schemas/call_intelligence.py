"""
Pydantic schemas for Call Intelligence Dashboard API endpoints.
These schemas match the frontend TypeScript interfaces in src/features/call-intelligence/types.ts
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ===== ENUMS / LITERALS =====
SentimentLevel = Literal["positive", "neutral", "negative", "mixed"]
EscalationRisk = Literal["low", "medium", "high", "critical"]
DispositionCategory = Literal["positive", "neutral", "negative"]
QualityTrend = Literal["up", "down", "neutral"]
TrainingPriority = Literal["high", "medium", "low"]


# ===== NESTED SCHEMAS =====

class TrendDataPoint(BaseModel):
    """Data point for trend charts."""
    date: str
    value: float
    positive: Optional[int] = None
    neutral: Optional[int] = None
    negative: Optional[int] = None


class DailyScore(BaseModel):
    """Daily quality score for heatmap."""
    date: str
    score: Optional[float] = None
    call_count: int = 0


class CoachingItem(BaseModel):
    """Item for coaching insights (strengths/improvements)."""
    name: str
    count: int
    percentage: float


class TopicItem(BaseModel):
    """Topic item with sentiment."""
    topic: str
    count: int
    sentiment: SentimentLevel


class TrainingRecommendation(BaseModel):
    """Training recommendation for agents."""
    module: str
    priority: TrainingPriority
    agents_affected: int


class DateRange(BaseModel):
    """Date range for reports."""
    start: str
    end: str


# ===== MAIN RESPONSE SCHEMAS =====

class CallIntelligenceMetrics(BaseModel):
    """Dashboard metrics - matches frontend CallIntelligenceMetrics interface."""
    # Volume
    total_calls: int = 0
    calls_today: int = 0
    calls_this_week: int = 0
    # Sentiment distribution
    positive_calls: int = 0
    neutral_calls: int = 0
    negative_calls: int = 0
    avg_sentiment_score: float = 0.0
    # Quality
    avg_quality_score: float = 0.0
    quality_trend: float = 0.0  # percentage change
    # Escalation
    escalation_rate: float = 0.0
    high_risk_calls: int = 0
    critical_risk_calls: int = 0
    # CSAT
    avg_csat_prediction: float = 0.0
    # Auto-disposition
    auto_disposition_rate: float = 0.0
    auto_disposition_accuracy: float = 0.0
    # Trends (7-day)
    sentiment_trend: List[TrendDataPoint] = []
    quality_trend_data: List[TrendDataPoint] = []
    volume_trend: List[TrendDataPoint] = []


class CallAnalyticsResponse(BaseModel):
    """Response for GET /ringcentral/calls/analytics"""
    metrics: CallIntelligenceMetrics
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        from_attributes = True


class AgentPerformance(BaseModel):
    """Agent performance data - matches frontend AgentPerformance interface."""
    agent_id: str
    agent_name: str
    avatar_url: Optional[str] = None
    # Metrics
    total_calls: int = 0
    avg_quality_score: float = 0.0
    avg_sentiment_score: float = 0.0
    avg_handle_time: float = 0.0  # seconds
    # Quality breakdown
    professionalism: float = 0.0
    empathy: float = 0.0
    clarity: float = 0.0
    resolution: float = 0.0
    # Trends
    quality_trend: QualityTrend = "neutral"
    trend_percentage: float = 0.0
    # Rankings
    rank: int = 0
    rank_change: int = 0  # positive = improved
    # Coaching
    strengths: List[str] = []
    improvement_areas: List[str] = []


class AgentPerformanceResponse(BaseModel):
    """Response for GET /ringcentral/agents/performance"""
    agents: List[AgentPerformance] = []
    total: int = 0

    class Config:
        from_attributes = True


class QualityHeatmapData(BaseModel):
    """Quality heatmap data per agent - matches frontend QualityHeatmapData interface."""
    agent_id: str
    agent_name: str
    daily_scores: List[DailyScore] = []


class QualityHeatmapResponse(BaseModel):
    """Response for GET /ringcentral/quality/heatmap"""
    data: List[QualityHeatmapData] = []
    date_range: DateRange

    class Config:
        from_attributes = True


class DispositionStats(BaseModel):
    """Disposition statistics - matches frontend DispositionStats interface."""
    disposition_id: str
    disposition_name: str
    category: DispositionCategory
    color: str = "#6B7280"
    count: int = 0
    percentage: float = 0.0
    auto_applied_count: int = 0
    manual_count: int = 0
    avg_confidence: float = 0.0


class DispositionStatsResponse(BaseModel):
    """Response for GET /call-dispositions/analytics"""
    dispositions: List[DispositionStats] = []
    total_calls: int = 0

    class Config:
        from_attributes = True


class CoachingInsights(BaseModel):
    """Coaching insights data - matches frontend CoachingInsights interface."""
    top_strengths: List[CoachingItem] = []
    top_improvements: List[CoachingItem] = []
    trending_topics: List[TopicItem] = []
    recommended_training: List[TrainingRecommendation] = []


class CoachingInsightsResponse(BaseModel):
    """Response for GET /ringcentral/coaching/insights"""
    insights: CoachingInsights
    period: str = "last_30_days"

    class Config:
        from_attributes = True
