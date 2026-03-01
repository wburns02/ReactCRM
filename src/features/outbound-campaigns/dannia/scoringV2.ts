import type { CampaignContact } from "../types";
import { scoreContact } from "../scoring";
import type { EnhancedContactScore, EnhancedScoreBreakdown, HourlyMetrics } from "./types";

/**
 * Enhanced scoring (v2) wraps existing scoreContact() and adds 5 bonus factors.
 * Base score: 0-100 (from v1)
 * Bonus factors: 0-30 total
 * Final score normalized back to 0-100
 */
export function scoreContactV2(
  contact: CampaignContact,
  context: {
    hourlyData?: HourlyMetrics[];
    queueZones?: string[];
    calledContactIds?: Set<string>;
    allContacts?: CampaignContact[];
  } = {},
  now: Date = new Date(),
): EnhancedContactScore {
  const baseScore = scoreContact(contact, now);
  const baseTotal = baseScore.total; // 0-100

  // Calculate v2 bonus factors (0-30 total)
  const connectTimeCluster = scoreConnectTimeCluster(context.hourlyData, now);
  const zoneDensity = scoreZoneDensity(contact, context.queueZones);
  const csrFamiliarity = scoreCsrFamiliarity(contact, context.calledContactIds);
  const thirtyDayExpiry = scoreThirtyDayExpiry(contact);
  const multiContract = scoreMultiContract(contact, context.allContacts);

  const bonusTotal =
    connectTimeCluster + zoneDensity + csrFamiliarity + thirtyDayExpiry + multiContract;

  // Normalize: (base 0-100 + bonus 0-30) → 0-100
  const rawTotal = baseTotal + bonusTotal;
  const normalizedTotal = Math.min(100, Math.round((rawTotal / 130) * 100));

  const enhancedBreakdown: EnhancedScoreBreakdown = {
    ...baseScore.breakdown,
    connectTimeCluster,
    zoneDensity,
    csrFamiliarity,
    thirtyDayExpiry,
    multiContract,
  };

  const explanation = generateExplanation(contact, enhancedBreakdown);

  return {
    ...baseScore,
    total: normalizedTotal,
    enhancedBreakdown,
    explanation,
    normalizedTotal,
  };
}

/**
 * Score and sort contacts using v2 scoring
 */
export function scoreAndSortContactsV2(
  contacts: CampaignContact[],
  context: {
    hourlyData?: HourlyMetrics[];
    calledContactIds?: Set<string>;
    allContacts?: CampaignContact[];
  } = {},
  now: Date = new Date(),
): (CampaignContact & { _scoreV2: EnhancedContactScore })[] {
  // Build zone queue for density scoring
  const queueZones = contacts
    .map((c) => c.service_zone)
    .filter((z): z is string => z !== null);

  return contacts
    .map((c) => ({
      ...c,
      _scoreV2: scoreContactV2(c, { ...context, queueZones }, now),
    }))
    .sort((a, b) => b._scoreV2.normalizedTotal - a._scoreV2.normalizedTotal);
}

// --- V2 Bonus Factors ---

/**
 * Connect time cluster: 0-8 pts
 * Higher score if historical data shows high connect rate at current hour
 */
function scoreConnectTimeCluster(
  hourlyData: HourlyMetrics[] | undefined,
  now: Date,
): number {
  if (!hourlyData || hourlyData.length === 0) return 4; // neutral if no data
  const currentHour = now.getHours();
  const hourEntries = hourlyData.filter((h) => h.hour === currentHour);
  if (hourEntries.length === 0) return 4;

  const totalCalls = hourEntries.reduce((s, h) => s + h.callsMade, 0);
  const totalConnected = hourEntries.reduce((s, h) => s + h.connected, 0);
  if (totalCalls === 0) return 4;

  const connectRate = totalConnected / totalCalls;
  if (connectRate >= 0.4) return 8;
  if (connectRate >= 0.3) return 6;
  if (connectRate >= 0.2) return 4;
  if (connectRate >= 0.1) return 2;
  return 1;
}

