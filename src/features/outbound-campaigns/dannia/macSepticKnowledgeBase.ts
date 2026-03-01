import type { CampaignContact } from "../types";

/**
 * Mac Septic Knowledge Base — comprehensive Q&A entries for AI call assistance.
 * Used by all 3 layers: Quick Answers, Enhanced Chat, and Live Transcription.
 */

export type KBCategory =
  | "pricing"
  | "technical"
  | "company"
  | "competitive"
  | "regulatory"
  | "service"
  | "emergency";

export interface KBEntry {
  id: string;
  category: KBCategory;
  keywords: string[];
  patterns: RegExp[];
  question: string;
  answer: string;
  /** Dynamic answer that uses contact context */
  dynamicAnswer?: (contact: CampaignContact) => string;
  priority: number; // higher = more relevant when multiple match
}

// ─── PRICING ENTRIES ────────────────────────────────────────────────

const PRICING_ENTRIES: KBEntry[] = [
  {
    id: "price-pumpout",
    category: "pricing",
    keywords: ["pump", "pumping", "pump-out", "cost", "price", "how much"],
    patterns: [/how much.*pump|pump.*cost|price.*pump|pump.*price/i],
    question: "How much does a pump-out cost?",
    answer:
      "Standard residential pump-out: $275-$400 depending on tank size and accessibility. No hidden fees — pricing is transparent and quoted upfront. New customers get competitive introductory rates.",
    dynamicAnswer: (c) =>
      `Standard residential pump-out: $275-$400 depending on tank size and accessibility. ${c.system_type ? `For a ${c.system_type}, pricing may vary based on system complexity.` : ""} No hidden fees — we quote upfront. As a new customer, they'd qualify for our introductory rates.`,
    priority: 10,
  },
  {
    id: "price-inspection",
    category: "pricing",
    keywords: ["inspection", "inspect", "check", "assess", "evaluate"],
    patterns: [/inspection.*cost|how much.*inspect|price.*inspect|free.*inspect/i],
    question: "How much is an inspection?",
    answer:
      "First inspection for new customers is FREE — no obligation. Standard inspection: $150-$250. Includes tank level check, baffle inspection, structural assessment, drainfield evaluation, and a written report with photos.",
    priority: 9,
  },
  {
    id: "price-contract",
    category: "pricing",
    keywords: ["contract", "plan", "maintenance plan", "annual", "service plan"],
    patterns: [/contract.*cost|maintenance.*plan.*price|annual.*plan|service.*plan.*cost/i],
    question: "What do maintenance plans cost?",
    answer:
      "Annual maintenance plans: $350-$600/year depending on system type. Includes scheduled pumping, inspection, priority scheduling, and discounted rates on repairs. Aerobic systems are at the higher end due to quarterly check requirements. Plans save 15-25% vs individual service calls.",
    priority: 9,
  },
  {
    id: "price-repair",
    category: "pricing",
    keywords: ["repair", "fix", "broken", "replacement", "replace"],
    patterns: [/repair.*cost|how much.*fix|price.*repair|replace.*cost/i],
    question: "How much do repairs cost?",
    answer:
      "Repairs vary widely: minor fixes $150-$500, baffle replacement $300-$600, pump replacement $800-$1,500, drainfield repair $2,000-$10,000+. We always provide a detailed quote before work begins. Free inspection helps us give accurate estimates.",
    priority: 8,
  },
  {
    id: "price-payment",
    category: "pricing",
    keywords: ["payment", "pay", "financing", "credit", "installment"],
    patterns: [/payment.*plan|financ|pay.*over.*time|credit|install.*ment/i],
    question: "Do you offer payment plans?",
    answer:
      "Yes! For larger jobs, we offer flexible payment options. Most routine services are due at time of service, but for major repairs or installations, we can work out a payment plan. We accept all major credit cards, checks, and cash.",
    priority: 7,
  },
  {
    id: "price-emergency",
    category: "pricing",
    keywords: ["emergency", "after hours", "weekend", "urgent", "same day"],
    patterns: [/emergency.*cost|after.*hour.*price|weekend.*rate|urgent.*fee/i],
    question: "Is there an emergency service fee?",
    answer:
      "Emergency/after-hours service may have an additional fee of $75-$150 depending on the situation. We try to keep it reasonable because we know emergencies are stressful enough. Maintenance plan customers get reduced or waived emergency fees.",
    priority: 8,
  },
  {
    id: "price-comparison",
    category: "pricing",
    keywords: ["cheaper", "expensive", "competitor", "quote", "estimate"],
    patterns: [/cheaper|too.*expensive|competitor.*price|beat.*price|match.*price/i],
    question: "Can you match competitor pricing?",
    answer:
      "We're very competitive, especially for new customers. We may not always be the absolute cheapest, but we deliver exceptional value — no surprise fees, thorough service, and written reports every visit. Our new customer deals are often better than what competitors offer their existing customers.",
    priority: 7,
  },
];

