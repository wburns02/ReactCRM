import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export function useMicrosoft365Status() {
  return useQuery({
    queryKey: ["microsoft365", "status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/microsoft365/status");
      return data as {
        configured: boolean;
        user_linked: boolean;
        microsoft_email: string | null;
        calendar_sync?: boolean;
        teams_webhook?: boolean;
        sharepoint?: boolean;
        email_monitoring?: boolean;
        bookings?: boolean;
      };
    },
    retry: false,
  });
}

export function useMicrosoft365AuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get("/microsoft365/auth-url");
      return data as { authorization_url: string };
    },
  });
}

export function useMicrosoft365Callback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post(`/microsoft365/callback?code=${encodeURIComponent(code)}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft365"] });
    },
  });
}

export function useMicrosoft365Link() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post(`/microsoft365/link?code=${encodeURIComponent(code)}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft365"] });
    },
  });
}

export function useMicrosoft365Unlink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete("/microsoft365/link");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft365"] });
    },
  });
}

// ── Bookings ──

export function useBookingsStatus() {
  return useQuery({
    queryKey: ["microsoft365", "bookings", "status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/microsoft365/bookings/status");
      return data as {
        configured: boolean;
        business_id: string | null;
        business_name: string | null;
        public_url: string | null;
      };
    },
    retry: false,
  });
}

export function useBookingsServices() {
  return useQuery({
    queryKey: ["microsoft365", "bookings", "services"],
    queryFn: async () => {
      const { data } = await apiClient.get("/microsoft365/bookings/services");
      return data as {
        services: Array<{
          id: string;
          name: string;
          description: string;
          duration: string;
          price: number;
          price_type: string;
        }>;
      };
    },
    retry: false,
  });
}

export function useBookingsStaff() {
  return useQuery({
    queryKey: ["microsoft365", "bookings", "staff"],
    queryFn: async () => {
      const { data } = await apiClient.get("/microsoft365/bookings/staff");
      return data as {
        staff: Array<{
          id: string;
          display_name: string;
          email: string;
          role: string;
        }>;
      };
    },
    retry: false,
  });
}

export function useBookingsSyncNow() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/microsoft365/bookings/sync-now");
      return data;
    },
  });
}
