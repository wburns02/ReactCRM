import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import {
  revenueReportSchema,
  technicianReportSchema,
  customerReportSchema,
  pipelineMetricsSchema,
  type RevenueReport,
  type TechnicianReport,
  type CustomerReport,
  type PipelineMetrics,
  type DateRange,
} from './types.ts';

/**
 * Query keys for reports
 */
export const reportKeys = {
  all: ['reports'] as const,
  revenue: (dateRange?: DateRange) => [...reportKeys.all, 'revenue', dateRange] as const,
  technician: (dateRange?: DateRange) => [...reportKeys.all, 'technician', dateRange] as const,
  customer: (dateRange?: DateRange) => [...reportKeys.all, 'customer', dateRange] as const,
  pipeline: () => [...reportKeys.all, 'pipeline'] as const,
};

/**
 * Fetch revenue metrics and report data
 */
export function useRevenueMetrics(dateRange?: DateRange) {
  return useQuery({
    queryKey: reportKeys.revenue(dateRange),
    queryFn: async (): Promise<RevenueReport> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set('start_date', dateRange.start_date);
      if (dateRange?.end_date) params.set('end_date', dateRange.end_date);

      const url = '/reports/revenue?' + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = revenueReportSchema.safeParse(data);
        if (!result.success) {
          console.warn('Revenue report response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch technician performance metrics
 */
export function useTechnicianMetrics(dateRange?: DateRange) {
  return useQuery({
    queryKey: reportKeys.technician(dateRange),
    queryFn: async (): Promise<TechnicianReport> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set('start_date', dateRange.start_date);
      if (dateRange?.end_date) params.set('end_date', dateRange.end_date);

      const url = '/reports/technician?' + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = technicianReportSchema.safeParse(data);
        if (!result.success) {
          console.warn('Technician report response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch customer metrics and growth data
 */
export function useCustomerMetrics(dateRange?: DateRange) {
  return useQuery({
    queryKey: reportKeys.customer(dateRange),
    queryFn: async (): Promise<CustomerReport> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set('start_date', dateRange.start_date);
      if (dateRange?.end_date) params.set('end_date', dateRange.end_date);

      const url = '/reports/customers?' + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = customerReportSchema.safeParse(data);
        if (!result.success) {
          console.warn('Customer report response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch pipeline metrics for prospects/leads
 */
export function usePipelineMetrics() {
  return useQuery({
    queryKey: reportKeys.pipeline(),
    queryFn: async (): Promise<PipelineMetrics> => {
      const { data } = await apiClient.get('/reports/pipeline');

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = pipelineMetricsSchema.safeParse(data);
        if (!result.success) {
          console.warn('Pipeline metrics response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Export report to file
 */
export async function exportReport(
  reportType: string,
  format: 'csv' | 'pdf' | 'excel',
  dateRange?: DateRange
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('format', format);
  if (dateRange?.start_date) params.set('start_date', dateRange.start_date);
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date);

  const url = `/reports/${reportType}/export?` + params.toString();
  const { data } = await apiClient.get(url, {
    responseType: 'blob',
  });

  return data;
}
