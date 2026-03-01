import type { CampaignContact, ContactScore, ScoreBreakdown } from "./types";

/**
 * Score a single contact on a 0-100 scale based on multiple factors.
 * Pure function — no side effects or API calls.
 */
export function scoreContact(
  contact: CampaignContact,
  now: Date = new Date(),
): ContactScore {
  const breakdown: ScoreBreakdown = {
    contractUrgency: scoreContractUrgency(contact),
    priorityLabel: scorePriorityLabel(contact),
    customerType: scoreCustomerType(contact),
    callbackDue: scoreCallbackDue(contact, now),
    attemptEfficiency: scoreAttemptEfficiency(contact),
    timeOfDay: scoreTimeOfDay(contact, now),
  };

  const total = Math.min(
    100,
    breakdown.contractUrgency +
      breakdown.priorityLabel +
      breakdown.customerType +
      breakdown.callbackDue +
      breakdown.attemptEfficiency +
      breakdown.timeOfDay,
  );

  return { contactId: contact.id, total, breakdown };
}

/**
 * Score and sort an array of contacts by smart score (descending).
 */
export function scoreAndSortContacts(
  contacts: CampaignContact[],
  now: Date = new Date(),
): (CampaignContact & { _score: ContactScore })[] {
  return contacts
    .map((c) => ({ ...c, _score: scoreContact(c, now) }))
    .sort((a, b) => b._score.total - a._score.total);
}

// --- Scoring factors ---

/** Contract urgency: 0-30 pts. Expired + high days = max. Active = 0. */
function scoreContractUrgency(contact: CampaignContact): number {
  const status = contact.contract_status?.toLowerCase() ?? "";
  const daysExpired = contact.days_since_expiry ?? 0;

  if (status.includes("expired") || daysExpired > 0) {
    if (daysExpired >= 365) return 30;
    if (daysExpired >= 180) return 25;
    if (daysExpired >= 90) return 20;
    if (daysExpired >= 30) return 15;
    return 10;
  }

  if (status.includes("active")) return 0;
  // No contract info — moderate urgency
  return 5;
}

/** Priority label: 0-20 pts. HIGH=20, Medium=12, Low=6. */
function scorePriorityLabel(contact: CampaignContact): number {
  const label = contact.call_priority_label?.toLowerCase().trim() ?? "";
  if (label === "high") return 20;
  if (label === "medium" || label === "med") return 12;
  if (label === "low") return 6;
  return 0;
}

/** Customer type: 0-10 pts. Commercial=8, Residential=5. */
function scoreCustomerType(contact: CampaignContact): number {
  const type = contact.customer_type?.toLowerCase() ?? "";
  if (type.includes("commercial")) return 8;
  if (type.includes("residential")) return 5;
  return 3;
}

/** Callback due: 0-15 pts. Overdue=15, within 24h=10, future=5. */
function scoreCallbackDue(contact: CampaignContact, now: Date): number {
  if (contact.call_status !== "callback_scheduled" || !contact.callback_date) {
    return 0;
  }

  const callbackTime = new Date(contact.callback_date).getTime();
  const diff = callbackTime - now.getTime();
  const hoursUntil = diff / (1000 * 60 * 60);

  if (hoursUntil <= 0) return 15; // Overdue
  if (hoursUntil <= 24) return 10; // Within 24h
  return 5; // Future
}

/** Attempt efficiency: 0-10 pts. Fewer attempts = higher score. */
function scoreAttemptEfficiency(contact: CampaignContact): number {
  const attempts = contact.call_attempts;
  if (attempts === 0) return 10; // Fresh lead
  if (attempts === 1) return 7;
  if (attempts === 2) return 4;
  return 1; // 3+ attempts
}

/** Time of day: 0-15 pts. Best calling windows vary by customer type. */
function scoreTimeOfDay(contact: CampaignContact, now: Date): number {
  const hour = now.getHours();
  const isCommercial = contact.customer_type?.toLowerCase().includes("commercial");

  if (isCommercial) {
    // Commercial: best 9am-12pm
    if (hour >= 9 && hour < 12) return 15;
    if (hour >= 12 && hour < 14) return 10;
    if (hour >= 8 && hour < 9) return 8;
    if (hour >= 14 && hour < 17) return 6;
    return 2;
  }

  // Residential: best 9-11am and 3-5pm
  if ((hour >= 9 && hour < 11) || (hour >= 15 && hour < 17)) return 15;
  if (hour >= 11 && hour < 13) return 10;
  if (hour >= 17 && hour < 19) return 8;
  if (hour >= 13 && hour < 15) return 6;
  return 2;
}