// ─── TECHNICAL ENTRIES ──────────────────────────────────────────────

const TECHNICAL_ENTRIES: KBEntry[] = [
  {
    id: "tech-aerobic-vs-conventional",
    category: "technical",
    keywords: ["aerobic", "conventional", "difference", "type", "system type"],
    patterns: [/aerobic.*conventional|conventional.*aerobic|difference.*system|type.*system|what.*type/i],
    question: "What's the difference between aerobic and conventional systems?",
    answer:
      "Conventional systems use anaerobic bacteria in a tank + drainfield. They're simpler and cheaper to maintain (pump every 3-5 years). Aerobic systems use oxygen and aerobic bacteria for more thorough treatment — required in some areas. They need quarterly maintenance checks, annual inspections, and have mechanical components (pumps, aerators) that need monitoring.",
    priority: 9,
  },
  {
    id: "tech-maintenance-schedule",
    category: "technical",
    keywords: ["how often", "frequency", "schedule", "maintenance", "when"],
    patterns: [/how often|every.*year|frequency|when should|maintenance.*schedule/i],
    question: "How often should a septic system be maintained?",
    answer:
      "Conventional: pump every 3-5 years depending on household size and usage. Aerobic: quarterly maintenance checks + annual inspection required by TCEQ. All systems benefit from annual visual inspections. Regular maintenance extends system life by 10-15 years and prevents costly emergency repairs.",
    dynamicAnswer: (c) =>
      c.system_type?.toLowerCase().includes("aerobic")
        ? "Aerobic systems like theirs require quarterly maintenance checks and annual inspections — it's actually required by TCEQ. Regular maintenance prevents the expensive repairs and extends system life by 10-15 years. This is a great pitch for our maintenance plan."
        : "Standard systems should be pumped every 3-5 years depending on household size. Regular maintenance extends system life by 10-15 years and prevents costly emergency repairs. Great opportunity to pitch the annual maintenance plan.",
    priority: 9,
  },
  {
    id: "tech-drainfield",
    category: "technical",
    keywords: ["drainfield", "drain field", "leach", "lateral", "absorption"],
    patterns: [/drain.*field|leach|lateral.*line|absorption|soggy.*yard/i],
    question: "What are drainfield issues?",
    answer:
      "Drainfield problems are serious but often fixable if caught early. Signs: soggy ground, slow drains, sewage odor, unusually green grass over the drainfield. Causes: overloading, lack of pumping, flushing non-biodegradables, tree root intrusion. Early detection through inspection can avoid $5,000-$15,000+ replacement costs.",
    priority: 8,
  },
  {
    id: "tech-signs-of-trouble",
    category: "technical",
    keywords: ["signs", "trouble", "problem", "failing", "warning", "symptoms"],
    patterns: [/sign.*trouble|sign.*problem|failing|warning.*sign|symptom/i],
    question: "What are signs my septic system needs attention?",
    answer:
      "Warning signs: slow drains throughout the house, gurgling sounds in plumbing, sewage odors inside or outside, standing water/soggy soil near tank or drainfield, unusually green grass over the system, sewage backup in lowest drains. If they mention ANY of these, this is urgent — offer immediate inspection.",
    priority: 9,
  },
  {
    id: "tech-tank-size",
    category: "technical",
    keywords: ["tank size", "gallon", "capacity", "how big"],
    patterns: [/tank.*size|how.*big|gallon|capacity.*tank/i],
    question: "How do I know my tank size?",
    answer:
      "Most residential tanks are 1,000-1,500 gallons. Size depends on home square footage and number of bedrooms (per code). A 3-bedroom home typically has a 1,000-gallon tank. We can determine exact size during an inspection. Tank size affects pumping frequency and cost.",
    priority: 6,
  },
  {
    id: "tech-what-not-to-flush",
    category: "technical",
    keywords: ["flush", "dispose", "garbage disposal", "chemicals", "bleach"],
    patterns: [/what.*flush|garbage.*dispos|chemical|bleach|wipe/i],
    question: "What shouldn't go in a septic system?",
    answer:
      "Never flush: wipes (even 'flushable' ones), feminine products, condoms, dental floss, cat litter, medications, grease/oils, paint, chemicals. Limit garbage disposal use. Harsh chemicals (bleach, drain cleaners) kill beneficial bacteria. This is great educational content that positions us as knowledgeable and trustworthy.",
    priority: 6,
  },
  {
    id: "tech-lifespan",
    category: "technical",
    keywords: ["lifespan", "last", "how long", "years", "life expectancy"],
    patterns: [/how long.*last|lifespan|life.*expect|years.*system/i],
    question: "How long does a septic system last?",
    answer:
      "Well-maintained systems: 25-30+ years. Neglected systems can fail in 10-15 years. Concrete tanks last 40+ years structurally. Drainfields last 20-30 years with proper care. Aerobic components (pumps, aerators) typically need replacement every 8-12 years. Regular maintenance is the #1 factor in longevity.",
    priority: 7,
  },
  {
    id: "tech-brands",
    category: "technical",
    keywords: ["brand", "manufacturer", "model", "clearstream", "jet", "norweco"],
    patterns: [/brand|manufacturer|clearstream|jet.*inc|norweco|aero.*star|bio.*microbics/i],
    question: "What brands do you service?",
    answer:
      "We service ALL brands of aerobic and conventional systems including Clearstream, Jet Inc., Norweco, Bio-Microbics, Aero-Star, Hoot, Delta, and more. Our technicians are factory-trained on major brands and we stock OEM parts.",
    priority: 7,
  },
  {
    id: "tech-winter",
    category: "technical",
    keywords: ["winter", "cold", "freeze", "frozen", "ice"],
    patterns: [/winter|cold.*weather|freez|frozen|ice.*septic/i],
    question: "Does cold weather affect septic systems?",
    answer:
      "Central Texas rarely has severe freezing, but extended cold snaps can affect shallow components. Insulation (mulch, earth cover) helps. The biggest winter issue is reduced bacterial activity in the tank. Keep water flowing regularly and avoid draining large volumes of cold water at once.",
    priority: 5,
  },
];

