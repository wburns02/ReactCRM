/**
 * Analytics API Hooks
 * Real-time embedded analytics and BI dashboards
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  TechnicianLocation,
  technicianLocationSchema,
  OperationsAlert,
  operationsAlertSchema,
  TodayStats,
  todayStatsSchema,
  DispatchQueueItem,
  dispatchQueueItemSchema,
  FinancialSnapshot,
  financialSnapshotSchema,
  PerformanceSummary,
  performanceSummarySchema,
  AIInsightsSummary,
  aiInsightsSummarySchema,
  DashboardFilters,
} from '@/api/types/analytics';
import { z } from 'zod';

// Query keys
export const analyticsKeys = {
  operations: {
    all: ['analytics', 'operations'] as const,
    locations: () => [...analyticsKeys.operations.all, 'locations'] as const,
    alerts: () => [...analyticsKeys.operations.all, 'alerts'] as const,
    todayStats: () => [...analyticsKeys.operations.all, 'today'] as const,
    dispatchQueue: () => [...analyticsKeys.operations.all, 'dispatch'] as const,
  },
  financial: {
    all: ['analytics', 'financial'] as const,
    snapshot: (filters?: DashboardFilters) =>
      [...analyticsKeys.financial.all, 'snapshot', filters] as const,
    arAging: () => [...analyticsKeys.financial.all, 'ar-aging'] as const,
    margins: () => [...analyticsKeys.financial.all, 'margins'] as const,
  },
  performance: {
    all: ['analytics', 'performance'] as const,
    summary: (filters?: DashboardFilters) =>
      [...analyticsKeys.performance.all, 'summary', filters] as const,
    technicians: () => [...analyticsKeys.performance.all, 'technicians'] as const,
    kpis: () => [...analyticsKeys.performance.all, 'kpis'] as const,
  },
  ai: {
    all: ['analytics', 'ai'] as const,
    insights: () => [...analyticsKeys.ai.all, 'insights'] as const,
    anomalies: () => [...analyticsKeys.ai.all, 'anomalies'] as const,
    predictions: () => [...analyticsKeys.ai.all, 'predictions'] as const,
  },
};

// ============================================
// Operations Command Center Hooks
// ============================================

/**
 * Get live technician locations
 */
export function useTechnicianLocations() {
  return useQuery({
    queryKey: analyticsKeys.operations.locations(),
    queryFn: async (): Promise<TechnicianLocation[]> => {
      const { data } = await apiClient.get('/analytics/operations/locations');
      return z.array(technicianLocationSchema).parse(data.locations || data);
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  });
}

/**
 * Get operations alerts (running late, customer waiting, etc.)
 */
export function useOperationsAlerts(acknowledged = false) {
  return useQuery({
    queryKey: analyticsKeys.operations.alerts(),
    queryFn: async (): Promise<OperationsAlert[]> => {
      const { data } = await apiClient.get('/analytics/operations/alerts', {
        params: { acknowledged },
      });
      return z.array(operationsAlertSchema).parse(data.alerts || data);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Acknowledge an operations alert
 */
export function useAcknowledgeOperationsAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<OperationsAlert> => {
      const { data } = await apiClient.post(`/analytics/operations/alerts/${alertId}/acknowledge`);
      return operationsAlertSchema.parse(data.alert || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.operations.alerts() });
    },
  });
}

/**
 * Get today's statistics
 */
export function useTodayStats() {
  return useQuery({
    queryKey: analyticsKeys.operations.todayStats(),
    queryFn: async (): Promise<TodayStats> => {
      const { data } = await apiClient.get('/analytics/operations/today');
      return todayStatsSchema.parse(data);
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get dispatch queue with AI suggestions
 */
export function useDispatchQueue() {
  return useQuery({
    queryKey: analyticsKeys.operations.dispatchQueue(),
    queryFn: async (): Promise<DispatchQueueItem[]> => {
      const { data } = await apiClient.get('/analytics/operations/dispatch-queue');
      return z.array(dispatchQueueItemSchema).parse(data.queue || data);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Accept AI dispatch suggestion
 */
export function useAcceptDispatchSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      work_order_id: string;
      technician_id: string;
    }): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post('/analytics/operations/dispatch-queue/accept', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.operations.dispatchQueue() });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.operations.locations() });
    },
  });
}

