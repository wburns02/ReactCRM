/**
 * Septic System FAQ — 50 most common homeowner questions.
 *
 * Designed for outbound call campaigns: when an agent is on the phone with a
 * homeowner, these are the questions the homeowner will ask. Each answer is
 * 2-3 sentences that the agent can read back quickly.
 *
 * Keywords include common misspellings, slang, and partial phrases so the
 * agent-assist UI can surface the right card from real-time speech.
 *
 * Sources: EPA.gov, state health departments, Angi, HomeGuide, septic company
 * FAQ pages, Reddit r/septic, university extension services.
 */

export interface SepticFAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

export const SEPTIC_FAQ: SepticFAQItem[] = [
  // ─────────────────────────────────────────────
  // COST & PRICING (1-8)
  // ─────────────────────────────────────────────
  {
    id: 1,
    question: "How much does it cost to pump a septic tank?",
    answer:
      "A standard residential pump-out starts at $595 depending on tank size, accessibility, and your location. We provide an exact quote before any work begins — no surprise fees.",
    category: "Cost & Pricing",
    keywords: [
      "how much",
      "cost",
      "price",
      "pump",
      "pumping",
      "pump out",
      "pumpout",
      "what do you charge",
      "how much you charge",
      "expensive",
      "pricing",
      "rate",
      "fee",
      "ballpark",
      "estimate",
      "quote",
      "dollars",
      "afford",
    ],
  },
  {
    id: 2,
    question: "How much does a new septic system cost to install?",
    answer:
      "A conventional system typically costs $3,000–$8,000 installed. Aerobic (ATU) systems run $10,000–$20,000 because they have more components. The exact price depends on soil conditions, lot size, and local permit requirements — we provide a free site evaluation.",
    category: "Cost & Pricing",
    keywords: [
      "new system",
      "install",
      "installation",
      "put in",
      "brand new",
      "new septic",
      "build",
      "cost to install",
      "how much for a new",
      "new tank",
      "start from scratch",
    ],
  },
  {
    id: 3,
    question: "How much does it cost to replace a septic system?",
    answer:
      "Replacing a full system (tank + drain field) ranges from $5,000 to $20,000+, depending on the system type and site conditions. Just replacing the tank is $3,000–$9,500. We'll inspect your existing system first — sometimes a repair is all you need.",
    category: "Cost & Pricing",
    keywords: [
      "replace",
      "replacement",
      "new system",
      "swap out",
      "redo",
      "start over",
      "whole new",
      "complete replacement",
      "cost to replace",
      "how much to replace",
    ],
  },
  {
    id: 4,
    question: "How much does a drain field replacement cost?",
    answer:
      "Drain field (leach field) replacement typically costs $3,000–$15,000 depending on the size, soil type, and whether a new design is required. It's one of the most expensive septic repairs, which is why regular pumping to protect your field is so important.",
    category: "Cost & Pricing",
    keywords: [
      "drain field",
      "drainfield",
      "leach field",
      "leachfield",
      "lateral lines",
      "field lines",
      "absorption field",
      "replace field",
      "field cost",
      "fingers",
      "laterals",
    ],
  },
  {
    id: 5,
    question: "Does my homeowner's insurance cover septic repairs?",
    answer:
      "Most standard homeowner's policies do NOT cover septic system repairs or replacement due to normal wear, neglect, or lack of maintenance. Some policies cover sudden accidental damage. We recommend checking your policy, and we can provide documentation for any insurance claims.",
    category: "Cost & Pricing",
    keywords: [
      "insurance",
      "homeowner insurance",
      "covered",
      "coverage",
      "claim",
      "policy",
      "pay for it",
      "warranty",
      "who pays",
      "insured",
      "home warranty",
    ],
  },
  {
    id: 6,
    question: "Do you offer payment plans or financing?",
    answer:
      "Yes, we understand that major septic work can be a significant expense. We offer flexible payment options for larger jobs like replacements and installations. Ask us about financing during your free estimate and we'll find something that works for your budget.",
    category: "Cost & Pricing",
    keywords: [
      "payment plan",
      "financing",
      "finance",
      "monthly payment",
      "pay over time",
      "installment",
      "credit",
      "can't afford",
      "too expensive",
      "budget",
      "pay later",
    ],
  },
  {
    id: 7,
    question: "How much does a septic inspection cost?",
    answer:
      "A standard inspection runs $150–$250. A full inspection with tank pumping (required for most real estate transactions) costs $300–$600. We can schedule an inspection to assess your system — that's actually what I'm calling about today.",
    category: "Cost & Pricing",
    keywords: [
      "inspection cost",
      "how much inspection",
      "inspect",
      "check it out",
      "look at it",
      "come out and look",
      "evaluation",
      "assessment",
      "diagnostic",
      "real estate inspection",
    ],
  },
  {
    id: 8,
    question: "What does a maintenance contract include and how much is it?",
    answer:
      "Our annual maintenance plans include scheduled pumping, system inspection, a written health report, and priority scheduling if you ever have an emergency. Plans start around $300–$500/year depending on your system type, which is far less than the cost of an emergency repair.",
    category: "Cost & Pricing",
    keywords: [
      "maintenance contract",
      "service plan",
      "annual plan",
      "agreement",
      "subscription",
      "yearly",
      "maintenance plan",
      "contract",
      "what's included",
      "membership",
      "service agreement",
    ],
  },

  // ─────────────────────────────────────────────
  // MAINTENANCE & PUMPING (9-18)
  // ─────────────────────────────────────────────
  {
    id: 9,
    question: "How often should I pump my septic tank?",
    answer:
      "The general rule is every 3–5 years for conventional systems and every 1–2 years for aerobic systems. The exact frequency depends on household size, water usage, and tank size. A family of four with a 1,000-gallon tank should pump closer to every 3 years.",
    category: "Maintenance & Pumping",
    keywords: [
      "how often",
      "frequency",
      "every how many years",
      "schedule",
      "when should I",
      "pump",
      "pumping schedule",
      "due for pumping",
      "overdue",
      "last time",
      "been a while",
      "how long between",
    ],
  },
  {
    id: 10,
    question: "I've never pumped my septic tank — is that a problem?",
    answer:
      "It could be. If you've lived there several years without pumping, solids may have built up and could be flowing into your drain field, which causes expensive damage. Even if things seem fine now, we strongly recommend getting it pumped and inspected — catching problems early saves thousands.",
    category: "Maintenance & Pumping",
    keywords: [
      "never pumped",
      "never had it pumped",
      "don't know when",
      "never been",
      "first time",
      "how long has it been",
      "been years",
      "long time",
      "forgot",
      "didn't know",
      "never serviced",
    ],
  },
  {
    id: 11,
    question: "Can I use a garbage disposal with a septic system?",
    answer:
      "You can, but it's not recommended. Garbage disposals significantly increase the amount of solids entering your tank, which means more frequent pumping and higher risk of drain field clogging. If you do use one, plan on pumping 50% more often.",
    category: "Maintenance & Pumping",
    keywords: [
      "garbage disposal",
      "disposal",
      "food waste",
      "grind",
      "kitchen sink",
      "food scraps",
      "insinkerator",
      "disposer",
      "food down the drain",
      "sink disposal",
    ],
  },
  {
    id: 12,
    question: "Is it safe to use bleach, Drano, or harsh chemicals with a septic system?",
    answer:
      "Small amounts of household bleach are generally okay, but products like Drano, heavy-duty cleaners, and chemical drain openers kill the beneficial bacteria your tank needs to break down waste. Use them sparingly or switch to septic-safe alternatives. If you have a clog, call us instead.",
    category: "Maintenance & Pumping",
    keywords: [
      "bleach",
      "drano",
      "chemicals",
      "drain cleaner",
      "cleaning products",
      "clorox",
      "lysol",
      "antibacterial",
      "detergent",
      "harsh",
      "safe to use",
      "kill bacteria",
      "liquid plumber",
      "liquid plumr",
    ],
  },
  {
    id: 13,
    question: "Do septic tank additives like Rid-X actually work?",
    answer:
      "The EPA does not recommend them. Your septic tank already has all the bacteria it needs from normal household waste. Studies show no measurable difference between tanks that use additives and those that don't. Some chemical additives can actually harm your system. Save your money and invest in regular pumping instead.",
    category: "Maintenance & Pumping",
    keywords: [
      "rid-x",
      "ridx",
      "rid x",
      "additive",
      "bacteria treatment",
      "enzyme",
      "septic treatment",
      "monthly treatment",
      "flush packets",
      "yeast",
      "septic safe",
      "bio",
      "activator",
    ],
  },
  {
    id: 14,
    question: "What can and can't I flush down the toilet?",
    answer:
      "Only human waste and toilet paper — nothing else. No wipes (even 'flushable' ones), feminine products, paper towels, diapers, condoms, dental floss, cat litter, or cooking grease. These don't break down and will clog your system. Think of it this way: if you didn't eat it or drink it, don't flush it.",
    category: "Maintenance & Pumping",
    keywords: [
      "flush",
      "what can I flush",
      "flushable wipes",
      "wipes",
      "feminine products",
      "tampons",
      "paper towels",
      "grease",
      "cooking oil",
      "cat litter",
      "diapers",
      "clogged",
      "toilet",
    ],
  },
  {
    id: 15,
    question: "Can I do laundry normally with a septic system?",
    answer:
      "Yes, but spread your loads throughout the week instead of doing all your laundry on one day. Multiple back-to-back loads can overwhelm the system. Use liquid detergent (powder can clog), choose septic-safe brands, and avoid excessive bleach.",
    category: "Maintenance & Pumping",
    keywords: [
      "laundry",
      "washing machine",
      "washer",
      "loads",
      "detergent",
      "wash clothes",
      "too much water",
      "water usage",
      "back to back",
      "all at once",
      "septic safe detergent",
    ],
  },
  {
    id: 16,
    question: "Can I plant trees or a garden over my drain field?",
    answer:
      "Only grass should be planted over your drain field. Tree and shrub roots can invade and crack pipes, block drainage, and cause system failure. Keep trees at least 30 feet away. You should also never park vehicles, build structures, or place heavy objects over the field.",
    category: "Maintenance & Pumping",
    keywords: [
      "plant",
      "tree",
      "garden",
      "landscaping",
      "roots",
      "grass",
      "over the drain field",
      "over the tank",
      "drive over",
      "park on",
      "build over",
      "shed",
      "patio",
      "driveway",
    ],
  },
  {
    id: 17,
    question: "How long does a septic pump-out take?",
    answer:
      "A standard pump-out takes about 30–60 minutes depending on tank size and accessibility. If the lid needs to be located and dug up, add another 15–30 minutes. We try to make it as quick and unobtrusive as possible.",
    category: "Maintenance & Pumping",
    keywords: [
      "how long",
      "take long",
      "how many hours",
      "quick",
      "time",
      "duration",
      "how long does it take",
      "be there long",
      "all day",
      "fast",
    ],
  },
  {
    id: 18,
    question: "What does pumping actually involve? Do I need to be home?",
    answer:
      "Our truck comes out, we locate and open the tank lid, insert a vacuum hose, and pump out all the solids and liquids. The whole process takes about 30–60 minutes. You don't need to be home as long as we can access the tank, but we're happy to walk you through our findings if you're there.",
    category: "Maintenance & Pumping",
    keywords: [
      "what happens",
      "what do you do",
      "be home",
      "need to be there",
      "home during",
      "process",
      "what's involved",
      "how does it work",
      "vacuum",
      "truck",
      "messy",
      "stink",
      "smell bad",
    ],
  },

  // ─────────────────────────────────────────────
  // SIGNS OF PROBLEMS / EMERGENCY (19-26)
  // ─────────────────────────────────────────────
  {
    id: 19,
    question: "What are the warning signs that my septic system is failing?",
    answer:
      "The top signs are: sewage backing up into drains, slow-draining sinks/tubs throughout the house, gurgling sounds in pipes, foul odors indoors or outdoors, standing water or soggy ground near the drain field, and unusually lush green grass over the tank or field. If you notice any of these, call us right away.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "warning signs",
      "failing",
      "problems",
      "something wrong",
      "not working",
      "bad",
      "trouble",
      "issues",
      "red flags",
      "how do I know",
      "tell if",
      "symptoms",
    ],
  },
  {
    id: 20,
    question: "Why does my yard smell like sewage?",
    answer:
      "A sewage smell in your yard usually means your tank is overfull or your drain field isn't processing effluent properly. It can also mean a pipe has cracked or separated. This is not something to ignore — it's a health hazard and could indicate system failure. We can come out and diagnose it quickly.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "smell",
      "stink",
      "odor",
      "sewage smell",
      "rotten eggs",
      "sulfur",
      "yard smells",
      "outside smells",
      "stinks",
      "smelly",
      "reek",
      "gross smell",
      "bad smell",
    ],
  },
  {
    id: 21,
    question: "Sewage is backing up into my house — what do I do?",
    answer:
      "Stop using all water immediately — no flushing, no sinks, no washing machine. This is an emergency. The cause is usually an overfull tank, a blockage, or drain field failure. Call us right away for emergency service. Keep children and pets away from any standing sewage.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "backup",
      "back up",
      "backing up",
      "sewage in house",
      "coming up",
      "overflow",
      "flooding",
      "toilet overflowing",
      "bathtub",
      "basement",
      "emergency",
      "urgent",
      "right now",
      "help",
      "sewage everywhere",
    ],
  },
  {
    id: 22,
    question: "Why are all my drains slow at the same time?",
    answer:
      "When every drain in the house is slow simultaneously, it almost always points to a septic issue — either a full tank, a clogged outlet baffle, or a failing drain field. If only one drain is slow, it's likely a localized plumbing clog. Multiple slow drains warrant a septic inspection.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "slow drain",
      "drains slow",
      "draining slow",
      "takes forever",
      "won't drain",
      "backed up",
      "sluggish",
      "all drains",
      "every sink",
      "shower drain",
      "tub drain",
      "gurgling",
      "bubbling",
    ],
  },
  {
    id: 23,
    question: "There's standing water over my drain field — is that bad?",
    answer:
      "Yes, that's a significant warning sign. Standing water or soggy ground over your drain field means the soil can't absorb effluent properly, which typically indicates the field is failing or overloaded. Don't walk through it — it may contain untreated sewage. Call us for an evaluation.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "standing water",
      "soggy",
      "wet spot",
      "puddle",
      "mushy",
      "spongy",
      "soft ground",
      "muddy",
      "water on top",
      "surfacing",
      "pooling",
      "saturated",
      "marshy",
    ],
  },
  {
    id: 24,
    question: "Why is the grass greener over my septic tank or drain field?",
    answer:
      "Unusually lush, green grass over your tank or drain field can indicate a leak — the escaping nutrients act like fertilizer. A small amount of extra growth is normal, but if one area is dramatically greener or the ground is soft, your system may be leaking and needs inspection.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "green grass",
      "greener",
      "lush",
      "grass growing",
      "one spot",
      "bright green",
      "patch",
      "dark green",
      "growing faster",
      "extra green",
      "fertilizer",
    ],
  },
  {
    id: 25,
    question: "My pipes are making gurgling sounds — is that septic-related?",
    answer:
      "Gurgling sounds from multiple fixtures usually indicate a venting issue or a full septic tank creating back-pressure in the lines. It's one of the early warning signs of a system that needs attention. If the gurgling is in just one drain, it may be a localized clog, but it's worth checking either way.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "gurgling",
      "gurgle",
      "bubbling",
      "noise",
      "sounds",
      "air bubbles",
      "glug",
      "weird noise",
      "pipes making noise",
      "toilet gurgles",
      "rumbling",
    ],
  },
  {
    id: 26,
    question: "Can a failed septic system contaminate my well water?",
    answer:
      "Yes — this is one of the most serious risks. A failing system can leach bacteria (E. coli), nitrates, and other pathogens into groundwater that feeds your well. If you're on well water and notice changes in taste, color, or smell, get both your water and your septic system tested immediately.",
    category: "Signs of Problems / Emergency",
    keywords: [
      "well water",
      "contaminate",
      "drinking water",
      "water quality",
      "e coli",
      "ecoli",
      "bacteria",
      "nitrates",
      "water test",
      "safe to drink",
      "well",
      "groundwater",
      "health risk",
      "sick",
    ],
  },

  // ─────────────────────────────────────────────
  // SYSTEM TYPES (27-33)
  // ─────────────────────────────────────────────
  {
    id: 27,
    question: "What type of septic system do I have?",
    answer:
      "The most common types are conventional (gravity-fed tank and drain field), aerobic treatment units (ATUs that use oxygen to treat waste), and mound systems (elevated drain fields for poor soil). Your county permit records will show what was installed. We can identify your system type during an inspection.",
    category: "System Types",
    keywords: [
      "what type",
      "what kind",
      "which system",
      "don't know what I have",
      "how do I know",
      "what's in my yard",
      "identify",
      "figure out",
      "tell me what",
      "system type",
    ],
  },
  {
    id: 28,
    question: "What is an aerobic septic system and how is it different?",
    answer:
      "An aerobic system uses an air pump to inject oxygen into the treatment tank, which supercharges bacterial activity and produces cleaner effluent than conventional systems. They're required in areas with poor soil or near waterways. They do require more maintenance (every 6–12 months) and have electrical components, but they treat wastewater much more effectively.",
    category: "System Types",
    keywords: [
      "aerobic",
      "ATU",
      "air pump",
      "oxygen",
      "aerobic treatment unit",
      "spray system",
      "sprinkler",
      "spray heads",
      "motor",
      "electric",
      "advanced system",
      "clearstream",
      "jet",
      "norweco",
      "fuji clean",
      "fuji",
    ],
  },
  {
    id: 29,
    question: "What is a conventional septic system?",
    answer:
      "A conventional system is the simplest and most common type. Wastewater flows by gravity from your house into a buried tank where solids settle out, then liquid effluent flows into a drain field of perforated pipes in gravel trenches where soil naturally filters it. They're reliable, affordable, and low-maintenance — just regular pumping every 3–5 years.",
    category: "System Types",
    keywords: [
      "conventional",
      "regular",
      "standard",
      "basic",
      "normal septic",
      "gravity",
      "traditional",
      "old fashioned",
      "simple",
      "regular tank",
    ],
  },
  {
    id: 30,
    question: "What is a mound septic system?",
    answer:
      "A mound system is used when the natural soil is too shallow, too clay-heavy, or the water table is too high for a conventional drain field. Effluent is pumped up into an engineered sand mound built above ground level where treatment occurs. They're more expensive to install and require periodic maintenance, but they solve drainage problems that other systems can't.",
    category: "System Types",
    keywords: [
      "mound",
      "mound system",
      "raised",
      "above ground",
      "sand mound",
      "elevated",
      "high water table",
      "clay soil",
      "rocky",
      "shallow soil",
      "hill",
      "bump in yard",
    ],
  },
  {
    id: 31,
    question: "How long does a septic system last?",
    answer:
      "A well-maintained conventional tank can last 20–40 years. The drain field typically lasts 20–30 years but can go 50+ years with proper care. Aerobic systems have mechanical components that may need replacement every 10–15 years. Regular pumping is the single most important thing you can do to extend your system's life.",
    category: "System Types",
    keywords: [
      "how long last",
      "lifespan",
      "life expectancy",
      "how many years",
      "how old",
      "old system",
      "wear out",
      "expire",
      "end of life",
      "still good",
      "need replacing",
      "age",
      "lasting",
    ],
  },
  {
    id: 32,
    question: "What is a drain field and what does it do?",
    answer:
      "The drain field (also called a leach field) is a network of perforated pipes buried in trenches filled with gravel. Liquid effluent flows from your tank into these pipes and slowly seeps into the surrounding soil, which naturally filters out harmful bacteria and nutrients. It's the part of your system that actually treats the wastewater.",
    category: "System Types",
    keywords: [
      "drain field",
      "drainfield",
      "leach field",
      "leachfield",
      "what is a drain field",
      "field lines",
      "lateral lines",
      "absorption",
      "where does it go",
      "pipes in ground",
      "fingers",
      "trenches",
    ],
  },
  {
    id: 33,
    question: "What is an effluent filter and do I need one?",
    answer:
      "An effluent filter sits at the tank outlet and catches solid particles before they reach your drain field. It's your drain field's last line of defense. Most modern systems have one, and we strongly recommend adding one if yours doesn't — they cost $50–$100 and can prevent thousands in drain field damage. It does need to be cleaned when the tank is pumped.",
    category: "System Types",
    keywords: [
      "effluent filter",
      "filter",
      "outlet filter",
      "baffle filter",
      "screen",
      "tank filter",
      "clogged filter",
      "need a filter",
      "filter maintenance",
    ],
  },

  // ─────────────────────────────────────────────
  // REGULATIONS & PERMITS (34-38)
  // ─────────────────────────────────────────────
  {
    id: 34,
    question: "Do I need a permit to install or repair a septic system?",
    answer:
      "Yes — virtually every jurisdiction requires a permit for septic installation, replacement, and major repairs. Your county health department or environmental agency issues the permit after a site evaluation (soil test, perc test). Minor maintenance like pumping does not require a permit. We handle all the permitting paperwork for our customers.",
    category: "Regulations & Permits",
    keywords: [
      "permit",
      "need a permit",
      "permitted",
      "legal",
      "county",
      "health department",
      "code",
      "regulation",
      "requirement",
      "allowed",
      "approval",
      "licensed",
      "OSSF",
      "TCEQ",
    ],
  },
  {
    id: 35,
    question: "How often does my septic system need to be inspected by the county?",
    answer:
      "Inspection requirements vary by location and system type. Conventional systems typically need a professional inspection every 3 years. Aerobic (ATU) systems usually require inspections every 6 months to 1 year, and many counties require a maintenance contract. We keep track of your schedule and handle all reporting to the county.",
    category: "Regulations & Permits",
    keywords: [
      "inspection",
      "county inspection",
      "required",
      "how often inspect",
      "inspector",
      "compliance",
      "report",
      "pass inspection",
      "fail inspection",
      "maintenance contract required",
      "county requires",
    ],
  },
  {
    id: 36,
    question: "What happens if my septic system fails a county inspection?",
    answer:
      "You'll typically receive a notice with a timeframe to make repairs — usually 30–90 days. The county may require specific fixes and a re-inspection. In severe cases with health hazards, they can require immediate action. We work with homeowners through the entire remediation process and can often get you back in compliance quickly.",
    category: "Regulations & Permits",
    keywords: [
      "fail",
      "failed inspection",
      "violation",
      "notice",
      "fine",
      "penalty",
      "non-compliant",
      "out of compliance",
      "fix it",
      "condemned",
      "shut down",
      "citation",
      "letter from county",
    ],
  },
  {
    id: 37,
    question: "Do I need a septic inspection when buying or selling a house?",
    answer:
      "While not always legally required, it's highly recommended and often required by lenders. A full inspection (with pumping) costs $300–$600 and can uncover problems worth $5,000–$30,000 to fix. As a buyer, always get an independent inspection — don't rely on the seller's inspector. We provide detailed written reports accepted by all major lenders.",
    category: "Regulations & Permits",
    keywords: [
      "buying a house",
      "selling",
      "real estate",
      "home sale",
      "closing",
      "lender",
      "mortgage",
      "title 5",
      "required for sale",
      "home buyer",
      "moving",
      "new house",
      "property transfer",
    ],
  },
  {
    id: 38,
    question: "Can I work on my own septic system or do I need a licensed contractor?",
    answer:
      "Minor maintenance like cleaning effluent filters is generally okay for homeowners. However, installation, major repairs, and anything involving excavation legally requires a licensed septic contractor in most states. Improper work can void warranties, cause environmental contamination, and result in fines. Always use a licensed professional for anything beyond basic upkeep.",
    category: "Regulations & Permits",
    keywords: [
      "DIY",
      "do it myself",
      "myself",
      "own work",
      "licensed",
      "contractor",
      "need a professional",
      "hire someone",
      "handyman",
      "brother in law",
      "neighbor",
      "friend",
      "do my own",
    ],
  },

  // ─────────────────────────────────────────────
  // INSTALLATION & REPLACEMENT (39-43)
  // ─────────────────────────────────────────────
  {
    id: 39,
    question: "How long does septic system installation take?",
    answer:
      "The physical installation typically takes 3–7 days of digging and construction. However, the full process including soil testing, permitting, and design can take 3–6 weeks from start to finish. Weather and permit processing speed are the biggest variables. We manage the entire timeline for you.",
    category: "Installation & Replacement",
    keywords: [
      "how long install",
      "timeline",
      "how many days",
      "weeks",
      "start to finish",
      "when can you start",
      "schedule",
      "how long does it take",
      "turnaround",
      "wait",
      "lead time",
    ],
  },
  {
    id: 40,
    question: "What is a perc test and why do I need one?",
    answer:
      "A percolation (perc) test measures how fast water drains through your soil. It determines what type of septic system your property can support and how large the drain field needs to be. It's required before any new installation or replacement. If soil drains too fast or too slow, you may need a specialized system like a mound or ATU.",
    category: "Installation & Replacement",
    keywords: [
      "perc test",
      "percolation",
      "soil test",
      "perk test",
      "perc",
      "percolation test",
      "soil sample",
      "drain test",
      "site evaluation",
      "soil assessment",
      "ground test",
    ],
  },
  {
    id: 41,
    question: "Can I repair my septic system or do I need a full replacement?",
    answer:
      "It depends on what's wrong. Many issues — cracked baffles, damaged lids, pump failures, minor pipe breaks — can be repaired for a fraction of replacement cost. A failing drain field or severely deteriorated tank usually requires replacement. We always diagnose first and recommend the most cost-effective solution. We won't upsell you on a replacement if a repair will work.",
    category: "Installation & Replacement",
    keywords: [
      "repair",
      "fix",
      "patch",
      "replace or repair",
      "fix it",
      "worth fixing",
      "salvageable",
      "save it",
      "full replacement",
      "do I need a new",
      "band-aid",
    ],
  },
  {
    id: 42,
    question: "What is a septic system riser and should I get one?",
    answer:
      "A riser is a vertical pipe that extends your tank access lid to ground level so it doesn't have to be dug up every time for pumping or inspection. They cost $200–$400 to install and pay for themselves after just a couple of service visits. We highly recommend them — they save time and money on every future pump-out.",
    category: "Installation & Replacement",
    keywords: [
      "riser",
      "lid",
      "access",
      "dig up",
      "find the tank",
      "buried",
      "can't find",
      "ground level",
      "concrete lid",
      "open the tank",
      "locate",
      "where is my tank",
    ],
  },
  {
    id: 43,
    question: "Will installing a new septic system tear up my whole yard?",
    answer:
      "There will be significant excavation — heavy equipment, trenching, and soil displacement are unavoidable. Typically a 20x40 foot area or larger will be affected. We restore the grade and seed grass when we're done, but expect your yard to need a growing season to fully recover. We work carefully to minimize damage to existing landscaping where possible.",
    category: "Installation & Replacement",
    keywords: [
      "tear up yard",
      "dig up",
      "excavation",
      "mess",
      "damage yard",
      "landscaping",
      "destroy",
      "backhoe",
      "heavy equipment",
      "put it back",
      "restore",
      "yard damage",
      "lawn",
    ],
  },

  // ─────────────────────────────────────────────
  // ENVIRONMENTAL & HEALTH (44-47)
  // ─────────────────────────────────────────────
  {
    id: 44,
    question: "Is a failed septic system a health hazard?",
    answer:
      "Absolutely. Raw or partially treated sewage contains dangerous bacteria (E. coli, salmonella), viruses (hepatitis A), and parasites that can cause serious illness. A failing system can contaminate soil, surface water, and well water. Children, elderly people, and pets are especially at risk. Any sewage exposure warrants immediate professional attention.",
    category: "Environmental & Health",
    keywords: [
      "health hazard",
      "dangerous",
      "safe",
      "sick",
      "disease",
      "bacteria",
      "contamination",
      "health risk",
      "kids",
      "children",
      "pets",
      "animals",
      "toxic",
      "poison",
      "infection",
    ],
  },
  {
    id: 45,
    question: "Can my septic system pollute nearby lakes, rivers, or streams?",
    answer:
      "Yes. A malfunctioning system can release nitrogen, phosphorus, and pathogens into surface water and groundwater. These nutrients cause algal blooms that kill fish and make water unsafe for swimming. This is one reason regulations exist about setback distances from waterways and why regular maintenance is so important — especially if you live near water.",
    category: "Environmental & Health",
    keywords: [
      "pollution",
      "lake",
      "river",
      "stream",
      "creek",
      "water body",
      "environment",
      "fish",
      "algae",
      "runoff",
      "contaminate water",
      "near water",
      "waterfront",
      "pond",
    ],
  },
  {
    id: 46,
    question: "Is the sewage smell around my system dangerous to breathe?",
    answer:
      "The gases from septic systems — hydrogen sulfide, methane, and ammonia — can be harmful in concentrated amounts. Occasional mild odor outdoors is generally not dangerous, but persistent strong smells indicate a problem. Never enter a septic tank or enclosed space near one — toxic gas buildup in confined spaces can be fatal within minutes.",
    category: "Environmental & Health",
    keywords: [
      "breathe",
      "gas",
      "fumes",
      "hydrogen sulfide",
      "methane",
      "toxic",
      "dangerous to breathe",
      "safe to be near",
      "smell dangerous",
      "poisonous",
      "harmful",
      "headache",
      "nauseous",
    ],
  },
  {
    id: 47,
    question: "Are septic systems bad for the environment?",
    answer:
      "Not when properly maintained — a well-functioning septic system is actually an effective and natural way to treat household wastewater. The soil acts as a biological filter. Problems only arise from neglected, failing, or improperly designed systems. Regular maintenance keeps your system environmentally safe and protects local water resources.",
    category: "Environmental & Health",
    keywords: [
      "environment",
      "eco",
      "green",
      "sustainable",
      "bad for environment",
      "pollution",
      "natural",
      "better than sewer",
      "ecological",
      "carbon footprint",
      "earth",
    ],
  },

  // ─────────────────────────────────────────────
  // GENERAL / HOW IT WORKS (48-50)
  // ─────────────────────────────────────────────
  {
    id: 48,
    question: "How does a septic system actually work?",
    answer:
      "All wastewater from your house flows into a buried tank where solids settle to the bottom (sludge) and oils float to the top (scum). Bacteria break down the solids. The liquid in the middle (effluent) flows out to the drain field, where it percolates through soil that naturally filters out remaining contaminants. It's simple, effective, and has been proven for over a century.",
    category: "General / How It Works",
    keywords: [
      "how does it work",
      "how it works",
      "explain",
      "what happens",
      "process",
      "basics",
      "101",
      "educate",
      "tell me about",
      "what is a septic",
      "new to septic",
      "never had",
      "first time",
      "sludge",
      "scum",
      "effluent",
    ],
  },
  {
    id: 49,
    question: "Can I connect to city sewer instead of using a septic system?",
    answer:
      "Only if a municipal sewer line runs close to your property. Connecting typically costs $5,000–$20,000+ including the tap fee, excavation, and plumbing work. Some areas offer incentive programs to help homeowners convert. Check with your city utility department to see if sewer service is available at your address — it's not always the cheaper option.",
    category: "General / How It Works",
    keywords: [
      "city sewer",
      "municipal",
      "connect to sewer",
      "sewer line",
      "switch to sewer",
      "get off septic",
      "utility",
      "public sewer",
      "tap",
      "hook up",
      "sewer hookup",
      "option",
      "alternative",
    ],
  },
  {
    id: 50,
    question: "Where is my septic tank located? How do I find it?",
    answer:
      "Check your property records or county permit office — there's usually a site plan showing the location. You can also follow the main sewer line from where it exits your house, look for a slight depression or raised area in the yard, or check for a cleanout pipe. If you can't find it, we can locate it for you — our technicians use probing rods and electronic locators.",
    category: "General / How It Works",
    keywords: [
      "where is",
      "locate",
      "find",
      "location",
      "can't find",
      "don't know where",
      "buried",
      "how to find",
      "where is my tank",
      "map",
      "site plan",
      "dig",
      "probe",
      "metal detector",
    ],
  },
];

/**
 * Category list for UI grouping / filtering.
 */
export const SEPTIC_FAQ_CATEGORIES = [
  "Cost & Pricing",
  "Maintenance & Pumping",
  "Signs of Problems / Emergency",
  "System Types",
  "Regulations & Permits",
  "Installation & Replacement",
  "Environmental & Health",
  "General / How It Works",
] as const;

export type SepticFAQCategory = (typeof SEPTIC_FAQ_CATEGORIES)[number];

/**
 * Fuzzy-match a customer's spoken phrase against FAQ keywords.
 * Returns matching FAQ items sorted by relevance (most keyword hits first).
 */
export function matchFAQByKeywords(
  phrase: string,
  limit = 5
): SepticFAQItem[] {
  const normalized = phrase.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  const scored = SEPTIC_FAQ.map((item) => {
    let score = 0;
    for (const keyword of item.keywords) {
      const kw = keyword.toLowerCase();
      // Exact substring match in the phrase
      if (normalized.includes(kw)) {
        score += kw.split(/\s+/).length * 2; // Multi-word keywords score higher
      }
      // Partial word match
      for (const word of words) {
        if (kw.includes(word) || word.includes(kw)) {
          score += 1;
        }
      }
    }
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