// ─── COMPANY ENTRIES ────────────────────────────────────────────────

const COMPANY_ENTRIES: KBEntry[] = [
  {
    id: "company-about",
    category: "company",
    keywords: ["who", "mac septic", "about", "company", "business"],
    patterns: [/who.*mac.*septic|about.*mac|tell.*about.*company|what.*mac.*septic/i],
    question: "Who is Mac Septic?",
    answer:
      "Mac Septic is a new septic service provider in Central Texas focused on delivering superior service, top-quality products, and a world-class customer experience. We're building our reputation one customer at a time with transparent pricing, reliable scheduling, and thorough service.",
    priority: 8,
  },
  {
    id: "company-new",
    category: "company",
    keywords: ["new", "experience", "how long", "started", "history"],
    patterns: [/never heard|new.*company|how long.*business|experience|just.*started/i],
    question: "You're a new company — can I trust you?",
    answer:
      "We're new to the Central Texas area, but our team has years of experience in the septic industry. Being new is actually an advantage for customers — we're working extra hard to earn every customer's trust, offering competitive introductory rates, and delivering the kind of personal attention that bigger companies can't match.",
    priority: 9,
  },
  {
    id: "company-service-area",
    category: "company",
    keywords: ["service area", "where", "location", "how far", "travel"],
    patterns: [/service.*area|where.*service|how far|do you.*come.*to|cover.*area/i],
    question: "What areas do you serve?",
    answer:
      "We serve the greater Central Texas area, centered around San Marcos (78666). Our service zones: Zone 1 (0-15mi) Home Base, Zone 2 (15-30mi) Local, Zone 3 (30-50mi) Regional, Zone 4 (50-75mi) Extended, Zone 5 (75+mi) Outer. We service all zones — just pricing/scheduling may vary for distant locations.",
    dynamicAnswer: (c) =>
      c.service_zone
        ? `They're in ${c.service_zone} — ${c.service_zone.includes("1") || c.service_zone.includes("2") ? "well within our core service area, so scheduling and response times are excellent." : "we absolutely service that area. Scheduling may take a bit more coordination for travel time."}`
        : "We serve the greater Central Texas area centered around San Marcos. Our service radius extends 75+ miles covering 5 zones.",
    priority: 7,
  },
  {
    id: "company-certifications",
    category: "company",
    keywords: ["certified", "licensed", "certification", "qualification", "training"],
    patterns: [/certif|licens|qualif|train|credential/i],
    question: "Are you licensed and certified?",
    answer:
      "Yes. Our technicians hold required TCEQ licenses for maintenance providers. We carry full liability insurance and are bonded. Our team stays current on manufacturer training for all major aerobic system brands. We're committed to professional standards.",
    priority: 8,
  },
  {
    id: "company-guarantee",
    category: "company",
    keywords: ["warranty", "guarantee", "stand behind", "promise", "satisfaction"],
    patterns: [/warranty|guarantee|stand.*behind|promise|satisfaction/i],
    question: "Do you guarantee your work?",
    answer:
      "100% satisfaction guarantee on all service. Labor is guaranteed for 90 days. Parts carry manufacturer warranties. Maintenance plan customers get extended warranty coverage. We stand behind our work — if there's an issue, we make it right.",
    priority: 8,
  },
  {
    id: "company-team",
    category: "company",
    keywords: ["team", "technician", "staff", "employee", "who comes"],
    patterns: [/team|technician|staff|who.*come|employee/i],
    question: "Who will come to my property?",
    answer:
      "All our technicians are background-checked, uniformed, and professionally trained. They arrive in clearly marked Mac Septic vehicles with all necessary equipment. They'll introduce themselves, explain what they're doing, and leave a detailed written report. We respect your property and time.",
    priority: 6,
  },
  {
    id: "company-hours",
    category: "company",
    keywords: ["hours", "open", "available", "schedule", "when"],
    patterns: [/what.*hours|when.*open|available.*when|business.*hours/i],
    question: "What are your business hours?",
    answer:
      "Regular hours: Monday-Friday 8:00 AM - 5:00 PM. Emergency service available 24/7 for urgent situations (backups, overflows). Weekend appointments available by request. Maintenance plan customers get priority scheduling and after-hours access.",
    priority: 6,
  },
];