/**
 * Zone density: 0-7 pts
 * Higher if contact is in the same zone as adjacent contacts in queue
 */
function scoreZoneDensity(
  contact: CampaignContact,
  queueZones: string[] | undefined,
): number {
  if (!contact.service_zone || !queueZones || queueZones.length === 0) return 3;

  const sameZoneCount = queueZones.filter(
    (z) => z === contact.service_zone,
  ).length;
  const density = sameZoneCount / queueZones.length;

  if (density >= 0.4) return 7;
  if (density >= 0.25) return 5;
  if (density >= 0.1) return 3;
  return 1;
}

/**
 * CSR familiarity: 0-5 pts
 * Bonus if this contact has been called before (CSR has context)
 */
function scoreCsrFamiliarity(
  contact: CampaignContact,
  calledContactIds: Set<string> | undefined,
): number {
  if (!calledContactIds) return 0;
  if (calledContactIds.has(contact.id)) {
    // Previously called — familiarity bonus
    if (contact.call_attempts >= 2) return 5;
    if (contact.call_attempts >= 1) return 3;
  }
  return 0;
}

/**
 * 30-day expiry boost: 0-5 pts
 * Contract expiring within 30 days gets a boost
 */
function scoreThirtyDayExpiry(contact: CampaignContact): number {
  if (!contact.contract_end) return 0;

  const endDate = new Date(contact.contract_end);
  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Already expired — the base scoring handles urgency
  if (daysUntilExpiry < 0) return 0;
  if (daysUntilExpiry <= 7) return 5;
  if (daysUntilExpiry <= 14) return 4;
  if (daysUntilExpiry <= 30) return 3;
  return 0;
}

/**
 * Multi-contract: 0-5 pts
 * Bonus if contact has multiple contracts (by matching phone across contacts)
 */
function scoreMultiContract(
  contact: CampaignContact,
  allContacts: CampaignContact[] | undefined,
): number {
  if (!allContacts || allContacts.length === 0) return 0;

  const samePhone = allContacts.filter(
    (c) => c.phone === contact.phone && c.id !== contact.id,
  ).length;

  if (samePhone >= 3) return 5;
  if (samePhone >= 2) return 3;
  if (samePhone >= 1) return 2;
  return 0;
}

/**
 * Generate a plain English explanation of why this contact scored the way it did
 */
function generateExplanation(
  contact: CampaignContact,
  breakdown: EnhancedScoreBreakdown,
): string {
  const parts: string[] = [];

  // Contract urgency
  if (breakdown.contractUrgency >= 25) {
    const days = contact.days_since_expiry ?? 0;
    parts.push(`Contract expired ${days}+ days`);
  } else if (breakdown.contractUrgency >= 15) {
    parts.push(`Contract expired ${contact.days_since_expiry ?? 30}+ days`);
  } else if (breakdown.thirtyDayExpiry > 0) {
    parts.push("Contract expiring soon");
  }

  // Priority
  if (breakdown.priorityLabel >= 20) parts.push("High priority");
  else if (breakdown.priorityLabel >= 12) parts.push("Medium priority");

  // Connect time
  if (breakdown.connectTimeCluster >= 6) parts.push("High connect time");

  // Zone density
  if (breakdown.zoneDensity >= 5) parts.push("Zone cluster match");

  // Callback
  if (breakdown.callbackDue >= 10) parts.push("Callback due");

  // Familiarity
  if (breakdown.csrFamiliarity > 0) parts.push("Previous contact");

  // Customer type
  if (breakdown.customerType >= 8) parts.push("Commercial account");

  // Multi-contract
  if (breakdown.multiContract > 0) parts.push("Multiple contracts");

  // Zone info
  if (contact.service_zone) {
    const zoneShort = contact.service_zone.split(" - ")[0] || contact.service_zone;
    parts.push(zoneShort);
  }

  return parts.length > 0 ? parts.join(" + ") : "Standard priority";
}
