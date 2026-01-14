/**
 * Call Intelligence Dashboard Feature
 * Export all components and hooks for the call analytics dashboard
 */

// Main page component
export { CallIntelligenceDashboard } from "./CallIntelligenceDashboard";

// Component exports
export { KPICards } from "./components/KPICards";
export { SentimentTrendChart } from "./components/SentimentTrendChart";
export { QualityHeatmap } from "./components/QualityHeatmap";
export { DispositionDonut } from "./components/DispositionDonut";
export { EscalationGauge } from "./components/EscalationGauge";
export { AgentLeaderboard } from "./components/AgentLeaderboard";
export { CoachingInsightsPanel } from "./components/CoachingInsightsPanel";
export { RecentCallsTable } from "./components/RecentCallsTable";
export { CallDetailModal } from "./components/CallDetailModal";
export { DashboardFilters } from "./components/DashboardFilters";

// API hooks
export {
  useCallAnalytics,
  useCallsWithAnalysis,
  useAgentPerformance,
  useDispositionStats,
  useQualityHeatmap,
  useCoachingInsights,
  callIntelligenceKeys,
} from "./api";

// Types
export type {
  CallWithAnalysis,
  CallIntelligenceMetrics,
  AgentPerformance,
  DispositionStats,
  QualityHeatmapData,
  CoachingInsights,
  DashboardFilters as DashboardFiltersType,
  TrendDataPoint,
  SentimentLevel,
  EscalationRisk,
  DispositionCategory,
} from "./types";
