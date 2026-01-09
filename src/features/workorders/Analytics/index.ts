/**
 * Work Order Analytics Module
 *
 * This module provides comprehensive analytics components for work order management,
 * including KPIs, charts, technician performance, and predictive insights.
 *
 * Usage:
 * ```tsx
 * import { WorkOrderDashboard } from '@/features/workorders/Analytics';
 *
 * // Full dashboard
 * <WorkOrderDashboard />
 *
 * // Or individual components
 * import { KPICards, RevenueChart, TechnicianPerformance } from '@/features/workorders/Analytics';
 * ```
 */

// Main Dashboard
export { WorkOrderDashboard } from './WorkOrderDashboard.tsx';

// Individual Components
export { KPICards } from './KPICards.tsx';
export { TechnicianPerformance, type TechnicianMetrics } from './TechnicianPerformance.tsx';
export { RevenueChart, type RevenueDataPoint } from './RevenueChart.tsx';
export { CompletionRates, type StatusDistribution, type CompletionTrendPoint } from './CompletionRates.tsx';
export { CustomerSatisfaction, type CustomerReview, type RatingDistribution, type SatisfactionTrend } from './CustomerSatisfaction.tsx';
export { PredictiveInsights, type DemandForecast, type BusyPeriodAlert, type EquipmentAlert, type RevenueProjection } from './PredictiveInsights.tsx';
export { ExportReports, type ReportType, type ExportFormat, type GeneratedReport, type ReportConfig } from './ExportReports.tsx';

// Hooks
export {
  useWorkOrderStats,
  useTechnicianMetrics,
  useRevenueData,
  useKPIs,
  useCompletionRates,
  useCustomerSatisfaction,
  usePredictiveInsights,
  useAnalyticsDashboard,
  type DateRange,
  type AnalyticsFilters,
} from './hooks/useAnalytics.ts';

// Utilities
export * from './utils/chartConfig.ts';
