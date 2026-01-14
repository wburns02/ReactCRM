import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
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
} from "./types.ts";

/**
 * Query keys for reports
 */
export const reportKeys = {
  all: ["reports"] as const,
  revenue: (dateRange?: DateRange) =>
    [...reportKeys.all, "revenue", dateRange] as const,
  technician: (dateRange?: DateRange) =>
    [...reportKeys.all, "technician", dateRange] as const,
  customer: (dateRange?: DateRange) =>
    [...reportKeys.all, "customer", dateRange] as const,
  pipeline: () => [...reportKeys.all, "pipeline"] as const,
};

/**
 * Fetch revenue metrics and report data
 */
export function useRevenueMetrics(dateRange?: DateRange) {
  return useQuery({
    queryKey: reportKeys.revenue(dateRange),
    queryFn: async (): Promise<RevenueReport> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/revenue?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = revenueReportSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Revenue report response validation failed:",
            result.error,
          );
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
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/technician?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = technicianReportSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Technician report response validation failed:",
            result.error,
          );
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
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/customers?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = customerReportSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Customer report response validation failed:",
            result.error,
          );
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
      const { data } = await apiClient.get("/reports/pipeline");

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = pipelineMetricsSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Pipeline metrics response validation failed:",
            result.error,
          );
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
  format: "csv" | "pdf" | "excel",
  dateRange?: DateRange,
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
  if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

  const url = `/reports/${reportType}/export?` + params.toString();
  const { data } = await apiClient.get(url, {
    responseType: "blob",
  });

  return data;
}

// ========================
// Enhanced Reports (Phase 7)
// ========================

export interface RevenueByServiceItem {
  service_type: string;
  job_count: number;
  revenue: number;
  average_job_value: number;
}

export interface RevenueByServiceResponse {
  period: { start_date: string; end_date: string };
  services: RevenueByServiceItem[];
  total_revenue: number;
}

export interface RevenueByTechnicianItem {
  technician_id: string;
  technician_name: string;
  jobs_completed: number;
  revenue: number;
  average_job_value: number;
}

export interface RevenueByTechnicianResponse {
  period: { start_date: string; end_date: string };
  technicians: RevenueByTechnicianItem[];
  total_revenue: number;
}

export interface RevenueByLocationItem {
  location: string;
  job_count: number;
  revenue: number;
}

export interface RevenueByLocationResponse {
  period: { start_date: string; end_date: string };
  locations: RevenueByLocationItem[];
  total_revenue: number;
}

export interface CustomerLTVItem {
  customer_id: string;
  customer_name: string;
  lifetime_value: number;
  total_jobs: number;
  tenure_months: number;
  monthly_value: number;
}

export interface CustomerLTVResponse {
  customers: CustomerLTVItem[];
  average_ltv: number;
  total_customers_analyzed: number;
}

export interface TechPerformanceItem {
  technician_id: string;
  technician_name: string;
  jobs_completed: number;
  jobs_assigned: number;
  completion_rate: number;
  revenue_generated: number;
  jobs_per_day: number;
  on_time_rate: number;
  customer_rating: number;
}

export interface TechPerformanceResponse {
  period: { start_date: string; end_date: string };
  technicians: TechPerformanceItem[];
}

/**
 * Fetch revenue by service type
 */
export function useRevenueByService(dateRange?: DateRange) {
  return useQuery({
    queryKey: [...reportKeys.all, "revenue-by-service", dateRange],
    queryFn: async (): Promise<RevenueByServiceResponse> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/revenue-by-service?" + params.toString();
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch revenue by technician
 */
export function useRevenueByTechnician(dateRange?: DateRange) {
  return useQuery({
    queryKey: [...reportKeys.all, "revenue-by-technician", dateRange],
    queryFn: async (): Promise<RevenueByTechnicianResponse> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/revenue-by-technician?" + params.toString();
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch revenue by location
 */
export function useRevenueByLocation(
  dateRange?: DateRange,
  groupBy: "city" | "state" | "zip" = "city",
) {
  return useQuery({
    queryKey: [...reportKeys.all, "revenue-by-location", dateRange, groupBy],
    queryFn: async (): Promise<RevenueByLocationResponse> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);
      params.set("group_by", groupBy);

      const url = "/reports/revenue-by-location?" + params.toString();
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch customer lifetime value
 */
export function useCustomerLTV(topN: number = 50) {
  return useQuery({
    queryKey: [...reportKeys.all, "customer-ltv", topN],
    queryFn: async (): Promise<CustomerLTVResponse> => {
      const url = `/reports/customer-lifetime-value?top_n=${topN}`;
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch technician performance
 */
export function useTechnicianPerformance(dateRange?: DateRange) {
  return useQuery({
    queryKey: [...reportKeys.all, "technician-performance", dateRange],
    queryFn: async (): Promise<TechPerformanceResponse> => {
      const params = new URLSearchParams();
      if (dateRange?.start_date) params.set("start_date", dateRange.start_date);
      if (dateRange?.end_date) params.set("end_date", dateRange.end_date);

      const url = "/reports/technician-performance?" + params.toString();
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000,
  });
}
