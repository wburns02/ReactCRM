import { useState, useRef, useEffect } from "react";
import {
  useRCStatus,
  useCallLog,
  useInitiateCall,
  useSyncCalls,
  useMyExtension,
  useTwilioStatus,
  useTwilioCall,
} from "./api.ts";
import { Input } from "@/components/ui/Input.tsx";
import { DialerModal } from "./components/DialerModal.tsx";
import { CallDispositionModal } from "./components/CallDispositionModal.tsx";
import {
  PhoneSettings,
  usePhoneProvider,
} from "./components/PhoneSettings.tsx";
import { CommunicationsNav } from "@/features/communications/components/CommunicationsNav";
import { cn, formatPhone } from "@/lib/utils.ts";
import type { CallRecord } from "./types.ts";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatTotalDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}


function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CALL_TABS = [
  { id: "all", label: "All" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
  { id: "missed", label: "Missed" },
] as const;

// ── Component ────────────────────────────────────────────────────────────

export function PhonePage() {
  const phoneProvider = usePhoneProvider();
  const { data: rcStatus, isLoading: rcStatusLoading } = useRCStatus();
  const { data: twilioStatus, isLoading: twilioStatusLoading } = useTwilioStatus();
  const { data: callsData, isLoading: callsLoading } = useCallLog({ page_size: 50 });
  const { data: myExtension } = useMyExtension();
  const rcCallMutation = useInitiateCall();
  const twilioCallMutation = useTwilioCall();
  const syncMutation = useSyncCalls();

  const status = phoneProvider === "ringcentral" ? rcStatus : twilioStatus;
  const statusLoading = phoneProvider === "ringcentral" ? rcStatusLoading : twilioStatusLoading;
  const calls = callsData?.items || [];

  const [dialerOpen, setDialerOpen] = useState(false);
  const [quickDialNumber, setQuickDialNumber] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const stats = calls.length > 0 ? {
    todayCalls: calls.filter((c) => {
      if (!c.start_time) return false;
      return new Date(c.start_time).toDateString() === new Date().toDateString();
    }).length,
    inboundCalls: calls.filter((c) => c.direction === "inbound").length,
    outboundCalls: calls.filter((c) => c.direction === "outbound").length,
    totalDuration: calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0),
    avgDuration: Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / calls.length),
    withRecordings: calls.filter((c) => c.recording_url).length,
  } : null;

  const filteredCalls = calls.filter((call) => {
    if (activeTab === "inbound" && call.direction !== "inbound") return false;
    if (activeTab === "outbound" && call.direction !== "outbound") return false;
    if (activeTab === "missed" && (call.duration_seconds || 0) > 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return call.from_number.includes(q) || call.to_number.includes(q) || call.disposition?.toLowerCase().includes(q);
    }
    return true;
  });

  const defaultFromNumber = myExtension?.extension_number || "";
  const isCallPending = rcCallMutation.isPending || twilioCallMutation.isPending;

  const handleSyncCalls = async () => {
    try {
      await syncMutation.mutateAsync(24);
    } catch {
      // handled by mutation
    }
  };

  const handleQuickDial = async () => {
    if (!quickDialNumber.trim()) return;
    try {
      if (phoneProvider === "ringcentral") {
        await rcCallMutation.mutateAsync({ to_number: quickDialNumber, from_number: defaultFromNumber || undefined });
      } else {
        await twilioCallMutation.mutateAsync({ to_number: quickDialNumber, record: true });
      }
      setQuickDialNumber("");
    } catch {
      // handled by mutation
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Phone System
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Manage calls, recordings, and communications
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg border transition-colors",
                showSettings
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border hover:bg-bg-hover text-text-muted",
              )}
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Sync button */}
            <button
              onClick={handleSyncCalls}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
            >
              <svg className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncMutation.isPending ? "Syncing..." : "Sync"}
            </button>

            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
              status?.connected
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600"
                : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600",
            )}>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-card border border-border text-text-muted">
                {phoneProvider === "ringcentral" ? "RC" : "TWL"}
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                status?.connected ? "bg-emerald-500 animate-pulse" : "bg-red-500",
              )} />
              {statusLoading ? "Checking..." : status?.connected ? "Connected" : "Offline"}
            </div>

            {/* Dialer button */}
            <button
              onClick={() => setDialerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Dialer
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.todayCalls || 0}</p>
              <p className="text-[11px] text-text-muted">Today</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94m-1 7.98v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.inboundCalls || 0}</p>
              <p className="text-[11px] text-text-muted">Inbound</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 3h6v6M21 3l-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.outboundCalls || 0}</p>
              <p className="text-[11px] text-text-muted">Outbound</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatTotalDuration(stats?.totalDuration || 0)}</p>
              <p className="text-[11px] text-text-muted">Total Time</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatDuration(stats?.avgDuration)}</p>
              <p className="text-[11px] text-text-muted">Avg Duration</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.withRecordings || 0}</p>
              <p className="text-[11px] text-text-muted">Recordings</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings Panel ────────────────────────────────────────── */}
      {showSettings && (
        <div className="flex-shrink-0 border-b border-border">
          <PhoneSettings />
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Quick Dial Panel */}
        <div className="hidden lg:flex lg:w-80 flex-col border-r border-border bg-bg-card overflow-y-auto">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Quick Dial
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Number input */}
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Enter number..."
                value={quickDialNumber}
                onChange={(e) => setQuickDialNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickDial()}
                className="font-mono text-sm h-10"
              />
              <button
                onClick={handleQuickDial}
                disabled={!quickDialNumber.trim() || isCallPending}
                className="w-10 h-10 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => setQuickDialNumber((prev) => prev + digit)}
                  className="h-12 rounded-xl bg-bg-body border border-border hover:bg-bg-hover text-text-primary text-lg font-semibold transition-all active:scale-95"
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setQuickDialNumber((prev) => prev.slice(0, -1))}
                disabled={!quickDialNumber}
                className="flex-1 px-3 py-2 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover disabled:opacity-40 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setQuickDialNumber("")}
                disabled={!quickDialNumber}
                className="flex-1 px-3 py-2 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover disabled:opacity-40 transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Recent numbers */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-text-muted mb-2">Recent Numbers</p>
              <div className="space-y-1">
                {calls.slice(0, 5).map((call, idx) => {
                  const number = call.direction === "inbound" ? call.from_number : call.to_number;
                  const isMissed = !call.duration_seconds || call.duration_seconds === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => setQuickDialNumber(number)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center",
                          isMissed
                            ? "bg-red-50 dark:bg-red-500/10"
                            : call.direction === "inbound"
                              ? "bg-emerald-50 dark:bg-emerald-500/10"
                              : "bg-blue-50 dark:bg-blue-500/10",
                        )}>
                          <svg className={cn(
                            "w-3 h-3",
                            isMissed ? "text-red-500" : call.direction === "inbound" ? "text-emerald-500" : "text-blue-500",
                          )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <span className="font-mono text-xs text-text-primary">
                          {formatPhone(number)}
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Call History */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs + Search */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-bg-card flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-1 bg-bg-body border border-border p-1 rounded-lg">
              {CALL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Call List */}
          <div className="flex-1 overflow-y-auto">
            {callsLoading ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm text-text-muted">Loading calls...</p>
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary mb-1">No calls found</h3>
                <p className="text-sm text-text-muted">
                  {searchQuery ? `No results for "${searchQuery}"` : "Call history will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCalls.map((call) => (
                  <CallLogRow
                    key={call.id}
                    call={call}
                    isPlaying={playingRecording === call.id}
                    onPlayRecording={() => setPlayingRecording(playingRecording === call.id ? null : call.id)}
                    onAddDisposition={() => {
                      setSelectedCall(call);
                      setDispositionModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <CommunicationsNav />

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <DialerModal open={dialerOpen} onClose={() => setDialerOpen(false)} />
      {selectedCall && (
        <CallDispositionModal
          open={dispositionModalOpen}
          onClose={() => { setDispositionModalOpen(false); setSelectedCall(null); }}
          callId={selectedCall.id}
          phoneNumber={selectedCall.direction === "inbound" ? selectedCall.from_number : selectedCall.to_number}
        />
      )}
    </div>
  );
}

// ── Call Log Row ──────────────────────────────────────────────────────────

function CallLogRow({
  call,
  isPlaying,
  onPlayRecording,
  onAddDisposition,
}: {
  call: CallRecord;
  isPlaying: boolean;
  onPlayRecording: () => void;
  onAddDisposition: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying]);

  const isMissed = !call.duration_seconds || call.duration_seconds === 0;
  const isInbound = call.direction === "inbound";

  return (
    <div className={cn(
      "px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors",
      isMissed && "bg-red-50/30 dark:bg-red-500/5",
    )}>
      <div className="flex items-start gap-3">
        {/* Direction icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          isMissed
            ? "bg-red-50 dark:bg-red-500/10"
            : isInbound
              ? "bg-emerald-50 dark:bg-emerald-500/10"
              : "bg-blue-50 dark:bg-blue-500/10",
        )}>
          <svg className={cn(
            "w-5 h-5",
            isMissed ? "text-red-500" : isInbound ? "text-emerald-500" : "text-blue-500",
          )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-text-primary font-mono">
              {formatPhone(isInbound ? call.from_number : call.to_number)}
            </span>
            <span className={cn(
              "inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full",
              isMissed
                ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                : isInbound
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                  : "bg-blue-50 dark:bg-blue-500/10 text-blue-600",
            )}>
              {isMissed ? "Missed" : isInbound ? "Inbound" : "Outbound"}
            </span>
            {call.disposition && (
              <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary">
                {call.disposition}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{formatDuration(call.duration_seconds)}</span>
            <span>{relativeTime(call.start_time)}</span>
          </div>

          {/* Recording player */}
          {call.recording_url && (
            <div className="mt-2.5 flex items-center gap-3 p-2.5 bg-bg-body border border-border rounded-xl">
              <button
                onClick={onPlayRecording}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isPlaying
                    ? "bg-primary text-white"
                    : "bg-bg-hover hover:bg-primary/20 text-text-primary",
                )}
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-100 rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5 text-[10px] text-text-muted">
                  <span>
                    {Math.floor((audioProgress * audioDuration) / 100 / 60)}:
                    {String(Math.floor((audioProgress * audioDuration) / 100) % 60).padStart(2, "0")}
                  </span>
                  <span>
                    {Math.floor(audioDuration / 60)}:
                    {String(Math.floor(audioDuration) % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-text-muted flex-shrink-0 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                REC
              </span>
              <audio
                ref={audioRef}
                src={call.recording_url}
                onTimeUpdate={() => {
                  if (audioRef.current) setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) setAudioDuration(audioRef.current.duration);
                }}
                onEnded={onPlayRecording}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {!call.disposition && (
            <button
              onClick={onAddDisposition}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              + Disposition
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
