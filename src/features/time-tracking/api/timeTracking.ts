import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// ========================
// Types
// ========================

export interface TimeEntry {
  id: string;
  technician_id: string;
  technician_name?: string;
  entry_date: string;
  date?: string;
  clock_in: string | null;
  clock_out: string | null;
  regular_hours: number;
  overtime_hours: number;
  break_minutes: number;
  entry_type: string;
  status: string;
  work_order_id: string | null;
  notes: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  clock_in_latitude?: number | null;
  clock_in_longitude?: number | null;
  clock_out_latitude?: number | null;
  clock_out_longitude?: number | null;
  created_at?: string;
}

export interface TimeEntryCreate {
  technician_id: string;
  entry_date: string;
  clock_in: string;
  clock_out?: string;
  work_order_id?: string;
  entry_type?: string;
  break_minutes?: number;
  notes?: string;
}

export interface TimeEntryUpdate {
  clock_in?: string;
  clock_out?: string;
  notes?: string;
  status?: "pending" | "approved" | "rejected";
  regular_hours?: number;
  overtime_hours?: number;
}

export interface TimeEntryFilters {
  technician_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface TimeEntriesResponse {
  entries: TimeEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface PayrollPeriod {
  id: string;
  start_date: string;
  end_date: string;
  period_type: string;
  status: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_gross_pay: number;
  total_commissions: number;
  technician_count: number;
}

export interface PayrollStats {
  current_period: {
    hours: number;
    amount: number;
  } | null;
  ytd_gross_pay: number;
  ytd_commissions: number;
  pending_approvals: number;
}

export interface Timesheet {
  technician_id: string;
  week_start: string;
  week_end: string;
  entries: TimeEntry[];
  total_regular_hours: number;
  total_overtime_hours: number;
  status: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ========================
// API Functions
// ========================

async function fetchTimeEntries(
  filters?: TimeEntryFilters,
): Promise<TimeEntriesResponse> {
  const params = new URLSearchParams();
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.page_size) params.append("page_size", String(filters.page_size));
  if (filters?.technician_id)
    params.append("technician_id", filters.technician_id);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.status) params.append("status", filters.status);

  const query = params.toString();
  const { data } = await apiClient.get<TimeEntriesResponse>(
    `/payroll/time-entries${query ? `?${query}` : ""}`,
  );
  return data;
}

async function createTimeEntry(
  entryData: TimeEntryCreate,
): Promise<{ id: string; hours: { regular: number; overtime: number } }> {
  const { data } = await apiClient.post<{
    id: string;
    hours: { regular: number; overtime: number };
  }>("/payroll/time-entries", entryData);
  return data;
}

async function approveTimeEntry(entryId: string): Promise<{ status: string }> {
  const { data } = await apiClient.patch<{ status: string }>(
    `/payroll/time-entries/${entryId}/approve`,
  );
  return data;
}

async function updateTimeEntry({
  id,
  data: updateData,
}: {
  id: string;
  data: TimeEntryUpdate;
}): Promise<TimeEntry> {
  const { data } = await apiClient.patch<TimeEntry>(
    `/payroll/time-entries/${id}`,
    updateData,
  );
  return data;
}

async function deleteTimeEntry(entryId: string): Promise<void> {
  await apiClient.delete(`/payroll/time-entries/${entryId}`);
}

async function bulkApproveTimeEntries(
  entryIds: string[],
): Promise<{ approved: number }> {
  const { data } = await apiClient.post<{ approved: number }>(
    "/payroll/time-entries/bulk-approve",
    { entry_ids: entryIds },
  );
  return data;
}

async function fetchPayrollPeriods(filters?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<ListResponse<PayrollPeriod>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.page_size) params.append("page_size", String(filters.page_size));
  if (filters?.status) params.append("status", filters.status);

  const query = params.toString();
  const { data } = await apiClient.get<ListResponse<PayrollPeriod>>(
    `/payroll${query ? `?${query}` : ""}`,
  );
  return data;
}

async function fetchCurrentPeriod(): Promise<PayrollPeriod> {
  const { data } = await apiClient.get<PayrollPeriod>("/payroll/current");
  return data;
}

async function fetchPayrollStats(): Promise<PayrollStats> {
  const { data } = await apiClient.get<PayrollStats>("/payroll/stats");
  return data;
}

async function approvePeriod(periodId: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/payroll/${periodId}/approve`,
  );
  return data;
}

async function calculatePeriod(periodId: string): Promise<{
  status: string;
  totals: {
    regular_hours: number;
    overtime_hours: number;
    gross_pay: number;
    commissions: number;
    technicians: number;
  };
}> {
  const { data } = await apiClient.post<{
    status: string;
    totals: {
      regular_hours: number;
      overtime_hours: number;
      gross_pay: number;
      commissions: number;
      technicians: number;
    };
  }>(`/payroll/${periodId}/calculate`);
  return data;
}

// Clock in/out for employee portal
async function clockIn(request: {
  latitude: number;
  longitude: number;
  work_order_id?: string;
  notes?: string;
}): Promise<{ status: string; time: string; work_order_id?: string }> {
  const { data } = await apiClient.post<{
    status: string;
    time: string;
    work_order_id?: string;
  }>("/employee/clock-in", request);
  return data;
}

async function clockOut(request: {
  latitude: number;
  longitude: number;
  work_order_id?: string;
  notes?: string;
}): Promise<{ status: string; time: string; labor_minutes?: number }> {
  const { data } = await apiClient.post<{
    status: string;
    time: string;
    labor_minutes?: number;
  }>("/employee/clock-out", request);
  return data;
}

// CSV Export
export async function exportTimeEntriesCsv(
  periodId: string,
): Promise<Blob> {
  const { data } = await apiClient.post(
    `/payroll/${periodId}/export?format=csv`,
    {},
    { responseType: "blob" },
  );
  return data;
}

// ========================
// React Query Hooks
// ========================

export function useTimeEntries(filters?: TimeEntryFilters) {
  return useQuery({
    queryKey: ["time-entries", filters],
    queryFn: () => fetchTimeEntries(filters),
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Time entry created");
    },
    onError: () => {
      toastError("Failed to create time entry", "Please try again.");
    },
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Time entry approved");
    },
    onError: () => {
      toastError("Failed to approve time entry", "Please try again.");
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Time entry updated", "Changes have been saved.");
    },
    onError: () => {
      toastError("Failed to update time entry", "Please try again.");
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Time entry deleted");
    },
    onError: () => {
      toastError(
        "Failed to delete time entry",
        "Only pending entries can be deleted.",
      );
    },
  });
}

export function useBulkApproveTimeEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkApproveTimeEntries,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Entries approved", `${data.approved} entries approved.`);
    },
    onError: () => {
      toastError("Bulk approve failed", "Please try again.");
    },
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data } = await apiClient.patch<TimeEntry>(
        `/payroll/time-entries/${entryId}`,
        { status: "rejected" },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
      toastSuccess("Time entry rejected");
    },
    onError: () => {
      toastError("Failed to reject time entry", "Please try again.");
    },
  });
}

export function usePayrollPeriods(filters?: {
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["payroll-periods", filters],
    queryFn: () => fetchPayrollPeriods(filters),
  });
}

export function useCurrentPeriod() {
  return useQuery({
    queryKey: ["payroll-periods", "current"],
    queryFn: fetchCurrentPeriod,
  });
}

export function usePayrollStats() {
  return useQuery({
    queryKey: ["payroll-stats"],
    queryFn: fetchPayrollStats,
  });
}

export function useApprovePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvePeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
  });
}

export function useCalculatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: calculatePeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-stats"] });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}
