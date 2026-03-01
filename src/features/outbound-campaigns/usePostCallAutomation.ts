import { useState, useCallback, useRef } from "react";
import { useCreateActivity } from "@/api/hooks/useActivities";
import { useSendSMS } from "@/api/hooks/useSMS";
import { useOutboundStore } from "./store";
import type { CampaignContact, ContactCallStatus, AutomationResult } from "./types";

const MAX_RESULTS = 10;

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Fire-and-forget post-call automation.
 * Logs activities and optionally sends SMS based on disposition + campaign config.
 * All API calls are non-blocking.
 */
export function usePostCallAutomation(campaignId: string) {
  const [results, setResults] = useState<AutomationResult[]>([]);
  const resultsRef = useRef<AutomationResult[]>([]);

  const createActivity = useCreateActivity();
  const sendSms = useSendSMS();

  const addResult = useCallback((result: AutomationResult) => {
    resultsRef.current = [result, ...resultsRef.current].slice(0, MAX_RESULTS);
    setResults([...resultsRef.current]);
  }, []);

  const runAutomation = useCallback(
    (contact: CampaignContact, disposition: ContactCallStatus, notes?: string) => {
      const config = useOutboundStore.getState().getAutomationConfig(campaignId);

      // 1. Log activity (for all dispositions when enabled)
      if (config.logActivity && contact.account_number) {
        const description = buildActivityDescription(contact, disposition, notes);
        createActivity
          .mutateAsync({
            customer_id: contact.account_number,
            activity_type: "call",
            description,
          })
          .then(() => {
            addResult({
              id: makeId(),
              type: "activity",
              status: "success",
              label: "Activity logged",
              timestamp: Date.now(),
            });
          })
          .catch(() => {
            addResult({
              id: makeId(),
              type: "activity",
              status: "error",
              label: "Activity log failed",
              timestamp: Date.now(),
            });
          });
      }

      // 2. SMS (opt-in dispositions only)
      if (
        config.sendSms &&
        contact.phone &&
        ["interested", "voicemail"].includes(disposition)
      ) {
        const message = buildSmsMessage(contact, disposition);
        sendSms
          .mutateAsync({
            to_phone: contact.phone,
            message,
            customer_id: contact.account_number ?? undefined,
          })
          .then(() => {
            addResult({
              id: makeId(),
              type: "sms",
              status: "success",
              label: "SMS sent",
              timestamp: Date.now(),
            });
          })
          .catch(() => {
            addResult({
              id: makeId(),
              type: "sms",
              status: "error",
              label: "SMS failed",
              timestamp: Date.now(),
            });
          });
      }

      // 3. Mark low priority for not_interested
      if (disposition === "not_interested") {
        useOutboundStore.getState().updateContact(contact.id, { priority: 0 });
        addResult({
          id: makeId(),
          type: "priority",
          status: "success",
          label: "Marked low priority",
          timestamp: Date.now(),
        });
      }
    },
    [campaignId, createActivity, sendSms, addResult],
  );

  return { runAutomation, results };
}

function buildActivityDescription(
  contact: CampaignContact,
  disposition: ContactCallStatus,
  notes?: string,
): string {
  const statusLabel =
    disposition === "interested"
      ? "Interested"
      : disposition === "not_interested"
        ? "Not Interested"
        : disposition === "voicemail"
          ? "Voicemail Left"
          : disposition === "callback_scheduled"
            ? "Callback Scheduled"
            : disposition === "do_not_call"
              ? "Do Not Call"
              : disposition === "completed"
                ? "Completed"
                : disposition === "no_answer"
                  ? "No Answer"
                  : disposition;

  let desc = `Outbound call to ${contact.account_name} — ${statusLabel}`;
  if (notes) desc += `. Notes: ${notes}`;
  return desc;
}

function buildSmsMessage(contact: CampaignContact, disposition: ContactCallStatus): string {
  const name = contact.account_name.split(" ")[0] || "there";

  if (disposition === "interested") {
    return `Hi ${name}, thanks for your interest in Mac Septic services! We'll follow up shortly with more details. Questions? Call us anytime.`;
  }

  // voicemail
  return `Hi ${name}, we tried reaching you from Mac Septic. We'd love to discuss how we can help with your septic needs. Call us back at your convenience!`;
}
