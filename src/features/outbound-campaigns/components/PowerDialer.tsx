import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOutboundStore } from "../store";
import {
  CALL_STATUS_CONFIG,
  ZONE_CONFIG,
  type AutoDialDelay,
  type ContactCallStatus,
} from "../types";
import type { AutomationResult } from "../types";
import { scoreContact, scoreAndSortContacts } from "../scoring";
import { scoreAndSortContactsV2 } from "../dannia/scoringV2";
import { usePostCallAutomation } from "../usePostCallAutomation";
import { usePerformanceLoop } from "../dannia/usePerformanceLoop";
import { useWebPhone } from "@/hooks/useWebPhone";
import { CallScriptPanel } from "./CallScriptPanel";
import { AgentAssist } from "./AgentAssist";
import {
  Phone,
  PhoneOff,
  SkipForward,
  Pause,
  Play,
  Mic,
  MicOff,
  StickyNote,
  Wifi,
  WifiOff,
  ChevronRight,
  Timer,
  X,
  Brain,
  Zap,
  AlertTriangle,
} from "lucide-react";

interface PowerDialerProps {
  campaignId: string;
}

function ScoreBadge({ score, showTooltip = false }: { score: number; showTooltip?: boolean }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${color}`}
      title={showTooltip ? `Smart Score: ${score}/100` : undefined}
    >
      {score}
    </span>
  );
}

function AutoDialCountdown({
  seconds,
  total,
  onCancel,
}: {
  seconds: number;
  total: number;
  onCancel: () => void;
}) {
  const progress = total > 0 ? ((total - seconds) / total) * 100 : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-4 gap-3">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-text-primary tabular-nums">
            {seconds}
          </span>
        </div>
      </div>
      <div className="text-xs text-text-secondary">Auto-dialing next contact...</div>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-hover text-xs font-medium"
      >
        <X className="w-3 h-3" /> Cancel
      </button>
    </div>
  );
}

function AutomationBadges({ results }: { results: AutomationResult[] }) {
  const recent = results.filter((r) => Date.now() - r.timestamp < 8000);
  if (recent.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {recent.map((r) => (
        <span
          key={r.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-opacity ${
            r.status === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
          }`}
        >
          {r.status === "success" ? "\u2713" : "\u2717"} {r.label}
        </span>
      ))}
    </div>
  );
}

