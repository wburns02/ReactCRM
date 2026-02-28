import type { CampaignContact } from "./types";

/**
 * Call scripts and talking points for Mac Septic outbound campaigns.
 * Context-aware: adapts based on customer type, contract status, and zone.
 */

export interface ScriptSection {
  title: string;
  lines: string[];
  highlight?: boolean;
}

export interface ObjectionHandler {
  objection: string;
  response: string;
}

export interface CallScript {
  opening: ScriptSection;
  valueProps: ScriptSection;
  contextual: ScriptSection[];
  closing: ScriptSection;
  objections: ObjectionHandler[];
}

/**
 * Generate a contextual call script based on the current contact's data.
 */
export function getCallScript(contact: CampaignContact): CallScript {
  const name = contact.account_name?.split(" ")[0] || "there";
  const isExpired = (contact.days_since_expiry ?? 0) > 0;
  const expiryDays = contact.days_since_expiry ?? 0;
  const hasContract = !!contact.contract_status;
  const contractStatus = contact.contract_status?.toLowerCase() ?? "";
  const customerType = contact.customer_type?.toLowerCase() ?? "";
  const systemType = contact.system_type ?? "septic system";

  // --- OPENING ---
  const opening: ScriptSection = {
    title: "Introduction",
    lines: [
      `"Hi, is this ${name}? Great! My name is [YOUR NAME] and I'm calling from Mac Septic."`,
      `"We're a new septic service provider here in Central Texas, and we're reaching out to homeowners in the area to introduce ourselves."`,
      `"Do you have just a minute? I promise this will be quick."`,
    ],
  };

  // --- VALUE PROPS ---
  const valueProps: ScriptSection = {
    title: "Why Mac Septic",
    highlight: true,
    lines: [
      `"Mac Septic is focused on delivering superior service and top-quality products to provide a world-class experience for our customers."`,
      `"We know a lot of folks in Central Texas have been frustrated with their current septic provider — long wait times, no-shows, surprise charges..."`,
      `"We're different. We show up when we say we will, we explain everything before we do it, and our pricing is transparent."`,
      `"Since we're actively building our customer base right now, we're able to offer some really competitive deals to bring on new customers."`,
    ],
  };

  // --- CONTEXTUAL SECTIONS ---
  const contextual: ScriptSection[] = [];

  if (isExpired) {
    const timeFrame =
      expiryDays > 365
        ? `over ${Math.floor(expiryDays / 365)} year${Math.floor(expiryDays / 365) > 1 ? "s" : ""}`
        : expiryDays > 30
          ? `about ${Math.floor(expiryDays / 30)} months`
          : `${expiryDays} days`;

    contextual.push({
      title: "Expired Contract",
      highlight: true,
      lines: [
        `"I can see your previous service contract expired ${timeFrame} ago."`,
        `"That means your ${systemType} hasn't had professional maintenance in a while — which can lead to costly problems down the road."`,
        `"We'd love to get you set up with a new service plan. And since we're bringing on new customers, I can get you a deal that's likely better than what you were paying before."`,
      ],
    });
  }

  if (contractStatus.includes("active") || contractStatus.includes("current")) {
    contextual.push({
      title: "Active Contract Elsewhere",
      lines: [
        `"I see you currently have an active service agreement. How's that going for you?"`,
        `"If you're happy with your current provider, that's great! But if there's anything that's been frustrating — response times, pricing, communication — we'd love the chance to earn your business when your term is up."`,
        `"I can make a note to follow up closer to your renewal date if you'd like."`,
      ],
    });
  }

  if (customerType.includes("commercial") || customerType.includes("business")) {
    contextual.push({
      title: "Commercial Customer",
      lines: [
        `"For commercial accounts, we offer priority scheduling and dedicated account managers."`,
        `"We understand that a septic issue at a business can mean lost revenue, so our response times for commercial clients are guaranteed."`,
        `"We also provide detailed service reports for your records and compliance needs."`,
      ],
    });
  }

  if (customerType.includes("residential") || !customerType) {
    contextual.push({
      title: "Residential Service",
      lines: [
        `"For residential customers, we offer annual maintenance plans that keep your system running smoothly."`,
        `"Regular maintenance can extend the life of your system by 10–15 years and prevent expensive emergency repairs."`,
        `"Our plans include routine pumping, inspection, and a written report of your system's health."`,
      ],
    });
  }

  if (contact.system_type) {
    contextual.push({
      title: `System: ${contact.system_type}`,
      lines: [
        `"I see you have a ${contact.system_type} — our technicians are specifically trained and certified to work on that type of system."`,
        `"We carry OEM parts and stay current on manufacturer recommendations, so you get the right service every time."`,
      ],
    });
  }

  // --- CLOSING ---
  const closing: ScriptSection = {
    title: "Close / Next Steps",
    lines: [
      `"What I'd like to do is set up a free system inspection for you — no obligation, no pressure."`,
      `"We'll come out, take a look at your system, give you an honest assessment, and put together a quote."`,
      `"What day works best for you this week or next?"`,
      `[If hesitant]: "I completely understand. Can I at least send you our info so you have it on hand? What's the best email to reach you at?"`,
    ],
  };

  // --- OBJECTION HANDLERS ---
  const objections: ObjectionHandler[] = [
    {
      objection: "I already have a septic company",
      response: `"That's great that you're staying on top of it! Out of curiosity, when was the last time they came out? ... We've been hearing from a lot of folks who've been with the same company for years but aren't getting the service they used to. We're happy to provide a free second opinion anytime."`,
    },
    {
      objection: "I'm not interested",
      response: `"I totally understand, and I don't want to take up your time. Just real quick — when was the last time your septic system was serviced? ... If it's been over a year, you might want to get it checked. Can I at least send you a card with our number in case you ever need emergency service?"`,
    },
    {
      objection: "How much does it cost?",
      response: `"Great question! Our pricing depends on the size and type of your system, but I can tell you we're very competitive — especially for new customers. For a standard residential pump-out, most of our customers pay between $275 and $400. We're transparent about pricing — no surprise fees."`,
    },
    {
      objection: "I just got my septic pumped",
      response: `"Perfect timing then! Since your system is freshly pumped, this is actually the best time to do an inspection — we can see everything clearly. And if everything looks good, you'll have peace of mind. Want me to schedule a quick free check-up?"`,
    },
    {
      objection: "I'm on city sewer / don't have a septic",
      response: `"Oh, I apologize for the confusion! We actually service both septic systems and handle some sewer line work as well. But if this doesn't apply to you, I'll make sure to update our records. Sorry for the trouble, ${name}!"`,
    },
    {
      objection: "Can you call back later?",
      response: `"Absolutely! When would be a better time to reach you? ... Perfect, I'll call you back at [TIME]. Talk to you then!"`,
    },
    {
      objection: "I need to talk to my spouse / partner",
      response: `"Of course! No rush at all. Would it help if I sent over some info you could share with them? I can email our service overview and pricing. What's the best email?"`,
    },
    {
      objection: "I've never heard of Mac Septic",
      response: `"We're new to the Central Texas area, and that's exactly why we're reaching out! We're building our reputation one customer at a time, and we're backing that up with top-notch service and honest pricing. We're confident that once you try us, you'll see the difference."`,
    },
  ];

  return { opening, valueProps, contextual, closing, objections };
}

/**
 * Quick-reference tips for agents — always visible.
 */
export const AGENT_TIPS = [
  "Smile when you speak — it comes through in your voice",
  "Use the customer's first name throughout the call",
  "Listen more than you talk — ask questions, then pause",
  "If they mention a problem, empathize before offering a solution",
  "Never bad-mouth their current provider — just highlight what makes us different",
  "Always get a next step: appointment, callback time, or email permission",
];
