import { z } from "zod";
import { type WorkOrder } from "./workOrder.ts";

/**
 * Region configuration for multi-region support
 */
export const REGIONS = {
  central_texas: {
    name: "Central Texas",
    center: { lat: 30.2672, lon: -97.7431 },
  },
  midlands_sc: {
    name: "Midlands SC",
    center: { lat: 34.0007, lon: -81.0348 },
  },
  greater_nashville: {
    name: "Greater Nashville",
    center: { lat: 36.1627, lon: -86.7816 },
  },
} as const;

export type Region = keyof typeof REGIONS;

export const REGION_LABELS: Record<Region, string> = {
  central_texas: "Central Texas",
  midlands_sc: "Midlands SC",
  greater_nashville: "Greater Nashville",
};

/**
 * Technician status for dispatch
 */
export const technicianStatusSchema = z.enum([
  "available",
  "en_route",
  "on_site",
  "on_break",
  "off_duty",
  "unavailable",
]);

export type TechnicianStatus = z.infer<typeof technicianStatusSchema>;

export const TECHNICIAN_STATUS_LABELS: Record<TechnicianStatus, string> = {
  available: "Available",
  en_route: "En Route",
  on_site: "On Site",
  on_break: "On Break",
  off_duty: "Off Duty",
  unavailable: "Unavailable",
};

export const TECHNICIAN_STATUS_COLORS: Record<TechnicianStatus, string> = {
  available: "bg-green-500",
  en_route: "bg-blue-500",
  on_site: "bg-purple-500",
  on_break: "bg-yellow-500",
  off_duty: "bg-gray-500",
  unavailable: "bg-red-500",
};

/**
 * Extended work order with schedule-specific computed fields
 */
export interface ScheduledWorkOrder extends WorkOrder {
  // Computed display fields
  displayTime?: string;
  displayDuration?: string;

  // Time estimates (minutes)
  travel_time_minutes?: number;
  setup_time_minutes?: number;
  dump_time_minutes?: number;
  inspection_time_minutes?: number;
  buffer_time_minutes?: number;

  // Cost estimates
  estimated_value?: number;
  estimated_gallons?: number;

  // Region
  region?: Region;
}

/**
 * Drop target data for drag-drop operations
 */
export interface DropTargetData {
  date: string; // YYYY-MM-DD
  technician?: string;
  hour?: number; // 0-23 for time slot drops
}

/**
 * Schedule statistics for dashboard
 */
export interface ScheduleStats {
  todayJobs: number;
  weekJobs: number;
  unscheduledJobs: number;
  emergencyJobs: number;
  todayRevenue?: number;
  weekRevenue?: number;
}

/**
 * Schedule configuration constants
 */
export const SCHEDULE_CONFIG = {
  WORK_HOURS: { start: 8, end: 18 },
  LUNCH_HOUR: { start: 12, end: 13 },
  TIME_SLOT_DURATION: 60, // minutes
  DEFAULT_SETUP_TIME: 15, // minutes
  DEFAULT_BUFFER_TIME: 10, // minutes
  DEFAULT_INSPECTION_TIME: 10, // minutes
  DEFAULT_DEPOT_RETURN_TIME: 30, // minutes
  MAX_RADIUS_MILES: 120,
  MAX_HOURS_PER_DAY: 8,
  WARNING_HOURS_PER_DAY: 7,
  POLLING_INTERVAL: 30000, // ms
  CACHE_DURATION: 300000, // ms (5 min)
} as const;

/**
 * Time slot for day view
 */
export interface TimeSlot {
  hour: number;
  label: string;
  isLunchHour: boolean;
}

/**
 * Generate time slots for day view
 */
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { start, end } = SCHEDULE_CONFIG.WORK_HOURS;
  const { start: lunchStart, end: lunchEnd } = SCHEDULE_CONFIG.LUNCH_HOUR;

  for (let hour: number = start; hour < end; hour++) {
    const isLunchHour = hour >= lunchStart && hour < lunchEnd;
    const period = hour >= 12 ? "PM" : "AM";
    // Convert 24h to 12h format (13-23 -> 1-11, 0 -> 12, 1-12 -> 1-12)
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

    slots.push({
      hour,
      label: `${displayHour}:00 ${period}`,
      isLunchHour,
    });
  }

  return slots;
}

/**
 * Format time string for display
 */
export function formatTimeDisplay(time: string | null | undefined): string {
  if (!time) return "TBD";
  // Handle HH:MM:SS or HH:MM format
  const parts = time.split(":");
  if (parts.length < 2) return time;

  const hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  return `${displayHour}:${minute} ${period}`;
}

/**
 * Get week days starting from a date (Monday)
 */
export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date range for display
 */
export function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startStr = startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const endStr = endDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}
