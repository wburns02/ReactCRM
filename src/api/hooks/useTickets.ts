import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import {
  ticketListResponseSchema,
  ticketSchema,
  type Ticket,
  type TicketListResponse,
  type TicketFilters,
  type TicketFormData,
} from "../types/ticket.ts";

/**
 * Query keys for tickets
 */
export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (filters: TicketFilters) => [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
};

/**
 * Fetch paginated tickets list
 */
export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: async (): Promise<TicketListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);

      const url = "/tickets/?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = ticketListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Tickets list response validation failed:",
            result.error,
          );
        }
      }

      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single ticket by ID
 */
export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.detail(id!),
    queryFn: async (): Promise<Ticket> => {
      const { data } = await apiClient.get("/tickets/" + id);

      if (import.meta.env.DEV) {
        const result = ticketSchema.safeParse(data);
        if (!result.success) {
          console.warn("Ticket response validation failed:", result.error);
        }
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create new ticket
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TicketFormData): Promise<Ticket> => {
      const response = await apiClient.post("/tickets/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

/**
 * Update existing ticket
 */
export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TicketFormData>;
    }): Promise<Ticket> => {
      const response = await apiClient.patch("/tickets/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

/**
 * Delete ticket
 */
export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/tickets/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}
