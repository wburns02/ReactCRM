import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  PayrollPeriod,
  TimeEntry,
  Commission,
  TechnicianPayRate,
  PayrollSummary,
  CreatePayrollPeriodInput,
  UpdateTimeEntryInput,
  UpdateCommissionInput,
  UpdatePayRateInput,
} from "@/api/types/payroll.ts";

/**
 * Payroll Periods
 */
export function usePayrollPeriods(params?: { status?: string; year?: number }) {
  return useQuery({
    queryKey: ["payroll", "periods", params],
    queryFn: async (): Promise<PayrollPeriod[]> => {
      const { data } = await apiClient.get("/payroll/periods", { params });
      return data.periods || [];
    },
  });
}

export function usePayrollPeriod(periodId: string) {
  return useQuery({
    queryKey: ["payroll", "periods", periodId],
    queryFn: async (): Promise<PayrollPeriod> => {
      const { data } = await apiClient.get(`/payroll/periods/${periodId}`);
      return data;
    },
    enabled: !!periodId,
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
      return data.summaries || [];
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
      return data.entries || [];
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
      return data.commissions || [];
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
      return data.rates || [];
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
      const { data } = await apiClient.get(
        `/payroll/periods/${periodId}/export`,
        {
          params: { format },
          responseType: "blob",
        },
      );
      return data;
    },
  });
}
