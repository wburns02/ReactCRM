import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  PortalCustomer,
  PortalWorkOrder,
  PortalInvoice,
  ServiceRequest,
  PortalLoginInput,
  PortalLoginResponse,
  PortalVerifyInput,
  PortalVerifyResponse,
  TechnicianLocation,
  CustomerProfileUpdate,
} from "@/api/types/portal.ts";

/**
 * Portal Authentication
 */

export function usePortalLogin() {
  return useMutation({
    mutationFn: async (
      input: PortalLoginInput,
    ): Promise<PortalLoginResponse> => {
      const { data } = await apiClient.post("/portal/auth/login", input);
      return data;
    },
  });
}

export function usePortalVerify() {
  return useMutation({
    mutationFn: async (
      input: PortalVerifyInput,
    ): Promise<PortalVerifyResponse> => {
      const { data } = await apiClient.post("/portal/auth/verify", input);
      return data;
    },
  });
}

/**
 * Portal Customer Data
 */

export function usePortalCustomer() {
  return useQuery({
    queryKey: ["portal", "customer"],
    queryFn: async (): Promise<PortalCustomer> => {
      const { data } = await apiClient.get("/portal/customer");
      return data.customer;
    },
  });
}

export function usePortalWorkOrders() {
  return useQuery({
    queryKey: ["portal", "work-orders"],
    queryFn: async (): Promise<PortalWorkOrder[]> => {
      const { data } = await apiClient.get("/portal/work-orders");
      return data.work_orders || [];
    },
  });
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ["portal", "invoices"],
    queryFn: async (): Promise<PortalInvoice[]> => {
      const { data } = await apiClient.get("/portal/invoices");
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
      const { data } = await apiClient.post("/portal/service-requests", input);
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
      const { data } = await apiClient.post(
        `/portal/invoices/${invoiceId}/pay`,
      );
      return data;
    },
  });
}

/**
 * Work Order Details
 */

export function usePortalWorkOrder(workOrderId: string) {
  return useQuery({
    queryKey: ["portal", "work-order", workOrderId],
    queryFn: async (): Promise<PortalWorkOrder> => {
      const { data } = await apiClient.get(
        `/portal/work-orders/${workOrderId}`,
      );
      return data.work_order;
    },
    enabled: !!workOrderId,
  });
}

/**
 * Technician Location Tracking
 */

export function useTechnicianLocation(workOrderId: string) {
  return useQuery({
    queryKey: ["portal", "technician-location", workOrderId],
    queryFn: async (): Promise<TechnicianLocation | null> => {
      try {
        const { data } = await apiClient.get(
          `/portal/work-orders/${workOrderId}/technician-location`,
        );
        return data.location;
      } catch {
        return null;
      }
    },
    enabled: !!workOrderId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time tracking
    staleTime: 5000,
  });
}

/**
 * Customer Profile
 */

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: CustomerProfileUpdate,
    ): Promise<PortalCustomer> => {
      const { data } = await apiClient.patch("/portal/customer", updates);
      return data.customer;
    },
    onSuccess: (customer) => {
      queryClient.setQueryData(["portal", "customer"], customer);
    },
  });
}
