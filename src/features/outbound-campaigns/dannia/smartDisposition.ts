import type { ContactCallStatus } from "../types";

/**
 * A smart disposition recommendation based on call context
 */
export interface SmartDisposition {
  status: ContactCallStatus;
  label: string;
  icon: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Returns 3-4 context-aware disposition suggestions ranked by likelihood.
 *
 * Heuristics:
 * - < 5s call duration + not connected → No Answer or Busy
 * - 5-20s → likely Voicemail
 * - 20-60s connected → short conversation (Not Interested / Callback)
 * - > 60s connected → real conversation (Interested / Callback / Completed)
 * - isCallback → prioritize Callback Scheduled / Completed
 * - High attempt count → offer Wrong Number / DNC
 */
export function getSmartDispositions(
  callDurationSec: number,
  wasConnected: boolean,
  isCallback: boolean,
  attempts: number,
): SmartDisposition[] {
  const results: SmartDisposition[] = [];

  if (!wasConnected && callDurationSec < 5) {
    // Very short, no connection — ring out or busy
    results.push(
      {
        status: "no_answer",
        label: "No Answer",
        icon: "\u{1F4F5}",
        confidence: "high",
        reason: "Call rang out with no connection",
      },
      {
        status: "busy",
        label: "Busy",
        icon: "\u{1F6AB}",
        confidence: "medium",
        reason: "Line was busy",
      },
      {
        status: "wrong_number",
        label: "Wrong Number",
        icon: "\u2753",
        confidence: "low",
        reason: "Number may be invalid",
      },
    );
    if (attempts >= 3) {
      results.push({
        status: "do_not_call",
        label: "Do Not Call",
        icon: "\u26D4",
        confidence: "low",
        reason: `${attempts} attempts with no answer`,
      });
    }
    return results;
  }

  if (!wasConnected && callDurationSec >= 5 && callDurationSec <= 30) {
    // Medium duration, no live connection — voicemail
    results.push(
      {
        status: "voicemail",
        label: "Left Voicemail",
        icon: "\u{1F4EC}",
        confidence: "high",
        reason: "Duration suggests voicemail was reached",
      },
      {
        status: "no_answer",
        label: "No Answer",
        icon: "\u{1F4F5}",
        confidence: "medium",
        reason: "Rang to VM but didn\u2019t leave message",
      },
      {
        status: "callback_scheduled",
        label: "Schedule Callback",
        icon: "\u{1F4C5}",
        confidence: "low",
        reason: "Try again at a better time",
      },
    );
    return results;
  }

  if (wasConnected && callDurationSec < 30) {
    // Short connected call — quick screen or decline
    results.push(
      {
        status: "not_interested",
        label: "Not Interested",
        icon: "\u{1F44E}",
        confidence: "high",
        reason: "Short conversation — quick decline",
      },
      {
        status: "callback_scheduled",
        label: "Schedule Callback",
        icon: "\u{1F4C5}",
        confidence: "medium",
        reason: "They were busy, call back later",
      },
      {
        status: "wrong_number",
        label: "Wrong Number",
        icon: "\u2753",
        confidence: "low",
        reason: "Reached wrong person",
      },
    );
    return results;
  }

  if (wasConnected && callDurationSec >= 30) {
    // Real conversation — they engaged
    if (isCallback) {
      results.push(
        {
          status: "interested",
          label: "Interested!",
          icon: "\u2B50",
          confidence: "high",
          reason: "Callback follow-up \u2014 they\u2019re engaged",
        },
        {
          status: "completed",
          label: "Completed",
          icon: "\u2705",
          confidence: "medium",
          reason: "Callback resolved",
        },
        {
          status: "not_interested",
          label: "Not Interested",
          icon: "\u{1F44E}",
          confidence: "low",
          reason: "Decided against after follow-up",
        },
      );
    } else {
      results.push(
        {
          status: "interested",
          label: "Interested!",
          icon: "\u2B50",
          confidence: "high",
          reason: `${Math.floor(callDurationSec / 60)}+ min conversation \u2014 strong engagement`,
        },
        {
          status: "callback_scheduled",
          label: "Schedule Callback",
          icon: "\u{1F4C5}",
          confidence: "medium",
          reason: "Wants to think about it",
        },
        {
          status: "not_interested",
          label: "Not Interested",
          icon: "\u{1F44E}",
          confidence: "medium",
          reason: "Polite decline after discussion",
        },
        {
          status: "completed",
          label: "Completed",
          icon: "\u2705",
          confidence: "low",
          reason: "Info gathered, no further action",
        },
      );
    }
    return results;
  }

  // Fallback: longer voicemail or ambiguous
  results.push(
    {
      status: "voicemail",
      label: "Left Voicemail",
      icon: "\u{1F4EC}",
      confidence: "medium",
      reason: "Extended ring / voicemail",
    },
    {
      status: "no_answer",
      label: "No Answer",
      icon: "\u{1F4F5}",
      confidence: "medium",
      reason: "No connection made",
    },
    {
      status: "callback_scheduled",
      label: "Schedule Callback",
      icon: "\u{1F4C5}",
      confidence: "low",
      reason: "Try again later",
    },
  );

  return results;
}
