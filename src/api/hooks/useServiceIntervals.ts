import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client";

/**
 * Service Interval Types
 */
export interface ServiceInterval {
  id: string;
  name: string;
  description?: string;
  service_type: string;
  interval_months: number;
  reminder_days_before: number[];
  is_active: boolean;
  created_at: string;
}

export interface CustomerServiceSchedule {
  id: string;
  customer_id: string;
  customer_name: string;
  service_interval_id: string;
  service_interval_name: string;
  last_service_date: string | null;
  next_due_date: string;
  status: "upcoming" | "due" | "overdue" | "scheduled";
  scheduled_work_order_id?: string;
  days_until_due: number;
  reminder_sent: boolean;
  notes?: string;
}

export interface ServiceReminder {
  id: string;
  customer_service_schedule_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_name: string;
  due_date: string;
  days_before_due: number;
  reminder_type: "sms" | "email" | "push" | "call";
  status: "pending" | "sent" | "failed" | "cancelled";
  scheduled_at: string;
  sent_at?: string;
  error_message?: string;
}

export interface ServiceIntervalStats {
  total_customers_with_intervals: number;
  upcoming_services: number;
  due_services: number;
  overdue_services: number;
  reminders_sent_today: number;
  reminders_pending: number;
}

/**
 * Default values for 404 fallback
 */
const DEFAULT_STATS: ServiceIntervalStats = {
  total_customers_with_intervals: 0,
  upcoming_services: 0,
  due_services: 0,
  overdue_services: 0,
  reminders_sent_today: 0,
  reminders_pending: 0,
};

/**
 * Query keys for service intervals
 */
export const serviceIntervalKeys = {
  all: ["service-intervals"] as const,
  lists: () => [...serviceIntervalKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...serviceIntervalKeys.lists(), filters] as const,
  detail: (id: string) => [...serviceIntervalKeys.all, "detail", id] as const,
  schedules: () => [...serviceIntervalKeys.all, "schedules"] as const,
  schedule: (filters?: { status?: string; customer_id?: string }) =>
    [...serviceIntervalKeys.schedules(), filters] as const,
  reminders: () => [...serviceIntervalKeys.all, "reminders"] as const,
  stats: () => [...serviceIntervalKeys.all, "stats"] as const,
  customerSchedule: (customerId: string) =>
    [...serviceIntervalKeys.all, "customer", customerId] as const,
};

/**
 * Get all service intervals
 * Returns empty array if endpoint not implemented (404)
 */
export function useServiceIntervals() {
  return useQuery({
    queryKey: serviceIntervalKeys.lists(),
    queryFn: async (): Promise<ServiceInterval[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/service-intervals/");
        return data.intervals || [];
      }, []);
    },
  });
}

/**
 * Get single service interval
 */
export function useServiceInterval(id: string) {
  return useQuery({
    queryKey: serviceIntervalKeys.detail(id),
    queryFn: async (): Promise<ServiceInterval> => {
      const { data } = await apiClient.get(`/service-intervals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create service interval
 */
export function useCreateServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      interval: Omit<ServiceInterval, "id" | "created_at">,
    ): Promise<ServiceInterval> => {
      const { data } = await apiClient.post("/service-intervals/", interval);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceIntervalKeys.lists() });
    },
  });
}

/**
 * Update service interval
 */
export function useUpdateServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...interval
    }: Partial<ServiceInterval> & { id: string }): Promise<ServiceInterval> => {
      const { data } = await apiClient.put(
        `/service-intervals/${id}`,
        interval,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceIntervalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Delete service interval
 */
export function useDeleteServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/service-intervals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceIntervalKeys.lists() });
    },
  });
}

/**
 * Get customer service schedules
 * Returns empty list if endpoint not implemented (404)
 */
export function useCustomerServiceSchedules(filters?: {
  status?: string;
  customer_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: serviceIntervalKeys.schedule(filters),
    queryFn: async (): Promise<{
      schedules: CustomerServiceSchedule[];
      total: number;
    }> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.status) params.append("status", filters.status);
          if (filters?.customer_id)
            params.append("customer_id", filters.customer_id.toString());
          if (filters?.limit) params.append("limit", filters.limit.toString());

          const { data } = await apiClient.get(
            `/service-intervals/schedules?${params.toString()}`,
          );
          return data;
        },
        { schedules: [], total: 0 },
      );
    },
  });
}

/**
 * Get schedules for a specific customer
 * Returns empty array if endpoint not implemented (404)
 */
export function useCustomerSchedule(customerId: string) {
  return useQuery({
    queryKey: serviceIntervalKeys.customerSchedule(customerId),
    queryFn: async (): Promise<CustomerServiceSchedule[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get(
          `/service-intervals/customer/${customerId}/schedules`,
        );
        return data.schedules || [];
      }, []);
    },
    enabled: !!customerId,
  });
}

/**
 * Assign service interval to customer
 */
export function useAssignServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      service_interval_id: string;
      last_service_date?: string;
      notes?: string;
    }): Promise<CustomerServiceSchedule> => {
      const { data } = await apiClient.post(
        "/service-intervals/assign",
        params,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.customerSchedule(variables.customer_id),
      });
    },
  });
}

/**
 * Remove service interval from customer
 */
export function useUnassignServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string): Promise<void> => {
      await apiClient.delete(`/service-intervals/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
    },
  });
}

/**
 * Update customer schedule (e.g., after service completion)
 */
export function useUpdateCustomerSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schedule_id: string;
      last_service_date: string;
      notes?: string;
    }): Promise<CustomerServiceSchedule> => {
      const { data } = await apiClient.put(
        `/service-intervals/schedules/${params.schedule_id}`,
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
      queryClient.invalidateQueries({ queryKey: serviceIntervalKeys.stats() });
    },
  });
}

/**
 * Get pending reminders
 * Returns empty array if endpoint not implemented (404)
 */
export function useServiceReminders(filters?: {
  status?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: serviceIntervalKeys.reminders(),
    queryFn: async (): Promise<ServiceReminder[]> => {
      return withFallback(async () => {
        const params = new URLSearchParams();
        if (filters?.status) params.append("status", filters.status);
        if (filters?.limit) params.append("limit", filters.limit.toString());

        const { data } = await apiClient.get(
          `/service-intervals/reminders?${params.toString()}`,
        );
        return data.reminders || [];
      }, []);
    },
  });
}

/**
 * Get service interval stats
 * Returns default stats if endpoint not implemented (404)
 */
export function useServiceIntervalStats() {
  return useQuery({
    queryKey: serviceIntervalKeys.stats(),
    queryFn: async (): Promise<ServiceIntervalStats> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/service-intervals/stats");
        return data;
      }, DEFAULT_STATS);
    },
  });
}

/**
 * Create work order from service schedule
 */
export function useCreateWorkOrderFromSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schedule_id: string;
      scheduled_date: string;
      technician_id?: number;
      notes?: string;
    }): Promise<{ work_order_id: string }> => {
      const { data } = await apiClient.post(
        "/service-intervals/create-work-order",
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
    },
  });
}

/**
 * Send reminder manually
 */
export function useSendServiceReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schedule_id: string;
      reminder_type: "sms" | "email" | "push";
    }): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post(
        "/service-intervals/send-reminder",
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.reminders(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
    },
  });
}

/**
 * Bulk assign service interval to multiple customers
 */
export function useBulkAssignServiceInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customer_ids: number[];
      service_interval_id: string;
    }): Promise<{ assigned: number; failed: number }> => {
      const { data } = await apiClient.post(
        "/service-intervals/bulk-assign",
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceIntervalKeys.schedules(),
      });
    },
  });
}
