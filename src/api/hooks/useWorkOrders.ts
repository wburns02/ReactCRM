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
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

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
      if (filters.scheduled_date_from)
        params.set("scheduled_date_from", filters.scheduled_date_from);
      if (filters.scheduled_date_to)
        params.set("scheduled_date_to", filters.scheduled_date_to);

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
    staleTime: 300_000, // 5 minutes (increased from 30s for better schedule performance)
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
    onSuccess: (workOrder) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.stats() });
      toastSuccess(
        "Work Order Created",
        `Work order ${workOrder.work_order_number || workOrder.id.slice(0, 8)} created successfully`
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to create work order";
      toastError("Creation Failed", message);
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
    onSuccess: (workOrder, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.stats() });
      toastSuccess(
        "Work Order Updated",
        `Work order ${workOrder.work_order_number || workOrder.id.slice(0, 8)} updated successfully`
      );
      if (workOrder.notification_sent) {
        toastSuccess("SMS Sent", "Customer notified by SMS that service is complete");
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to update work order";
      toastError("Update Failed", message);
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
      toastSuccess("Work Order Deleted", "Work order deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to delete work order";
      toastError("Deletion Failed", message);
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
    onSuccess: (workOrder, variables) => {
      // Update the cache directly with the server response instead of
      // invalidating — invalidateQueries causes a refetch that can return
      // stale HTTP-cached data, overwriting the optimistic update.
      // Filter out null values so we don't overwrite cached customer_name etc.
      const nonNullFields = Object.fromEntries(
        Object.entries(workOrder).filter(([, v]) => v != null),
      );
      queryClient.setQueriesData<{ items: WorkOrder[] }>(
        { queryKey: workOrderKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;
          const exists = oldData.items.some((wo) => wo.id === workOrder.id);
          if (exists) {
            return {
              ...oldData,
              items: oldData.items.map((wo) =>
                wo.id === workOrder.id ? { ...wo, ...nonNullFields } : wo,
              ),
            };
          }
          // Add to this query's cache if not already present
          // (happens when scheduling an unscheduled WO — it wasn't in date-filtered queries)
          return {
            ...oldData,
            items: [...oldData.items, { ...workOrder, ...nonNullFields }],
          };
        },
      );
      queryClient.setQueryData(
        workOrderKeys.detail(variables.id),
        (old: WorkOrder | undefined) => old ? { ...old, ...nonNullFields } : workOrder,
      );

      // Remove from unscheduled list if it was scheduled
      if (workOrder.scheduled_date) {
        queryClient.setQueryData<{ items: WorkOrder[] }>(
          scheduleKeys.unscheduled(),
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              items: oldData.items.filter((wo) => wo.id !== workOrder.id),
            };
          },
        );
      }

      // Toast notification
      toastSuccess(
        "Work Order Scheduled",
        `${workOrder.work_order_number || 'Work order'} scheduled successfully`
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to schedule work order";
      console.error("Schedule assignment failed:", error);
      toastError("Schedule Failed", message);
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
    onSuccess: (workOrder, id) => {
      // Update cache directly with server response (avoid stale refetch)
      // For unschedule, we intentionally keep null fields (scheduled_date: null, etc.)
      // but preserve customer_name from cache if response has it null
      const mergeFields = Object.fromEntries(
        Object.entries(workOrder).filter(
          ([k, v]) => v != null || ["scheduled_date", "assigned_technician", "time_window_start"].includes(k),
        ),
      );
      queryClient.setQueriesData<{ items: WorkOrder[] }>(
        { queryKey: workOrderKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((wo) =>
              wo.id === workOrder.id ? { ...wo, ...mergeFields } : wo,
            ),
          };
        },
      );
      queryClient.setQueryData(
        workOrderKeys.detail(id),
        (old: WorkOrder | undefined) => old ? { ...old, ...mergeFields } : workOrder,
      );

      // Add back to unscheduled list
      queryClient.setQueryData<{ items: WorkOrder[] }>(
        scheduleKeys.unscheduled(),
        (oldData) => {
          if (!oldData) return { items: [workOrder], total: 1, page: 1, page_size: 200 };
          const exists = oldData.items.some((wo) => wo.id === workOrder.id);
          if (exists) return oldData;
          return { ...oldData, items: [...oldData.items, workOrder] };
        },
      );

      // Toast notification
      toastSuccess(
        "Work Order Unscheduled",
        `${workOrder.work_order_number || 'Work order'} removed from schedule`
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to unschedule work order";
      console.error("Unschedule failed:", error);
      toastError("Unschedule Failed", message);
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

      // Emergency priority (active/upcoming only - not completed)
      if (
        wo.priority === "emergency" &&
        wo.status !== "completed" &&
        wo.status !== "canceled"
      ) {
        stats.emergencyJobs++;
      }
    });
  }

  return stats;
}

// ============================================
// Bulk Operations
// ============================================

interface BulkResult {
  success_count: number;
  failed_count: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Bulk update work order status
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ids: string[]; status: string }) => {
      const res = await apiClient.patch<BulkResult>(
        "/work-orders/bulk/status",
        data,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      toastSuccess(
        `Updated ${data.success_count} work orders${data.failed_count ? ` (${data.failed_count} failed)` : ""}`,
      );
    },
    onError: () => toastError("Failed to update work orders"),
  });
}

/**
 * Bulk assign technician
 */
export function useBulkAssignTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ids: string[];
      assigned_technician?: string;
      technician_id?: string;
    }) => {
      const res = await apiClient.patch<BulkResult>(
        "/work-orders/bulk/assign",
        data,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      toastSuccess(
        `Assigned ${data.success_count} work orders${data.failed_count ? ` (${data.failed_count} failed)` : ""}`,
      );
    },
    onError: () => toastError("Failed to assign work orders"),
  });
}

/**
 * Bulk delete work orders
 */
export function useBulkDeleteWorkOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiClient.delete<BulkResult>("/work-orders/bulk", {
        data: { ids },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      toastSuccess(
        `Deleted ${data.success_count} work orders${data.failed_count ? ` (${data.failed_count} failed)` : ""}`,
      );
    },
    onError: () => toastError("Failed to delete work orders"),
  });
}
