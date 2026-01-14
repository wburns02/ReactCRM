/**
 * Call Intelligence Dashboard Types
 * Type definitions for the call analytics and disposition dashboard
 */

// Sentiment types
export type SentimentLevel = "positive" | "neutral" | "negative" | "mixed";
export type EscalationRisk = "low" | "medium" | "high" | "critical";
export type DispositionCategory = "positive" | "neutral" | "negative";

// Call with analysis data
export interface CallWithAnalysis {
  id: string;
  // Call metadata
  from_number: string;
  to_number: string;
  direction: "inbound" | "outbound";
  duration_seconds: number;
  start_time: string;
  recording_url?: string;
  // Customer info
  customer_id?: number;
  customer_name?: string;
  // Disposition
  disposition?: string;
  disposition_category?: DispositionCategory;
  disposition_confidence?: number;
  // Sentiment analysis
  sentiment: SentimentLevel;
  sentiment_score: number; // -100 to 100
  customer_sentiment?: SentimentLevel;
  agent_sentiment?: SentimentLevel;
  // Quality metrics
  quality_score: number; // 0-100
  professionalism_score?: number;
  empathy_score?: number;
  clarity_score?: number;
  resolution_score?: number;
  // Escalation
  escalation_risk: EscalationRisk;
  escalation_score?: number;
  csat_prediction?: number; // 1-5
  // Topics
  primary_topic?: string;
  topics?: string[];
  // Agent
  agent_id?: string;
  agent_name?: string;
  // AI processing
  has_transcript: boolean;
  has_analysis: boolean;
}

// Dashboard metrics
export interface CallIntelligenceMetrics {
  // Volume
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  // Sentiment distribution
  positive_calls: number;
  neutral_calls: number;
  negative_calls: number;
  avg_sentiment_score: number;
  // Quality
  avg_quality_score: number;
  quality_trend: number; // percentage change
  // Escalation
  escalation_rate: number;
  high_risk_calls: number;
  critical_risk_calls: number;
  // CSAT
  avg_csat_prediction: number;
  // Auto-disposition
  auto_disposition_rate: number;
  auto_disposition_accuracy: number;
  // Trends (7-day)
  sentiment_trend: TrendDataPoint[];
  quality_trend_data: TrendDataPoint[];
  volume_trend: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
  positive?: number;
  neutral?: number;
  negative?: number;
}

// Agent performance
export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  avatar_url?: string;
  // Metrics
  total_calls: number;
  avg_quality_score: number;
  avg_sentiment_score: number;
  avg_handle_time: number;
  // Quality breakdown
  professionalism: number;
  empathy: number;
  clarity: number;
  resolution: number;
  // Trends
  quality_trend: "up" | "down" | "neutral";
  trend_percentage: number;
  // Rankings
  rank: number;
  rank_change: number; // positive = improved
  // Coaching
  strengths: string[];
  improvement_areas: string[];
}

// Disposition statistics
export interface DispositionStats {
  disposition_id: string;
  disposition_name: string;
  category: DispositionCategory;
  color: string;
  count: number;
  percentage: number;
  auto_applied_count: number;
  manual_count: number;
  avg_confidence: number;
}

// Quality heatmap data
export interface QualityHeatmapData {
  agent_id: string;
  agent_name: string;
  daily_scores: {
    date: string;
    score: number;
    call_count: number;
  }[];
}

// Coaching insights
export interface CoachingInsights {
  // Aggregated
  top_strengths: CoachingItem[];
  top_improvements: CoachingItem[];
  trending_topics: TopicItem[];
  // Recommendations
  recommended_training: TrainingRecommendation[];
}

export interface CoachingItem {
  name: string;
  count: number;
  percentage: number;
}

export interface TopicItem {
  topic: string;
  count: number;
  sentiment: SentimentLevel;
}

export interface TrainingRecommendation {
  module: string;
  priority: "high" | "medium" | "low";
  agents_affected: number;
}

// Filter state
export interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  agents: string[];
  dispositions: string[];
  sentiment: SentimentLevel[];
  qualityRange: {
    min: number;
    max: number;
  };
  escalationRisk: EscalationRisk[];
}

// Paginated response
export interface PaginatedCallsResponse {
  items: CallWithAnalysis[];
  total: number;
  page: number;
  page_size: number;
}

// API response types
export interface CallAnalyticsResponse {
  metrics: CallIntelligenceMetrics;
  updated_at: string;
}

export interface AgentPerformanceResponse {
  agents: AgentPerformance[];
  total: number;
}

export interface DispositionStatsResponse {
  dispositions: DispositionStats[];
  total_calls: number;
}

export interface QualityHeatmapResponse {
  data: QualityHeatmapData[];
  date_range: {
    start: string;
    end: string;
  };
}

export interface CoachingInsightsResponse {
  insights: CoachingInsights;
  period: string;
}
