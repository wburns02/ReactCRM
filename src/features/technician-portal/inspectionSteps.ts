/**
 * Inspection Checklist Step Configuration
 * Based on MAC Septic field meeting notes — 16-step guided inspection flow
 */

export interface EquipmentItem {
  id: string;
  label: string;
  emoji: string;
  category: "tools" | "safety" | "supplies" | "cleaning";
}

export interface InspectionStep {
  stepNumber: number;
  title: string;
  emoji: string;
  description: string;
  detailedInstructions: string[];
  requiresPhoto: boolean;
  photoType?: string;
  photoGuidance?: string;
  /** All inspection steps apply to aerobic systems only */
  safetyWarning?: string;
  customerFacing?: boolean;
  talkingPoints?: string[];
  avoidPhrases?: string[];
  estimatedMinutes: number;
  /** Video tutorial link (placeholder — populated per step when videos available) */
  videoLink?: string;
  /** Parts/materials that may be needed for this step */
  parts?: { name: string; partNumber?: string; estimatedCost?: number }[];
  /** Whether this step has a sludge level reading */
  hasSludgeLevel?: boolean;
  /** Whether this step has a PSI reading */
  hasPsiReading?: boolean;
}

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";
export type FindingLevel = "ok" | "needs_attention" | "critical";

export interface StepState {
  status: StepStatus;
  completedAt: string | null;
  notes: string;
  voiceNotes: string;
  findings: FindingLevel;
  findingDetails: string;
  photos: string[]; // photo IDs
  /** Sludge level reading (e.g., "3 inches", "12 inches") */
  sludgeLevel?: string;
  /** PSI reading */
  psiReading?: string;
}

export interface InspectionState {
  startedAt: string | null;
  completedAt: string | null;
  equipmentVerified: boolean;
  equipmentItems: Record<string, boolean>;
  homeownerNotifiedAt: string | null;
  currentStep: number;
  steps: Record<number, StepState>;
  summary: InspectionSummary | null;
  voiceGuidanceEnabled: boolean;
  /** Tech recommends pumping service */
  recommendPumping?: boolean;
}

export interface InspectionSummary {
  generatedAt: string;
  overallCondition: "good" | "fair" | "poor" | "critical";
  totalIssues: number;
  criticalIssues: number;
  recommendations: string[];
  upsellOpportunities: string[];
  nextServiceDate: string | null;
  techNotes: string;
  /** Customer-facing report data */
  reportSentVia?: ("email" | "sms" | "print")[];
  reportSentAt?: string | null;
  estimateTotal?: number | null;
}

// ─── Equipment Checklist (Step 1) ───────────────────────────────────────────

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: "sludge_judge", label: "Sludge Judge", emoji: "📏", category: "tools" },
  { id: "tool_bag", label: "Tool Bag", emoji: "🧰", category: "tools" },
  { id: "multimeter", label: "Multimeter", emoji: "⚡", category: "tools" },
  { id: "tire_gauge", label: "Tire Pressure Gauge", emoji: "🔧", category: "tools" },
  { id: "drill", label: "Drill", emoji: "🔩", category: "tools" },
  { id: "hand_tools", label: "Hand Tools", emoji: "🛠️", category: "tools" },
  { id: "screws_lids", label: "Screws for Lids", emoji: "🔩", category: "supplies" },
  { id: "drill_bits", label: "Drill Bits", emoji: "⚙️", category: "supplies" },
  { id: "speedout", label: "Speedout", emoji: "🔧", category: "tools" },
  { id: "gloves", label: "Gloves", emoji: "🧤", category: "safety" },
  { id: "silicon_sealant", label: "Silicon Sealant", emoji: "💧", category: "supplies" },
  { id: "water", label: "Water", emoji: "💦", category: "supplies" },
  { id: "shovel", label: "Shovel", emoji: "⛏️", category: "tools" },
  { id: "hoe", label: "Hoe", emoji: "🪓", category: "tools" },
  { id: "mini_pick_axe", label: "Mini-Pick Axe", emoji: "⛏️", category: "tools" },
  { id: "mini_shovel", label: "Mini-Shovel", emoji: "🪣", category: "tools" },
  { id: "foam_pad", label: "Foam Pad", emoji: "🟦", category: "safety" },
  { id: "water_hose", label: "Water Hose", emoji: "🚿", category: "cleaning" },
  { id: "spray_nozzle", label: "Spray Nozzle", emoji: "💨", category: "cleaning" },
  { id: "check_valve", label: "Check Valve", emoji: "🔄", category: "supplies" },
];

