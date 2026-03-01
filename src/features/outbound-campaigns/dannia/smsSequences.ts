import { SMSService } from "@/features/sms/services/SMSService";
import type { CampaignContact, ContactCallStatus } from "../types";

export interface SequenceDefinition {
  id: string;
  name: string;
  steps: {
    delayMs: number; // delay from sequence start
    template: string;
  }[];
}

const SEQUENCES: Record<string, SequenceDefinition> = {
  voicemail_followup: {
    id: "voicemail_followup",
    name: "Voicemail Follow-Up",
    steps: [
      {
        delayMs: 0, // immediate
        template:
          "Hi {name}, this is Dannia from Mac Septic. I just tried reaching you about your septic system service. We're new to Central Texas and offering great deals for new customers! Feel free to call us back at (903) 665-0170.",
      },
    ],
  },
  interested_drip: {
    id: "interested_drip",
    name: "Interested Drip",
    steps: [
      {
        delayMs: 0, // Day 0: thank-you
        template:
          "Hi {name}, thanks for chatting with Dannia at Mac Septic today! We look forward to helping you with your septic needs. Questions? Call us anytime at (903) 665-0170.",
      },
      {
        delayMs: 2 * 24 * 60 * 60 * 1000, // Day 2: pricing
        template:
          "Hi {name}, just wanted to follow up from our conversation. Mac Septic offers competitive pricing and flexible scheduling. Ready to get started? Call (903) 665-0170 or reply here!",
      },
      {
        delayMs: 5 * 24 * 60 * 60 * 1000, // Day 5: check-in
        template:
          "Hi {name}, checking in from Mac Septic. Have any questions about your septic service? We'd love to help. Call us at (903) 665-0170.",
      },
    ],
  },
  callback_reminder: {
    id: "callback_reminder",
    name: "Callback Reminder",
    steps: [
      {
        delayMs: -30 * 60 * 1000, // 30 min before (negative = before scheduledAt)
        template:
          "Hi {name}, this is a reminder that Dannia from Mac Septic will be calling you shortly. Talk soon!",
      },
    ],
  },
};

const DISPOSITION_TO_SEQUENCE: Partial<Record<ContactCallStatus, string>> = {
  voicemail: "voicemail_followup",
  interested: "interested_drip",
  callback_scheduled: "callback_reminder",
};

export function getSequenceForDisposition(
  status: ContactCallStatus,
): SequenceDefinition | null {
  const seqId = DISPOSITION_TO_SEQUENCE[status];
  return seqId ? SEQUENCES[seqId] ?? null : null;
}

export function buildSmsMessage(
  template: string,
  contact: CampaignContact,
): string {
  const message = template
    .replace(/\{name\}/g, contact.account_name || "there")
    .replace(/\{company\}/g, contact.company || "");
  return SMSService.ensureOptOutMessage(message);
}

export function shouldSendNow(step: {
  scheduledAt: number;
  status: string;
}): boolean {
  if (step.status !== "pending") return false;
  if (Date.now() < step.scheduledAt) return false;
  // Check quiet hours (default 22:00-07:00)
  if (SMSService.isWithinQuietHours("22:00", "07:00")) return false;
  return true;
}
