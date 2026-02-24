import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client.ts";
import { toastError } from "@/components/ui/Toast.tsx";
import type {
  EmployeeJob,
  TimeClockEntry,
  ClockInInput,
  ClockOutInput,
  EmployeeProfile,
  ChecklistItem,
  JobUpdateInput,
  EmployeeDashboardStats,
} from "@/api/types/employee.ts";

/**
 * Default values for 404 fallback
 */
const DEFAULT_DASHBOARD_STATS: EmployeeDashboardStats = {
  jobs_today: 0,
  jobs_completed_today: 0,
  hours_today: 0,
  is_clocked_in: false,
};

const DEFAULT_PROFILE: EmployeeProfile = {
  id: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "technician",
  is_active: true,
};

/**
 * Employee Dashboard Stats
 * Returns defaults if endpoint not implemented (404)
 */
export function useEmployeeDashboard() {
  return useQuery({
    queryKey: ["employee", "dashboard"],
    queryFn: async (): Promise<EmployeeDashboardStats> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/dashboard");
        return data;
      }, DEFAULT_DASHBOARD_STATS);
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Employee Profile
 * Returns defaults if endpoint not implemented (404)
 */
export function useEmployeeProfile() {
  return useQuery({
    queryKey: ["employee", "profile"],
    queryFn: async (): Promise<EmployeeProfile> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/profile");
        return data;
      }, DEFAULT_PROFILE);
    },
  });
}

/**
 * Today's Jobs
 * Returns empty array if endpoint not implemented (404)
 */
export function useEmployeeJobs(date?: string) {
  return useQuery({
    queryKey: ["employee", "jobs", date],
    queryFn: async (): Promise<EmployeeJob[]> => {
      return withFallback(async () => {
        const params = date ? { date } : {};
        const { data } = await apiClient.get("/employee/jobs", { params });
        return data.jobs || [];
      }, []);
    },
  });
}

/**
 * Single Job Details
 */
export function useEmployeeJob(jobId: string) {
  return useQuery({
    queryKey: ["employee", "jobs", jobId],
    queryFn: async (): Promise<EmployeeJob> => {
      const { data } = await apiClient.get(`/employee/jobs/${jobId}`);
      return data;
    },
    enabled: !!jobId,
  });
}

/**
 * Job Checklist
 * Returns empty array if endpoint not implemented (404)
 */
export function useJobChecklist(jobId: string) {
  return useQuery({
    queryKey: ["employee", "jobs", jobId, "checklist"],
    queryFn: async (): Promise<ChecklistItem[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get(
          `/employee/jobs/${jobId}/checklist`,
        );
        return data.items || [];
      }, []);
    },
    enabled: !!jobId,
  });
}

/**
 * Update Job Status
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      input,
    }: {
      jobId: string;
      input: JobUpdateInput;
    }): Promise<EmployeeJob> => {
      const { data } = await apiClient.patch(`/employee/jobs/${jobId}`, input);
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to update job"),
  });
}

/**
 * Time Clock - Current Status
 * Returns null if endpoint not implemented (404)
 */
export function useTimeClockStatus() {
  return useQuery({
    queryKey: ["employee", "timeclock", "status"],
    queryFn: async (): Promise<TimeClockEntry | null> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/timeclock/status");
        return data.entry || null;
      }, null);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Time Clock - Clock In
 */
export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClockInInput): Promise<TimeClockEntry> => {
      const { data } = await apiClient.post(
        "/employee/timeclock/clock-in",
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "timeclock"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to clock in"),
  });
}

/**
 * Time Clock - Clock Out
 */
export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClockOutInput): Promise<TimeClockEntry> => {
      const { data } = await apiClient.post(
        "/employee/timeclock/clock-out",
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "timeclock"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to clock out"),
  });
}

/**
 * Time Clock - History
 * Returns empty array if endpoint not implemented (404)
 */
export function useTimeClockHistory(params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["employee", "timeclock", "history", params],
    queryFn: async (): Promise<TimeClockEntry[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/timeclock/history", {
          params,
        });
        return data.entries || [];
      }, []);
    },
  });
}

/**
 * Start Job (mark as en_route or in_progress)
 */
export function useStartJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      latitude,
      longitude,
    }: {
      jobId: string;
      latitude?: number;
      longitude?: number;
    }): Promise<EmployeeJob> => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/start`, {
        latitude,
        longitude,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to start job"),
  });
}

/**
 * Revert Job Status (undo accidental start)
 * en_route → scheduled, in_progress → en_route
 */
export function useRevertJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/revert-status`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to revert job status"),
  });
}

/**
 * Complete Job
 */
export function useCompleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      notes,
      latitude,
      longitude,
      customer_signature,
      technician_signature,
    }: {
      jobId: string;
      notes?: string;
      latitude?: number;
      longitude?: number;
      customer_signature?: string;
      technician_signature?: string;
    }): Promise<EmployeeJob> => {
      const { data } = await apiClient.post(
        `/employee/jobs/${jobId}/complete`,
        {
          notes,
          latitude,
          longitude,
          customer_signature,
          technician_signature,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
    },
    onError: () => toastError("Failed to complete job"),
  });
}
