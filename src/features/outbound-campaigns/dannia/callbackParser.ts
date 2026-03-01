import type { HourlyMetrics } from "./types";

export interface ParsedCallback {
  scheduledFor: Date;
  label: string;
  confidence: "high" | "medium" | "low";
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Parse a callback time expression into a scheduled datetime.
 * Examples: "next week", "afternoon", "monday", "after payday", "morning"
 */
export function parseCallbackTime(
  rawInput: string,
  hourlyData?: HourlyMetrics[],
  now: Date = new Date(),
): ParsedCallback {
  const input = rawInput.toLowerCase().trim();

  // "next week" → same weekday, same time ±30min
  if (input.includes("next week")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 7);
    const bestHour = getBestHistoricalHour(hourlyData, now);
    target.setHours(bestHour, Math.random() > 0.5 ? 0 : 30, 0, 0);
    return {
      scheduledFor: target,
      label: `Next ${DAY_NAMES[target.getDay()]} ~${formatHourLabel(bestHour)}`,
      confidence: "high",
    };
  }

  // "afternoon" → 1-3PM today/tomorrow
  if (input.includes("afternoon")) {
    const target = new Date(now);
    if (now.getHours() >= 15) {
      target.setDate(target.getDate() + 1);
    }
    const hour = 13 + Math.floor(Math.random() * 2); // 1-2 PM
    target.setHours(hour, 0, 0, 0);
    return {
      scheduledFor: target,
      label: `${isToday(target, now) ? "Today" : "Tomorrow"} afternoon ~${formatHourLabel(hour)}`,
      confidence: "high",
    };
  }

  // "morning" → 9-11AM today/tomorrow
  if (input.includes("morning")) {
    const target = new Date(now);
    if (now.getHours() >= 11) {
      target.setDate(target.getDate() + 1);
    }
    const hour = 9 + Math.floor(Math.random() * 2); // 9-10 AM
    target.setHours(hour, 0, 0, 0);
    return {
      scheduledFor: target,
      label: `${isToday(target, now) ? "Today" : "Tomorrow"} morning ~${formatHourLabel(hour)}`,
      confidence: "high",
    };
  }

  // "after payday" → 1st or 15th of month (whichever is next)
  if (input.includes("payday") || input.includes("pay day")) {
    const target = new Date(now);
    const day = now.getDate();
    if (day < 15) {
      target.setDate(15);
    } else {
      target.setMonth(target.getMonth() + 1);
      target.setDate(1);
    }
    const bestHour = getBestHistoricalHour(hourlyData, now);
    target.setHours(bestHour, 0, 0, 0);
    return {
      scheduledFor: target,
      label: `After payday (${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
      confidence: "medium",
    };
  }

  // Day names: "monday", "tuesday", etc.
  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (input.includes(DAY_NAMES[i])) {
      const target = new Date(now);
      const currentDay = now.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      target.setDate(target.getDate() + daysUntil);
      const bestHour = getBestHistoricalHour(hourlyData, now);
      target.setHours(bestHour, Math.random() > 0.5 ? 0 : 30, 0, 0);
      return {
        scheduledFor: target,
        label: `${DAY_NAMES[i].charAt(0).toUpperCase() + DAY_NAMES[i].slice(1)} ~${formatHourLabel(bestHour)}`,
        confidence: "high",
      };
    }
  }

  // "tomorrow"
  if (input.includes("tomorrow")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    const bestHour = getBestHistoricalHour(hourlyData, now);
    target.setHours(bestHour, 0, 0, 0);
    return {
      scheduledFor: target,
      label: `Tomorrow ~${formatHourLabel(bestHour)}`,
      confidence: "high",
    };
  }

  // "today" or "later"
  if (input.includes("today") || input.includes("later")) {
    const target = new Date(now);
    const bestHour = Math.max(now.getHours() + 1, 14);
    target.setHours(Math.min(bestHour, 16), 0, 0, 0);
    return {
      scheduledFor: target,
      label: `Today ~${formatHourLabel(Math.min(bestHour, 16))}`,
      confidence: "medium",
    };
  }

  // Fallback: use best historical connect hour, schedule for next business day
  const bestHour = getBestHistoricalHour(hourlyData, now);
  const target = getNextBusinessDay(now);
  target.setHours(bestHour, 0, 0, 0);
  return {
    scheduledFor: target,
    label: `Best connect time (~${formatHourLabel(bestHour)})`,
    confidence: "low",
  };
}

/**
 * Get the hour with the highest historical connect rate
 */
function getBestHistoricalHour(
  hourlyData: HourlyMetrics[] | undefined,
  now: Date,
): number {
  if (!hourlyData || hourlyData.length === 0) return 10; // default 10 AM

  const hourStats = new Map<number, { calls: number; connects: number }>();
  for (const h of hourlyData) {
    const existing = hourStats.get(h.hour) ?? { calls: 0, connects: 0 };
    existing.calls += h.callsMade;
    existing.connects += h.connected;
    hourStats.set(h.hour, existing);
  }

  let bestHour = 10;
  let bestRate = 0;
  for (const [hour, stats] of hourStats) {
    if (stats.calls < 3) continue; // need minimum sample
    const rate = stats.connects / stats.calls;
    if (rate > bestRate) {
      bestRate = rate;
      bestHour = hour;
    }
  }

  return bestHour;
}

function getNextBusinessDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function isToday(date: Date, now: Date): boolean {
  return date.toDateString() === now.toDateString();
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${period}`;
}
