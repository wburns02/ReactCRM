/**
 * Manufacturer-Specific Business Rules for Aerobic Septic Systems
 *
 * Encodes operational knowledge for Norweco, Fuji, Jet, Clearstream, and generic
 * aerobic systems. Used throughout the inspection flow to show auto-notes,
 * pricing adjustments, refill requirements, and post-service reminders.
 */

export type AerobicManufacturer = "norweco" | "fuji" | "jet" | "clearstream" | "other";

export interface ManufacturerMaintenanceItem {
  id: string;
  label: string;
  emoji: string;
  /** How often this maintenance should be done */
  frequency: string;
  /** Estimated cost to the customer */
  estimatedCost: number;
  /** Auto-note injected into inspection findings */
  autoNote: string;
  /** Additional guidance for technician */
  techGuidance: string;
  /** Best season to perform this maintenance */
  preferredSeason?: string;
  /** Upcharge note if service is repeated */
  upchargeNote?: string;
}

export interface ManufacturerPumpingRules {
  /** Price adjustment vs. standard pumping ($595 base) */
  priceAdjustment: number;
  /** Why pumping costs more for this manufacturer */
  priceReason?: string;
  /** Does the tank REQUIRE refill after pumping? */
  refillRequired: boolean;
  /** Why refill is required (shown as warning) */
  refillReason?: string;
  /** Refill volume range */
  refillVolumeMin?: number;
  refillVolumeMax?: number;
  /** Refill method options */
  refillMethods?: string[];
  /** Post-pumping customer action required */
  postPumpingAction?: string;
  /** How many days after pumping the action is needed */
  postPumpingActionDays?: number;
  /** CRM reminder message for post-pumping action */
  postPumpingReminderMessage?: string;
  /** Additional pumping notes for technician */
  pumpingNotes: string[];
}

export interface ManufacturerContractRules {
  /** Base contract should be higher for this manufacturer */
  premiumContract: boolean;
  /** Reason for premium pricing */
  premiumReason?: string;
  /** Additional line items to include in contracts */
  additionalLineItems?: { name: string; cost: number; frequency: string }[];
}

export interface ManufacturerInfo {
  id: AerobicManufacturer;
  name: string;
  emoji: string;
  description: string;
  /** Color class for badges */
  color: string;
  /** Maintenance items specific to this manufacturer */
  maintenanceItems: ManufacturerMaintenanceItem[];
  /** Pumping-specific rules */
  pumpingRules: ManufacturerPumpingRules;
  /** Contract pricing rules */
  contractRules: ManufacturerContractRules;
  /** General warnings shown at top of inspection */
  warnings: string[];
  /** Auto-notes added to inspection summary */
  autoNotes: string[];
}

// ─── Manufacturer Definitions ─────────────────────────────────────────────

