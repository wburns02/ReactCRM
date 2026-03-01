import type { PerformanceMetrics } from "./types";

/**
 * Lifetime stats tracked across all sessions
 */
export interface LifetimeStats {
  totalCalls: number;
  totalConnected: number;
  totalInterested: number;
  totalVoicemails: number;
  totalDaysWorked: number;
  longestStreak: number;
  bestDayCalls: number;
  bestDayConnectRate: number;
}

export const EMPTY_LIFETIME_STATS: LifetimeStats = {
  totalCalls: 0,
  totalConnected: 0,
  totalInterested: 0,
  totalVoicemails: 0,
  totalDaysWorked: 0,
  longestStreak: 0,
  bestDayCalls: 0,
  bestDayConnectRate: 0,
};

/**
 * Voicemail drop configuration
 */
export interface VoicemailDropConfig {
  vmExtension: string;
  enabled: boolean;
  dropCount: number;
}

export const DEFAULT_VM_DROP_CONFIG: VoicemailDropConfig = {
  vmExtension: "",
  enabled: false,
  dropCount: 0,
};

/**
 * Badge definition
 */
export interface DanniaBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "calls" | "streak" | "conversion" | "milestone";
  condition: (
    metrics: PerformanceMetrics,
    lifetime: LifetimeStats,
  ) => boolean;
}

/**
 * All badge definitions — 12 badges across 4 categories
 */
export const BADGE_DEFINITIONS: DanniaBadge[] = [
  // Call volume badges
  {
    id: "first_ring",
    name: "First Ring",
    description: "Made your first call",
    icon: "\u{1F4DE}",
    category: "calls",
    condition: (m) => m.todayCallsMade >= 1,
  },
  {
    id: "warming_up",
    name: "Warming Up",
    description: "Made 10 calls in a day",
    icon: "\u{1F525}",
    category: "calls",
    condition: (m) => m.todayCallsMade >= 10,
  },
  {
    id: "on_a_roll",
    name: "On a Roll",
    description: "Made 25 calls in a day",
    icon: "\u26A1",
    category: "calls",
    condition: (m) => m.todayCallsMade >= 25,
  },
  {
    id: "full_day",
    name: "Full Day",
    description: "Hit the daily goal of 35 calls",
    icon: "\u{1F3C6}",
    category: "calls",
    condition: (m) => m.todayCallsMade >= 35,
  },

  // Streak badges
  {
    id: "hot_streak",
    name: "Hot Streak",
    description: "3 connects in a row",
    icon: "\u{1F329}\uFE0F",
    category: "streak",
    condition: (m) => m.currentStreak >= 3,
  },
  {
    id: "on_fire",
    name: "On Fire",
    description: "5 connects in a row",
    icon: "\u{1F525}",
    category: "streak",
    condition: (m) => m.currentStreak >= 5,
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "10 connects in a row!",
    icon: "\u{1F680}",
    category: "streak",
    condition: (m) => m.currentStreak >= 10,
  },

  // Conversion badges
  {
    id: "closer",
    name: "Closer",
    description: "Got your first interested contact",
    icon: "\u{1F91D}",
    category: "conversion",
    condition: (m) => m.todayInterested >= 1,
  },
  {
    id: "sales_natural",
    name: "Sales Natural",
    description: "10 interested contacts total",
    icon: "\u{1F4B0}",
    category: "conversion",
    condition: (_m, l) => l.totalInterested >= 10,
  },
  {
    id: "connect_queen",
    name: "Connect Queen",
    description: "30%+ connect rate today",
    icon: "\u{1F451}",
    category: "conversion",
    condition: (m) => m.todayCallsMade >= 10 && m.connectRate >= 30,
  },

  // Milestone badges
  {
    id: "century_club",
    name: "Century Club",
    description: "100 lifetime calls",
    icon: "\u{1F4AF}",
    category: "milestone",
    condition: (_m, l) => l.totalCalls >= 100,
  },
  {
    id: "phone_warrior",
    name: "Phone Warrior",
    description: "500 lifetime calls",
    icon: "\u{1F3C5}",
    category: "milestone",
    condition: (_m, l) => l.totalCalls >= 500,
  },
];

/**
 * Check which new badges have been earned.
 * Returns only badges that are NOT already in earnedBadges.
 */
export function checkNewBadges(
  metrics: PerformanceMetrics,
  lifetime: LifetimeStats,
  earnedBadges: string[],
): DanniaBadge[] {
  const newBadges: DanniaBadge[] = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (earnedBadges.includes(badge.id)) continue;
    if (badge.condition(metrics, lifetime)) {
      newBadges.push(badge);
    }
  }
  return newBadges;
}

/**
 * Daily goal definition
 */
export interface DailyGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  color: string;
}

/**
 * Build daily goals from current metrics
 */
export function buildDailyGoals(
  metrics: PerformanceMetrics,
  maxCallsPerDay: number,
): DailyGoal[] {
  // Target 30% connect rate for connects goal
  const connectTarget = Math.max(3, Math.round(maxCallsPerDay * 0.2));
  // Target 2+ interested per day
  const interestedTarget = Math.max(2, Math.round(maxCallsPerDay * 0.06));

  return [
    {
      id: "calls",
      label: "Calls",
      current: metrics.todayCallsMade,
      target: maxCallsPerDay,
      color: "#3B82F6", // blue-500
    },
    {
      id: "connects",
      label: "Connects",
      current: metrics.todayConnected,
      target: connectTarget,
      color: "#10B981", // emerald-500
    },
    {
      id: "interested",
      label: "Interested",
      current: metrics.todayInterested,
      target: interestedTarget,
      color: "#F59E0B", // amber-500
    },
  ];
}
