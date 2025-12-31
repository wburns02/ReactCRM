import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import type {
  EmployeeJob,
  TimeClockEntry,
  ClockInInput,
  ClockOutInput,
  EmployeeProfile,
  ChecklistItem,
  JobUpdateInput,
  EmployeeDashboardStats,
} from '@/api/types/employee.ts';

/**
 * Employee Dashboard Stats
 */
export function useEmployeeDashboard() {
  return useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async (): Promise<EmployeeDashboardStats> => {
      const { data } = await apiClient.get('/employee/dashboard');
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Employee Profile
 */
export function useEmployeeProfile() {
  return useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async (): Promise<EmployeeProfile> => {
      const { data } = await apiClient.get('/employee/profile');
      return data;
    },
  });
}

/**
 * Today's Jobs
 */
export function useEmployeeJobs(date?: string) {
  return useQuery({
    queryKey: ['employee', 'jobs', date],
    queryFn: async (): Promise<EmployeeJob[]> => {
      const params = date ? { date } : {};
      const { data } = await apiClient.get('/employee/jobs', { params });
      return data.jobs || [];
    },
  });
}

/**
 * Single Job Details
 */
export function useEmployeeJob(jobId: string) {
  return useQuery({
    queryKey: ['employee', 'jobs', jobId],
    queryFn: async (): Promise<EmployeeJob> => {
      const { data } = await apiClient.get(`/employee/jobs/${jobId}`);
      return data;
    },
    enabled: !!jobId,
  });
}

/**
 * Job Checklist
 */
export function useJobChecklist(jobId: string) {
  return useQuery({
    queryKey: ['employee', 'jobs', jobId, 'checklist'],
    queryFn: async (): Promise<ChecklistItem[]> => {
      const { data } = await apiClient.get(`/employee/jobs/${jobId}/checklist`);
      return data.items || [];
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
      queryClient.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
}

/**
 * Time Clock - Current Status
 */
export function useTimeClockStatus() {
  return useQuery({
    queryKey: ['employee', 'timeclock', 'status'],
    queryFn: async (): Promise<TimeClockEntry | null> => {
      const { data } = await apiClient.get('/employee/timeclock/status');
      return data.entry || null;
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
      const { data } = await apiClient.post('/employee/timeclock/clock-in', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'timeclock'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
}

/**
 * Time Clock - Clock Out
 */
export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClockOutInput): Promise<TimeClockEntry> => {
      const { data } = await apiClient.post('/employee/timeclock/clock-out', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'timeclock'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
}

/**
 * Time Clock - History
 */
export function useTimeClockHistory(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['employee', 'timeclock', 'history', params],
    queryFn: async (): Promise<TimeClockEntry[]> => {
      const { data } = await apiClient.get('/employee/timeclock/history', { params });
      return data.entries || [];
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
      queryClient.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
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
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/complete`, {
        notes,
        latitude,
        longitude,
        customer_signature,
        technician_signature,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
}
