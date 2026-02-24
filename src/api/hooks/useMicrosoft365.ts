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
