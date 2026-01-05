/**
 * API Hooks for CRM Mobile
 * React Query hooks for data fetching and mutations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, setAuthToken, clearAuthToken, getErrorMessage } from './client';
import {
  WorkOrder,
  WorkOrderList,
  WorkOrderListSchema,
  WorkOrderSchema,
  WorkOrderFilters,
  WorkOrderCompletionData,
  LoginCredentials,
  LoginResponse,
  User,
  Technician,
  TechnicianSchema,
} from './types';
import { z } from 'zod';

// Query keys factory
export const queryKeys = {
  workOrders: {
    all: ['workOrders'] as const,
    lists: () => [...queryKeys.workOrders.all, 'list'] as const,
    list: (filters?: WorkOrderFilters) => [...queryKeys.workOrders.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.workOrders.all, 'detail', id] as const,
    today: () => [...queryKeys.workOrders.all, 'today'] as const,
  },
  technicians: {
    all: ['technicians'] as const,
    current: () => [...queryKeys.technicians.all, 'current'] as const,
  },
  user: {
    current: ['user', 'current'] as const,
  },
};

/**
 * Auth hooks
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const { data } = await apiClient.post('/auth/login', credentials);
      return data;
    },
    onSuccess: async (data) => {
      await setAuthToken(data.token);
      queryClient.setQueryData(queryKeys.user.current, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await clearAuthToken();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user.current,
    queryFn: async (): Promise<User> => {
      const { data } = await apiClient.get('/auth/me');
      return data.user;
    },
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Work order hooks
 */
export function useWorkOrders(filters?: WorkOrderFilters) {
  return useQuery({
    queryKey: queryKeys.workOrders.list(filters),
    queryFn: async (): Promise<WorkOrderList> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.page_size) params.set('page_size', String(filters.page_size));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.scheduled_date) params.set('scheduled_date', filters.scheduled_date);
      if (filters?.technician_id) params.set('technician_id', filters.technician_id);

      const { data } = await apiClient.get(`/work-orders?${params.toString()}`);

      // Handle both array and paginated response formats
      if (Array.isArray(data)) {
        return {
          items: z.array(WorkOrderSchema).parse(data),
          total: data.length,
          page: 1,
          page_size: data.length,
        };
      }

      return WorkOrderListSchema.parse(data);
    },
  });
}

export function useTodayWorkOrders(technicianId?: string) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...queryKeys.workOrders.today(), technicianId],
    queryFn: async (): Promise<WorkOrder[]> => {
      const params = new URLSearchParams({
        scheduled_date: today,
        page_size: '50',
      });
      if (technicianId) {
        params.set('technician_id', technicianId);
      }

      const { data } = await apiClient.get(`/work-orders?${params.toString()}`);

      // Handle both array and paginated response formats
      if (Array.isArray(data)) {
        return z.array(WorkOrderSchema).parse(data);
      }

      const parsed = WorkOrderListSchema.parse(data);
      return parsed.items;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.workOrders.detail(id),
    queryFn: async (): Promise<WorkOrder> => {
      const { data } = await apiClient.get(`/work-orders/${id}`);
      return WorkOrderSchema.parse(data.work_order || data);
    },
    enabled: !!id,
  });
}

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
      const { data } = await apiClient.patch(`/work-orders/${id}`, { status });
      return WorkOrderSchema.parse(data.work_order || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workOrders.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.today() });
    },
  });
}

export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (completionData: WorkOrderCompletionData): Promise<WorkOrder> => {
      const { data } = await apiClient.post(
        `/work-orders/${completionData.work_order_id}/complete`,
        completionData
      );
      return WorkOrderSchema.parse(data.work_order || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workOrders.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.today() });
    },
  });
}

export function useStartWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<WorkOrder> => {
      const { data } = await apiClient.post(`/work-orders/${id}/start`);
      return WorkOrderSchema.parse(data.work_order || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workOrders.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.today() });
    },
  });
}

/**
 * Technician hooks
 */
export function useCurrentTechnician() {
  return useQuery({
    queryKey: queryKeys.technicians.current(),
    queryFn: async (): Promise<Technician | null> => {
      try {
        const { data } = await apiClient.get('/technicians/me');
        return TechnicianSchema.parse(data.technician || data);
      } catch {
        return null;
      }
    },
    retry: false,
  });
}