// ─── COMPETITIVE ENTRIES ────────────────────────────────────────────

const COMPETITIVE_ENTRIES: KBEntry[] = [
  {
    id: "comp-vs-current",
    category: "competitive",
    keywords: ["current provider", "already have", "switch", "change", "why"],
    patterns: [/already have|current.*provider|switch|why.*change|happy with/i],
    question: "Why should I switch from my current provider?",
    answer:
      "Don't bad-mouth their current provider. Instead: 'That's great you're staying on top of it!' Then probe: 'When was the last time they came out?' and 'How's the communication been?' Many people settle for mediocre service. Highlight: transparent pricing, written reports every visit, priority scheduling, and our new customer deals.",
    dynamicAnswer: (c) =>
      c.days_since_expiry && c.days_since_expiry > 365
        ? `Their contract expired over ${Math.floor(c.days_since_expiry / 365)} year(s) ago — they may not actually be getting serviced. Gently ask: "When was the last time they actually came out?" This usually reveals gaps in service.`
        : "Don't bad-mouth competitors. Probe gently about their satisfaction, then highlight what makes Mac Septic different: transparent pricing, thorough service with written reports, and competitive new customer rates.",
    priority: 9,
  },
  {
    id: "comp-value-prop",
    category: "competitive",
    keywords: ["why mac septic", "different", "special", "unique", "better"],
    patterns: [/why.*mac|what.*different|what.*special|what.*unique|why.*better/i],
    question: "What makes Mac Septic different?",
    answer:
      "What sets us apart: 1) Transparent pricing — no surprise fees, ever. 2) Written reports with photos after every visit. 3) Guaranteed scheduling — we show up when we say we will. 4) Comprehensive service — we don't just pump and leave, we inspect everything. 5) Competitive new customer deals. 6) Personal attention of a local company with professional standards.",
    priority: 9,
  },
  {
    id: "comp-reviews",
    category: "competitive",
    keywords: ["reviews", "reputation", "testimonial", "rating", "references"],
    patterns: [/review|reputation|testimonial|rating|reference|recommend/i],
    question: "Do you have reviews/references?",
    answer:
      "We're actively building our review base. Offer: 'I can connect you with a few of our current customers who'd be happy to share their experience.' Every customer who's tried us has been impressed with the difference. We're also happy to provide our service guarantee in writing.",
    priority: 6,
  },
];

