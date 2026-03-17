import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { useWebPhone } from "@/hooks/useWebPhone";
import type { PhoneState } from "@/hooks/useWebPhone";
import { useCustomerLookup } from "@/api/hooks/useDispatch";
import { useCallLog } from "./api.ts";
import { cn, formatPhone } from "@/lib/utils.ts";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Mic, MicOff, Pause, Play, Hash, ArrowRightLeft,
  Voicemail, Wifi, WifiOff, ChevronDown, Clock,
  MapPin, PhoneForwarded, Delete,
} from "lucide-react";
import { ScreenPop } from "./components/ScreenPop";

// ── Phone number / line data ──────────────────────────────────────────────

interface PhoneLine {
  id: string;
  phone_number: string;
  label: string;
  usage_type: string;
  features: string[];
  can_call: boolean;
}

// Known office labels — user can choose which line to present as caller ID
const OFFICE_LABELS: Record<string, string> = {
  "+15127378711": "San Marcos, TX",
  "+16153452544": "Nashville, TN",
  "+16152362691": "Nashville Main",
  "+18033291250": "Rock Hill Main",
  "+18032239677": "Rock Hill, SC",
  "+18033281410": "Rock Hill, SC #2",
};

// Default outbound line
const DEFAULT_LINE = "+15127378711";

function usePhoneNumbers() {
  return useQuery({
    queryKey: ["phone", "numbers"],
    queryFn: async (): Promise<PhoneLine[]> => {
      const { data } = await apiClient.get("/ringcentral/phone-numbers");
      return data.items || [];
    },
    staleTime: 300_000,
  });
}

