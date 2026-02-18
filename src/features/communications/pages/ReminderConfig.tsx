import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ReminderModal } from "../components/ReminderModal";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Reminder {
  id: number | string;
  name: string;
  trigger: string;
  timing: string;
  channels: string[];
  enabled: boolean;
  last_sent?: string | null;
}

// ── Default reminders ────────────────────────────────────────────────────

const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: "appointment-24h",
    name: "Appointment Reminder - 24 Hours",
    trigger: "Before scheduled appointment",
    timing: "24 hours before",
    channels: ["sms"],
    enabled: true,
  },
  {
    id: "appointment-1h",
    name: "Appointment Reminder - 1 Hour",
    trigger: "Before scheduled appointment",
    timing: "1 hour before",
    channels: ["sms"],
    enabled: true,
  },
  {
    id: "invoice-due",
    name: "Invoice Due Reminder",
    trigger: "Invoice due date",
    timing: "3 days before",
    channels: ["email", "sms"],
    enabled: false,
  },
  {
    id: "service-due",
    name: "Service Due Reminder",
    trigger: "Scheduled service interval",
    timing: "7 days before",
    channels: ["email"],
    enabled: true,
  },
];

// ── Channel config ───────────────────────────────────────────────────────

const CHANNEL_BADGE: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  sms: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600",
    icon: "SMS",
  },
  email: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-600",
    icon: "Email",
  },
  push: {
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-600",
    icon: "Push",
  },
};

// ── Component ────────────────────────────────────────────────────────────

export function ReminderConfig() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["auto-reminders"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/reminders");
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const displayReminders: Reminder[] = useMemo(
    () => (reminders?.length > 0 ? reminders : DEFAULT_REMINDERS),
    [reminders],
  );

  const activeCount = displayReminders.filter((r) => r.enabled).length;
  const pausedCount = displayReminders.filter((r) => !r.enabled).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Auto-Reminders
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Automated messages that keep customers informed
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Reminder
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {activeCount}
              </p>
              <p className="text-xs text-text-muted">Active</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {pausedCount}
              </p>
              <p className="text-xs text-text-muted">Paused</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">--</p>
              <p className="text-xs text-text-muted">Sent This Week</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-cyan-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">--</p>
              <p className="text-xs text-text-muted">Open Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reminders List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-text-muted">Loading reminders...</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayReminders.map((reminder) => (
              <Link
                key={reminder.id}
                to={`/communications/reminders/${reminder.id}`}
                className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors"
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    reminder.enabled
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "bg-gray-100 dark:bg-gray-500/10",
                  )}
                >
                  {reminder.enabled ? (
                    <svg
                      className="w-5 h-5 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm text-text-primary truncate">
                      {reminder.name}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full",
                        reminder.enabled
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                          : "bg-gray-100 dark:bg-gray-500/10 text-gray-500",
                      )}
                    >
                      {reminder.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {reminder.trigger} &middot; {reminder.timing}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {reminder.channels.map((ch) => {
                      const cfg = CHANNEL_BADGE[ch] || CHANNEL_BADGE.sms;
                      return (
                        <span
                          key={ch}
                          className={cn(
                            "inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            cfg.bg,
                            cfg.text,
                          )}
                        >
                          {cfg.icon}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-text-muted flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* ── How It Works Section ─────────────────────────────────── */}
        <div className="px-6 py-6">
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-text-primary mb-3">
              How Auto-Reminders Work
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-500">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Set a trigger
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Choose when the reminder fires (before appointment, invoice
                    due, etc.)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-500">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Pick channels
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Send via SMS, email, or both for maximum reach
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-500">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Sit back
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Messages go out automatically. Track delivery and open rates
                    here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border bg-bg-card px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <Link
          to="/communications"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border hover:bg-bg-hover transition-colors text-text-secondary"
        >
          Unified Inbox
        </Link>
        <Link
          to="/communications/templates"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border hover:bg-bg-hover transition-colors text-text-secondary"
        >
          Templates
        </Link>
        <Link
          to="/communications/sms"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border hover:bg-bg-hover transition-colors text-text-secondary"
        >
          SMS Inbox
        </Link>
      </div>

      {/* Create Reminder Modal */}
      <ReminderModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
