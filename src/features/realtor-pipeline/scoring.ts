import type { RealtorAgent } from "./types";

/** Calculate days since a date string, or Infinity if null */
function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Follow-up urgency score (0-100).
 * Higher = more urgent, should be contacted first.
 */
export function getFollowUpUrgency(agent: RealtorAgent): number {
  const daysSinceContact = daysSince(agent.last_call_date);

  // Active referrers: follow up every 2 weeks
  if (agent.stage === "active_referrer") {
    if (daysSinceContact > 21) return 100;
    if (daysSinceContact > 14) return 90;
    if (daysSinceContact > 10) return 70;
    return 20;
  }

  // Warm: follow up every 3 weeks
  if (agent.stage === "warm") {
    if (daysSinceContact > 28) return 95;
    if (daysSinceContact > 21) return 85;
    if (daysSinceContact > 14) return 65;
    return 15;
  }

  // Intro'd: follow up every 3-4 weeks
  if (agent.stage === "introd") {
    if (daysSinceContact > 35) return 90;
    if (daysSinceContact > 28) return 80;
    if (daysSinceContact > 21) return 55;
    return 10;
  }

  // Cold: never contacted = highest priority among cold, contacted = lower
  if (agent.last_call_date === null) return 60;
  if (daysSinceContact > 30) return 50;
  return 5;
}

/**
 * Check if an agent is due for follow-up (overdue or coming due).
 */
export function isDueForFollowUp(agent: RealtorAgent): boolean {
  return getFollowUpUrgency(agent) >= 55;
}

/**
 * Sort agents by urgency score (highest first).
 */
export function sortByUrgency(agents: RealtorAgent[]): RealtorAgent[] {
  return [...agents].sort((a, b) => getFollowUpUrgency(b) - getFollowUpUrgency(a));
}