export function PowerDialer({ campaignId }: PowerDialerProps) {
  const allContacts = useOutboundStore((s) => s.contacts);
  const dialerActive = useOutboundStore((s) => s.dialerActive);
  const dialerContactIndex = useOutboundStore((s) => s.dialerContactIndex);
  const danniaMode = useOutboundStore((s) => s.danniaMode);
  const autoDialEnabled = useOutboundStore((s) => danniaMode ? true : s.autoDialEnabled);
  const autoDialDelay = useOutboundStore((s) => s.autoDialDelay);
  const sortOrder = useOutboundStore((s) => danniaMode ? "smart" as const : s.sortOrder);

  const {
    state: phoneState,
    activeCall,
    connect,
    disconnect,
    call,
    hangup,
    toggleMute,
    toggleHold,
    error: phoneError,
  } = useWebPhone();

  const { runAutomation, results: automationResults } = usePostCallAutomation(campaignId);
  const { onDisposition: trackDisposition } = usePerformanceLoop();

  const [notes, setNotes] = useState("");
  const [callTimer, setCallTimer] = useState(0);
  const [disposition, setDisposition] = useState<ContactCallStatus | "">("");
  const [scriptCollapsed, setScriptCollapsed] = useState(false);
  const [assistCollapsed, setAssistCollapsed] = useState(false);

  // Auto-dial countdown state
  const [autoDialCountdown, setAutoDialCountdown] = useState<number | null>(null);
  const autoDialTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDialMountedRef = useRef(true);

  // Filter callable contacts
  const rawCallable = useMemo(
    () =>
      allContacts.filter(
        (c) =>
          c.campaign_id === campaignId &&
          ["pending", "queued", "no_answer", "busy", "callback_scheduled"].includes(c.call_status),
      ),
    [allContacts, campaignId],
  );

  // Sort: smart (v2 in Dannia mode) or default
  const callable = useMemo(() => {
    if (sortOrder === "smart") {
      if (danniaMode) {
        return scoreAndSortContactsV2(rawCallable, { allContacts });
      }
      return scoreAndSortContacts(rawCallable);
    }
    return [...rawCallable].sort((a, b) => {
      if (a.call_status === "callback_scheduled" && b.call_status !== "callback_scheduled") return -1;
      if (b.call_status === "callback_scheduled" && a.call_status !== "callback_scheduled") return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [rawCallable, sortOrder, danniaMode, allContacts]);

  // Score for current contact (used for badge even in default mode)
  const currentContact = callable[dialerContactIndex] ?? null;
  const currentScore = useMemo(
    () => (currentContact ? scoreContact(currentContact) : null),
    [currentContact],
  );

  const stats = useMemo(() => {
    const camp = allContacts.filter((c) => c.campaign_id === campaignId);
    const called = camp.filter((c) => c.call_status !== "pending" && c.call_status !== "queued").length;
    const connected = camp.filter((c) =>
      ["connected", "interested", "not_interested", "completed"].includes(c.call_status),
    ).length;
    const interested = camp.filter((c) => c.call_status === "interested").length;
    return { called, connected, interested };
  }, [allContacts, campaignId]);

  // Initialize active campaign
  useEffect(() => {
    useOutboundStore.getState().setActiveCampaign(campaignId);
    return () => useOutboundStore.getState().setActiveCampaign(null);
  }, [campaignId]);

  // Cleanup on unmount
  useEffect(() => {
    autoDialMountedRef.current = true;
    return () => {
      autoDialMountedRef.current = false;
      if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
    };
  }, []);

  // Call timer
  useEffect(() => {
    if (phoneState !== "active") {
      setCallTimer(0);
      return;
    }
    const interval = setInterval(() => {
      if (activeCall) {
        setCallTimer(Math.floor((Date.now() - activeCall.startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneState, activeCall]);

  // Cancel auto-dial if phone disconnects
  useEffect(() => {
    if (phoneState === "error" && autoDialCountdown !== null) {
      cancelAutoDial();
    }
  }, [phoneState, autoDialCountdown]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatPhone = (digits: string) => {
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
  };

  const cancelAutoDial = useCallback(() => {
    if (autoDialTimerRef.current) {
      clearInterval(autoDialTimerRef.current);
      autoDialTimerRef.current = null;
    }
    setAutoDialCountdown(null);
  }, []);

  const startAutoDialCountdown = useCallback(() => {
    if (!autoDialEnabled) return;
    cancelAutoDial();
    const delay = autoDialDelay;
    setAutoDialCountdown(delay);

    autoDialTimerRef.current = setInterval(() => {
      setAutoDialCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
          autoDialTimerRef.current = null;
          // Trigger auto-dial
          if (autoDialMountedRef.current) {
            setTimeout(() => handleDial(), 0);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [autoDialEnabled, autoDialDelay]);

  const handleDial = useCallback(async () => {
    if (!currentContact) return;
    // DNC safety check
    if (currentContact.call_status === "do_not_call") return;

    cancelAutoDial();
    if (phoneState === "idle") {
      await connect();
      setTimeout(async () => {
        await call(currentContact.phone);
      }, 2000);
    } else if (phoneState === "registered") {
      await call(currentContact.phone);
    }
  }, [currentContact, phoneState, connect, call, cancelAutoDial]);

  const handleDisposition = useCallback(
    (status: ContactCallStatus) => {
      if (!currentContact) return;
      const store = useOutboundStore.getState();
      store.setContactCallStatus(currentContact.id, status, notes || undefined);

      // Fire post-call automation
      runAutomation(currentContact, status, notes || undefined);

      // Track in Dannia Mode performance engine
      if (danniaMode) {
        trackDisposition(status, callTimer);
      }

      setNotes("");
      setDisposition("");

      // Auto-advance to next contact
      if (dialerContactIndex < callable.length - 1) {
        store.setDialerContactIndex(dialerContactIndex + 1);
        // Start auto-dial countdown if enabled
        if (autoDialEnabled && status !== "do_not_call") {
          setTimeout(() => startAutoDialCountdown(), 100);
        }
      } else {
        store.stopDialer();
      }
    },
    [currentContact, notes, dialerContactIndex, callable.length, autoDialEnabled, runAutomation, startAutoDialCountdown, danniaMode, trackDisposition, callTimer],
  );

  const handleSkip = () => {
    const store = useOutboundStore.getState();
    if (currentContact) {
      store.setContactCallStatus(currentContact.id, "skipped");
    }
    cancelAutoDial();
    if (dialerContactIndex < callable.length - 1) {
      store.setDialerContactIndex(dialerContactIndex + 1);
    }
    setNotes("");
    setDisposition("");
  };

  const handleStartSession = async () => {
    useOutboundStore.getState().startDialer();
    if (phoneState === "idle") {
      await connect();
    }
  };

  // Phone connection status
  const isPhoneReady = phoneState === "registered";
  const isOnCall = phoneState === "active" || phoneState === "calling";

  // Check if current contact is DNC (shouldn't happen, but safety check)
  const isDNC = currentContact?.call_status === "do_not_call";

  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Power Dialer
          </h2>
          <div className="flex items-center gap-2">
            {/* Sort order toggle — hidden in Dannia Mode (forced smart v2) */}
            {!danniaMode && (
              <div className="flex items-center bg-bg-hover rounded-lg p-0.5">
                <button
                  onClick={() => useOutboundStore.getState().setSortOrder("default")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    sortOrder === "default"
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => useOutboundStore.getState().setSortOrder("smart")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    sortOrder === "smart"
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Brain className="w-3 h-3" /> Smart
                </button>
              </div>
            )}

            {/* Auto-dial toggle — hidden in Dannia Mode (forced on) */}
            {!danniaMode && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    useOutboundStore.getState().setAutoDialEnabled(!autoDialEnabled)
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    autoDialEnabled
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-bg-hover text-text-tertiary border border-transparent"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Auto
                </button>
                {autoDialEnabled && (
                  <select
                    value={autoDialDelay}
                    onChange={(e) =>
                      useOutboundStore
                        .getState()
                        .setAutoDialDelay(Number(e.target.value) as AutoDialDelay)
                    }
                    className="text-[11px] bg-bg-body border border-border rounded-md px-1 py-1 text-text-secondary cursor-pointer focus:outline-none"
                  >
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                  </select>
                )}
              </div>
            )}

            {/* Phone status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isPhoneReady
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : phoneState === "connecting"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isPhoneReady ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {isPhoneReady
                ? "Phone Ready"
                : phoneState === "connecting"
                  ? "Connecting..."
                  : "Phone Offline"}
            </div>
            {!dialerActive ? (
              <button
                onClick={handleStartSession}
                disabled={callable.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40"
              >
                <Play className="w-4 h-4" /> Start Session
              </button>
            ) : (
              <button
                onClick={() => {
                  cancelAutoDial();
                  useOutboundStore.getState().stopDialer();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                <Pause className="w-4 h-4" /> End Session
              </button>
            )}
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {callable.length}
            </div>
            <div className="text-[10px] text-text-tertiary">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {stats.called}
            </div>
            <div className="text-[10px] text-text-tertiary">Called</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">
              {stats.connected}
            </div>
            <div className="text-[10px] text-text-tertiary">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-700">
              {stats.interested}
            </div>
            <div className="text-[10px] text-text-tertiary">Interested</div>
          </div>
        </div>
      </div>

      {/* Phone error */}
      {phoneError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {phoneError}
        </div>
      )}

      {/* Current contact card + assist panels */}
      {dialerActive && currentContact ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        {/* LEFT: Contact card + call controls */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          {/* DNC Warning Banner */}
          {isDNC && (
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                This contact is marked Do Not Call — skipping
              </span>
              <button
                onClick={handleSkip}
                className="ml-auto px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
              >
                Skip to Next
              </button>
            </div>
          )}

          {/* Contact info header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-text-tertiary mb-0.5">
                  Contact {dialerContactIndex + 1} of {callable.length}
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-text-primary">
                    {currentContact.account_name}
                  </h3>
                  {currentContact.service_zone && (() => {
                    const zc = ZONE_CONFIG[currentContact.service_zone];
                    return zc ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${zc.color}`}>
                        {zc.shortLabel}
                      </span>
                    ) : null;
                  })()}
                  {currentScore && <ScoreBadge score={currentScore.total} showTooltip />}
                </div>
                {currentContact.company && (
                  <p className="text-sm text-text-secondary">
                    {currentContact.company}
                  </p>
                )}
                {(currentContact.address || currentContact.zip_code) && (
                  <p className="text-xs text-text-tertiary">
                    {[currentContact.address, currentContact.zip_code].filter(Boolean).join(" \u00b7 ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-text-primary">
                  {formatPhone(currentContact.phone)}
                </div>
                {currentContact.email && (
                  <div className="text-xs text-text-tertiary">
                    {currentContact.email}
                  </div>
                )}
              </div>
            </div>

            {/* Contract & equipment info */}
            {(currentContact.contract_type ||
              currentContact.contract_status ||
              currentContact.system_type ||
              currentContact.contract_start) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                {currentContact.system_type && (
                  <span className="bg-bg-hover px-2 py-0.5 rounded">
                    {currentContact.system_type}
                  </span>
                )}
                {currentContact.contract_status && (
                  <span className="bg-bg-hover px-2 py-0.5 rounded">
                    {currentContact.contract_status}
                  </span>
                )}
                {currentContact.contract_type && (
                  <span className="bg-bg-hover px-2 py-0.5 rounded">
                    {currentContact.contract_type}
                  </span>
                )}
                {currentContact.contract_end && (
                  <span>End: {currentContact.contract_end}</span>
                )}
                {currentContact.days_since_expiry != null && currentContact.days_since_expiry > 0 && (
                  <span className="text-amber-600 font-medium">
                    {currentContact.days_since_expiry}d expired
                  </span>
                )}
              </div>
            )}

            {/* Previous call info */}
            {currentContact.call_attempts > 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Previously called {currentContact.call_attempts} time(s)
                {currentContact.last_disposition && (
                  <span>
                    {" "}
                    &mdash; Last:{" "}
                    {
                      CALL_STATUS_CONFIG[
                        currentContact.last_disposition as ContactCallStatus
                      ]?.label
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Call controls */}
          <div className="p-4 space-y-3">
            {/* Auto-dial countdown overlay */}
            {autoDialCountdown !== null ? (
              <AutoDialCountdown
                seconds={autoDialCountdown}
                total={autoDialDelay}
                onCancel={cancelAutoDial}
              />
            ) : !isOnCall ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDial}
                  disabled={isDNC || (!isPhoneReady && phoneState !== "idle")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-40 touch-manipulation"
                >
                  <Phone className="w-5 h-5" />
                  {phoneState === "idle" ? "Connect & Dial" : "Dial"}
                </button>
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-lg border border-border text-text-secondary hover:bg-bg-hover text-sm font-medium"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>
              </div>
            ) : (
              <>
                {/* Active call header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-text-primary">
                      {phoneState === "calling"
                        ? "Dialing..."
                        : "Connected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary text-sm">
                    <Timer className="w-3.5 h-3.5" />
                    {formatDuration(callTimer)}
                  </div>
                </div>

                {/* Call action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={toggleMute}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${
                      activeCall?.muted
                        ? "bg-red-100 dark:bg-red-950/40 text-red-600"
                        : "bg-bg-hover text-text-secondary"
                    }`}
                  >
                    {activeCall?.muted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    {activeCall?.muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={toggleHold}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${
                      activeCall?.held
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600"
                        : "bg-bg-hover text-text-secondary"
                    }`}
                  >
                    {activeCall?.held ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                    {activeCall?.held ? "Resume" : "Hold"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={async () => {
                      await hangup();
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600"
                  >
                    <PhoneOff className="w-4 h-4" /> End
                  </button>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-text-tertiary" />
              <textarea
                placeholder="Call notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Disposition buttons */}
            <div>
              <div className="text-xs text-text-tertiary mb-2 font-medium">
                Disposition
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    "interested",
                    "not_interested",
                    "voicemail",
                    "no_answer",
                    "busy",
                    "callback_scheduled",
                    "wrong_number",
                    "do_not_call",
                    "completed",
                  ] as ContactCallStatus[]
                ).map((status) => {
                  const conf = CALL_STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleDisposition(status)}
                      className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-colors ${conf.color} hover:opacity-80`}
                    >
                      {conf.icon} {conf.label}
                    </button>
                  );
                })}
              </div>
              {/* Automation result badges */}
              <AutomationBadges results={automationResults} />
            </div>
          </div>

          {/* Queue preview */}
          {callable.length > 1 && (
            <div className="border-t border-border px-4 py-2">
              <div className="text-[10px] text-text-tertiary font-medium mb-1">
                Up next
              </div>
              <div className="space-y-1">
                {callable
                  .slice(dialerContactIndex + 1, dialerContactIndex + 4)
                  .map((c) => {
                    const zc = c.service_zone ? ZONE_CONFIG[c.service_zone] : null;
                    const cs = scoreContact(c);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-text-secondary"
                      >
                        <ChevronRight className="w-3 h-3 text-text-tertiary" />
                        {sortOrder === "smart" && (
                          <ScoreBadge score={cs.total} />
                        )}
                        {zc && (
                          <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-bold ${zc.color}`}>
                            {zc.shortLabel}
                          </span>
                        )}
                        <span className="truncate">{c.account_name}</span>
                        <span className="font-mono text-text-tertiary">
                          {formatPhone(c.phone)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Call Script + Agent Assist */}
        <div className="space-y-3">
          <CallScriptPanel
            contact={currentContact}
            collapsed={scriptCollapsed}
            onToggle={() => setScriptCollapsed(!scriptCollapsed)}
          />
          <AgentAssist
            contact={currentContact}
            isOnCall={isOnCall}
            collapsed={assistCollapsed}
            onToggle={() => setAssistCollapsed(!assistCollapsed)}
          />
        </div>
        </div>
      ) : dialerActive ? (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">&#127881;</div>
          <h3 className="text-lg font-semibold text-text-primary">
            All contacts called!
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            You&apos;ve reached the end of the call list for this campaign.
          </p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <Phone className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary">
            Ready to dial
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {callable.length > 0
              ? `${callable.length} contacts ready to call. Click "Start Session" to begin.`
              : "No callable contacts. Import contacts or check filters."}
          </p>
        </div>
      )}
    </div>
  );
}
