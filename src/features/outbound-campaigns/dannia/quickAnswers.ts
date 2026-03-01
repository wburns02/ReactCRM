import type { CampaignContact } from "../types";
import { KB_CATEGORIES, type KBCategory } from "./macSepticKnowledgeBase";

/**
 * Pre-generated quick-answer cards based on the current contact's data.
 * Visible before the call starts so Dannia has context ready.
 */

export interface QuickAnswerCard {
  id: string;
  category: KBCategory;
  title: string;
  content: string;
  /** Short text for copy-to-clipboard */
  talkingPoint: string;
  priority: number;
}

/**
 * Generate quick-answer cards for the given contact.
 * Cards refresh when the contact changes (dialer advances).
 */
export function generateQuickAnswers(
  contact: CampaignContact | null,
): QuickAnswerCard[] {
  if (!contact) return [];

  const cards: QuickAnswerCard[] = [];
  const name = contact.account_name?.split(" ")[0] || "Customer";

  // ─── CONTRACT STATUS CARDS ──────────────────────────────────────

  if (contact.days_since_expiry != null && contact.days_since_expiry > 0) {
    const days = contact.days_since_expiry;
    const timeFrame =
      days > 365
        ? `over ${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""}`
        : days > 30
          ? `${Math.floor(days / 30)} months`
          : `${days} days`;

    cards.push({
      id: "qa-contract-expired",
      category: "competitive",
      title: "Contract Expired",
      content: `Their contract expired ${timeFrame} ago (${days} days). Their system likely hasn't been serviced recently — great opportunity to offer a free inspection and new service plan.`,
      talkingPoint: `I can see your previous service contract ended ${timeFrame} ago. That means your system hasn't had professional maintenance in a while — we'd love to get you set up with our new customer deal.`,
      priority: 10,
    });
  } else if (
    contact.contract_status?.toLowerCase().includes("active")
  ) {
    cards.push({
      id: "qa-contract-active",
      category: "competitive",
      title: "Active Contract",
      content: `They have an active contract. Don't push hard — probe satisfaction. Ask about response times, communication, and pricing. Plant the seed for when their term ends.`,
      talkingPoint: `I see you have a service agreement in place. How's that been going for you? We'd love the chance to earn your business when your current term is up.`,
      priority: 7,
    });
  }

  // ─── SYSTEM TYPE CARDS ──────────────────────────────────────────

  if (contact.system_type) {
    const systemLower = contact.system_type.toLowerCase();
    if (systemLower.includes("aerobic")) {
      cards.push({
        id: "qa-system-aerobic",
        category: "technical",
        title: `Aerobic System`,
        content: `They have an aerobic system — requires quarterly maintenance and annual inspection (TCEQ mandate). Higher maintenance = stronger pitch for our maintenance plan. We're certified for all aerobic brands.`,
        talkingPoint: `Since you have an aerobic system, it requires quarterly maintenance checks — that's actually a TCEQ requirement. Our maintenance plans are designed specifically for aerobic systems.`,
        priority: 9,
      });
    } else if (systemLower.includes("conventional")) {
      cards.push({
        id: "qa-system-conventional",
        category: "technical",
        title: `Conventional System`,
        content: `Conventional system — simpler maintenance, pump every 3-5 years. Lower maintenance cost but still needs regular attention. Pitch the annual inspection for peace of mind.`,
        talkingPoint: `Your conventional system should be pumped every 3-5 years. Regular maintenance extends system life by 10-15 years and prevents expensive emergency repairs.`,
        priority: 7,
      });
    } else {
      cards.push({
        id: "qa-system-generic",
        category: "technical",
        title: `System: ${contact.system_type}`,
        content: `They have a ${contact.system_type}. Our technicians are trained and certified for this system type. We carry OEM parts and follow manufacturer recommendations.`,
        talkingPoint: `Our technicians are specifically trained and certified to work on ${contact.system_type} systems. We carry OEM parts so you get the right service every time.`,
        priority: 6,
      });
    }
  }

  // ─── ZONE / PRICING CARDS ──────────────────────────────────────

  const zone = contact.service_zone || "";
  if (zone.includes("1") || zone.includes("2")) {
    cards.push({
      id: "qa-zone-local",
      category: "pricing",
      title: `${zone.includes("1") ? "Zone 1 — Home Base" : "Zone 2 — Local"}`,
      content: `Close to base — excellent response times, priority scheduling available. Standard pricing: pump-out $275-$400, free first inspection. Easiest to schedule.`,
      talkingPoint: `You're right in our core service area, so we can offer excellent response times and priority scheduling. Standard pump-out runs $275-$400.`,
      priority: 7,
    });
  } else if (zone.includes("3") || zone.includes("4") || zone.includes("5")) {
    cards.push({
      id: "qa-zone-distant",
      category: "pricing",
      title: `${zone}`,
      content: `Further from base — scheduling may need more coordination. Still full service available. May want to batch with nearby customers for efficiency. Standard pricing applies.`,
      talkingPoint: `We absolutely service your area! We may need to coordinate scheduling around our route, but you'll get the same great service and pricing.`,
      priority: 5,
    });
  }

  // ─── PRICING REFERENCE CARD (always shown) ─────────────────────

  cards.push({
    id: "qa-pricing-ref",
    category: "pricing",
    title: "Pricing Quick Reference",
    content: `Pump-out: $275-$400 | Inspection: FREE (new customers) | Maintenance plan: $350-$600/yr | Emergency: +$75-$150 | Repairs: get free inspection first for quote.`,
    talkingPoint: `For a standard residential pump-out, most customers pay between $275 and $400. And your first inspection would be completely free — no obligation.`,
    priority: 8,
  });

  // ─── CALL HISTORY CARDS ────────────────────────────────────────

  if (contact.call_attempts > 0) {
    const lastDate = contact.last_call_date
      ? new Date(contact.last_call_date).toLocaleDateString()
      : "unknown date";
    const lastResult = contact.last_disposition || contact.call_status;

    cards.push({
      id: "qa-call-history",
      category: "service",
      title: "Previous Contact",
      content: `${contact.call_attempts} previous attempt${contact.call_attempts > 1 ? "s" : ""}. Last call: ${lastDate} (${lastResult}). ${contact.notes ? `Notes: ${contact.notes}` : "No notes from previous calls."}`,
      talkingPoint: contact.notes
        ? `I have a note from our last conversation: ${contact.notes}`
        : `I wanted to follow up — we tried reaching you on ${lastDate}.`,
      priority: 8,
    });
  }

  // ─── CUSTOMER TYPE CARD ────────────────────────────────────────

  if (contact.customer_type?.toLowerCase().includes("commercial")) {
    cards.push({
      id: "qa-commercial",
      category: "service",
      title: "Commercial Account",
      content: `Commercial customer — pitch priority scheduling, dedicated account manager, guaranteed response times, compliance reports. They need reliability because downtime = lost revenue.`,
      talkingPoint: `For commercial accounts, we offer priority scheduling and a dedicated account manager. We know that any downtime can affect your business.`,
      priority: 8,
    });
  }

  // ─── PERSONALIZATION CARD ──────────────────────────────────────

  cards.push({
    id: "qa-personalize",
    category: "company",
    title: `Calling ${name}`,
    content: `Use their first name ("${name}") throughout the call. ${contact.city ? `They're in ${contact.city}.` : ""} ${contact.company ? `Company: ${contact.company}.` : ""} Build rapport before pitching.`,
    talkingPoint: `Hi ${name}! My name is Dannia, and I'm calling from Mac Septic. We're a new septic service provider here in Central Texas.`,
    priority: 6,
  });

  // Sort by priority (highest first)
  return cards.sort((a, b) => b.priority - a.priority);
}

/**
 * Get category display info for a card.
 */
export function getCardCategory(category: KBCategory) {
  return KB_CATEGORIES[category];
}
