/**
 * Analytics hooks for Work Order Dashboard
 * Provides data fetching and computation for analytics components
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WorkOrderKPIs, WorkOrderStatus, JobType } from '@/api/types/workOrder.ts';
import type { TechnicianMetrics } from '../TechnicianPerformance.tsx';
import type { RevenueDataPoint } from '../RevenueChart.tsx';
import type { StatusDistribution, CompletionTrendPoint } from '../CompletionRates.tsx';
import type { CustomerReview, RatingDistribution, SatisfactionTrend } from '../CustomerSatisfaction.tsx';
import type { DemandForecast, BusyPeriodAlert, EquipmentAlert, RevenueProjection } from '../PredictiveInsights.tsx';

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
 * Generate mock KPIs for development
 */
function generateMockKPIs(dateRange: DateRange): WorkOrderKPIs {
  const days = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));
  const baseMultiplier = days / 30;

  return {
    totalCompleted: Math.round(145 * baseMultiplier),
    totalScheduled: Math.round(168 * baseMultiplier),
    totalCanceled: Math.round(12 * baseMultiplier),
    avgResponseTime: 2.3,
    avgCompletionTime: 1.8,
    avgTravelTime: 0.45,
    firstTimeFixRate: 87.5,
    customerSatisfaction: 4.6,
    callbackRate: 8.2,
    avgRevenuePerJob: 425,
    totalRevenue: Math.round(61625 * baseMultiplier),
    collectionRate: 94.2,
    utilizationRate: 78.5,
    jobsPerTechPerDay: 4.2,
  };
}

/**
 * Generate mock technician metrics
 */
function generateMockTechnicianMetrics(): TechnicianMetrics[] {
  const names = [
    'John Martinez',
    'Sarah Johnson',
    'Mike Williams',
    'Emily Davis',
    'David Brown',
    'Lisa Anderson',
    'Robert Taylor',
    'Jennifer Wilson',
  ];

  return names.map((name, index) => ({
    id: `tech-${index + 1}`,
    name,
    jobsCompleted: Math.floor(25 + Math.random() * 30),
    avgCompletionTime: 1.2 + Math.random() * 1.5,
    customerRating: 3.8 + Math.random() * 1.2,
    revenueGenerated: Math.floor(8000 + Math.random() * 12000),
    efficiency: Math.floor(70 + Math.random() * 25),
    firstTimeFixRate: Math.floor(80 + Math.random() * 18),
  }));
}

/**
 * Generate mock revenue data
 */
function generateMockRevenueData(dateRange: DateRange): RevenueDataPoint[] {
  const data: RevenueDataPoint[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseRevenue = isWeekend ? 800 : 2500;

    data.push({
      date: current.toISOString().split('T')[0],
      revenue: Math.floor(baseRevenue + Math.random() * 1500),
      previousRevenue: Math.floor(baseRevenue * 0.9 + Math.random() * 1200),
      workOrders: Math.floor((isWeekend ? 2 : 6) + Math.random() * 4),
      previousWorkOrders: Math.floor((isWeekend ? 2 : 5) + Math.random() * 3),
    });

    current.setDate(current.getDate() + 1);
  }

  return data;
}

/**
 * Generate mock status distribution
 */
function generateMockStatusDistribution(): StatusDistribution[] {
  return [
    { status: 'completed', count: 145, label: 'Completed' },
    { status: 'scheduled', count: 23, label: 'Scheduled' },
    { status: 'in_progress', count: 8, label: 'In Progress' },
    { status: 'canceled', count: 12, label: 'Canceled' },
    { status: 'draft', count: 5, label: 'Draft' },
    { status: 'confirmed', count: 15, label: 'Confirmed' },
    { status: 'requires_followup', count: 7, label: 'Requires Follow-up' },
  ];
}

/**
 * Generate mock completion trend data
 */