// ─── 16-Step Inspection Flow ────────────────────────────────────────────────

export const INSPECTION_STEPS: InspectionStep[] = [
  {
    stepNumber: 1,
    title: "Equipment Checklist",
    emoji: "🧰",
    description: "Verify all required equipment before starting inspection.",
    detailedInstructions: [
      "Check truck inventory against the equipment list",
      "Verify all tools are in working condition",
      "Ensure PPE is present and clean",
      "Report any missing or damaged equipment",
    ],
    requiresPhoto: false,
    estimatedMinutes: 2,
  },
  {
    stepNumber: 2,
    title: "Contact Homeowner",
    emoji: "📱",
    description: "Notify homeowner of your arrival. Auto-sends when GPS confirms location.",
    detailedInstructions: [
      "Arrival notification auto-sends via text when GPS confirms you're on-site",
      "If auto-text fails, manually call or text the homeowner",
      "Confirm someone is home or note if no one answers",
      "Be professional — introduce yourself and MAC Septic",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "Hi, this is [Your Name] from MAC Septic. I'm here for your scheduled inspection.",
      "I'll be working around the septic system area. The inspection typically takes about 25 minutes.",
      "I'll knock when I'm finished to go over my findings with you.",
    ],
    estimatedMinutes: 1,
  },
  {
    stepNumber: 3,
    title: "Confirm Location",
    emoji: "📍",
    description: "Verify you're at the correct service address and locate the work area.",
    detailedInstructions: [
      "Match GPS address with work order address",
      "Identify property and confirm access to septic area",
      "Note any obstacles or access issues",
      "Check for visible markers or risers",
    ],
    requiresPhoto: true,
    photoType: "inspection_location",
    photoGuidance: "Photo of property showing septic area access",
    estimatedMinutes: 1,
  },
  {
    stepNumber: 4,
    title: "Knock on Door",
    emoji: "🚪",
    description: "Greet the homeowner and introduce yourself professionally.",
    detailedInstructions: [
      "Knock firmly and wait — ring doorbell if available",
      "If no answer after 2 attempts, call the customer directly",
      "Introduce yourself: name, company, purpose",
      "If no contact, leave a door tag and proceed with exterior inspection",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "Good morning/afternoon! I'm [Name] from MAC Septic, here for your inspection.",
      "I'll be checking your septic system — should take about 25 minutes.",
      "Is there anything specific you've noticed or any concerns?",
    ],
    estimatedMinutes: 1,
  },
  {
    stepNumber: 5,
    title: "Explain Purpose of Visit",
    emoji: "📋",
    description: "Clearly explain what the inspection covers and what to expect.",
    detailedInstructions: [
      "Explain the inspection scope: system health, components, efficiency",
      "Set expectations on timeline (~25 minutes)",
      "Ask about any recent issues: odors, slow drains, wet spots in yard",
      "Note any concerns the homeowner mentions for follow-up",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "I'll be inspecting all major components of your system today.",
      "I'll check the tank, control panel, floats, timer, and spray or drip system.",
      "When I'm done, I'll walk you through everything I found.",
      "Have you noticed any issues? Slow drains, odors, or wet spots?",
    ],
    estimatedMinutes: 1,
  },
  {
    stepNumber: 6,
    title: "Locate Tank & Control Panel",
    emoji: "🗺️",
    description: "Find and identify the septic tank and control panel locations.",
    detailedInstructions: [
      "Use property records or map data if available",
      "Look for risers, cleanout pipes, or yard markers",
      "Locate the control panel (typically on exterior wall or utility area)",
      "Note distances and access paths for future reference",
    ],
    requiresPhoto: true,
    photoType: "inspection_tank_location",
    photoGuidance: "Photo showing tank location and control panel",
    estimatedMinutes: 2,
  },
  {
    stepNumber: 7,
    title: "Open All Lids",
    emoji: "🔓",
    description: "Carefully open all septic tank and distribution box lids.",
    detailedInstructions: [
      "Remove lid screws/bolts carefully — avoid stripping screws and lid",
      "Lift lids carefully — they can be heavy",
      "Set lids on solid ground away from opening",
      "Check lid condition: cracks, deterioration, proper seal",
      "Measure and record sludge level using sludge judge",
    ],
    requiresPhoto: true,
    photoType: "lid",
    photoGuidance: "Photo of opened lids showing tank interior and sludge level",
    safetyWarning: "Stand upwind. Never lean into the tank opening. Toxic gases present.",
    hasSludgeLevel: true,
    estimatedMinutes: 3,
    parts: [
      { name: "Replacement lid screws", partNumber: "LID-SCR-SS", estimatedCost: 8 },
      { name: "Riser extension", partNumber: "RSR-24-GRN", estimatedCost: 65 },
    ],
  },
  {
    stepNumber: 8,
    title: "Test Override Float, Pump & Alarm Float",
    emoji: "🔴",
    description: "Test all float switches and verify pump operation.",
    detailedInstructions: [
      "Locate the override float switch",
      "Manually activate pump float switch to test pump operation",
      "Verify pump turns on and moves water",
      "Test alarm float — should trigger audible/visual alarm",
      "Check float wiring for corrosion or damage",
      "Note pump sound: normal hum vs grinding/cavitation",
    ],
    requiresPhoto: true,
    photoType: "inspection_float_test",
    photoGuidance: "Photo of float switches and pump during test",
    hasPsiReading: true,
    estimatedMinutes: 3,
    parts: [
      { name: "Replacement float switch", partNumber: "FLT-UNI-120", estimatedCost: 45 },
      { name: "Float switch wire nuts", partNumber: "WN-14-WP", estimatedCost: 5 },
    ],
  },
  {
    stepNumber: 9,
    title: "Test Control Panel",
    emoji: "🎛️",
    description: "Inspect and test the aerobic system control panel.",
    detailedInstructions: [
      "Open control panel door carefully",
      "Check for warning lights",
      "Check for corrosion or defects inside control panel",
      "Verify all indicator lights function",
      "Test alarm silence/reset button",
      "Check wiring connections — no loose wires",
      "Note panel model and age if visible",
    ],
    requiresPhoto: true,
    photoType: "control_panel",
    photoGuidance: "Photo of control panel with all lights/indicators visible",
    estimatedMinutes: 2,
    parts: [
      { name: "Replacement alarm light bulb", partNumber: "ALM-BULB-12V", estimatedCost: 12 },
      { name: "Wire nuts (waterproof)", partNumber: "WN-14-WP", estimatedCost: 5 },
    ],
  },
  {
    stepNumber: 10,
    title: "Test & Adjust Timer",
    emoji: "⏱️",
    description: "Verify timer settings: 24-hour cycle, 15 minutes every 4 hours.",
    detailedInstructions: [
      "Locate timer mechanism in control panel",
      "Verify setting: 15 minutes ON every 4 hours (6 cycles per day)",
      "Check that timer is advancing correctly",
      "Adjust pins/dials if settings are incorrect",
      "Note current time position for verification",
      "Standard: 24hr cycle — 15 min every 4 hrs",
    ],
    requiresPhoto: true,
    photoType: "inspection_timer",
    photoGuidance: "Photo of timer showing current settings and pin positions",
    estimatedMinutes: 2,
  },
  {
    stepNumber: 11,
    title: "Bulb & Buzzer Check",
    emoji: "💡",
    description: "Verify alarm bulb and buzzer are functioning properly.",
    detailedInstructions: [
      "Test alarm light — should illuminate when triggered",
      "Test buzzer — should sound when alarm activated",
      "Replace bulb if burned out (note replacement needed)",
      "Check alarm visibility from house — homeowner should see/hear it",
      "Verify alarm wiring integrity",
    ],
    requiresPhoto: true,
    photoType: "inspection_alarm",
    photoGuidance: "Photo of alarm light/buzzer during test",
    estimatedMinutes: 1,
    parts: [
      { name: "Alarm light bulb", partNumber: "ALM-BULB-12V", estimatedCost: 12 },
      { name: "Buzzer unit", partNumber: "BZR-12V-WP", estimatedCost: 25 },
    ],
  },
  {
    stepNumber: 12,
    title: "Check Corrosion, Seal & Ventilate",
    emoji: "🔍",
    description: "Inspect for corrosion, apply sealant if needed, ventilate the panel.",
    detailedInstructions: [
      "Inspect all metal components for rust or corrosion",
      "Check wire nuts and connections for degradation",
      "Apply silicon sealant where needed",
      "Leave control panel door OPEN for 4-5 minutes to ventilate",
      "Note any parts that need replacement",
      "Check conduit entry points for water intrusion",
    ],
    requiresPhoto: true,
    photoType: "inspection_corrosion",
    photoGuidance: "Photo of any corrosion found or clean connections",
    safetyWarning: "Leave panel door open 4-5 minutes for ventilation before closing.",
    estimatedMinutes: 2,
    parts: [
      { name: "Silicon sealant", partNumber: "SIL-CLR-10OZ", estimatedCost: 8 },
      { name: "Wire nuts (waterproof)", partNumber: "WN-14-WP", estimatedCost: 5 },
      { name: "Conduit sealant", partNumber: "CND-SEAL-GRY", estimatedCost: 12 },
    ],
  },
  {
    stepNumber: 13,
    title: "Turn Breakers Back On",
    emoji: "⚡",
    description: "ALWAYS turn breakers back on. Critical safety step.",
    detailedInstructions: [
      "Verify ALL breakers are in the ON position",
      "Check that pump is running after breaker reset",
      "Confirm control panel powers back up normally",
      "Double-check: never leave breakers off!",
      "If a breaker trips immediately, note as critical issue",
    ],
    requiresPhoto: true,
    photoType: "breaker",
    photoGuidance: "Photo of breaker panel showing ALL breakers in ON position",
    safetyWarning: "ALWAYS turn breakers back on. Leaving them off will cause system failure and sewage backup.",
    estimatedMinutes: 1,
  },
  {
    stepNumber: 14,
    title: "Check Valve & Spray/Drip System",
    emoji: "🚿",
    description: "Inspect check valve in distribution box and clean drip filter. Check spray heads OR drip emitters (system-dependent).",
    detailedInstructions: [
      "Open distribution box",
      "Inspect check valve — should move freely",
      "Clean drip filter",
      "For SPRAY systems: Check spray heads for proper output and coverage",
      "For DRIP systems: Check drip emitters and distribution lines",
      "Note any heads/emitters with poor or no output",
      "Check distribution uniformity",
    ],
    requiresPhoto: true,
    photoType: "inspection_spray_drip",
    photoGuidance: "Photo of spray heads or drip emitters and distribution box",
    estimatedMinutes: 2,
    parts: [
      { name: "Drip filter", partNumber: "DRP-FLT-STD", estimatedCost: 18 },
      { name: "Check valve", partNumber: "CHK-VLV-1IN", estimatedCost: 22 },
      { name: "Spray head (replacement)", partNumber: "SPR-HD-360", estimatedCost: 15 },
    ],
  },
  {
    stepNumber: 15,
    title: "Secure All Lids & Clean Up",
    emoji: "🔒",
    description: "Replace and secure ALL lids. Pick up ALL trash and debris.",
    detailedInstructions: [
      "Replace all tank lids securely",
      "Tighten lid screws/bolts — use new screws if old ones are stripped",
      "Close and secure control panel door",
      "Pick up ALL trash, tools, and debris from the area",
      "Leave the site cleaner than you found it",
      "Walk the entire work area to verify nothing left behind",
    ],
    requiresPhoto: true,
    photoType: "after",
    photoGuidance: "Photo showing all lids secured and clean work area",
    safetyWarning: "Verify ALL lids are secured. An open septic lid is a fatal hazard.",
    estimatedMinutes: 1,
  },
  {
    stepNumber: 16,
    title: "Discuss Findings with Homeowner",
    emoji: "🤝",
    description: "Knock on door, walk through findings, and prime for future services.",
    detailedInstructions: [
      "Knock on door — if no answer, call customer",
      "Walk through your findings clearly and honestly",
      "Show relevant photos on your phone if helpful",
      "Explain any issues found and recommended actions",
      "Recommend pumping if sludge level is high",
      "Prime for future services: pumping schedule, maintenance plan",
      "Offer to set up reminders for next service",
      "Thank them for choosing MAC Septic",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "I completed the inspection and wanted to go over what I found.",
      "Your system is [functional/showing some wear]. Here's what I noticed...",
      "Based on the sludge levels, I'd recommend scheduling pumping in the next [timeframe].",
      "We can set up automatic reminders so you never have to worry about it.",
      "I'm going to send you a full inspection report with photos — would you prefer email or text?",
      "Do you have any questions about your system or what we found today?",
    ],
    avoidPhrases: [
      "Your system is A+",
      "Everything is perfect",
      "You don't need to worry about anything",
      "This system will last forever",
    ],
    estimatedMinutes: 2,
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get all inspection steps (aerobic systems only — all 16 steps always apply)
 */
export function getInspectionSteps(): InspectionStep[] {
  return INSPECTION_STEPS;
}

/**
 * Get total estimated time for inspection
 */
export function getEstimatedTime(): number {
  return INSPECTION_STEPS.reduce((sum, s) => sum + s.estimatedMinutes, 0);
}

/**
 * Create default step state
 */
export function createDefaultStepState(): StepState {
  return {
    status: "pending",
    completedAt: null,
    notes: "",
    voiceNotes: "",
    findings: "ok",
    findingDetails: "",
    photos: [],
    sludgeLevel: "",
    psiReading: "",
  };
}

/**
 * Create default inspection state
 */
export function createDefaultInspectionState(): InspectionState {
  const equipmentItems: Record<string, boolean> = {};
  for (const item of EQUIPMENT_ITEMS) {
    equipmentItems[item.id] = false;
  }
  return {
    startedAt: null,
    completedAt: null,
    equipmentVerified: false,
    equipmentItems,
    homeownerNotifiedAt: null,
    currentStep: 1,
    steps: {},
    summary: null,
    voiceGuidanceEnabled: false,
    recommendPumping: false,
  };
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercent(state: InspectionState): number {
  const steps = getInspectionSteps();
  if (steps.length === 0) return 0;
  const completed = steps.filter(
    (s) => state.steps[s.stepNumber]?.status === "completed",
  ).length;
  return Math.round((completed / steps.length) * 100);
}

/**
 * Determine overall condition from step findings
 */
export function determineOverallCondition(
  state: InspectionState,
): InspectionSummary["overallCondition"] {
  const findings = Object.values(state.steps);
  const criticalCount = findings.filter(
    (s) => s.findings === "critical",
  ).length;
  const attentionCount = findings.filter(
    (s) => s.findings === "needs_attention",
  ).length;
  if (criticalCount > 0) return "critical";
  if (attentionCount >= 3) return "poor";
  if (attentionCount >= 1) return "fair";
  return "good";
}

/**
 * Generate upsell recommendations based on findings
 */
export function generateRecommendations(state: InspectionState): string[] {
  const recs: string[] = [];
  const steps = getInspectionSteps();

  for (const step of steps) {
    const stepState = state.steps[step.stepNumber];
    if (!stepState) continue;
    if (stepState.findings === "critical") {
      recs.push(
        `URGENT: ${step.title} — ${stepState.findingDetails || "Critical issue found. Schedule repair immediately."}`,
      );
    } else if (stepState.findings === "needs_attention") {
      recs.push(
        `${step.title} — ${stepState.findingDetails || "Needs attention. Recommend scheduling maintenance."}`,
      );
    }
  }

  // Pumping recommendation based on sludge level
  const step7 = state.steps[7];
  if (step7?.sludgeLevel) {
    recs.push(
      `Sludge level measured at ${step7.sludgeLevel}. Schedule pumping based on current level.`,
    );
  }

  if (state.recommendPumping) {
    recs.push(
      "Technician recommends scheduling pumping service.",
    );
  }

  recs.push(
    "Consider a maintenance plan for regular inspections and preventive care.",
  );

  return recs;
}

/**
 * Calculate estimate total from parts needed (based on findings)
 */
export function calculateEstimate(state: InspectionState): { items: { name: string; cost: number }[]; total: number } {
  const items: { name: string; cost: number }[] = [];
  const steps = getInspectionSteps();

  for (const step of steps) {
    const stepState = state.steps[step.stepNumber];
    if (!stepState || stepState.findings === "ok") continue;
    if (!step.parts) continue;

    for (const part of step.parts) {
      if (part.estimatedCost) {
        items.push({ name: part.name, cost: part.estimatedCost });
      }
    }
  }

  // Add labor estimate for non-OK steps
  const issueSteps = steps.filter((s) => {
    const ss = state.steps[s.stepNumber];
    return ss && ss.findings !== "ok";
  });
  if (issueSteps.length > 0) {
    items.push({ name: "Labor (estimated)", cost: issueSteps.length * 75 });
  }

  return { items, total: items.reduce((sum, i) => sum + i.cost, 0) };
}
