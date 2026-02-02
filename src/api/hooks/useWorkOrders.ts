import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  workOrderListResponseSchema,
  workOrderSchema,
  type WorkOrder,
  type WorkOrderListResponse,
  type WorkOrderFilters,
  type WorkOrderFormData,
} from "../types/workOrder.ts";

/**
 * Query keys for work orders
 */
export const workOrderKeys = {
  all: ["workOrders"] as const,
  lists: () => [...workOrderKeys.all, "list"] as const,
  list: (filters: WorkOrderFilters) =>
    [...workOrderKeys.lists(), filters] as const,
  details: () => [...workOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...workOrderKeys.details(), id] as const,
};

/**
 * Fetch paginated work orders list
 */
export function useWorkOrders(filters: WorkOrderFilters = {}) {
  return useQuery({
    queryKey: workOrderKeys.list(filters),
    queryFn: async (): Promise<WorkOrderListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.status) params.set("status", filters.status);
      if (filters.scheduled_date)
        params.set("scheduled_date", filters.scheduled_date);

      const url = "/work-orders?" + params.toString();
      const { data } = await apiClient.get(url);

      // Handle both array and paginated response
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: 1,
          page_size: data.length,
        };
      }

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        workOrderListResponseSchema,
        data,
        "/work-orders"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single work order by ID
 */
export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: workOrderKeys.detail(id!),
    queryFn: async (): Promise<WorkOrder> => {
      const { data } = await apiClient.get("/work-orders/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(workOrderSchema, data, `/work-orders/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new work order
 */
export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkOrderFormData): Promise<WorkOrder> => {
      const response = await apiClient.post("/work-orders", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

/**
 * Update existing work order
 */
export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<WorkOrderFormData>;
    }): Promise<WorkOrder> => {
      const response = await apiClient.patch("/work-orders/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

/**
 * Delete work order
 */
export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/work-orders/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

// ============================================
// Schedule-specific hooks
// ============================================

/**
 * Query keys for schedule operations
 */
export const scheduleKeys = {
  unscheduled: () => [...workOrderKeys.all, "unscheduled"] as const,
  stats: () => [...workOrderKeys.all, "stats"] as const,
};

/**
 * Fetch unscheduled work orders (draft status, no scheduled_date)
 */
export function useUnscheduledWorkOrders() {
  return useQuery({
    queryKey: scheduleKeys.unscheduled(),
    queryFn: async (): Promise<WorkOrderListResponse> => {
      // Fetch draft and unscheduled work orders
      const params = new URLSearchParams({
        page: "1",
        page_size: "200",
        status: "draft",
      });

      const { data } = await apiClient.get("/work-orders?" + params.toString());

      // Handle both array and paginated response
      if (Array.isArray(data)) {
        // Filter to only unscheduled (no date)
        const unscheduled = data.filter((wo: WorkOrder) => !wo.scheduled_date);
        return {
          items: unscheduled,
          total: unscheduled.length,
          page: 1,
          page_size: 200,
        };
      }

      // Filter paginated items
      const unscheduled = (data.items || []).filter(
        (wo: WorkOrder) => !wo.scheduled_date,
      );
      return { ...data, items: unscheduled, total: unscheduled.length };
    },
    staleTime: 30_000,
  });
}

/**
 * Assign work order to technician and/or date
 * Used for drag-drop operations
 */
export function useAssignWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      technician,
      date,
      timeStart,
    }: {
      id: string;
      technician?: string;
      date?: string;
      timeStart?: string;
    }): Promise<WorkOrder> => {
      const updateData: Partial<WorkOrderFormData> = {};

      if (technician !== undefined) {
        updateData.assigned_technician = technician || undefined;
      }
      if (date !== undefined) {
        updateData.scheduled_date = date || undefined;
        // Auto-set status to scheduled if date is set
        if (date) {
          updateData.status = "scheduled";
        }
      }
      if (timeStart !== undefined) {
        updateData.time_window_start = timeStart || undefined;
      }

      const response = await apiClient.patch("/work-orders/" + id, updateData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all work order queries to refresh views
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
    },
  });
}

/**
 * Update work order status
 */
export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }): Promise<WorkOrder> => {
      const response = await apiClient.patch("/work-orders/" + id, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
    },
  });
}

/**
 * Unschedule a work order (remove from schedule, return to draft)
 * Used for bi-directional drag-drop: dragging scheduled event back to unscheduled area
 */
export function useUnscheduleWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<WorkOrder> => {
      const response = await apiClient.patch("/work-orders/" + id, {
        scheduled_date: null,
        assigned_technician: null,
        time_window_start: null,
        status: "draft",
      });
      return response.data;
    },
    onSuccess: (_, id) => {
      // Invalidate all work order queries to refresh views
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
    },
  });
}

/**
 * Update work order duration
 * Used for drag-resize operations on schedule
 */
export function useUpdateWorkOrderDuration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      durationHours,
    }: {
      id: string;
      durationHours: number;
    }): Promise<WorkOrder> => {
      const response = await apiClient.patch("/work-orders/" + id, {
        estimated_duration_hours: durationHours,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Schedule stats hook
 * Computes stats from work orders data
 */
export function useScheduleStats() {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(
    weekStart.getDate() -
      weekStart.getDay() +
      (weekStart.getDay() === 0 ? -6 : 1),
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Fetch all work orders for stats calculation
  const { data: allData } = useWorkOrders({ page: 1, page_size: 500 });

  const stats = {
    todayJobs: 0,
    weekJobs: 0,
    unscheduledJobs: 0,
    emergencyJobs: 0,
  };

  if (allData?.items) {
    allData.items.forEach((wo) => {
      // Today's jobs
      if (wo.scheduled_date === today) {
        stats.todayJobs++;
      }

      // Week's jobs
      if (wo.scheduled_date) {
        const woDate = new Date(wo.scheduled_date);
        if (woDate >= weekStart && woDate <= weekEnd) {
          stats.weekJobs++;
        }
      }

      // Unscheduled (draft without date)
      if (wo.status === "draft" && !wo.scheduled_date) {
        stats.unscheduledJobs++;
      }

      // Emergency priority
      if (wo.priority === "emergency") {
        stats.emergencyJobs++;
      }
    });
  }

  return stats;
}