export const MANUFACTURERS: Record<AerobicManufacturer, ManufacturerInfo> = {
  norweco: {
    id: "norweco",
    name: "Norweco",
    emoji: "🔵",
    description: "Norweco Singulair / Bio-Kinetic systems",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    maintenanceItems: [
      {
        id: "air_filter",
        label: "Clean Air Filter",
        emoji: "🌀",
        frequency: "Replace once a year",
        estimatedCost: 10,
        autoNote: "Air filter needs replacement ($10). Replace annually to maintain proper aeration.",
        techGuidance: "Check air filter condition. If dirty or clogged, replace with new filter ($10 part). Mark date of replacement. Remind customer this is an annual item.",
        upchargeNote: "If filter needs early replacement (before 12 months), upcharge applies.",
      },
      {
        id: "biokinetic_basket",
        label: "Bio-Kinetic Basket Cleaning",
        emoji: "🧺",
        frequency: "Clean once a year",
        estimatedCost: 0, // included in contract or charged separately
        autoNote: "Bio-Kinetic basket must be cleaned annually. Best done in warm weather.",
        techGuidance: "Remove and clean the Bio-Kinetic basket thoroughly. Best to schedule in spring/summer (warm weather). If basket needs cleaning again before annual service, upcharge applies. Norweco contracts should be priced higher to account for this or it should be a separate line item charge.",
        preferredSeason: "Spring/Summer (warm weather)",
        upchargeNote: "If bio-kinetic basket needs cleaning again within the year, additional charge applies.",
      },
    ],
    pumpingRules: {
      priceAdjustment: 200, // $795 vs $595 standard
      priceReason: "Norweco pumping takes longer — trash tank must be dug up, and refill takes significantly longer than standard systems.",
      refillRequired: true,
      refillReason: "Norweco systems require refill after pumping to maintain biological treatment process. Tank must be refilled with 500-800 gallons of water.",
      refillVolumeMin: 500,
      refillVolumeMax: 800,
      refillMethods: ["Water hose on-site", "Natural fill (customer usage over time)"],
      postPumpingAction: "Customer must turn the control panel back ON after 2.5 weeks",
      postPumpingActionDays: 18, // ~2.5 weeks
      postPumpingReminderMessage: "Hi {customerName}! This is MAC Septic. It has been 2.5 weeks since your Norweco system was pumped. Please turn your control panel back ON now. If you need help, call us at (512) 392-1232.",
      pumpingNotes: [
        "Trash tank must be dug up — add extra time",
        "Refill with 500-800 gallons via water hose OR natural fill",
        "Takes significantly longer than standard pumping",
        "Customer MUST turn control panel back on after 2.5 weeks",
        "Schedule CRM reminder for customer at 2.5 weeks post-pumping",
      ],
    },
    contractRules: {
      premiumContract: true,
      premiumReason: "Norweco systems require annual bio-kinetic basket cleaning and air filter replacement, which adds labor and parts cost.",
      additionalLineItems: [
        { name: "Bio-Kinetic Basket Cleaning", cost: 75, frequency: "Annual" },
        { name: "Air Filter Replacement", cost: 10, frequency: "Annual" },
      ],
    },
    warnings: [
      "Norweco system — higher pumping cost, requires tank refill",
      "Bio-kinetic basket must be cleaned annually (warm weather preferred)",
      "Customer must turn control panel back on 2.5 weeks after pumping",
    ],
    autoNotes: [
      "Check and replace air filter ($10, annual replacement).",
      "Inspect bio-kinetic basket — clean if needed (annual, best in warm weather).",
      "If pumping: dig up trash tank, refill 500-800 gal, remind customer to turn panel on in 2.5 weeks.",
    ],
  },

  fuji: {
    id: "fuji",
    name: "Fuji Clean",
    emoji: "🟢",
    description: "Fuji Clean fiberglass aerobic treatment units",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    maintenanceItems: [
      {
        id: "air_filter",
        label: "Clean Air Filter",
        emoji: "🌀",
        frequency: "Replace once a year",
        estimatedCost: 10,
        autoNote: "Air filter needs replacement ($10). Replace annually.",
        techGuidance: "Check air filter condition. Replace annually ($10 part).",
      },
    ],
    pumpingRules: {
      priceAdjustment: 150, // slightly higher
      priceReason: "Fuji fiberglass tanks MUST be refilled immediately after pumping to prevent structural collapse.",
      refillRequired: true,
      refillReason: "CRITICAL: Fuji tanks are fiberglass and WILL COLLAPSE if not refilled after pumping. This is not optional — the tank must be refilled with water immediately.",
      refillVolumeMin: 500,
      refillVolumeMax: 1000,
      refillMethods: ["Water hose on-site (required immediately)"],
      pumpingNotes: [
        "⚠️ CRITICAL: Fuji tanks are FIBERGLASS — they MUST be refilled immediately",
        "Failure to refill will cause tank collapse — catastrophic and expensive",
        "Have water hose ready BEFORE pumping begins",
        "Refill 500-1000 gallons immediately after pumping completes",
      ],
    },
    contractRules: {
      premiumContract: false,
      additionalLineItems: [
        { name: "Air Filter Replacement", cost: 10, frequency: "Annual" },
      ],
    },
    warnings: [
      "⚠️ FIBERGLASS TANK — MUST refill immediately after pumping or tank will collapse!",
    ],
    autoNotes: [
      "Check and replace air filter ($10, annual replacement).",
      "⚠️ If pumping: MUST refill tank immediately — fiberglass tanks collapse without water weight.",
    ],
  },

  jet: {
    id: "jet",
    name: "Jet Inc.",
    emoji: "🟡",
    description: "Jet Inc. aerobic treatment plants",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    maintenanceItems: [
      {
        id: "air_filter",
        label: "Clean Air Filter",
        emoji: "🌀",
        frequency: "Replace once a year",
        estimatedCost: 10,
        autoNote: "Air filter needs replacement ($10). Replace annually.",
        techGuidance: "Check air filter. Replace annually ($10).",
      },
    ],
    pumpingRules: {
      priceAdjustment: 0,
      refillRequired: false,
      pumpingNotes: ["Standard aerobic pumping procedure."],
    },
    contractRules: {
      premiumContract: false,
      additionalLineItems: [
        { name: "Air Filter Replacement", cost: 10, frequency: "Annual" },
      ],
    },
    warnings: [],
    autoNotes: [
      "Check and replace air filter ($10, annual replacement).",
    ],
  },

  clearstream: {
    id: "clearstream",
    name: "Clearstream",
    emoji: "🔷",
    description: "Clearstream Wastewater Systems",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    maintenanceItems: [
      {
        id: "air_filter",
        label: "Clean Air Filter",
        emoji: "🌀",
        frequency: "Replace once a year",
        estimatedCost: 10,
        autoNote: "Air filter needs replacement ($10). Replace annually.",
        techGuidance: "Check air filter. Replace annually ($10).",
      },
    ],
    pumpingRules: {
      priceAdjustment: 0,
      refillRequired: false,
      pumpingNotes: ["Standard aerobic pumping procedure."],
    },
    contractRules: {
      premiumContract: false,
      additionalLineItems: [
        { name: "Air Filter Replacement", cost: 10, frequency: "Annual" },
      ],
    },
    warnings: [],
    autoNotes: [
      "Check and replace air filter ($10, annual replacement).",
    ],
  },

  other: {
    id: "other",
    name: "Other / Unknown",
    emoji: "⬜",
    description: "Generic aerobic system",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300",
    maintenanceItems: [
      {
        id: "air_filter",
        label: "Clean Air Filter",
        emoji: "🌀",
        frequency: "Replace once a year",
        estimatedCost: 10,
        autoNote: "Air filter needs replacement ($10). Replace annually.",
        techGuidance: "Check air filter. Replace annually ($10).",
      },
    ],
    pumpingRules: {
      priceAdjustment: 0,
      refillRequired: false,
      pumpingNotes: ["Standard aerobic pumping procedure. Check manufacturer specs for refill requirements."],
    },
    contractRules: {
      premiumContract: false,
      additionalLineItems: [
        { name: "Air Filter Replacement", cost: 10, frequency: "Annual" },
      ],
    },
    warnings: [],
    autoNotes: [
      "Check and replace air filter ($10, annual replacement).",
    ],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────

/** Get manufacturer info by ID, defaulting to "other" */
export function getManufacturer(id?: string | null): ManufacturerInfo {
  if (id && id in MANUFACTURERS) return MANUFACTURERS[id as AerobicManufacturer];
  return MANUFACTURERS.other;
}

/** Get list of all manufacturers for selection dropdown */
export function getManufacturerOptions(): { value: string; label: string }[] {
  return [
    { value: "norweco", label: "Norweco" },
    { value: "fuji", label: "Fuji Clean" },
    { value: "jet", label: "Jet Inc." },
    { value: "clearstream", label: "Clearstream" },
    { value: "other", label: "Other / Unknown" },
  ];
}

/** Calculate adjusted pumping price based on manufacturer */
export function getAdjustedPumpingPrice(manufacturerId?: string | null): number {
  const base = 595; // standard pumping price
  const mfr = getManufacturer(manufacturerId);
  return base + mfr.pumpingRules.priceAdjustment;
}

/** Get all auto-notes for a manufacturer (for injection into inspection) */
export function getManufacturerAutoNotes(manufacturerId?: string | null): string[] {
  return getManufacturer(manufacturerId).autoNotes;
}

/** Check if post-pumping reminder is needed */
export function needsPostPumpingReminder(manufacturerId?: string | null): boolean {
  return !!getManufacturer(manufacturerId).pumpingRules.postPumpingAction;
}

/** Get the pumping estimate label with manufacturer adjustment */
export function getPumpingEstimateLabel(manufacturerId?: string | null): string {
  const mfr = getManufacturer(manufacturerId);
  const price = 595 + mfr.pumpingRules.priceAdjustment;
  if (mfr.pumpingRules.priceAdjustment > 0) {
    return `${mfr.name} Aerobic Tank Pumping (extended service)`;
  }
  return "Septic Tank Pumping (up to 2000 gal)";
}
