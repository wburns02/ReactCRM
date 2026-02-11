import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client.ts";
import type {
  TechWorkOrder,
  TechWorkOrderList,
  TimeEntry,
  Commission,
  PayrollPeriod,
  Message,
  ScheduleJob,
} from "@/api/types/techPortal.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// Re-export all employee hooks for convenience
export {
  useClockIn,
  useClockOut,
  useStartJob,
  useCompleteJob,
  useTimeClockStatus,
  useTimeClockHistory,
  useEmployeeProfile,
} from "./useEmployee.ts";

// Re-export dashboard hook
export { useTechnicianDashboard } from "./useTechnicianDashboard.ts";

// ── My Jobs (extended work order list) ──────────────────────────────────

interface JobFilters {
  status?: string;
  job_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
  scheduled_date_from?: string;
  scheduled_date_to?: string;
}

export function useTechJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", filters],
    queryFn: async (): Promise<TechWorkOrderList> => {
      return withFallback(async () => {
        const params: Record<string, string | number> = {};
        if (filters.status) params.status = filters.status;
        if (filters.job_type) params.job_type = filters.job_type;
        if (filters.search) params.search = filters.search;
        if (filters.page) params.page = filters.page;
        if (filters.page_size) params.page_size = filters.page_size;
        if (filters.scheduled_date_from) params.scheduled_date_from = filters.scheduled_date_from;
        if (filters.scheduled_date_to) params.scheduled_date_to = filters.scheduled_date_to;
        // Use employee-portal/jobs which auto-filters by current technician
        const { data } = await apiClient.get("/employee/jobs", { params });
        // Normalize response shape
        if (Array.isArray(data)) {
          return { items: data, total: data.length, page: 1, page_size: 50 };
        }
        return {
          items: data.items || data.jobs || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 20,
        };
      }, { items: [], total: 0, page: 1, page_size: 20 });
    },
    staleTime: 30_000,
  });
}

export function useTechJobDetail(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId],
    queryFn: async (): Promise<TechWorkOrder | null> => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/work-orders/${jobId}`);
        return data;
      }, null);
    },
    enabled: !!jobId,
  });
}

// ── Schedule (jobs by date range) ───────────────────────────────────────

export function useTechSchedule(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["tech-portal", "schedule", startDate, endDate],
    queryFn: async (): Promise<ScheduleJob[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/jobs", {
          params: {
            scheduled_date_from: startDate,
            scheduled_date_to: endDate,
          },
        });
        const items = Array.isArray(data) ? data : (data.items || data.jobs || []);
        return items;
      }, []);
    },
    staleTime: 60_000,
  });
}

// ── Pay & Commissions ───────────────────────────────────────────────────

export function useTechCurrentPeriod() {
  return useQuery({
    queryKey: ["tech-portal", "payroll", "current"],
    queryFn: async (): Promise<PayrollPeriod | null> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/periods/current");
        return data;
      }, null);
    },
    staleTime: 300_000,
  });
}

export function useTechCommissions(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ["tech-portal", "commissions", params],
    queryFn: async (): Promise<{ items: Commission[]; total: number }> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/commissions", { params });
        return {
          items: data.items || data.commissions || [],
          total: data.total || 0,
        };
      }, { items: [], total: 0 });
    },
    staleTime: 60_000,
  });
}

export function useTechPayRates(technicianId: string) {
  return useQuery({
    queryKey: ["tech-portal", "pay-rates", technicianId],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/payroll/pay-rates/${technicianId}`);
        return data;
      }, null);
    },
    enabled: !!technicianId,
  });
}

// ── Time Entries (for detailed clock history) ───────────────────────────

export function useTechTimeEntries(params?: {
  start_date?: string;
  end_date?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["tech-portal", "time-entries", params],
    queryFn: async (): Promise<TimeEntry[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/time-entries", { params });
        return data.items || data.entries || [];
      }, []);
    },
    staleTime: 30_000,
  });
}

// ── Communications ──────────────────────────────────────────────────────

export function useTechMessages(params?: { page?: number; message_type?: string }) {
  return useQuery({
    queryKey: ["tech-portal", "messages", params],
    queryFn: async (): Promise<{ items: Message[]; total: number }> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/communications/history", { params });
        return {
          items: data.items || data.messages || [],
          total: data.total || 0,
        };
      }, { items: [], total: 0 });
    },
    staleTime: 60_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      type: "sms" | "email";
      to: string;
      subject?: string;
      content: string;
    }) => {
      const endpoint = input.type === "sms"
        ? "/communications/sms/send"
        : "/communications/email/send";
      const body = input.type === "sms"
        ? { to_number: input.to, content: input.content }
        : { to_email: input.to, subject: input.subject, content: input.content };
      const { data } = await apiClient.post(endpoint, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "messages"] });
      toastSuccess("Message sent!");
    },
    onError: () => {
      toastError("Failed to send message");
    },
  });
}

// ── Profile / Settings ──────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      phone?: string;
      email?: string;
      home_address?: string;
      home_city?: string;
      home_state?: string;
      home_postal_code?: string;
    }) => {
      const { data } = await apiClient.patch("/employee/profile", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toastSuccess("Profile updated!");
    },
    onError: () => {
      toastError("Failed to update profile");
    },
  });
}

// ── Job Photos ──────────────────────────────────────────────────────────

export function useJobPhotos(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "photos"],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/employee/jobs/${jobId}/photos`);
        return data as Array<{
          id: string;
          work_order_id: string;
          photo_type: string;
          data_url: string;
          thumbnail_url: string | null;
          timestamp: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          created_at: string | null;
        }>;
      }, []);
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useUploadJobPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      photo,
      photoType = "other",
    }: {
      jobId: string;
      photo: string;
      photoType?: string;
    }) => {
      const { data } = await apiClient.post(
        `/employee/jobs/${jobId}/photos/base64`,
        { photo_data: photo, photo_type: photoType },
      );
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId, "photos"] });
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId] });
      toastSuccess("Photo uploaded!");
    },
    onError: () => {
      toastError("Failed to upload photo");
    },
  });
}

// ── Job Payments ────────────────────────────────────────────────────────

export function useJobPayments(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "payments"],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/employee/jobs/${jobId}/payments`);
        return data as Array<{
          id: string;
          work_order_id: string | null;
          amount: number;
          payment_method: string;
          status: string;
          description: string | null;
          payment_date: string | null;
          created_at: string | null;
        }>;
      }, []);
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      payment_method,
      amount,
      check_number,
      notes,
    }: {
      jobId: string;
      payment_method: string;
      amount: number;
      check_number?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/payment`, {
        payment_method,
        amount,
        check_number,
        notes,
      });
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId] });
      toastSuccess("Payment recorded!");
    },
    onError: () => {
      toastError("Failed to record payment");
    },
  });
}

// ── GPS Location Update ─────────────────────────────────────────────────

export function useUpdateLocation() {
  return useMutation({
    mutationFn: async (input: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      const { data } = await apiClient.post("/gps/location", input);
      return data;
    },
  });
}
