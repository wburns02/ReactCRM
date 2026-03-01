import type { CallRecordingEntry } from "./types";
import type { ActiveCall } from "@/hooks/useWebPhone";

/**
 * Extract a call ID from the active RingCentral WebPhone session.
 * Tries telephonySessionId first (most reliable), falls back to session.id.
 */
export function extractCallId(activeCall: ActiveCall | null): string {
  if (!activeCall?.session) return "";
  const session = activeCall.session;
  return (
    session.telephonySessionId ||
    session.id ||
    session.callId ||
    ""
  );
}

/**
 * Filter recordings to a specific disposition, or return all if null.
 */
export function filterRecordingsByDisposition(
  records: CallRecordingEntry[],
  disposition?: string | null,
): CallRecordingEntry[] {
  const today = new Date().toISOString().split("T")[0];
  const todayRecords = records.filter(
    (r) => new Date(r.timestamp).toISOString().split("T")[0] === today,
  );
  if (!disposition) return todayRecords;
  return todayRecords.filter((r) => r.disposition === disposition);
}

/**
 * Get the longest "interested" call today — the call of the day.
 */
export function getCallOfTheDay(
  records: CallRecordingEntry[],
): CallRecordingEntry | null {
  const today = new Date().toISOString().split("T")[0];
  const interested = records.filter(
    (r) =>
      r.disposition === "interested" &&
      new Date(r.timestamp).toISOString().split("T")[0] === today,
  );
  if (interested.length === 0) return null;
  return interested.reduce((best, r) =>
    r.durationSec > best.durationSec ? r : best,
  );
}
