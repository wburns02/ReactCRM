import type { BlockType, DanniaModeConfig } from "./types";

/**
 * Default Dannia Mode configuration
 */
export const DEFAULT_DANNIA_CONFIG: DanniaModeConfig = {
  maxCallsPerDay: 35,
  callbackReservePercent: 15,
  workStartHour: 8.5, // 8:30 AM
  workEndHour: 16.5, // 4:30 PM
  lunchStartHour: 12,
  lunchEndHour: 13,
  avgCallCycleMinutes: 7,
  bufferMinutesPerHour: 10,
  connectRateThreshold: 15, // %
  interestRateThreshold: 5, // %
  lowVelocityThreshold: 4, // calls/hr
  failureWindowHours: 2,
};

/**
 * Day block templates define the daily structure
 */
export interface BlockTemplate {
  type: BlockType;
  label: string;
  startHour: number;
  endHour: number;
  capacity: number;
}

export const DAY_BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: "prep",
    label: "Prep Buffer",
    startHour: 8.5,
    endHour: 9,
    capacity: 0,
  },
  {
    type: "high_connect",
    label: "Morning Prime",
    startHour: 9,
    endHour: 11,
    capacity: 14,
  },
  {
    type: "cleanup",
    label: "Follow-ups & VMs",
    startHour: 11,
    endHour: 12,
    capacity: 7,
  },
  {
    type: "lunch",
    label: "Lunch Break",
    startHour: 12,
    endHour: 13,
    capacity: 0,
  },
  {
    type: "high_connect",
    label: "Afternoon Prime",
    startHour: 13,
    endHour: 15,
    capacity: 14,
  },
  {
    type: "high_connect",
    label: "Late Afternoon",
    startHour: 15,
    endHour: 16,
    capacity: 7,
  },
  {
    type: "overflow",
    label: "Overflow / Wrap-up",
    startHour: 16,
    endHour: 16.5,
    capacity: 0, // flex — filled from callbacks
  },
];

/**
 * Day names for schedule display
 */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const SHORT_DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * Performance thresholds for the meter
 */
export const PERF_THRESHOLDS = {
  good: 20, // >20% connect rate = green
  warning: 15, // 15-20% = yellow
  // <15% = red
} as const;

/**
 * Zone batch size for schedule grouping
 */
export const ZONE_BATCH_SIZE = { min: 5, max: 8 } as const;

/**
 * Weekly capacity calculation
 * 5 days * 35/day = 175, reserve 15% = ~26 slots for callbacks
 */
export const WEEKLY_CAPACITY = 175;
export const WEEKLY_CALLBACK_RESERVE = Math.ceil(
  WEEKLY_CAPACITY * (DEFAULT_DANNIA_CONFIG.callbackReservePercent / 100),
);

/**
 * Audit log max entries
 */
export const AUDIT_LOG_MAX = 1000;

/**
 * Format hour number to display string
 */
export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m > 0 ? `${displayH}:${m.toString().padStart(2, "0")} ${period}` : `${displayH} ${period}`;
}
