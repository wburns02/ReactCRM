import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { validateResponse } from "@/api/validateResponse.ts";
import {
  type Booking,
  type BookingListResponse,
  type CaptureResponse,
  bookingListSchema,
  bookingSchema,
  captureResponseSchema,
} from "@/api/types/booking.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

interface BookingFilters {
  page?: number;
  page_size?: number;
  status?: string;
  payment_status?: string;
}

export function useBookings(filters: BookingFilters = {}) {
  const { page = 1, page_size = 20, status, payment_status } = filters;
  return useQuery<BookingListResponse>({
    queryKey: bookingKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(page_size));
      if (status) params.set("status", status);
      if (payment_status) params.set("payment_status", payment_status);

      const { data } = await apiClient.get(`/bookings/?${params.toString()}`);
      return validateResponse(bookingListSchema, data, "/bookings");
    },
    staleTime: 30_000,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery<Booking | null>({
    queryKey: bookingKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/bookings/${id}`);
      return validateResponse(bookingSchema, data, `/bookings/${id}`);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCaptureBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation<
    CaptureResponse,
    Error,
    { bookingId: string; actual_gallons: number; notes?: string }
  >({
    mutationFn: async ({ bookingId, actual_gallons, notes }) => {
      const { data } = await apiClient.post(`/bookings/${bookingId}/capture`, {
        actual_gallons,
        notes,
      });
      return validateResponse(captureResponseSchema, data, `/bookings/${bookingId}/capture`);
    },
    onSuccess: (_, { bookingId }) => {
      toastSuccess("Payment captured successfully");
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(bookingId),
      });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (err) => {
      toastError(err.message || "Failed to capture payment");
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: async (bookingId: string) => {
      const { data } = await apiClient.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: (_, bookingId) => {
      toastSuccess("Booking cancelled");
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(bookingId),
      });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (err) => {
      toastError(err.message || "Failed to cancel booking");
    },
  });
}
