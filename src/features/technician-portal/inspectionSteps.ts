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

export interface CustomInput {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
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
  /** Custom input fields for data collection (conventional inspections) */
  customInputs?: CustomInput[];
  /** Yes/No assessment question (conventional condition checks) */
  hasYesNo?: boolean;
  yesNoQuestion?: string;
  /** Step is only shown when a condition is met (e.g., forced flow) */
  conditionalOn?: { stepNumber: number; fieldId: string; value: string };
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
  /** Tech-selected parts for this step (part names from step definition) */
  selectedParts?: string[];
  /** Custom field values for conventional inspection data collection */
  customFields?: Record<string, string>;
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
  /** Persisted AI analysis (survives page refresh) */
  aiAnalysis?: import("@/api/hooks/useTechPortal").AIInspectionAnalysis | null;
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
      { name: "Replacement lid", partNumber: "LID-24-GRN", estimatedCost: 125 },
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

// ─── Conventional Equipment Checklist ────────────────────────────────────────

export const CONVENTIONAL_EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: "probe_rod", label: "Probe Rod", emoji: "📏", category: "tools" },
  { id: "tool_bag", label: "Tool Bag", emoji: "🧰", category: "tools" },
  { id: "shovel", label: "Shovel", emoji: "⛏️", category: "tools" },
  { id: "mini_shovel", label: "Mini-Shovel", emoji: "🪣", category: "tools" },
  { id: "hoe", label: "Hoe", emoji: "🪓", category: "tools" },
  { id: "flashlight", label: "Flashlight", emoji: "🔦", category: "tools" },
  { id: "hand_tools", label: "Hand Tools", emoji: "🛠️", category: "tools" },
  { id: "tape_measure", label: "Tape Measure", emoji: "📐", category: "tools" },
  { id: "gloves", label: "Gloves", emoji: "🧤", category: "safety" },
  { id: "safety_glasses", label: "Safety Glasses", emoji: "🥽", category: "safety" },
  { id: "foam_pad", label: "Foam Pad", emoji: "🟦", category: "safety" },
  { id: "camera", label: "Camera/Phone", emoji: "📷", category: "tools" },
  { id: "clipboard", label: "Clipboard & Forms", emoji: "📋", category: "supplies" },
  { id: "paint_marker", label: "Paint/Marker", emoji: "🖊️", category: "supplies" },
  { id: "water_hose", label: "Water Hose", emoji: "🚿", category: "cleaning" },
];

// ─── 16-Step Conventional Inspection Flow ───────────────────────────────────

