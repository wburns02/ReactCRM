import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { validateResponse } from "@/api/validateResponse.ts";
import type {
  PayrollPeriod,
  TimeEntry,
  Commission,
  TechnicianPayRate,
  PayrollSummary,
  CreatePayrollPeriodInput,
  UpdatePayrollPeriodInput,
  UpdateTimeEntryInput,
  CreateCommissionInput,
  UpdateCommissionInput,
  UpdatePayRateInput,
  CommissionStats,
  CommissionInsight,
  CommissionLeaderboardEntry,
  CommissionFilters,
  CommissionListResponse,
  WorkOrderForCommission,
  CommissionCalculation,
} from "@/api/types/payroll.ts";
import {
  payrollPeriodsResponseSchema,
  timeEntriesResponseSchema,
  commissionsResponseSchema,
  payRatesResponseSchema,
  payrollSummaryResponseSchema,
  payrollPeriodSchema,
} from "@/api/types/payroll.ts";

/**
 * Payroll Periods
 */
export function usePayrollPeriods(params?: { status?: string; year?: number }) {
  return useQuery({
    queryKey: ["payroll", "periods", params],
    queryFn: async (): Promise<PayrollPeriod[]> => {
      const { data } = await apiClient.get("/payroll/periods", { params });
      const validated = validateResponse(
        payrollPeriodsResponseSchema,
        data,
        "/payroll/periods"
      );
      return validated.periods || [];
    },
  });
}

export function usePayrollPeriod(periodId: string) {
  return useQuery({
    queryKey: ["payroll", "periods", periodId],
    queryFn: async (): Promise<PayrollPeriod> => {
      const { data } = await apiClient.get(`/payroll/periods/${periodId}`);
      return validateResponse(payrollPeriodSchema, data, `/payroll/periods/${periodId}`);
    },
    enabled: !!periodId,
  });
}

/**
 * Get current or most recent payroll period
 */
export function useCurrentPayrollPeriod() {
  return useQuery({
    queryKey: ["payroll", "periods", "current"],
    queryFn: async (): Promise<PayrollPeriod> => {
      const { data } = await apiClient.get("/payroll/periods/current");
      return data;
    },
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePayrollPeriodInput,
    ): Promise<PayrollPeriod> => {
      const { data } = await apiClient.post("/payroll/periods", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

export function useUpdatePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      periodId,
      input,
    }: {
      periodId: string;
      input: UpdatePayrollPeriodInput;
    }): Promise<PayrollPeriod> => {
      const { data } = await apiClient.patch(
        `/payroll/periods/${periodId}`,
        input,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      queryClient.invalidateQueries({
        queryKey: ["payroll", "periods", variables.periodId],
      });
    },
    onError: (error) => {
      console.error("Failed to update payroll period:", error);
    },
  });
}

export function useApprovePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string): Promise<PayrollPeriod> => {
      const { data } = await apiClient.post(
        `/payroll/periods/${periodId}/approve`,
      );
      return data;
    },
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      queryClient.invalidateQueries({
        queryKey: ["payroll", "periods", periodId],
      });
    },
    onError: (error) => {
      console.error("Failed to approve payroll period:", error);
    },
  });
}

export function useProcessPayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string): Promise<PayrollPeriod> => {
      const { data } = await apiClient.post(
        `/payroll/periods/${periodId}/process`,
      );
      return data;
    },
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      queryClient.invalidateQueries({
        queryKey: ["payroll", "periods", periodId],
      });
    },
  });
}

