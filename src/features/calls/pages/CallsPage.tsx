import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useCalls,
  useCallAnalytics,
  useCallDispositions,
  useSetCallDisposition,
  type Call,
  type CallFilters,
} from "../api/calls.ts";
import { CommunicationsNav } from "@/features/communications/components/CommunicationsNav";
import { Input } from "@/components/ui/Input";
import { cn, formatPhone } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}


function relativeCallTime(dateStr: string | null | undefined): string {
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

// Direction icons as SVG
function DirectionIcon({
  direction,
  isMissed,
  className,
}: {
  direction: string | null | undefined;
  isMissed: boolean;
  className?: string;
}) {
  if (isMissed) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94m-1 7.98v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
        <line x1="1" y1="1" x2="23" y2="23" strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }
  if (direction === "inbound") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94m-1 7.98v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 3h6v6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 3l-6 6" />
    </svg>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────

const DIRECTION_TABS = [
  { id: "all", label: "All Calls" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
  { id: "missed", label: "Missed" },
] as const;

// ── Component ────────────────────────────────────────────────────────────

export function CallsPage() {
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showDispositionPicker, setShowDispositionPicker] = useState(false);
  const [dispositionNotes, setDispositionNotes] = useState("");

  const { data: analytics, isLoading: analyticsLoading } = useCallAnalytics();
  const { data: dispositions } = useCallDispositions();
  const setDisposition = useSetCallDisposition();

  const filters: CallFilters = {
    page,
    page_size: 25,
    direction: activeTab !== "all" && activeTab !== "missed" ? activeTab : undefined,
    search: searchQuery || undefined,
  };

  const { data: callsData, isLoading: callsLoading } = useCalls(filters);
  const calls = callsData?.items || [];
  const totalCalls = callsData?.total || 0;
  const totalPages = Math.ceil(totalCalls / 25);

  // Filter missed calls client-side (missed = 0 duration)
  const displayCalls = useMemo(() => {
    if (activeTab === "missed") {
      return calls.filter((c) => !c.duration_seconds || c.duration_seconds === 0);
    }
    return calls;
  }, [calls, activeTab]);

  const selectedCall = useMemo(
    () => calls.find((c) => c.id === selectedCallId) || null,
    [calls, selectedCallId],
  );

  const handleSetDisposition = async (dispositionName: string) => {
    if (!selectedCallId) return;
    try {
      await setDisposition.mutateAsync({
        callId: selectedCallId,
        disposition: dispositionName,
        notes: dispositionNotes || undefined,
      });
      setShowDispositionPicker(false);
      setDispositionNotes("");
    } catch {
      // silently handled by mutation
    }
  };

  const answerRate = analytics?.total_calls
    ? Math.round((analytics.answered_calls / analytics.total_calls) * 100)
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Call Center
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Call logs, analytics, and disposition tracking
            </p>
          </div>
          <Link
            to="/phone"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Open Dialer
          </Link>
        </div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {analyticsLoading ? "--" : (analytics?.total_calls || 0)}
              </p>
              <p className="text-xs text-text-muted">Total Calls</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {analyticsLoading ? "--" : (analytics?.answered_calls || 0)}
              </p>
              <p className="text-xs text-text-muted">
                Answered{answerRate > 0 ? ` (${answerRate}%)` : ""}
              </p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94m-1 7.98v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {analyticsLoading ? "--" : (analytics?.missed_calls || 0)}
              </p>
              <p className="text-xs text-text-muted">Missed</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {analyticsLoading ? "--" : formatDuration(analytics?.avg_duration_seconds)}
              </p>
              <p className="text-xs text-text-muted">Avg Duration</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-bg-card flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-bg-body border border-border p-1 rounded-lg">
          {DIRECTION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
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
            placeholder="Search by phone number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
        <p className="text-xs text-text-muted ml-auto">
          {totalCalls} call{totalCalls !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* ── Main Content (List + Detail) ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Call List */}
        <div className={cn(
          "overflow-y-auto",
          selectedCall ? "hidden sm:block sm:w-1/2 lg:w-3/5 border-r border-border" : "w-full",
        )}>
          {callsLoading ? (
            <div className="p-8 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-text-muted">Loading calls...</p>
            </div>
          ) : displayCalls.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">No calls found</h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                {searchQuery ? `No results for "${searchQuery}"` : "Call logs will appear here as they come in."}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {displayCalls.map((call) => {
                  const isMissed = !call.duration_seconds || call.duration_seconds === 0;
                  const isInbound = call.direction === "inbound";
                  const isSelected = selectedCallId === call.id;
                  const primaryNumber = isInbound
                    ? call.caller_number
                    : call.called_number;
                  return (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCallId(isSelected ? null : call.id)}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-bg-hover transition-colors",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary",
                        isMissed && !isSelected && "bg-red-50/30 dark:bg-red-500/5",
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isMissed
                          ? "bg-red-50 dark:bg-red-500/10"
                          : isInbound
                            ? "bg-emerald-50 dark:bg-emerald-500/10"
                            : "bg-blue-50 dark:bg-blue-500/10",
                      )}>
                        <DirectionIcon
                          direction={call.direction}
                          isMissed={isMissed}
                          className={cn(
                            "w-5 h-5",
                            isMissed ? "text-red-500" : isInbound ? "text-emerald-500" : "text-blue-500",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-text-primary font-mono truncate">
                            {formatPhone(primaryNumber)}
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
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span>{formatDuration(call.duration_seconds)}</span>
                          <span>{relativeCallTime(call.call_date || call.created_at)}</span>
                          {call.call_disposition && (
                            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-hover text-text-secondary">
                              {call.call_disposition}
                            </span>
                          )}
                        </div>
                      </div>
                      {call.recording_url && (
                        <div className="flex-shrink-0">
                          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-border">
                  <p className="text-xs text-text-muted">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Detail Panel ──────────────────────────────────────── */}
        {selectedCall && (
          <div className={cn(
            "overflow-y-auto bg-bg-body",
            "w-full sm:w-1/2 lg:w-2/5",
          )}>
            <div className="p-5 border-b border-border bg-bg-card flex items-center justify-between">
              <h2 className="font-semibold text-text-primary text-sm">Call Details</h2>
              <button
                onClick={() => { setSelectedCallId(null); setShowDispositionPicker(false); }}
                className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Direction + Number */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  (!selectedCall.duration_seconds)
                    ? "bg-red-50 dark:bg-red-500/10"
                    : selectedCall.direction === "inbound"
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "bg-blue-50 dark:bg-blue-500/10",
                )}>
                  <DirectionIcon
                    direction={selectedCall.direction}
                    isMissed={!selectedCall.duration_seconds || selectedCall.duration_seconds === 0}
                    className={cn(
                      "w-6 h-6",
                      (!selectedCall.duration_seconds) ? "text-red-500" : selectedCall.direction === "inbound" ? "text-emerald-500" : "text-blue-500",
                    )}
                  />
                </div>
                <div>
                  <p className="font-bold text-text-primary font-mono text-lg">
                    {formatPhone(selectedCall.direction === "inbound" ? selectedCall.caller_number : selectedCall.called_number)}
                  </p>
                  <p className="text-xs text-text-muted capitalize">
                    {(!selectedCall.duration_seconds || selectedCall.duration_seconds === 0) ? "Missed Call" : `${selectedCall.direction} Call`}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-0.5">From</p>
                  <p className="text-sm font-medium text-text-primary font-mono">
                    {formatPhone(selectedCall.caller_number)}
                  </p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-0.5">To</p>
                  <p className="text-sm font-medium text-text-primary font-mono">
                    {formatPhone(selectedCall.called_number)}
                  </p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-0.5">Duration</p>
                  <p className="text-sm font-medium text-text-primary">
                    {formatDuration(selectedCall.duration_seconds)}
                  </p>
                </div>
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-0.5">Date</p>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedCall.call_date
                      ? new Date(selectedCall.call_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "--"}
                  </p>
                </div>
              </div>

              {/* Recording */}
              {selectedCall.recording_url && (
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Recording Available
                  </p>
                  <audio src={selectedCall.recording_url} controls className="w-full h-8" />
                </div>
              )}

              {/* Answered By */}
              {selectedCall.answered_by && (
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-0.5">Answered By</p>
                  <p className="text-sm font-medium text-text-primary">{selectedCall.answered_by}</p>
                </div>
              )}

              {/* Disposition */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-muted">Disposition</p>
                  {!showDispositionPicker && (
                    <button
                      onClick={() => setShowDispositionPicker(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      {selectedCall.call_disposition ? "Change" : "Set Disposition"}
                    </button>
                  )}
                </div>
                {selectedCall.call_disposition && !showDispositionPicker && (
                  <span className="inline-flex text-sm font-medium px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                    {selectedCall.call_disposition}
                  </span>
                )}
                {!selectedCall.call_disposition && !showDispositionPicker && (
                  <p className="text-sm text-text-muted">No disposition set</p>
                )}
                {showDispositionPicker && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {dispositions?.map((disp) => (
                        <button
                          key={disp.id}
                          onClick={() => handleSetDisposition(disp.name)}
                          disabled={setDisposition.isPending}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                            selectedCall.call_disposition === disp.name
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-bg-hover text-text-secondary",
                          )}
                        >
                          {disp.name}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={dispositionNotes}
                      onChange={(e) => setDispositionNotes(e.target.value)}
                      placeholder="Add notes (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => { setShowDispositionPicker(false); setDispositionNotes(""); }}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedCall.notes && (
                <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-text-muted mb-1">Notes</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{selectedCall.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <CommunicationsNav />
    </div>
  );
}

export default CallsPage;
