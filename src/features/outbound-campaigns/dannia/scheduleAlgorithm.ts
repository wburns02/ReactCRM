import type { CampaignContact } from "../types";
import type { WeeklySchedule, DailyPlan, TimeBlock, DanniaModeConfig } from "./types";
import { DAY_BLOCK_TEMPLATES, ZONE_BATCH_SIZE } from "./constants";
import { scoreContactV2 } from "./scoringV2";
import type { HourlyMetrics } from "./types";

/**
 * Get the Monday of the current week
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Get the Friday of the current week
 */
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -2 : 5 - day; // Friday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Generate blocks for a single day from templates
 */
export function generateDayBlocks(): TimeBlock[] {
  return DAY_BLOCK_TEMPLATES.map((template) => ({
    id: crypto.randomUUID(),
    type: template.type,
    label: template.label,
    startHour: template.startHour,
    endHour: template.endHour,
    capacity: template.capacity,
    contactIds: [],
    completedIds: [],
  }));
}

/**
 * Batch contacts by zone, maintaining score order within each zone.
 * Returns interleaved batches of 5-8 same-zone contacts.
 */
export function batchByZone(
  contacts: CampaignContact[],
): CampaignContact[] {
  // Group by zone
  const zoneGroups = new Map<string, CampaignContact[]>();
  const noZone: CampaignContact[] = [];

  for (const contact of contacts) {
    const zone = contact.service_zone ?? "Unknown";
    if (zone === "Unknown") {
      noZone.push(contact);
    } else {
      const group = zoneGroups.get(zone) ?? [];
      group.push(contact);
      zoneGroups.set(zone, group);
    }
  }

  // Create batches from each zone
  const batches: CampaignContact[][] = [];
  for (const [, group] of zoneGroups) {
    for (let i = 0; i < group.length; i += ZONE_BATCH_SIZE.max) {
      const batch = group.slice(i, i + ZONE_BATCH_SIZE.max);
      if (batch.length >= ZONE_BATCH_SIZE.min || group.length < ZONE_BATCH_SIZE.min) {
        batches.push(batch);
      } else {
        // Too small — merge with previous batch or push anyway
        if (batches.length > 0) {
          batches[batches.length - 1].push(...batch);
        } else {
          batches.push(batch);
        }
      }
    }
  }

  // Sort batches by average score (highest first)
  batches.sort((a, b) => {
    const avgA = a.reduce((s, c) => s + (c.priority ?? 0), 0) / a.length;
    const avgB = b.reduce((s, c) => s + (c.priority ?? 0), 0) / b.length;
    return avgB - avgA;
  });

  // Interleave: flatten batches, then append no-zone contacts
  const result = batches.flat();
  result.push(...noZone);
  return result;
}

/**
 * Assign scored + zone-batched contacts to time blocks for a day
 */
export function assignContactsToBlocks(
  blocks: TimeBlock[],
  contacts: CampaignContact[],
  config: DanniaModeConfig,
): TimeBlock[] {
  const batched = batchByZone(contacts);
  let contactIndex = 0;
  const dailyCap = config.maxCallsPerDay;
  let assigned = 0;

  return blocks.map((block) => {
    if (block.capacity === 0 || assigned >= dailyCap) {
      return block;
    }

    const blockContacts: string[] = [];
    const blockCap = Math.min(block.capacity, dailyCap - assigned);

    for (let i = 0; i < blockCap && contactIndex < batched.length; i++) {
      blockContacts.push(batched[contactIndex].id);
      contactIndex++;
      assigned++;
    }

    return { ...block, contactIds: blockContacts };
  });
}

/**
 * Generate a full weekly plan (Mon-Fri)
 */
export function generateWeeklyPlan(
  allCallable: CampaignContact[],
  config: DanniaModeConfig,
  context?: {
    hourlyData?: HourlyMetrics[];
    calledContactIds?: Set<string>;
    allContacts?: CampaignContact[];
  },
): WeeklySchedule {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const callbackReserve = Math.ceil(
    allCallable.length * (config.callbackReservePercent / 100),
  );

  // Score all contacts with v2 scoring
  const scored = scoreContactV2
    ? allCallable
        .map((c) => ({
          contact: c,
          score: scoreContactV2(c, context ?? {}, now),
        }))
        .sort((a, b) => b.score.normalizedTotal - a.score.normalizedTotal)
        .map((s) => s.contact)
    : allCallable;

  // Reserve top contacts for callback replacements
  const available = scored.slice(0, scored.length - callbackReserve);

  // Generate 5 days (Mon-Fri)
  const days: DailyPlan[] = [];
  let contactPool = [...available];

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const dateStr = dayDate.toISOString().split("T")[0];

    const blocks = generateDayBlocks();
    const dailySlice = contactPool.slice(0, config.maxCallsPerDay);
    contactPool = contactPool.slice(config.maxCallsPerDay);

    const assignedBlocks = assignContactsToBlocks(blocks, dailySlice, config);
    const totalCapacity = assignedBlocks.reduce(
      (sum, b) => sum + b.contactIds.length,
      0,
    );

    days.push({
      date: dateStr,
      dayOfWeek: dayDate.getDay(),
      blocks: assignedBlocks,
      totalCapacity,
      completedCount: 0,
      skippedCount: 0,
    });
  }

  return {
    id: crypto.randomUUID(),
    weekStart,
    weekEnd,
    days,
    generatedAt: now.toISOString(),
    callbackReserve,
  };
}

/**
 * Regenerate a single day's plan (e.g., after failure detection)
 */
export function regenerateDayPlan(
  schedule: WeeklySchedule,
  date: string,
  contacts: CampaignContact[],
  config: DanniaModeConfig,
): WeeklySchedule {
  const blocks = generateDayBlocks();
  const dailySlice = contacts.slice(0, config.maxCallsPerDay);
  const assignedBlocks = assignContactsToBlocks(blocks, dailySlice, config);

  const dayDate = new Date(date);
  const totalCapacity = assignedBlocks.reduce(
    (sum, b) => sum + b.contactIds.length,
    0,
  );

  const newDay: DailyPlan = {
    date,
    dayOfWeek: dayDate.getDay(),
    blocks: assignedBlocks,
    totalCapacity,
    completedCount: 0,
    skippedCount: 0,
  };

  return {
    ...schedule,
    days: schedule.days.map((d) => (d.date === date ? newDay : d)),
  };
}
