import { useQuery } from "@tanstack/react-query";

// API base URL - use environment variable for production
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

// Types matching the backend API response
export interface TimeWindow {
  start: string; // "08:00"
  end: string; // "12:00"
  available: boolean;
  slots_remaining: number;
}

export interface DayAvailability {
  date: string; // "2026-01-30"
  day_name: string; // "Thursday"
  is_weekend: boolean;
  available: boolean;
  time_windows: TimeWindow[];
}

export interface AvailabilityResponse {
  slots: DayAvailability[];
  start_date: string;
  end_date: string;
  total_available_days: number;
}

interface UseAvailabilityOptions {
  startDate?: string;
  endDate?: string;
  serviceType?: string;
  enabled?: boolean;
}

/**
 * Fetch availability slots from the CRM API
 */
async function fetchAvailability(
  options: UseAvailabilityOptions,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams();

  if (options.startDate) {
    params.append("start_date", options.startDate);
  }
  if (options.endDate) {
    params.append("end_date", options.endDate);
  }
  if (options.serviceType) {
    params.append("service_type", options.serviceType);
  }

  const url = `${API_BASE_URL}/availability/slots?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch next available slots (up to 5 available days)
 */
async function fetchNextAvailable(
  serviceType?: string,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams();

  if (serviceType) {
    params.append("service_type", serviceType);
  }

  const url = `${API_BASE_URL}/availability/next-available?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch next available: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch availability slots from the CRM
 */
export function useAvailability(options: UseAvailabilityOptions = {}) {
  const { startDate, endDate, serviceType, enabled = true } = options;

  return useQuery({
    queryKey: ["availability", startDate, endDate, serviceType],
    queryFn: () => fetchAvailability({ startDate, endDate, serviceType }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch next available slots
 */
export function useNextAvailable(serviceType?: string, enabled = true) {
  return useQuery({
    queryKey: ["next-available", serviceType],
    queryFn: () => fetchNextAvailable(serviceType),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Format time slot for display
 * "08:00" -> "8am-12pm" (when combined with end)
 */
export function formatTimeSlot(start: string, end: string): string {
  const formatTime = (time: string) => {
    const [hours] = time.split(":");
    const h = parseInt(hours, 10);
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h > 12 ? `${h - 12}pm` : `${h}am`;
  };

  return `${formatTime(start)}-${formatTime(end)}`;
}

/**
 * Format date for display
 * "2026-01-30" -> "Thu, Jan 30"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
