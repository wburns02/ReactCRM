import { useMutation, useQuery } from "@tanstack/react-query";

// API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

// Types
export interface PricingInfo {
  service_type: string;
  base_price: number;
  included_gallons: number;
  overage_rate: number;
  preauth_amount: number;
  description: string;
}

export interface BookingCreateData {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  service_address?: string;
  service_type: string;
  scheduled_date: string; // YYYY-MM-DD
  time_slot?: "morning" | "afternoon" | "any";
  payment_token?: string;
  overage_acknowledged: boolean;
  sms_consent: boolean;
  notes?: string;
  test_mode: boolean;
}

export interface BookingResponse {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email?: string;
  customer_phone: string;
  service_address?: string;
  service_type: string;
  scheduled_date: string;
  time_slot?: string;
  time_window_start?: string;
  time_window_end?: string;
  base_price: number;
  included_gallons: number;
  overage_rate: number;
  preauth_amount: number;
  status: string;
  payment_status: string;
  is_test: boolean;
  created_at: string;
}

/**
 * Fetch pricing information for a service type
 */
async function fetchPricing(serviceType: string): Promise<PricingInfo> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/pricing?service_type=${serviceType}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch pricing: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new booking with payment pre-authorization
 */
async function createBooking(data: BookingCreateData): Promise<BookingResponse> {
  const response = await fetch(`${API_BASE_URL}/bookings/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create booking");
  }

  return response.json();
}

/**
 * Hook to get pricing information
 */
export function usePricing(serviceType: string = "pumping") {
  return useQuery({
    queryKey: ["pricing", serviceType],
    queryFn: () => fetchPricing(serviceType),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to create a booking
 */
export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      // Track conversion in Google Analytics if available
      if (typeof window !== "undefined") {
        const w = window as Window & { gtag?: (...args: unknown[]) => void };
        if (w.gtag) {
          w.gtag("event", "purchase", {
            event_category: "booking",
            event_label: data.service_type,
            value: data.base_price,
            transaction_id: data.id,
          });
        }
      }
    },
  });
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(slot?: string): string {
  switch (slot) {
    case "morning":
      return "Morning (8am - 12pm)";
    case "afternoon":
      return "Afternoon (12pm - 5pm)";
    case "any":
      return "Any Time";
    default:
      return "";
  }
}

/**
 * Format date for display
 */
export function formatBookingDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
