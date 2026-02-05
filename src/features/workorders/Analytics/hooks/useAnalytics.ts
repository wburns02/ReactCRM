/**
 * Analytics hooks for Work Order Dashboard
 *
 * Fetches real data from the API. No mock data generators.
 * Hooks return null when analytics API endpoints are not yet available.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
  WorkOrderKPIs,
  WorkOrderStatus,
  JobType,
} from "@/api/types/workOrder.ts";
import type { TechnicianMetrics } from "../TechnicianPerformance.tsx";
import type { RevenueDataPoint } from "../RevenueChart.tsx";
import type {
  StatusDistribution,
  CompletionTrendPoint,
} from "../CompletionRates.tsx";
import type {
  CustomerReview,
  RatingDistribution,
  SatisfactionTrend,
} from "../CustomerSatisfaction.tsx";
import type {
  DemandForecast,
  BusyPeriodAlert,
  EquipmentAlert,
  RevenueProjection,
} from "../PredictiveInsights.tsx";

export interface DateRange {
  start: string;
  end: string;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  technicianId?: string;
  jobType?: JobType;
  status?: WorkOrderStatus;
}

/**
 * Hook for fetching work order statistics
 */
export function useWorkOrderStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ["workOrderStats", dateRange],
    queryFn: async (): Promise<WorkOrderKPIs | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/stats", {
          params: { start_date: dateRange.start, end_date: dateRange.end },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching technician metrics
 */
export function useTechnicianMetrics(techId?: string, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["technicianMetrics", techId, dateRange],
    queryFn: async (): Promise<TechnicianMetrics[] | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/technician-metrics", {
          params: {
            technician_id: techId,
            start_date: dateRange?.start,
            end_date: dateRange?.end,
          },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching revenue data
 */
export function useRevenueData(
  dateRange: DateRange,
  groupBy: "daily" | "weekly" | "monthly" = "daily",
) {
  return useQuery({
    queryKey: ["revenueData", dateRange, groupBy],
    queryFn: async (): Promise<RevenueDataPoint[] | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/revenue", {
          params: {
            start_date: dateRange.start,
            end_date: dateRange.end,
            group_by: groupBy,
          },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching KPIs with comparison to previous period
 */
export function useKPIs(dateRange: DateRange) {
  const currentQuery = useQuery({
    queryKey: ["kpis", "current", dateRange],
    queryFn: async (): Promise<WorkOrderKPIs | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/stats", {
          params: { start_date: dateRange.start, end_date: dateRange.end },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate previous period
  const previousDateRange = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const duration = end.getTime() - start.getTime();

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    return {
      start: prevStart.toISOString().split("T")[0],
      end: prevEnd.toISOString().split("T")[0],
    };
  }, [dateRange]);

  const previousQuery = useQuery({
    queryKey: ["kpis", "previous", previousDateRange],
    queryFn: async (): Promise<WorkOrderKPIs | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/stats", {
          params: {
            start_date: previousDateRange.start,
            end_date: previousDateRange.end,
          },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    current: currentQuery.data,
    previous: previousQuery.data,
    isLoading: currentQuery.isLoading || previousQuery.isLoading,
    error: currentQuery.error || previousQuery.error,
  };
}

/**
 * Hook for completion rates data
 */
export function useCompletionRates(dateRange: DateRange) {
  return useQuery({
    queryKey: ["completionRates", dateRange],
    queryFn: async (): Promise<{
      statusDistribution: StatusDistribution[];
      trendData: CompletionTrendPoint[];
    } | null> => {
      try {
        const { data } = await apiClient.get("/work-orders/completion-rates", {
          params: { start_date: dateRange.start, end_date: dateRange.end },
        });
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for customer satisfaction data
 */
export function useCustomerSatisfaction(dateRange: DateRange) {
  return useQuery({
    queryKey: ["customerSatisfaction", dateRange],
    queryFn: async (): Promise<{
      overallScore: number;
      totalResponses: number;
      npsScore: number;
      ratingDistribution: RatingDistribution[];
      recentReviews: CustomerReview[];
      trendData: SatisfactionTrend[];
    } | null> => {
      try {
        const { data } = await apiClient.get(
          "/work-orders/customer-satisfaction",
          {
            params: { start_date: dateRange.start, end_date: dateRange.end },
          },
        );
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for predictive insights data
 */
export function usePredictiveInsights() {
  return useQuery({
    queryKey: ["predictiveInsights"],
    queryFn: async (): Promise<{
      demandForecast: DemandForecast[];
      busyPeriodAlerts: BusyPeriodAlert[];
      equipmentAlerts: EquipmentAlert[];
      revenueProjections: RevenueProjection[];
    } | null> => {
      try {
        const { data } = await apiClient.get(
          "/work-orders/predictive-insights",
        );
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Combined analytics hook for the dashboard
 */
export function useAnalyticsDashboard(filters: AnalyticsFilters) {
  const kpis = useKPIs(filters.dateRange);
  const techMetrics = useTechnicianMetrics(
    filters.technicianId,
    filters.dateRange,
  );
  const revenueData = useRevenueData(filters.dateRange);
  const completionRates = useCompletionRates(filters.dateRange);
  const satisfaction = useCustomerSatisfaction(filters.dateRange);
  const predictions = usePredictiveInsights();

  return {
    kpis,
    technicianMetrics: techMetrics.data,
    revenueData: revenueData.data,
    completionRates: completionRates.data,
    satisfaction: satisfaction.data,
    predictions: predictions.data,
    isLoading:
      kpis.isLoading ||
      techMetrics.isLoading ||
      revenueData.isLoading ||
      completionRates.isLoading ||
      satisfaction.isLoading ||
      predictions.isLoading,
    error:
      kpis.error ||
      techMetrics.error ||
      revenueData.error ||
      completionRates.error ||
      satisfaction.error ||
      predictions.error,
  };
}