// ============================================
// Financial Dashboard Hooks
// ============================================

/**
 * Get financial snapshot (revenue, AR aging, margins)
 */
export function useFinancialSnapshot(filters?: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.financial.snapshot(filters),
    queryFn: async (): Promise<FinancialSnapshot> => {
      const { data } = await apiClient.get('/analytics/financial/snapshot', {
        params: filters,
      });
      return financialSnapshotSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get detailed AR aging report
 */
export function useARAgingDetails() {
  return useQuery({
    queryKey: analyticsKeys.financial.arAging(),
    queryFn: async (): Promise<{
      buckets: FinancialSnapshot['ar_aging'];
      invoices: {
        id: string;
        customer_name: string;
        amount: number;
        days_outstanding: number;
        bucket: string;
      }[];
    }> => {
      const { data } = await apiClient.get('/analytics/financial/ar-aging');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get margin analysis by job type
 */
export function useMarginAnalysis() {
  return useQuery({
    queryKey: analyticsKeys.financial.margins(),
    queryFn: async (): Promise<FinancialSnapshot['margins_by_type']> => {
      const { data } = await apiClient.get('/analytics/financial/margins');
      return data.margins || data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Performance Scorecard Hooks
// ============================================

/**
 * Get performance summary (technician scores, KPI trends)
 */
export function usePerformanceSummary(filters?: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.performance.summary(filters),
    queryFn: async (): Promise<PerformanceSummary> => {
      const { data } = await apiClient.get('/analytics/performance/summary', {
        params: filters,
      });
      return performanceSummarySchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get detailed technician performance
 */
export function useTechnicianPerformance(technicianId: string) {
  return useQuery({
    queryKey: [...analyticsKeys.performance.technicians(), technicianId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/analytics/performance/technicians/${technicianId}`);
      return data;
    },
    enabled: !!technicianId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get KPI trending data
 */
export function useKPITrends(metric: string, period: string = '30d') {
  return useQuery({
    queryKey: [...analyticsKeys.performance.kpis(), metric, period],
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/performance/kpi-trends', {
        params: { metric, period },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// AI Insights Hooks
// ============================================

/**
 * Get AI insights summary
 */
export function useAIInsights() {
  return useQuery({
    queryKey: analyticsKeys.ai.insights(),
    queryFn: async (): Promise<AIInsightsSummary> => {
      const { data } = await apiClient.get('/analytics/ai/insights');
      return aiInsightsSummarySchema.parse(data);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get anomaly details
 */
export function useAnomalyDetails(anomalyId: string) {
  return useQuery({
    queryKey: [...analyticsKeys.ai.anomalies(), anomalyId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/analytics/ai/anomalies/${anomalyId}`);
      return data;
    },
    enabled: !!anomalyId,
  });
}

/**
 * Dismiss an anomaly alert
 */
export function useDismissAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { anomaly_id: string; reason?: string }): Promise<void> => {
      await apiClient.post(`/analytics/ai/anomalies/${params.anomaly_id}/dismiss`, {
        reason: params.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.ai.insights() });
    },
  });
}

/**
 * Execute an AI-recommended action
 */
export function useExecuteInsightAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      insight_id: string;
      action_type: string;
      action_params?: Record<string, unknown>;
    }): Promise<{ success: boolean; result?: unknown }> => {
      const { data } = await apiClient.post(`/analytics/ai/insights/${params.insight_id}/execute`, {
        action_type: params.action_type,
        params: params.action_params,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.ai.insights() });
    },
  });
}

/**
 * Get predictions for a metric
 */
export function usePredictions(metric: string, horizon: string = '7d') {
  return useQuery({
    queryKey: [...analyticsKeys.ai.predictions(), metric, horizon],
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/ai/predictions', {
        params: { metric, horizon },
      });
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Ask "why" about a metric change
 */
export function useMetricExplanation() {
  return useMutation({
    mutationFn: async (params: {
      metric: string;
      period: string;
      question?: string;
    }): Promise<{
      explanation: string;
      factors: { factor: string; impact: number; direction: 'positive' | 'negative' }[];
      recommendations: string[];
    }> => {
      const { data } = await apiClient.post('/analytics/ai/explain', params);
      return data;
    },
  });
}
