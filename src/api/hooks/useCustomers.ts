import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.ts';
import {
  customerListResponseSchema,
  customerSchema,
  type Customer,
  type CustomerListResponse,
  type CustomerFilters,
  type CustomerFormData,
} from '../types/customer.ts';

/**
 * Query keys for customers
 */
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

/**
 * Fetch paginated customers list
 */
export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async (): Promise<CustomerListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.search) params.set('search', filters.search);
      if (filters.prospect_stage) params.set('prospect_stage', filters.prospect_stage);

      const url = '/customers/?' + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = customerListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn('Customer list response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single customer by ID
 */
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id!),
    queryFn: async (): Promise<Customer> => {
      const { data } = await apiClient.get('/customers/' + id);

      if (import.meta.env.DEV) {
        const result = customerSchema.safeParse(data);
        if (!result.success) {
          console.warn('Customer response validation failed:', result.error);
        }
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CustomerFormData): Promise<Customer> => {
      const response = await apiClient.post('/customers/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Update existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CustomerFormData>;
    }): Promise<Customer> => {
      const response = await apiClient.patch('/customers/' + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Delete customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete('/customers/' + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