function generateMockCompletionTrend(dateRange: DateRange): CompletionTrendPoint[] {
  const data: CompletionTrendPoint[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const current = new Date(start);

  // Group by week
  while (current <= end) {
    data.push({
      date: current.toISOString().split('T')[0],
      completionRate: 82 + Math.random() * 12,
      cancellationRate: 3 + Math.random() * 5,
      followUpRate: 5 + Math.random() * 6,
      total: Math.floor(30 + Math.random() * 20),
    });

    current.setDate(current.getDate() + 7);
  }

  return data;
}

/**
 * Generate mock customer satisfaction data
 */
function generateMockSatisfactionData(): {
  reviews: CustomerReview[];
  distribution: RatingDistribution[];
  trend: SatisfactionTrend[];
} {
  const reviews: CustomerReview[] = [
    {
      id: '1',
      customerName: 'Robert Thompson',
      rating: 5,
      comment: 'Excellent service! The technician was professional and thorough.',
      workOrderId: 'WO-2024-001',
      technicianName: 'John Martinez',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      customerName: 'Susan Miller',
      rating: 4,
      comment: 'Good work overall. Arrived on time and fixed the issue quickly.',
      workOrderId: 'WO-2024-002',
      technicianName: 'Sarah Johnson',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      customerName: 'James Wilson',
      rating: 5,
      comment: 'Very satisfied with the service. Will definitely use again!',
      workOrderId: 'WO-2024-003',
      technicianName: 'Mike Williams',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      customerName: 'Patricia Davis',
      rating: 3,
      comment: 'Service was okay but could have been faster.',
      workOrderId: 'WO-2024-004',
      technicianName: 'Emily Davis',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      customerName: 'Michael Brown',
      rating: 5,
      comment: 'Outstanding work! Very professional team.',
      workOrderId: 'WO-2024-005',
      technicianName: 'David Brown',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const distribution: RatingDistribution[] = [
    { rating: 5, count: 68 },
    { rating: 4, count: 42 },
    { rating: 3, count: 18 },
    { rating: 2, count: 5 },
    { rating: 1, count: 2 },
  ];

  const trend: SatisfactionTrend[] = [];
  for (let i = 12; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    trend.push({
      date: date.toISOString().split('T')[0],
      avgRating: 4.2 + Math.random() * 0.6,
      responseCount: Math.floor(8 + Math.random() * 12),
      nps: Math.floor(35 + Math.random() * 30),
    });
  }

  return { reviews, distribution, trend };
}

/**
 * Generate mock predictive insights data
 */
function generateMockPredictiveData(): {
  demandForecast: DemandForecast[];
  busyPeriodAlerts: BusyPeriodAlert[];
  equipmentAlerts: EquipmentAlert[];
  revenueProjections: RevenueProjection[];
} {
  const demandForecast: DemandForecast[] = [];
  const today = new Date();

  // Past 14 days with actuals
  for (let i = 14; i > 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseValue = isWeekend ? 3 : 8;
    const actual = Math.floor(baseValue + Math.random() * 4);

    demandForecast.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.floor(baseValue + Math.random() * 3),
      actual,
      lowerBound: Math.max(0, baseValue - 2),
      upperBound: baseValue + 5,
    });
  }

  // Future 30 days predictions
  for (let i = 0; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseValue = isWeekend ? 3 : 8;

    demandForecast.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.floor(baseValue + Math.random() * 3),
      lowerBound: Math.max(0, baseValue - 2),
      upperBound: baseValue + 5,
    });
  }

  const busyPeriodAlerts: BusyPeriodAlert[] = [
    {
      id: '1',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      expectedVolume: 45,
      normalVolume: 24,
      severity: 'high',
      reason: 'Spring maintenance season typically sees 80% increase in pumping requests',
    },
    {
      id: '2',
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      expectedVolume: 32,
      normalVolume: 24,
      severity: 'medium',
      reason: 'Holiday weekend typically increases emergency calls',
    },
  ];

  const equipmentAlerts: EquipmentAlert[] = [
    {
      id: '1',
      equipmentId: 'PUMP-001',
      equipmentName: 'Vacuum Pump - Truck 3',
      failureProbability: 75,
      predictedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Schedule preventive maintenance. Replace seals and check motor bearings.',
      priority: 'high',
    },
    {
      id: '2',
      equipmentId: 'TANK-002',
      equipmentName: 'Storage Tank B',
      failureProbability: 45,
      predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Inspect tank integrity during next scheduled maintenance window.',
      priority: 'medium',
    },
    {
      id: '3',
      equipmentId: 'HOSE-015',
      equipmentName: 'Suction Hose Set - Truck 1',
      failureProbability: 30,
      predictedDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Monitor for wear. Order replacement parts proactively.',
      priority: 'low',
    },
  ];

  const revenueProjections: RevenueProjection[] = [];

  // Past 30 days with actuals
  for (let i = 30; i > 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseValue = isWeekend ? 1000 : 3000;

    revenueProjections.push({
      date: date.toISOString().split('T')[0],
      projected: Math.floor(baseValue + Math.random() * 1500),
      optimistic: Math.floor(baseValue * 1.2 + Math.random() * 2000),
      pessimistic: Math.floor(baseValue * 0.8 + Math.random() * 1000),
      actual: Math.floor(baseValue + Math.random() * 1800),
    });
  }

  // Future 30 days projections
  for (let i = 0; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseValue = isWeekend ? 1000 : 3000;

    revenueProjections.push({
      date: date.toISOString().split('T')[0],
      projected: Math.floor(baseValue + Math.random() * 1500),
      optimistic: Math.floor(baseValue * 1.2 + Math.random() * 2000),
      pessimistic: Math.floor(baseValue * 0.8 + Math.random() * 1000),
    });
  }

  return { demandForecast, busyPeriodAlerts, equipmentAlerts, revenueProjections };
}

