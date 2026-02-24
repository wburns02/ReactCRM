/**
 * Grease Trap Pricing — MAC Septic Services 2026
 *
 * Based on official pricing sheet from Doug Carter (EVP).
 * Two models: one-time service and monthly subscription.
 */

// ─── One-Time Service Tiers ──────────────────────────────────────────────────

export interface GreaseTrapTier {
  id: string;
  label: string;
  gallons: number | null; // null for ">50" tier
  minGallons: number;
  maxGallons: number | null;
  pumpFee: number;
  dumpFee: number;
  total: number;
}

export const GREASE_TRAP_TIERS: GreaseTrapTier[] = [
  { id: "gt-2000", label: "2,000 GAL", gallons: 2000, minGallons: 1501, maxGallons: 2000, pumpFee: 1000, dumpFee: 400, total: 1400 },
  { id: "gt-1500", label: "1,500 GAL", gallons: 1500, minGallons: 1001, maxGallons: 1500, pumpFee: 750, dumpFee: 300, total: 1050 },
  { id: "gt-1000", label: "1,000 GAL", gallons: 1000, minGallons: 501, maxGallons: 1000, pumpFee: 500, dumpFee: 200, total: 700 },
  { id: "gt-500", label: "500 GAL", gallons: 500, minGallons: 51, maxGallons: 500, pumpFee: 250, dumpFee: 100, total: 350 },
  { id: "gt-50", label: ">50 GAL", gallons: null, minGallons: 0, maxGallons: 50, pumpFee: 150, dumpFee: 50, total: 200 },
];

// ─── Monthly Subscription Tiers ──────────────────────────────────────────────

export interface GreaseTrapSubscription {
  id: string;
  label: string;
  gallons: number | null;
  monthlyFee: number;
  annualCost: number;
  pumpOutsPerYear: number;
  includes: string[];
}

export const GREASE_TRAP_SUBSCRIPTIONS: GreaseTrapSubscription[] = [
  {
    id: "sub-2000", label: "2,000 GAL", gallons: 2000, monthlyFee: 470, annualCost: 5640,
    pumpOutsPerYear: 5,
    includes: ["Monthly Inspections", "5 Pump-Outs per Year", "Annual Inspection & Certification", "All Dump Fees Included"],
  },
  {
    id: "sub-1500", label: "1,500 GAL", gallons: 1500, monthlyFee: 360, annualCost: 4320,
    pumpOutsPerYear: 5,
    includes: ["Monthly Inspections", "5 Pump-Outs per Year", "Annual Inspection & Certification", "All Dump Fees Included"],
  },
  {
    id: "sub-1000", label: "1,000 GAL", gallons: 1000, monthlyFee: 245, annualCost: 2940,
    pumpOutsPerYear: 5,
    includes: ["Monthly Inspections", "5 Pump-Outs per Year", "Annual Inspection & Certification", "All Dump Fees Included"],
  },
  {
    id: "sub-500", label: "500 GAL", gallons: 500, monthlyFee: 125, annualCost: 1500,
    pumpOutsPerYear: 5,
    includes: ["Monthly Inspections", "5 Pump-Outs per Year", "Annual Inspection & Certification", "All Dump Fees Included"],
  },
  {
    id: "sub-50", label: ">50 GAL", gallons: null, monthlyFee: 100, annualCost: 1200,
    pumpOutsPerYear: 5,
    includes: ["Monthly Inspections", "5 Pump-Outs per Year", "Annual Inspection & Certification", "All Dump Fees Included"],
  },
];

// ─── Calculator Helpers ──────────────────────────────────────────────────────

export type ServiceFrequency = "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";

export interface GreaseTrapQuote {
  tier: GreaseTrapTier;
  frequency: ServiceFrequency;
  pumpOuts: number; // per year
  oneTimeCost: number;
  annualCost: number;
  monthlyCost: number;
  subscriptionSavings: number; // vs one-time at same frequency
  recommendSubscription: boolean;
}

const FREQUENCY_MULTIPLIERS: Record<ServiceFrequency, number> = {
  "one-time": 1,
  "monthly": 12,
  "quarterly": 4,
  "semi-annual": 2,
  "annual": 1,
};

export function calculateGreaseTrapQuote(
  tankGallons: number,
  frequency: ServiceFrequency,
): GreaseTrapQuote {
  // Find the matching tier
  const tier = GREASE_TRAP_TIERS.find((t) =>
    tankGallons <= (t.maxGallons ?? Infinity) && tankGallons >= t.minGallons
  ) ?? GREASE_TRAP_TIERS[GREASE_TRAP_TIERS.length - 1];

  const pumpOuts = FREQUENCY_MULTIPLIERS[frequency];
  const oneTimeCost = tier.total;
  const annualCost = tier.total * pumpOuts;

  // Find matching subscription for comparison
  const sub = GREASE_TRAP_SUBSCRIPTIONS.find((s) =>
    s.label === tier.label
  );
  const subAnnual = sub?.annualCost ?? annualCost;
  const subscriptionSavings = annualCost - subAnnual;

  return {
    tier,
    frequency,
    pumpOuts,
    oneTimeCost,
    annualCost,
    monthlyCost: annualCost / 12,
    subscriptionSavings: Math.max(0, subscriptionSavings),
    recommendSubscription: subscriptionSavings > 0 && pumpOuts >= 3,
  };
}

export function getTierForGallons(gallons: number): GreaseTrapTier {
  return GREASE_TRAP_TIERS.find((t) =>
    gallons <= (t.maxGallons ?? Infinity) && gallons >= t.minGallons
  ) ?? GREASE_TRAP_TIERS[GREASE_TRAP_TIERS.length - 1];
}
