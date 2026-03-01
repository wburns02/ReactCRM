import { useMemo } from "react";
import { useOutboundStore } from "./store";
import {
  CALL_STATUS_CONFIG,
  type CampaignContact,
  type CampaignKPIs,
  type DispositionBreakdownItem,
  type CallsOverTimeItem,
  type FunnelStep,
  type BestHourItem,
  type CallLogEntry,
  type ContactCallStatus,
} from "./types";

const DISPOSITION_COLORS: Partial<Record<ContactCallStatus, string>> = {
  interested: "#22c55e",
  not_interested: "#6b7280",
  voicemail: "#8b5cf6",
  no_answer: "#f59e0b",
  busy: "#ef4444",
  callback_scheduled: "#6366f1",
  wrong_number: "#dc2626",
  do_not_call: "#b91c1c",
  completed: "#3b82f6",
  connected: "#10b981",
  skipped: "#9ca3af",
};

export function useCampaignAnalytics(campaignId: string | null) {
  const allContacts = useOutboundStore((s) => s.contacts);

  const contacts = useMemo(
    () => (campaignId ? allContacts.filter((c) => c.campaign_id === campaignId) : []),
    [allContacts, campaignId],
  );

  const calledContacts = useMemo(
    () => contacts.filter((c) => c.call_status !== "pending" && c.call_status !== "queued"),
    [contacts],
  );

  // --- KPIs ---
  const kpis: CampaignKPIs = useMemo(() => {
    if (calledContacts.length === 0) {
      return { callsPerHour: 0, avgDuration: 0, connectRate: 0, interestRate: 0, callbackConversionRate: 0 };
    }

    const connected = calledContacts.filter((c) =>
      ["connected", "interested", "not_interested", "completed"].includes(c.call_status),
    );
    const interested = calledContacts.filter((c) => c.call_status === "interested");

    // Estimate calls per hour from call dates
    const callDates = calledContacts
      .map((c) => c.last_call_date)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime())
      .sort();

    let callsPerHour = 0;
    if (callDates.length >= 2) {
      const spanMs = callDates[callDates.length - 1] - callDates[0];
      const spanHours = spanMs / (1000 * 60 * 60);
      callsPerHour = spanHours > 0 ? callDates.length / spanHours : callDates.length;
    }

    // Average duration
    const durations = calledContacts
      .map((c) => c.last_call_duration)
      .filter((d): d is number => d != null && d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Callback conversion: how many callbacks resulted in interested/completed
    const callbackContacts = contacts.filter(
      (c) => c.call_attempts > 1 && ["interested", "completed"].includes(c.call_status),
    );
    const totalCallbacks = contacts.filter((c) => c.call_attempts > 1).length;
    const callbackConversionRate = totalCallbacks > 0 ? (callbackContacts.length / totalCallbacks) * 100 : 0;

    return {
      callsPerHour: Math.round(callsPerHour * 10) / 10,
      avgDuration: Math.round(avgDuration),
      connectRate: calledContacts.length > 0 ? (connected.length / calledContacts.length) * 100 : 0,
      interestRate: connected.length > 0 ? (interested.length / connected.length) * 100 : 0,
      callbackConversionRate,
    };
  }, [calledContacts, contacts]);

  // --- Disposition breakdown ---
  const dispositionBreakdown: DispositionBreakdownItem[] = useMemo(() => {
    const counts = new Map<ContactCallStatus, number>();
    for (const c of calledContacts) {
      counts.set(c.call_status, (counts.get(c.call_status) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([status, value]) => ({
        name: CALL_STATUS_CONFIG[status]?.label ?? status,
        value,
        color: DISPOSITION_COLORS[status] ?? "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [calledContacts]);

  // --- Calls over time (by day) ---
  const callsOverTime: CallsOverTimeItem[] = useMemo(() => {
    const byDay = new Map<string, { calls: number; connected: number }>();

    for (const c of calledContacts) {
      if (!c.last_call_date) continue;
      const day = c.last_call_date.slice(0, 10);
      const existing = byDay.get(day) ?? { calls: 0, connected: 0 };
      existing.calls++;
      if (["connected", "interested", "not_interested", "completed"].includes(c.call_status)) {
        existing.connected++;
      }
      byDay.set(day, existing);
    }

    return Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calledContacts]);

  // --- Conversion funnel ---
  const funnel: FunnelStep[] = useMemo(() => {
    const total = contacts.length;
    const called = calledContacts.length;
    const connected = calledContacts.filter((c) =>
      ["connected", "interested", "not_interested", "completed"].includes(c.call_status),
    ).length;
    const interested = calledContacts.filter((c) => c.call_status === "interested").length;
    const finalized = calledContacts.filter((c) =>
      ["completed", "interested", "not_interested", "wrong_number", "do_not_call"].includes(c.call_status),
    ).length;

    return [
      { label: "Total Contacts", value: total, percentage: 100, color: "#6b7280" },
      { label: "Called", value: called, percentage: total > 0 ? (called / total) * 100 : 0, color: "#3b82f6" },
      { label: "Connected", value: connected, percentage: total > 0 ? (connected / total) * 100 : 0, color: "#10b981" },
      { label: "Interested", value: interested, percentage: total > 0 ? (interested / total) * 100 : 0, color: "#22c55e" },
      { label: "Finalized", value: finalized, percentage: total > 0 ? (finalized / total) * 100 : 0, color: "#8b5cf6" },
    ];
  }, [contacts, calledContacts]);

  // --- Best calling hours ---
  const bestHours: BestHourItem[] = useMemo(() => {
    const byHour = new Map<number, { total: number; connected: number }>();

    for (const c of calledContacts) {
      if (!c.last_call_date) continue;
      const hour = new Date(c.last_call_date).getHours();
      const existing = byHour.get(hour) ?? { total: 0, connected: 0 };
      existing.total++;
      if (["connected", "interested", "not_interested", "completed"].includes(c.call_status)) {
        existing.connected++;
      }
      byHour.set(hour, existing);
    }

    return Array.from(byHour.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        connectRate: data.total > 0 ? (data.connected / data.total) * 100 : 0,
        totalCalls: data.total,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [calledContacts]);

  // --- Call log table data ---
  const callLog: CallLogEntry[] = useMemo(
    () =>
      calledContacts.map((c) => ({
        id: c.id,
        contactName: c.account_name,
        phone: c.phone,
        zone: c.service_zone,
        status: c.call_status,
        attempts: c.call_attempts,
        lastCallDate: c.last_call_date,
        duration: c.last_call_duration,
        notes: c.notes,
      })),
    [calledContacts],
  );

  // --- CSV export ---
  const exportCSV = useMemo(() => {
    return () => {
      const headers = [
        "Contact Name",
        "Phone",
        "Zone",
        "Status",
        "Attempts",
        "Last Call Date",
        "Duration (s)",
        "Contract Status",
        "Days Since Expiry",
        "Customer Type",
        "Notes",
      ];

      const rows = contacts.map((c) => [
        c.account_name,
        c.phone,
        c.service_zone ?? "",
        c.call_status,
        c.call_attempts.toString(),
        c.last_call_date ?? "",
        c.last_call_duration?.toString() ?? "",
        c.contract_status ?? "",
        c.days_since_expiry?.toString() ?? "",
        c.customer_type ?? "",
        (c.notes ?? "").replace(/"/g, '""'),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `campaign-${campaignId}-export.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };
  }, [contacts, campaignId]);

  return {
    kpis,
    dispositionBreakdown,
    callsOverTime,
    funnel,
    bestHours,
    callLog,
    exportCSV,
    totalContacts: contacts.length,
    calledCount: calledContacts.length,
  };
}
