/**
 * GA4 Analytics event tracking utility.
 *
 * Fires GA4 events via the gtag global injected in index.html.
 * Safe to call even if GA4 is not configured (no-op).
 */

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { gtag?: GtagFn };
  return w.gtag ?? null;
}

/** Fire a GA4 event */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  const gtag = getGtag();
  if (gtag) {
    gtag("event", eventName, params);
  }
}

/** Track a phone click (tel: link) */
export function trackPhoneClick(phoneNumber: string, source?: string) {
  trackEvent("tel", {
    event_category: "engagement",
    event_label: phoneNumber,
    link_url: `tel:${phoneNumber.replace(/\D/g, "")}`,
    source: source ?? "crm",
  });
}

/** Track an email click (mailto: link) */
export function trackEmailClick(email: string, source?: string) {
  trackEvent("mailto", {
    event_category: "engagement",
    event_label: email,
    link_url: `mailto:${email}`,
    source: source ?? "crm",
  });
}

/** Track a lead form submission */
export function trackLeadSubmit(
  formName: string,
  params?: Record<string, unknown>,
) {
  trackEvent("generate_lead", {
    event_category: "conversion",
    event_label: formName,
    ...params,
  });
}

/** Track a booking completion */
export function trackBookingComplete(
  serviceType: string,
  value?: number,
) {
  trackEvent("purchase", {
    event_category: "conversion",
    event_label: "booking_complete",
    service_type: serviceType,
    value,
    currency: "USD",
  });
}