export const CONVENTIONAL_INSPECTION_STEPS: InspectionStep[] = [
  {
    stepNumber: 1,
    title: "Equipment Checklist",
    emoji: "🧰",
    description: "Verify all required equipment before starting the conventional inspection.",
    detailedInstructions: [
      "Check truck inventory against the equipment list",
      "Verify probe rod, shovel, and flashlight are present",
      "Ensure PPE (gloves, safety glasses) is available",
      "Have clipboard or phone ready for data entry",
    ],
    requiresPhoto: false,
    estimatedMinutes: 2,
  },
  {
    stepNumber: 2,
    title: "Arrive & Contact Client",
    emoji: "📱",
    description: "Arrive on-site and notify the client of your presence.",
    detailedInstructions: [
      "Auto-send arrival text when GPS confirms location",
      "If no auto-text, manually call or text the client",
      "Introduce yourself and MAC Septic professionally",
      "Confirm access to septic system area",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "Hi, this is [Your Name] from MAC Septic. I'm here for your septic inspection.",
      "I'll be inspecting the tank and drain field. The inspection typically takes about 30 minutes.",
      "I'll come find you when I'm done to discuss my findings.",
    ],
    estimatedMinutes: 2,
  },
  {
    stepNumber: 3,
    title: "Confirm Location & Access",
    emoji: "📍",
    description: "Verify you're at the correct address and note access to the septic area.",
    detailedInstructions: [
      "Match GPS address with work order address",
      "Identify property and confirm access to septic area",
      "Take a photo of the property/access point",
      "Note any obstacles, fences, or access issues",
    ],
    requiresPhoto: true,
    photoType: "inspection_location",
    photoGuidance: "Photo of property showing the general area where the septic system is located",
    estimatedMinutes: 1,
  },
  {
    stepNumber: 4,
    title: "Record Attendees & Client Info",
    emoji: "👥",
    description: "Document who is present during the inspection and verify client contact info.",
    detailedInstructions: [
      "Note all persons present (homeowner, realtor, buyer, inspector, etc.)",
      "Verify client name, phone, and email",
      "Ask when the system was last cleaned or serviced",
    ],
    requiresPhoto: false,
    customerFacing: true,
    customInputs: [
      {
        id: "persons_present",
        label: "Who was present at inspection?",
        type: "select",
        options: ["Homeowner", "Realtor", "Potential Buyer", "Home Inspector", "Property Manager", "None/Unoccupied"],
        placeholder: "Select all that apply",
      },
      {
        id: "last_service",
        label: "When was the last cleaning or service?",
        type: "select",
        options: [
          "Within 12 months",
          "1-2 years",
          "2-5 years",
          "More than 5 years",
          "Client did not know or did not answer",
        ],
      },
    ],
    estimatedMinutes: 2,
  },
  {
    stepNumber: 5,
    title: "Document Site Conditions",
    emoji: "🌤️",
    description: "Record weather conditions and recent precipitation at the time of inspection.",
    detailedInstructions: [
      "Note current weather (sunny, overcast, raining, temp)",
      "Record when the last precipitation occurred",
      "This helps interpret drain field conditions",
    ],
    requiresPhoto: false,
    customInputs: [
      {
        id: "weather_conditions",
        label: "Weather conditions at time of inspection",
        type: "text",
        placeholder: "e.g., Sunny and 85 degrees, Overcast with rain",
      },
      {
        id: "last_precipitation",
        label: "When was the last precipitation?",
        type: "select",
        options: [
          "Within 24 hours",
          "1-3 days",
          "4-7 days",
          "7-14 days",
          "Greater than 2 weeks",
          "Unknown",
        ],
      },
    ],
    estimatedMinutes: 1,
  },
  {
    stepNumber: 6,
    title: "Locate & Document Tank",
    emoji: "🗺️",
    description: "Find the septic tank and describe its location, depth, and accessibility.",
    detailedInstructions: [
      "Use property records, probe rod, or visible markers to find the tank",
      "Describe location relative to the house (e.g., 'back yard, 15 ft from foundation')",
      "Probe to determine depth and identify access hatches",
      "Note if risers are present, lid type, and accessibility for pumping",
      "Mark tank location with paint if needed for future reference",
    ],
    requiresPhoto: true,
    photoType: "inspection_tank_location",
    photoGuidance: "Photo showing tank location relative to the house. Include any markers, risers, or hatches.",
    customInputs: [
      {
        id: "tank_location",
        label: "Tank location relative to house",
        type: "textarea",
        placeholder: "e.g., Back yard, left side of house, 15 ft from foundation, near back porch",
      },
      {
        id: "tank_depth",
        label: "Tank depth and accessibility",
        type: "textarea",
        placeholder: "e.g., 12 inches deep, round hatches on inlet and outlet, risers installed",
      },
    ],
    estimatedMinutes: 3,
  },
  {
    stepNumber: 7,
    title: "Identify System Type & Size",
    emoji: "📐",
    description: "Document the septic system type, tank size, age, and drain field configuration.",
    detailedInstructions: [
      "Identify tank material (concrete, plastic, block, fiberglass)",
      "Determine tank capacity (typically 750-1500 gallons)",
      "Estimate system age from permits, homeowner info, or condition",
      "Identify drain field type: gravity flow or forced flow (pump)",
      "If forced flow, proceed to Step 8 for pump details",
    ],
    requiresPhoto: true,
    photoType: "inspection_system_id",
    photoGuidance: "Photo of the opened tank showing type, size indicators, and construction",
    customInputs: [
      {
        id: "system_type",
        label: "Type of septic system",
        type: "text",
        placeholder: "e.g., Standard gravity flow concrete tank, Precast concrete with pump chamber",
      },
      {
        id: "tank_size",
        label: "Tank size",
        type: "text",
        placeholder: "e.g., 1000 gallons, 1500 gallons",
      },
      {
        id: "system_age",
        label: "Approximate age of system",
        type: "text",
        placeholder: "e.g., 25 years, Built 1996, Unknown",
      },
      {
        id: "drain_field_type",
        label: "Type of drain field",
        type: "select",
        options: ["Gravity flow", "Forced flow"],
      },
    ],
    estimatedMinutes: 3,
  },
  {
    stepNumber: 8,
    title: "Pump System Check",
    emoji: "⚙️",
    description: "If forced flow: Document pump chamber, pump details, and test operation.",
    detailedInstructions: [
      "Only required if drain field type is 'Forced flow'",
      "Locate and open pump chamber",
      "Record pump chamber size",
      "Identify pump make and model",
      "Test pump operation if accessible",
      "Check float switches and alarm if present",
      "Record amp draw if multimeter available",
      "Skip this step if system is gravity flow only",
    ],
    requiresPhoto: true,
    photoType: "inspection_pump",
    photoGuidance: "Photo of pump chamber showing pump, floats, and any labels/nameplates",
    conditionalOn: { stepNumber: 7, fieldId: "drain_field_type", value: "Forced flow" },
    customInputs: [
      {
        id: "pump_chamber_size",
        label: "Pump chamber size",
        type: "text",
        placeholder: "e.g., 500 gallons, 1000 gallons, 1250 gallons",
      },
      {
        id: "pump_make_model",
        label: "Pump make and model",
        type: "text",
        placeholder: "e.g., Liberty LE51A, Goulds 1512HH, Myers Hydromatic",
      },
      {
        id: "pump_amps",
        label: "Amp draw (if measured)",
        type: "text",
        placeholder: "e.g., 14.5 amps",
      },
    ],
    estimatedMinutes: 3,
  },
  {
    stepNumber: 9,
    title: "Inspect Tank Condition",
    emoji: "🔍",
    description: "Open and inspect the tank. Does it appear to be in good working condition?",
    detailedInstructions: [
      "Open all access hatches/lids",
      "Inspect inlet and outlet baffles",
      "Check water level — should be at outlet pipe level",
      "Look for signs of backup or poor drainage",
      "Note condition of baffles (intact, damaged, missing)",
      "Check for excessive grease or foreign objects",
    ],
    requiresPhoto: true,
    photoType: "inspection_tank_interior",
    photoGuidance: "Photo of the tank interior showing water level, baffles, and general condition",
    safetyWarning: "Stand upwind. Never lean into the tank opening. Toxic gases present.",
    hasYesNo: true,
    yesNoQuestion: "Does the tank appear to be in good working condition?",
    hasSludgeLevel: true,
    estimatedMinutes: 3,
    parts: [
      { name: "Replacement lid", partNumber: "LID-24-GRN", estimatedCost: 125 },
      { name: "Inlet baffle", partNumber: "BFL-INL-4IN", estimatedCost: 45 },
      { name: "Outlet baffle", partNumber: "BFL-OUT-4IN", estimatedCost: 45 },
      { name: "Riser extension", partNumber: "RSR-24-GRN", estimatedCost: 65 },
    ],
  },
  {
    stepNumber: 10,
    title: "Check for Visible Damage",
    emoji: "⚠️",
    description: "Check the tank for any visible signs of structural damage.",
    detailedInstructions: [
      "Inspect tank walls for cracks, holes, or deterioration",
      "Check lid condition — broken, chipped, or crumbling",
      "Look for broken or missing baffles",
      "Check for tree root intrusion",
      "Inspect riser condition if present",
      "Note any damage found with detailed description",
    ],
    requiresPhoto: true,
    photoType: "inspection_damage",
    photoGuidance: "Photo of any damage found, or overall tank condition if no damage",
    hasYesNo: true,
    yesNoQuestion: "Does the tank have any visible signs of damage?",
    estimatedMinutes: 2,
    parts: [
      { name: "Tank lid replacement", partNumber: "LID-CONC-24", estimatedCost: 150 },
      { name: "Riser repair kit", partNumber: "RSR-RPR-KIT", estimatedCost: 85 },
      { name: "Root treatment", partNumber: "ROOT-TREAT", estimatedCost: 35 },
    ],
  },
  {
    stepNumber: 11,
    title: "Inspect Drain Field — Leaching",
    emoji: "🌿",
    description: "Walk the drain field area and check for signs of effluent leaching to the surface.",
    detailedInstructions: [
      "Walk the entire drain field area",
      "Look for wet spots, standing water, or sewage on the surface",
      "Check for unusually green or lush grass over field lines",
      "Note any odors coming from the drain field area",
      "Check downhill areas for runoff or seepage",
      "Compare drain field vegetation to surrounding yard",
    ],
    requiresPhoto: true,
    photoType: "inspection_drain_field",
    photoGuidance: "Photo of the drain field area showing condition of grass, any wet spots or leaching signs",
    hasYesNo: true,
    yesNoQuestion: "Does the drain field show signs of leaching up?",
    estimatedMinutes: 3,
  },
  {
    stepNumber: 12,
    title: "Inspect Drain Field — Saturation",
    emoji: "💧",
    description: "Check the drain field for signs of super saturation or failure.",
    detailedInstructions: [
      "Check soil moisture level in drain field area",
      "Look for spongy or waterlogged ground",
      "Note if the area holds water after recent rain vs draining normally",
      "Check for sewage odor — indicates saturation/failure",
      "Verify proper slope and drainage away from field",
      "Note any areas where the field appears overwhelmed",
    ],
    requiresPhoto: true,
    photoType: "inspection_saturation",
    photoGuidance: "Photo of drain field showing any saturation, standing water, or soil conditions",
    hasYesNo: true,
    yesNoQuestion: "Does the drain field show signs of super saturation?",
    estimatedMinutes: 2,
  },
  {
    stepNumber: 13,
    title: "Overall System Assessment",
    emoji: "✅",
    description: "Make a final assessment: Does the entire septic system appear to function properly?",
    detailedInstructions: [
      "Consider all previous findings together",
      "Assess tank drainage to field — is water flowing properly?",
      "Run water test if possible (flush toilet, run faucet) to verify flow",
      "Confirm no backups, slow drains, or unusual sounds",
      "Determine overall system health",
      "If system is NOT functioning properly, explain in detail what's wrong and what needs to be done",
    ],
    requiresPhoto: false,
    hasYesNo: true,
    yesNoQuestion: "Does the septic system at this site appear to be functioning properly overall?",
    estimatedMinutes: 2,
  },
  {
    stepNumber: 14,
    title: "Additional Notes & Observations",
    emoji: "📝",
    description: "Document any other relevant information not covered in previous steps.",
    detailedInstructions: [
      "Record any additional observations about the property or system",
      "Note recommendations for risers, baffles, or other improvements",
      "Document field line locations if visible or known",
      "Note anything unusual: easements, nearby trees, pool, structures over system",
      "Record if tank was pumped at time of inspection",
    ],
    requiresPhoto: true,
    photoType: "inspection_additional",
    photoGuidance: "Photo of anything noteworthy not captured in previous steps",
    customInputs: [
      {
        id: "additional_info",
        label: "Additional relevant information",
        type: "textarea",
        placeholder: "Any other observations, recommendations, or notes not covered above...",
      },
    ],
    estimatedMinutes: 2,
  },
  {
    stepNumber: 15,
    title: "Secure Site & Clean Up",
    emoji: "🔒",
    description: "Replace and secure ALL lids. Leave the site clean.",
    detailedInstructions: [
      "Replace all tank lids securely",
      "Replace all hatch covers and plugs",
      "Pick up ALL tools, trash, and debris from the area",
      "Leave the site cleaner than you found it",
      "Walk the entire work area to verify nothing left behind",
    ],
    requiresPhoto: true,
    photoType: "after",
    photoGuidance: "Photo showing all lids secured and clean work area",
    safetyWarning: "Verify ALL lids are secured. An open septic lid is a fatal hazard.",
    estimatedMinutes: 2,
  },
  {
    stepNumber: 16,
    title: "Discuss Findings with Client",
    emoji: "🤝",
    description: "Review all findings with the client and provide recommendations.",
    detailedInstructions: [
      "Knock on door or call the client",
      "Walk through findings clearly and honestly",
      "Show relevant photos on your phone",
      "Explain any issues found and recommended actions",
      "Recommend pumping if tank levels warrant it",
      "Discuss system age and expected maintenance needs",
      "Offer to send a detailed report via email or text",
      "Thank them for choosing MAC Septic",
    ],
    requiresPhoto: false,
    customerFacing: true,
    talkingPoints: [
      "I completed the inspection and wanted to go over what I found.",
      "Your system is [functional/showing some wear]. Here's what I noticed...",
      "Based on what I've seen, I'd recommend [specific action].",
      "I'll send you a full inspection report with photos — would you prefer email or text?",
      "Do you have any questions about your system?",
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
 * Get inspection steps for the given system type.
 * Aerobic = original 16-step electrical/mechanical inspection
 * Conventional = 16-step tank/field assessment
 */
export function getInspectionSteps(systemType?: string): InspectionStep[] {
  if (systemType === "conventional") return CONVENTIONAL_INSPECTION_STEPS;
  return INSPECTION_STEPS; // aerobic (default)
}

/**
 * Get equipment items for the given system type.
 */
export function getEquipmentItems(systemType?: string): EquipmentItem[] {
  if (systemType === "conventional") return CONVENTIONAL_EQUIPMENT_ITEMS;
  return EQUIPMENT_ITEMS;
}

/**
 * Get total estimated time for inspection
 */
export function getEstimatedTime(systemType?: string): number {
  return getInspectionSteps(systemType).reduce((sum, s) => sum + s.estimatedMinutes, 0);
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
    selectedParts: [],
  };
}

/**
 * Create default inspection state
 */
export function createDefaultInspectionState(systemType?: string): InspectionState {
  const items = getEquipmentItems(systemType);
  const equipmentItems: Record<string, boolean> = {};
  for (const item of items) {
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
export function getCompletionPercent(state: InspectionState, systemType?: string): number {
  const steps = getInspectionSteps(systemType);
  if (steps.length === 0) return 0;
  // For conventional, skip conditional steps that don't apply
  const applicableSteps = steps.filter((s) => {
    if (!s.conditionalOn) return true;
    const condStep = state.steps[s.conditionalOn.stepNumber];
    return condStep?.customFields?.[s.conditionalOn.fieldId] === s.conditionalOn.value;
  });
  if (applicableSteps.length === 0) return 0;
  const completed = applicableSteps.filter(
    (s) => state.steps[s.stepNumber]?.status === "completed" || state.steps[s.stepNumber]?.status === "skipped",
  ).length;
  return Math.round((completed / applicableSteps.length) * 100);
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
export function generateRecommendations(state: InspectionState, systemType?: string): string[] {
  const recs: string[] = [];
  const steps = getInspectionSteps(systemType);

  for (const step of steps) {
    const stepState = state.steps[step.stepNumber];
    if (!stepState) continue;

    if (step.hasYesNo) {
      // For yes/no assessment steps (conventional), use the question context
      if (stepState.findings === "critical") {
        recs.push(
          `URGENT (${step.title}): ${stepState.findingDetails || "Critical issue — schedule repair immediately."}`,
        );
      } else if (stepState.findings === "needs_attention") {
        recs.push(
          `${step.title}: ${stepState.findingDetails || "Needs maintenance attention."}`,
        );
      }
    } else {
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
  }

  // Pumping recommendation based on sludge level (aerobic step 7, conventional step 9)
  const sludgeStep = systemType === "conventional" ? state.steps[9] : state.steps[7];
  if (sludgeStep?.sludgeLevel) {
    recs.push(
      `Sludge level measured at ${sludgeStep.sludgeLevel}. Schedule pumping based on current level.`,
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
export function calculateEstimate(
  state: InspectionState,
  options?: { includePumping?: boolean; systemType?: string },
): { items: { name: string; cost: number }[]; total: number } {
  const items: { name: string; cost: number }[] = [];
  const steps = getInspectionSteps(options?.systemType);

  for (const step of steps) {
    const stepState = state.steps[step.stepNumber];
    if (!stepState || stepState.findings === "ok") continue;
    if (!step.parts) continue;

    // Use selectedParts if tech has made selections, otherwise include all parts
    const selected = stepState.selectedParts;
    const hasSelections = selected && selected.length > 0;

    for (const part of step.parts) {
      if (!part.estimatedCost) continue;
      if (hasSelections && !selected.includes(part.name)) continue;
      items.push({ name: part.name, cost: part.estimatedCost });
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

  // Add pumping if included
  if (options?.includePumping) {
    items.push({ name: "Septic Tank Pumping (up to 2000 gal)", cost: 595 });
  }

  return { items, total: items.reduce((sum, i) => sum + i.cost, 0) };
}