export function useDeletePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string): Promise<void> => {
      await apiClient.delete(`/payroll/periods/${periodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
    onError: (error) => {
      console.error("Failed to delete payroll period:", error);
    },
  });
}

/**
 * Payroll Summary for a Period
 */
export function usePayrollSummary(periodId: string) {
  return useQuery({
    queryKey: ["payroll", "periods", periodId, "summary"],
    queryFn: async (): Promise<PayrollSummary[]> => {
      const { data } = await apiClient.get(
        `/payroll/periods/${periodId}/summary`,
      );
      const validated = validateResponse(
        payrollSummaryResponseSchema,
        data,
        `/payroll/periods/${periodId}/summary`
      );
      return validated.summaries || [];
    },
    enabled: !!periodId,
  });
}

/**
 * Time Entries
 */
export function useTimeEntries(params?: {
  technician_id?: string;
  payroll_period_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["payroll", "time-entries", params],
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data } = await apiClient.get("/payroll/time-entries", { params });
      const validated = validateResponse(
        timeEntriesResponseSchema,
        data,
        "/payroll/time-entries"
      );
      return validated.entries || [];
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      input,
    }: {
      entryId: string;
      input: UpdateTimeEntryInput;
    }): Promise<TimeEntry> => {
      const { data } = await apiClient.patch(
        `/payroll/time-entries/${entryId}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

export function useBulkApproveTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryIds: string[]): Promise<{ approved: number }> => {
      const { data } = await apiClient.post(
        "/payroll/time-entries/bulk-approve",
        {
          entry_ids: entryIds,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      technician_id: string;
      entry_date: string;
      clock_in: string;
      clock_out?: string;
      work_order_id?: string;
      entry_type?: string;
      break_minutes?: number;
      notes?: string;
    }): Promise<TimeEntry> => {
      const { data } = await apiClient.post("/payroll/time-entries", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
    onError: (error) => {
      console.error("Failed to create time entry:", error);
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string): Promise<void> => {
      await apiClient.delete(`/payroll/time-entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
    onError: (error) => {
      console.error("Failed to delete time entry:", error);
    },
  });
}

/**
 * Commissions
 */
export function useCommissions(params?: {
  technician_id?: string;
  payroll_period_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["payroll", "commissions", params],
    queryFn: async (): Promise<Commission[]> => {
      const { data } = await apiClient.get("/payroll/commissions", { params });
      const validated = validateResponse(
        commissionsResponseSchema,
        data,
        "/payroll/commissions"
      );
      return validated.commissions || [];
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commissionId,
      input,
    }: {
      commissionId: string;
      input: UpdateCommissionInput;
    }): Promise<Commission> => {
      const { data } = await apiClient.patch(
        `/payroll/commissions/${commissionId}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "commissions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

export function useBulkApproveCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      commissionIds: string[],
    ): Promise<{ approved: number }> => {
      const { data } = await apiClient.post(
        "/payroll/commissions/bulk-approve",
        {
          commission_ids: commissionIds,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "commissions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

/**
 * Create a new commission
 */
export function useCreateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommissionInput): Promise<Commission> => {
      const { data } = await apiClient.post("/payroll/commissions", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "commissions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

/**
 * Delete a commission (only pending can be deleted)
 */
export function useDeleteCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commissionId: string): Promise<void> => {
      await apiClient.delete(`/payroll/commissions/${commissionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "commissions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

/**
 * Technician Pay Rates
 */
export function usePayRates(params?: {
  technician_id?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["payroll", "pay-rates", params],
    queryFn: async (): Promise<TechnicianPayRate[]> => {
      const { data } = await apiClient.get("/payroll/pay-rates", { params });
      const validated = validateResponse(
        payRatesResponseSchema,
        data,
        "/payroll/pay-rates"
      );
      return validated.rates || [];
    },
  });
}

export function usePayRate(rateId: string) {
  return useQuery({
    queryKey: ["payroll", "pay-rates", rateId],
    queryFn: async (): Promise<TechnicianPayRate> => {
      const { data } = await apiClient.get(`/payroll/pay-rates/${rateId}`);
      return data;
    },
    enabled: !!rateId,
  });
}

export function useCreatePayRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<TechnicianPayRate, "id">,
    ): Promise<TechnicianPayRate> => {
      const { data } = await apiClient.post("/payroll/pay-rates", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "pay-rates"] });
    },
  });
}

export function useUpdatePayRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rateId,
      input,
    }: {
      rateId: string;
      input: UpdatePayRateInput;
    }): Promise<TechnicianPayRate> => {
      const { data } = await apiClient.patch(
        `/payroll/pay-rates/${rateId}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "pay-rates"] });
    },
  });
}

export function useDeletePayRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rateId: string): Promise<void> => {
      await apiClient.delete(`/payroll/pay-rates/${rateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "pay-rates"] });
    },
  });
}

/**
 * Export Payroll
 */
export function useExportPayroll() {
  return useMutation({
    mutationFn: async ({
      periodId,
      format,
    }: {
      periodId: string;
      format: "csv" | "pdf" | "nacha";
    }): Promise<Blob> => {
      const { data } = await apiClient.post(
        `/payroll/${periodId}/export`,
        null,
        {
          params: { format },
          responseType: "blob",
        },
      );
      return data;
    },
  });
}

/**
 * Commission Dashboard Hooks
 */

/**
 * Fetch commission statistics for KPI cards
 */
export function useCommissionStats(params?: { period_id?: string }) {
  return useQuery({
    queryKey: ["payroll", "commissions", "stats", params],
    queryFn: async (): Promise<CommissionStats> => {
      const { data } = await apiClient.get("/payroll/commissions/stats", {
        params,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch AI-generated commission insights
 */
export function useCommissionInsights() {
  return useQuery({
    queryKey: ["payroll", "commissions", "insights"],
    queryFn: async (): Promise<CommissionInsight[]> => {
      const { data } = await apiClient.get("/payroll/commissions/insights");
      return data.insights || [];
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch commission leaderboard
 */
export function useCommissionLeaderboard(period?: string) {
  return useQuery({
    queryKey: ["payroll", "commissions", "leaderboard", period],
    queryFn: async (): Promise<CommissionLeaderboardEntry[]> => {
      const { data } = await apiClient.get("/payroll/commissions/leaderboard", {
        params: period ? { period_id: period } : undefined,
      });
      return data.entries || [];
    },
    staleTime: 60_000,
  });
}

/**
 * Enhanced commissions list with filtering and pagination
 */
export function useCommissionsList(filters: CommissionFilters) {
  return useQuery({
    queryKey: ["payroll", "commissions", "list", filters],
    queryFn: async (): Promise<CommissionListResponse> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "all") {
          params.set(key, String(value));
        }
      });
      const { data } = await apiClient.get(
        `/payroll/commissions?${params.toString()}`,
      );
      return {
        commissions: data.commissions || [],
        total: data.total || 0,
        page: data.page || 1,
        page_size: data.page_size || 20,
      };
    },
    staleTime: 15_000,
  });
}

/**
 * Bulk mark commissions as paid
 */
export function useBulkMarkPaidCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commissionIds: string[]): Promise<{ paid: number }> => {
      const { data } = await apiClient.post(
        "/payroll/commissions/bulk-mark-paid",
        {
          commission_ids: commissionIds,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "commissions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
  });
}

/**
 * Export commissions to CSV
 */
export function useExportCommissions() {
  return useMutation({
    mutationFn: async (filters: CommissionFilters): Promise<Blob> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "all") {
          params.set(key, String(value));
        }
      });
      const { data } = await apiClient.get("/payroll/commissions/export", {
        params,
        responseType: "blob",
      });
      return data;
    },
  });
}

/**
 * Commission Auto-Calculation Hooks
 */

/**
 * Fetch completed work orders that don't have commissions yet
 */
export function useWorkOrdersForCommission(params?: {
  technician_id?: string;
  job_type?: string;
}) {
  return useQuery({
    queryKey: ["payroll", "work-orders-for-commission", params],
    queryFn: async (): Promise<WorkOrderForCommission[]> => {
      const { data } = await apiClient.get(
        "/payroll/work-orders-for-commission",
        {
          params,
        },
      );
      return data.work_orders || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Calculate commission for a work order (with dump fee deduction if applicable)
 */
export function useCalculateCommission() {
  return useMutation({
    mutationFn: async (input: {
      work_order_id: string;
      dump_site_id?: string;
    }): Promise<CommissionCalculation> => {
      const { data } = await apiClient.post(
        "/payroll/commissions/calculate",
        input,
      );
      return data;
    },
  });
}

/**
 * Fetch commission rate configuration by job type
 */
export function useCommissionRates() {
  return useQuery({
    queryKey: ["payroll", "commission-rates"],
    queryFn: async () => {
      const { data } = await apiClient.get("/payroll/commission-rates");
      return data.rates as Array<{
        job_type: string;
        rate: number;
        apply_dump_fee: boolean;
      }>;
    },
    staleTime: 300_000, // 5 minutes
  });
}
