import type { ContactScore, ScoreBreakdown } from "../types";
import type {
  LifetimeStats,
  VoicemailDropConfig,
} from "./gamification";

/**
 * Time block types for daily schedule
 */
export type BlockType =
  | "prep"
  | "high_connect"
  | "cleanup"
  | "lunch"
  | "overflow";

/**
 * A single time block in the daily schedule
 */
export interface TimeBlock {
  id: string;
  type: BlockType;
  label: string;
  startHour: number; // 24hr, e.g. 9.5 = 9:30
  endHour: number;
  capacity: number; // max contacts for this block
  contactIds: string[];
  completedIds: string[];
}

/**
 * A full day plan
 */
export interface DailyPlan {
  date: string; // ISO date YYYY-MM-DD
  dayOfWeek: number; // 0=Sun ... 5=Fri
  blocks: TimeBlock[];
  totalCapacity: number;
  completedCount: number;
  skippedCount: number;
}

/**
 * Weekly schedule (Mon-Fri)
 */
export interface WeeklySchedule {
  id: string;
  weekStart: string; // ISO date of Monday
  weekEnd: string; // ISO date of Friday
  days: DailyPlan[];
  generatedAt: string;
  callbackReserve: number; // slots reserved for callbacks
}

/**
 * Performance metrics tracked per hour
 */
export interface HourlyMetrics {
  hour: number; // 0-23
  date: string; // ISO date
  callsMade: number;
  connected: number;
  interested: number;
  voicemails: number;
  noAnswers: number;
  avgDurationSec: number;
}

/**
 * Aggregate performance metrics
 */
export interface PerformanceMetrics {
  todayCallsMade: number;
  todayConnected: number;
  todayInterested: number;
  todayVoicemails: number;
  connectRate: number; // percentage
  interestRate: number; // percentage
  callsPerHour: number;
  currentStreak: number; // consecutive connects
  bestStreak: number;
  hourlyData: HourlyMetrics[];
}

/**
 * Callback entry
 */
export interface CallbackEntry {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  campaignId: string;
  requestedAt: string; // ISO datetime
  scheduledFor: string; // ISO datetime
  scheduledBlockId: string | null;
  rawInput: string; // what the user typed
  parsedLabel: string; // human-readable label
  status: "pending" | "placed" | "completed" | "no_show" | "retried";
  retryCount: number;
  priority: "high" | "standard";
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | "schedule_generated"
    | "day_regenerated"
    | "block_completed"
    | "contact_called"
    | "callback_scheduled"
    | "callback_placed"
    | "callback_no_show"
    | "failure_detected"
    | "zone_shift"
    | "urgency_boost"
    | "break_suggested"
    | "config_changed"
    | "daily_limit_reached";
  reason: string;
  details?: Record<string, unknown>;
}

/**
 * Configuration for Dannia Mode
 */
export interface DanniaModeConfig {
  maxCallsPerDay: number;
  callbackReservePercent: number; // 0-100
  workStartHour: number; // 8.5 = 8:30
  workEndHour: number; // 16.5 = 4:30
  lunchStartHour: number;
  lunchEndHour: number;
  avgCallCycleMinutes: number;
  bufferMinutesPerHour: number;
  connectRateThreshold: number; // below this triggers failure
  interestRateThreshold: number;
  lowVelocityThreshold: number; // calls/hr
  failureWindowHours: number;
}

/**
 * Enhanced score breakdown adding v2 factors
 */
export interface EnhancedScoreBreakdown extends ScoreBreakdown {
  connectTimeCluster: number; // 0-8
  zoneDensity: number; // 0-7
  csrFamiliarity: number; // 0-5
  thirtyDayExpiry: number; // 0-5
  multiContract: number; // 0-5
}

/**
 * Enhanced contact score with explanation
 */
export interface EnhancedContactScore extends ContactScore {
  enhancedBreakdown: EnhancedScoreBreakdown;
  explanation: string; // plain English
  normalizedTotal: number; // 0-100 after v2 normalization
}

/**
 * Weekly report data
 */
export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  totalCalls: number;
  totalConnected: number;
  totalInterested: number;
  totalVoicemails: number;
  totalNoAnswer: number;
  connectRate: number;
  interestRate: number;
  contractsSaved: number;
  revenueEstimate: number;
  bestTimeBlock: string;
  bestZone: string;
  bestDay: string;
  dailyBreakdown: {
    date: string;
    dayLabel: string;
    calls: number;
    connected: number;
    interested: number;
    connectRate: number;
  }[];
  suggestions: string[];
}

/**
 * Dannia store state shape
 */
export interface DanniaStoreState {
  // Schedule
  currentSchedule: WeeklySchedule | null;
  // Performance
  performanceMetrics: PerformanceMetrics;
  // Callbacks
  callbacks: CallbackEntry[];
  // Audit
  auditLog: AuditLogEntry[];
  // Config
  config: DanniaModeConfig;
  // Weekly reports
  weeklyReports: WeeklyReport[];
  // Session state
  activeBlockId: string | null;
  dialingActive: boolean;
  // Gamification
  earnedBadges: string[];
  lifetimeStats: LifetimeStats;
  // Voicemail drop
  voicemailDropConfig: VoicemailDropConfig;

  // Actions
  setSchedule: (schedule: WeeklySchedule) => void;
  updateDayPlan: (date: string, plan: DailyPlan) => void;
  markBlockContact: (blockId: string, contactId: string, date: string) => boolean;
  completeBlock: (blockId: string, date: string) => void;
  setActiveBlock: (blockId: string | null) => void;
  setDialingActive: (active: boolean) => void;

  // Performance
  recordCall: (metrics: {
    connected: boolean;
    interested: boolean;
    voicemail: boolean;
    noAnswer: boolean;
    durationSec: number;
  }) => void;
  resetDailyMetrics: () => void;

  // Callbacks
  addCallback: (entry: Omit<CallbackEntry, "id">) => void;
  updateCallback: (id: string, updates: Partial<CallbackEntry>) => void;
  removeCallback: (id: string) => void;

  // Audit
  addAuditEntry: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;

  // Config
  updateConfig: (updates: Partial<DanniaModeConfig>) => void;

  // Reports
  addWeeklyReport: (report: WeeklyReport) => void;

  // Gamification
  earnBadge: (badgeId: string) => void;
  updateLifetimeStats: (updates: Partial<LifetimeStats>) => void;

  // Voicemail drop
  updateVoicemailDropConfig: (updates: Partial<VoicemailDropConfig>) => void;

  // Queries
  getTodayPlan: () => DailyPlan | null;
  getCurrentBlock: () => TimeBlock | null;
  getPendingCallbacks: () => CallbackEntry[];
  getTodayCallCount: () => number;
  canMakeMoreCalls: () => boolean;
}
