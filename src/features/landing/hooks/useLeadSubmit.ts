import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { LeadSubmitData } from "../types/lead";

interface CustomerCreateResponse {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  prospect_stage: string;
  created_at: string;
}

// Format scheduling preference for lead notes
function formatSchedulingPreference(data: LeadSubmitData): string {
  if (data.is_asap) {
    return "ASAP / Emergency";
  }
  if (data.preferred_date) {
    const date = new Date(data.preferred_date + "T00:00:00");
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeSlotMap: Record<string, string> = {
      morning: "Morning (8am-12pm)",
      afternoon: "Afternoon (12pm-5pm)",
      any: "Any time",
    };
    const timeStr = data.preferred_time_slot
      ? ` - ${timeSlotMap[data.preferred_time_slot]}`
      : "";
    return `Requested: ${dateStr}${timeStr}`;
  }
  return "";
}

export function useLeadSubmit() {
  return useMutation({
    mutationFn: async (
      data: LeadSubmitData,
    ): Promise<CustomerCreateResponse> => {
      // Build lead notes with scheduling preference
      const schedulingPref = formatSchedulingPreference(data);
      const noteParts = [
        `Service requested: ${data.service_type}`,
        schedulingPref,
        data.message ? `Notes: ${data.message}` : "",
        data.sms_consent ? "[SMS consent given]" : "",
      ].filter(Boolean);

      // Map form data to customer schema expected by API
      const customerData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone,
        customer_type: "residential",
        lead_source: data.lead_source || "website",
        lead_notes: noteParts.join(". "),
        prospect_stage: data.prospect_stage || "new_lead",
        address_line1: data.address || null,
        // UTM tracking
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_term: data.utm_term || null,
        utm_content: data.utm_content || null,
        gclid: data.gclid || null,
        landing_page: data.landing_page || "/home",
      };

      const response = await apiClient.post("/customers/", customerData);
      return response.data;
    },
    onSuccess: (data) => {
      // Track conversion in Google Analytics if available
      if (typeof window !== "undefined") {
        const w = window as Window & { gtag?: (...args: unknown[]) => void };
        if (w.gtag) {
          w.gtag("event", "generate_lead", {
            event_category: "engagement",
            event_label: "landing_page_form",
            value: 1,
            customer_id: data.id,
          });
        }
      }
    },
  });
}