/**
 * Hook for fetching work order statistics
 */
export function useWorkOrderStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ['workOrderStats', dateRange],
    queryFn: async () => {
      // In production, this would call the API
      // For now, return mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      return generateMockKPIs(dateRange);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching technician metrics
 */
export function useTechnicianMetrics(techId?: string, dateRange?: DateRange) {
  return useQuery({
    queryKey: ['technicianMetrics', techId, dateRange],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const metrics = generateMockTechnicianMetrics();
      if (techId) {
        return metrics.filter((m) => m.id === techId);
      }
      return metrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching revenue data
 */
export function useRevenueData(dateRange: DateRange, groupBy: 'daily' | 'weekly' | 'monthly' = 'daily') {
  return useQuery({
    queryKey: ['revenueData', dateRange, groupBy],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return generateMockRevenueData(dateRange);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching KPIs with comparison to previous period
 */
export function useKPIs(dateRange: DateRange) {
  const currentQuery = useQuery({
    queryKey: ['kpis', 'current', dateRange],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return generateMockKPIs(dateRange);
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
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const previousQuery = useQuery({
    queryKey: ['kpis', 'previous', previousDateRange],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return generateMockKPIs(previousDateRange);
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
    queryKey: ['completionRates', dateRange],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        statusDistribution: generateMockStatusDistribution(),
        trendData: generateMockCompletionTrend(dateRange),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for customer satisfaction data
 */
export function useCustomerSatisfaction(dateRange: DateRange) {
  return useQuery({
    queryKey: ['customerSatisfaction', dateRange],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = generateMockSatisfactionData();
      const totalResponses = data.distribution.reduce((sum, d) => sum + d.count, 0);
      const totalRating = data.distribution.reduce((sum, d) => sum + d.rating * d.count, 0);
      const avgRating = totalRating / totalResponses;

      // Calculate NPS (simplified)
      const promoters = data.distribution.filter((d) => d.rating >= 4).reduce((sum, d) => sum + d.count, 0);
      const detractors = data.distribution.filter((d) => d.rating <= 2).reduce((sum, d) => sum + d.count, 0);
      const nps = Math.round(((promoters - detractors) / totalResponses) * 100);

      return {
        overallScore: avgRating,
        totalResponses,
        npsScore: nps,
        ratingDistribution: data.distribution,
        recentReviews: data.reviews,
        trendData: data.trend,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for predictive insights data
 */
export function usePredictiveInsights() {
  return useQuery({
    queryKey: ['predictiveInsights'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return generateMockPredictiveData();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Combined analytics hook for the dashboard
 */
export function useAnalyticsDashboard(filters: AnalyticsFilters) {
  const kpis = useKPIs(filters.dateRange);
  const techMetrics = useTechnicianMetrics(filters.technicianId, filters.dateRange);
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