const DTMF_KEYS = [
  { key: "1", sub: "" },
  { key: "2", sub: "ABC" },
  { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" },
  { key: "5", sub: "JKL" },
  { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" },
  { key: "8", sub: "TUV" },
  { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" },
  { key: "0", sub: "+" },
  { key: "#", sub: "" },
];

// ── Component ─────────────────────────────────────────────────────────────

export function WebPhonePage() {
  const {
    state, error, activeCall,
    connect, disconnect, call, answer, hangup,
    toggleMute, toggleHold, sendDtmf, transfer, toVoicemail,
  } = useWebPhone();

  const { data: lines = [] } = usePhoneNumbers();
  const { data: callsData } = useCallLog({ page_size: 20 });
  const recentCalls = callsData?.items || [];

  const [dialInput, setDialInput] = useState("");
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [showLineSelector, setShowLineSelector] = useState(false);
  const [showDtmf, setShowDtmf] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const lineSelectorRef = useRef<HTMLDivElement>(null);

  // Customer lookup for active call
  const lookup = useCustomerLookup(activeCall?.remoteNumber ?? "");

  // Auto-select default line (512 number), fall back to first callable
  useEffect(() => {
    if (lines.length > 0 && !selectedLine) {
      const defaultLine = lines.find((l) => l.phone_number === DEFAULT_LINE && l.can_call);
      const callable = defaultLine || lines.find((l) => l.can_call);
      if (callable) setSelectedLine(callable.phone_number);
    }
  }, [lines, selectedLine]);

  // Call timer
  useEffect(() => {
    if (state !== "active" || !activeCall) {
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state, activeCall]);

  // Close line selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lineSelectorRef.current && !lineSelectorRef.current.contains(e.target as Node)) {
        setShowLineSelector(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatDisplayPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleDtmfPress = useCallback((key: string) => {
    if (activeCall) {
      sendDtmf(key);
    } else {
      setDialInput((prev) => prev + key);
    }
  }, [activeCall, sendDtmf]);

  const handleDial = useCallback(() => {
    const digits = dialInput.replace(/\D/g, "");
    if (digits.length >= 7) {
      call(digits, selectedLine || undefined);
      setDialInput("");
    }
  }, [dialInput, call, selectedLine]);

  const handleTransfer = useCallback(() => {
    const digits = transferTarget.replace(/\D/g, "");
    if (digits.length >= 7) {
      transfer(digits);
      setShowTransfer(false);
      setTransferTarget("");
    }
  }, [transferTarget, transfer]);

  const handleBackspace = useCallback(() => {
    setDialInput((prev) => prev.slice(0, -1));
  }, []);

  const getLineLabel = (phone: string) => {
    return OFFICE_LABELS[phone] || lines.find((l) => l.phone_number === phone)?.label || phone;
  };

  const selectedLineLabel = selectedLine ? getLineLabel(selectedLine) : "Select Line";

  const stateColor: Record<PhoneState, string> = {
    idle: "text-gray-400",
    connecting: "text-amber-500",
    registered: "text-emerald-500",
    ringing: "text-blue-500",
    calling: "text-amber-500",
    active: "text-emerald-500",
    error: "text-red-500",
  };

  const stateLabel: Record<PhoneState, string> = {
    idle: "Disconnected",
    connecting: "Connecting...",
    registered: "Ready",
    ringing: "Incoming Call",
    calling: "Dialing...",
    active: formatDuration(callDuration),
    error: "Error",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-bg-body">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Web Phone
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              RingCentral browser phone — select your line and dial
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status */}
            <div className={cn("flex items-center gap-2 text-sm font-medium", stateColor[state])}>
              {state === "registered" || state === "active" ? (
                <Wifi className="w-4 h-4" />
              ) : state === "error" ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {stateLabel[state]}
            </div>

            {/* Connect/Disconnect */}
            {state === "idle" ? (
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                <Wifi className="w-4 h-4" />
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                disabled={!!activeCall}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-bg-hover disabled:opacity-40 transition-colors"
              >
                <WifiOff className="w-4 h-4" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Phone */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-w-0">
          <div className="w-full max-w-sm space-y-6">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Line Selector */}
            <div className="relative" ref={lineSelectorRef}>
              <button
                onClick={() => setShowLineSelector(!showLineSelector)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-bg-card hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">{selectedLineLabel}</p>
                    {selectedLine && (
                      <p className="text-xs text-text-muted font-mono">{formatPhone(selectedLine)}</p>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", showLineSelector && "rotate-180")} />
              </button>

              {showLineSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                  {lines.filter((l) => l.can_call).map((line) => (
                    <button
                      key={line.id}
                      onClick={() => {
                        setSelectedLine(line.phone_number);
                        setShowLineSelector(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors text-left",
                        selectedLine === line.phone_number && "bg-primary/5",
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {getLineLabel(line.phone_number)}
                        </p>
                        <p className="text-xs text-text-muted font-mono truncate">
                          {formatPhone(line.phone_number)}
                        </p>
                      </div>
                      {selectedLine === line.phone_number && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  {lines.filter((l) => l.can_call).length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-text-muted">
                      No callable lines found. Connect to RingCentral first.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Incoming Call */}
            {state === "ringing" && activeCall?.direction === "inbound" && (
              <div className="p-6 rounded-2xl bg-bg-card border border-border shadow-lg space-y-4">
                <div className="text-center space-y-2">
                  <PhoneIncoming className="w-12 h-12 text-blue-500 mx-auto animate-bounce" />
                  <p className="text-2xl font-bold text-text-primary">
                    {activeCall.callerIdName || formatDisplayPhone(activeCall.remoteNumber)}
                  </p>
                  {activeCall.callerIdName && (
                    <p className="text-base text-text-secondary font-mono">{formatDisplayPhone(activeCall.remoteNumber)}</p>
                  )}
                  {lookup.data?.found && lookup.data.customer && (
                    <p className="text-sm text-primary font-medium">
                      {lookup.data.customer.first_name} {lookup.data.customer.last_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={hangup} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-semibold text-lg active:bg-red-600 touch-manipulation transition-colors">
                    Decline
                  </button>
                  <button onClick={answer} className="flex-1 py-4 rounded-xl bg-emerald-500 text-white font-semibold text-lg active:bg-emerald-600 touch-manipulation transition-colors">
                    Answer
                  </button>
                </div>
                <button onClick={toVoicemail} className="w-full py-3 rounded-xl border border-border text-text-secondary flex items-center justify-center gap-2 hover:bg-bg-hover touch-manipulation transition-colors">
                  <Voicemail className="w-5 h-5" /> Voicemail
                </button>
              </div>
            )}

            {/* Active Call */}
            {(state === "active" || state === "calling") && activeCall && (
              <div className="p-6 rounded-2xl bg-bg-card border border-border shadow-lg space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-xs text-text-muted flex items-center justify-center gap-1">
                    {activeCall.direction === "inbound" ? <PhoneIncoming className="w-3.5 h-3.5" /> : <PhoneOutgoing className="w-3.5 h-3.5" />}
                    {activeCall.direction === "inbound" ? "Inbound" : "Outbound"}
                  </p>
                  <p className="text-2xl font-bold text-text-primary font-mono">
                    {formatDisplayPhone(activeCall.remoteNumber)}
                  </p>
                  {lookup.data?.found && lookup.data.customer && (
                    <p className="text-sm text-primary font-medium">
                      {lookup.data.customer.first_name} {lookup.data.customer.last_name}
                    </p>
                  )}
                  <p className="text-lg font-mono text-text-secondary">{formatDuration(callDuration)}</p>
                </div>

                {/* Call controls */}
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={toggleMute}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium touch-manipulation transition-colors",
                      activeCall.muted ? "bg-red-100 dark:bg-red-950/40 text-red-600" : "bg-bg-hover text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {activeCall.muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    {activeCall.muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={toggleHold}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium touch-manipulation transition-colors",
                      activeCall.held ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600" : "bg-bg-hover text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {activeCall.held ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                    {activeCall.held ? "Resume" : "Hold"}
                  </button>
                  <button
                    onClick={() => { setShowDtmf(!showDtmf); setShowTransfer(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium touch-manipulation transition-colors",
                      showDtmf ? "bg-primary/10 text-primary" : "bg-bg-hover text-text-secondary hover:text-text-primary",
                    )}
                  >
                    <Hash className="w-6 h-6" />
                    Keypad
                  </button>
                  <button
                    onClick={() => { setShowTransfer(!showTransfer); setShowDtmf(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium touch-manipulation transition-colors",
                      showTransfer ? "bg-primary/10 text-primary" : "bg-bg-hover text-text-secondary hover:text-text-primary",
                    )}
                  >
                    <ArrowRightLeft className="w-6 h-6" />
                    Transfer
                  </button>
                </div>

                {/* DTMF pad during call */}
                {showDtmf && (
                  <div className="grid grid-cols-3 gap-2">
                    {DTMF_KEYS.map(({ key }) => (
                      <button
                        key={key}
                        onClick={() => sendDtmf(key)}
                        className="py-4 rounded-xl bg-bg-hover text-text-primary text-xl font-medium active:bg-bg-tertiary touch-manipulation"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                )}

                {/* Transfer input */}
                {showTransfer && (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Transfer to..."
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={handleTransfer} className="px-4 py-3 rounded-xl bg-primary text-white font-medium">
                      <PhoneForwarded className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Hangup */}
                <button
                  onClick={hangup}
                  className="w-full py-4 rounded-xl bg-red-500 text-white font-semibold text-lg flex items-center justify-center gap-2 active:bg-red-600 touch-manipulation transition-colors"
                >
                  <PhoneOff className="w-6 h-6" />
                  End Call
                </button>
              </div>
            )}

            {/* Dialer — idle or registered, no active call */}
            {!activeCall && (state === "idle" || state === "registered" || state === "error") && (
              <>
                {/* Number display */}
                <div className="text-center">
                  <div className="h-14 flex items-center justify-center">
                    <span className={cn(
                      "font-mono tracking-wider transition-all",
                      dialInput ? "text-3xl font-bold text-text-primary" : "text-lg text-text-muted",
                    )}>
                      {dialInput ? formatDisplayPhone(dialInput) : "Enter a number"}
                    </span>
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3">
                  {DTMF_KEYS.map(({ key, sub }) => (
                    <button
                      key={key}
                      onClick={() => handleDtmfPress(key)}
                      className="h-16 rounded-2xl bg-bg-card border border-border hover:bg-bg-hover active:bg-bg-tertiary active:scale-95 transition-all touch-manipulation flex flex-col items-center justify-center"
                    >
                      <span className="text-2xl font-semibold text-text-primary leading-none">{key}</span>
                      {sub && <span className="text-[9px] font-medium text-text-muted tracking-widest mt-0.5">{sub}</span>}
                    </button>
                  ))}
                </div>

                {/* Action row */}
                <div className="flex items-center justify-center gap-6">
                  {/* Clear / Backspace */}
                  <button
                    onClick={handleBackspace}
                    disabled={!dialInput}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-0 transition-all touch-manipulation"
                  >
                    <Delete className="w-6 h-6" />
                  </button>

                  {/* Call button */}
                  <button
                    onClick={handleDial}
                    disabled={state !== "registered" || dialInput.replace(/\D/g, "").length < 7}
                    className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation"
                  >
                    <Phone className="w-7 h-7" />
                  </button>

                  {/* Spacer for symmetry */}
                  <div className="w-14 h-14" />
                </div>

                {state === "idle" && (
                  <p className="text-center text-sm text-text-muted">
                    Click <strong>Connect</strong> to start the web phone
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Middle: Screen Pop (when call active) — takes priority over recent calls */}
        {activeCall && (
          <div className="hidden md:flex flex-1 max-w-lg flex-col border-l border-border overflow-hidden">
            <ScreenPop activeCall={activeCall} callDuration={callDuration} />
          </div>
        )}

        {/* Right: Recent Calls */}
        <div className="hidden lg:flex w-80 flex-col border-l border-border bg-bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-muted" />
              Recent Calls
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {recentCalls.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-muted">
                No recent calls
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentCalls.map((c) => {
                  const isInbound = c.direction === "inbound";
                  const isMissed = !c.duration_seconds || c.duration_seconds === 0;
                  const number = isInbound ? c.from_number : c.to_number;
                  const time = c.start_time ? new Date(c.start_time) : null;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setDialInput(number.replace(/\D/g, ""));
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors text-left"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isMissed
                          ? "bg-red-50 dark:bg-red-500/10"
                          : isInbound
                            ? "bg-emerald-50 dark:bg-emerald-500/10"
                            : "bg-blue-50 dark:bg-blue-500/10",
                      )}>
                        {isMissed ? (
                          <PhoneOff className="w-3.5 h-3.5 text-red-500" />
                        ) : isInbound ? (
                          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary font-mono truncate">
                          {formatPhone(number)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {isMissed ? "Missed" : isInbound ? "Inbound" : "Outbound"}
                          {c.duration_seconds ? ` - ${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-text-muted flex-shrink-0">
                        {time ? time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
