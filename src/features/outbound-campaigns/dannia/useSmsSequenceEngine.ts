import { useEffect, useCallback, useRef } from "react";
import { useSendSMS } from "@/api/hooks/useSMS";
import { SMSService } from "@/features/sms/services/SMSService";
import { useDanniaStore } from "./danniaStore";
import {
  getSequenceForDisposition,
  buildSmsMessage,
  shouldSendNow,
} from "./smsSequences";
import type { CampaignContact, ContactCallStatus } from "../types";

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useSmsSequenceEngine() {
  const addSmsStep = useDanniaStore((s) => s.addSmsStep);
  const markSmsStepSent = useDanniaStore((s) => s.markSmsStepSent);
  const markSmsStepFailed = useDanniaStore((s) => s.markSmsStepFailed);
  const sendSms = useSendSMS();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enqueueSequence = useCallback(
    (contact: CampaignContact, disposition: ContactCallStatus) => {
      const sequence = getSequenceForDisposition(disposition);
      if (!sequence) return;
      if (!contact.phone) return;

      const now = Date.now();
      sequence.steps.forEach((step, index) => {
        const scheduledAt = now + step.delayMs;
        const message = buildSmsMessage(step.template, contact);
        addSmsStep({
          contactId: contact.id,
          contactName: contact.account_name,
          contactPhone: SMSService.normalizePhoneForTwilio(contact.phone),
          sequenceId: sequence.id,
          stepIndex: index,
          template: message,
          scheduledAt: Math.max(scheduledAt, now), // no negative timestamps
          status: "pending",
          sentAt: null,
          error: null,
        });
      });
    },
    [addSmsStep],
  );

  // Process due pending steps
  const processPendingSteps = useCallback(async () => {
    const steps = useDanniaStore.getState().pendingSmsSteps;
    const due = steps.filter(shouldSendNow);

    for (const step of due) {
      try {
        await sendSms.mutateAsync({
          to_phone: step.contactPhone,
          message: step.template,
        });
        markSmsStepSent(step.id);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "SMS send failed";
        markSmsStepFailed(step.id, msg);
      }
    }
  }, [sendSms, markSmsStepSent, markSmsStepFailed]);

  // 60-second polling interval
  useEffect(() => {
    // Run once immediately
    processPendingSteps();

    intervalRef.current = setInterval(processPendingSteps, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [processPendingSteps]);

  return { enqueueSequence };
}