// ─── REGULATORY ENTRIES ─────────────────────────────────────────────

const REGULATORY_ENTRIES: KBEntry[] = [
  {
    id: "reg-tceq",
    category: "regulatory",
    keywords: ["TCEQ", "regulation", "requirement", "law", "compliance"],
    patterns: [/tceq|regulation|requirement|law|compliance|code/i],
    question: "What are the TCEQ requirements?",
    answer:
      "TCEQ (Texas Commission on Environmental Quality) requires: aerobic systems have a licensed maintenance provider and quarterly inspections. Property transfers require a septic inspection. Some counties have additional requirements. Non-compliance can result in fines. We handle all compliance paperwork.",
    priority: 7,
  },
  {
    id: "reg-permit",
    category: "regulatory",
    keywords: ["permit", "permission", "approval", "installation"],
    patterns: [/permit|permiss|approval|install.*new/i],
    question: "Do I need a permit for septic work?",
    answer:
      "Routine maintenance (pumping, inspections) doesn't require permits. New installations, major repairs, or modifications require permits from the local health department or TCEQ authorized agent. We handle all permitting as part of our installation/repair services.",
    priority: 6,
  },
  {
    id: "reg-selling-home",
    category: "regulatory",
    keywords: ["selling", "real estate", "property transfer", "buying"],
    patterns: [/sell.*home|real.*estate|property.*transfer|buy.*house/i],
    question: "I'm selling/buying a home — what about the septic?",
    answer:
      "Property transfers in Texas require a septic inspection. This protects both buyer and seller. Our inspection provides a detailed written report that satisfies lender and real estate requirements. We can typically schedule within 3-5 business days. This is a great lead source — they NEED this service.",
    priority: 8,
  },
];

// ─── SERVICE ENTRIES ────────────────────────────────────────────────

const SERVICE_ENTRIES: KBEntry[] = [
  {
    id: "svc-inspection-process",
    category: "service",
    keywords: ["inspection", "process", "what happens", "thorough"],
    patterns: [/what.*inspection.*include|inspection.*process|what.*inspect|thorough/i],
    question: "What does an inspection include?",
    answer:
      "Our inspections cover: tank levels, inlet/outlet baffles, structural integrity, drainfield performance, all mechanical components (aerobic systems), and effluent quality. Takes 30-45 minutes. You get a written report with photos, condition assessment, and recommendations. First inspection is free for new customers.",
    priority: 8,
  },
  {
    id: "svc-pumping-process",
    category: "service",
    keywords: ["pumping", "process", "how long", "what happens"],
    patterns: [/pump.*process|how.*long.*pump|what.*happen.*pump/i],
    question: "What does pumping involve?",
    answer:
      "Standard pumping for a 1,000-gallon tank takes about 30 minutes. We use modern vacuum trucks and dispose at licensed facilities. Unlike some companies, we don't just pump and leave — our techs inspect the tank interior, check baffles, and note any issues. Service includes a brief written summary.",
    priority: 7,
  },
  {
    id: "svc-scheduling",
    category: "service",
    keywords: ["schedule", "appointment", "available", "when can"],
    patterns: [/schedule.*appointment|when.*available|when.*come|earliest.*appointment/i],
    question: "How soon can you come out?",
    answer:
      "Routine service: typically within 1-2 weeks. Priority/maintenance plan customers: within 3-5 business days. Emergency service: same-day or next-day. We work with your schedule and confirm appointments in advance. No sitting around waiting — we give you a time window.",
    priority: 7,
  },
  {
    id: "svc-emergency",
    category: "emergency",
    keywords: ["emergency", "urgent", "backup", "overflow", "smell"],
    patterns: [/emergency|urgent|back.*up|overflow|sewage.*smell|odor|gurgling/i],
    question: "I have a septic emergency!",
    answer:
      "Show empathy first: 'I'm sorry you're dealing with that — that sounds really stressful.' Then action: we can get a technician out quickly, same-day or next-day for emergencies. After the fix, suggest a maintenance plan to prevent recurrence. Emergencies often convert to long-term customers.",
    priority: 10,
  },
  {
    id: "svc-commercial",
    category: "service",
    keywords: ["commercial", "business", "restaurant", "office", "industrial"],
    patterns: [/commercial|business.*septic|restaurant|office.*septic|industrial/i],
    question: "Do you service commercial properties?",
    answer:
      "Yes! Commercial accounts get: priority scheduling, dedicated account manager, guaranteed response times, detailed service reports for compliance, and customized maintenance plans. Commercial systems typically need more frequent service. We understand downtime = lost revenue, so we respond fast.",
    priority: 7,
  },
];

