import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import type {
  PortalCustomer,
  PortalWorkOrder,
  PortalInvoice,
  ServiceRequest,
  PortalLoginInput,
  PortalLoginResponse,
  PortalVerifyInput,
  PortalVerifyResponse,
} from '@/api/types/portal.ts';

/**
 * Portal Authentication
 */

export function usePortalLogin() {
  return useMutation({
    mutationFn: async (input: PortalLoginInput): Promise<PortalLoginResponse> => {
      const { data } = await apiClient.post('/portal/auth/login', input);
      return data;
    },
  });
}

export function usePortalVerify() {
  return useMutation({
    mutationFn: async (input: PortalVerifyInput): Promise<PortalVerifyResponse> => {
      const { data } = await apiClient.post('/portal/auth/verify', input);
      return data;
    },
  });
}

/**
 * Portal Customer Data
 */

export function usePortalCustomer() {
  return useQuery({
    queryKey: ['portal', 'customer'],
    queryFn: async (): Promise<PortalCustomer> => {
      const { data } = await apiClient.get('/portal/customer');
      return data.customer;
    },
  });
}

export function usePortalWorkOrders() {
  return useQuery({
    queryKey: ['portal', 'work-orders'],
    queryFn: async (): Promise<PortalWorkOrder[]> => {
      const { data } = await apiClient.get('/portal/work-orders');
      return data.work_orders || [];
    },
  });
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: async (): Promise<PortalInvoice[]> => {
      const { data } = await apiClient.get('/portal/invoices');
      return data.invoices || [];
    },
  });
}

/**
 * Service Requests
 */

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: async (input: ServiceRequest): Promise<{ id: string }> => {
      const { data } = await apiClient.post('/portal/service-requests', input);
      return data;
    },
  });
}

/**
 * Payments
 */

export function usePayInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string): Promise<{ payment_url: string }> => {
      const { data } = await apiClient.post(`/portal/invoices/${invoiceId}/pay`);
      return data;
    },
  });
}