// ─── COMBINED KNOWLEDGE BASE ────────────────────────────────────────

export const KNOWLEDGE_BASE: KBEntry[] = [
  ...PRICING_ENTRIES,
  ...TECHNICAL_ENTRIES,
  ...COMPANY_ENTRIES,
  ...COMPETITIVE_ENTRIES,
  ...REGULATORY_ENTRIES,
  ...SERVICE_ENTRIES,
];

/**
 * Category metadata for UI display
 */
export const KB_CATEGORIES: Record<KBCategory, { label: string; color: string; icon: string }> = {
  pricing: { label: "Pricing", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30", icon: "$" },
  technical: { label: "Technical", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30", icon: "T" },
  company: { label: "Company", color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30", icon: "C" },
  competitive: { label: "Competitive", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30", icon: "V" },
  regulatory: { label: "Regulatory", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30", icon: "R" },
  service: { label: "Service", color: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30", icon: "S" },
  emergency: { label: "Emergency", color: "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/40", icon: "!" },
};

/**
 * Search the knowledge base for relevant entries.
 * Returns matches sorted by relevance score (highest first).
 */
export function searchKnowledgeBase(
  query: string,
  limit = 5,
): { entry: KBEntry; score: number }[] {
  const lowerQuery = query.toLowerCase();
  const results: { entry: KBEntry; score: number }[] = [];

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;

    // Pattern matching (highest signal)
    if (entry.patterns.some((p) => p.test(query))) {
      score += 50;
    }

    // Keyword matching
    for (const keyword of entry.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    // Question similarity (basic word overlap)
    const queryWords = lowerQuery.split(/\s+/);
    const questionWords = entry.question.toLowerCase().split(/\s+/);
    const overlap = queryWords.filter((w) => questionWords.includes(w)).length;
    score += overlap * 3;

    // Priority boost
    score += entry.priority;

    if (score > 10) {
      results.push({ entry, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get the best answer for a query, using dynamic answers when contact context is available.
 */
export function getBestAnswer(
  query: string,
  contact?: CampaignContact | null,
): { answer: string; entry: KBEntry } | null {
  const results = searchKnowledgeBase(query, 1);
  if (results.length === 0) return null;

  const { entry } = results[0];
  const answer =
    contact && entry.dynamicAnswer
      ? entry.dynamicAnswer(contact)
      : entry.answer;

  return { answer, entry };
}

/**
 * Build a system prompt for Claude API with contact context.
 */
export function buildSystemPrompt(contact?: CampaignContact | null): string {
  const parts = [
    "You are an AI assistant helping a call center agent (Dannia) at Mac Septic, a septic service company in Central Texas.",
    "Provide concise, actionable advice she can use while on a live phone call.",
    "Keep responses under 3-4 sentences — she needs quick answers, not essays.",
    "Always be positive about Mac Septic. Never bad-mouth competitors.",
    "Key talking points: transparent pricing, thorough inspections, written reports, new customer deals, satisfaction guarantee.",
  ];

  if (contact) {
    parts.push("");
    parts.push("CURRENT CONTACT CONTEXT:");
    parts.push(`Name: ${contact.account_name || "Unknown"}`);
    if (contact.system_type) parts.push(`System Type: ${contact.system_type}`);
    if (contact.contract_status) parts.push(`Contract Status: ${contact.contract_status}`);
    if (contact.days_since_expiry != null) {
      parts.push(`Days Since Contract Expiry: ${contact.days_since_expiry}`);
    }
    if (contact.service_zone) parts.push(`Service Zone: ${contact.service_zone}`);
    if (contact.customer_type) parts.push(`Customer Type: ${contact.customer_type}`);
    if (contact.city) parts.push(`City: ${contact.city}`);
    if (contact.call_attempts > 0) parts.push(`Previous Call Attempts: ${contact.call_attempts}`);
    if (contact.notes) parts.push(`Notes: ${contact.notes}`);
  }

  parts.push("");
  parts.push("PRICING REFERENCE:");
  parts.push("- Pump-out: $275-$400 (residential standard)");
  parts.push("- First inspection: FREE for new customers");
  parts.push("- Maintenance plans: $350-$600/year");
  parts.push("- Emergency fee: $75-$150 additional");

  return parts.join("\n");
}
