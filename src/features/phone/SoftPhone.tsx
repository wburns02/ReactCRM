import { useState, useEffect, useRef } from "react";
import { useWebPhone, type PhoneState } from "@/hooks/useWebPhone";
import { useCustomerLookup } from "@/api/hooks/useDispatch";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneForwarded,
  Mic, MicOff, Pause, Play, Hash, X, ChevronDown, ChevronUp,
  Voicemail, ArrowRightLeft, Wifi, WifiOff,
} from "lucide-react";

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

/**
 * Floating softphone widget — always visible when connected.
 * Handles inbound/outbound WebRTC calls via RingCentral.
 */
export function SoftPhone() {
  const {
    state, error, activeCall,
    connect, disconnect, call, answer, hangup,
    toggleMute, toggleHold, sendDtmf, transfer, toVoicemail,
  } = useWebPhone();

  const [dialInput, setDialInput] = useState("");
  const [showDtmf, setShowDtmf] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Customer lookup for incoming calls
  const lookup = useCustomerLookup(activeCall?.remoteNumber ?? "");

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

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleDial = () => {
    const digits = dialInput.replace(/\D/g, "");
    if (digits.length >= 7) {
      call(digits);
      setDialInput("");
    }
  };

  const handleDtmfPress = (tone: string) => {
    sendDtmf(tone);
  };

  const handleTransfer = () => {
    const digits = transferTarget.replace(/\D/g, "");
    if (digits.length >= 7) {
      transfer(digits);
      setShowTransfer(false);
      setTransferTarget("");
    }
  };

  const stateColor: Record<PhoneState, string> = {
    idle: "bg-gray-500",
    connecting: "bg-amber-500 animate-pulse",
    registered: "bg-green-500",
    ringing: "bg-blue-500 animate-pulse",
    calling: "bg-amber-500 animate-pulse",
    active: "bg-green-500",
    error: "bg-red-500",
  };

  const stateLabel: Record<PhoneState, string> = {
    idle: "Offline",
    connecting: "Connecting...",
    registered: "Ready",
    ringing: "Incoming Call",
    calling: "Dialing...",
    active: formatDuration(callDuration),
    error: "Error",
  };

  // Don't render if idle (not connected)
  if (state === "idle") {
    return (
      <button
        onClick={connect}
        className="fixed bottom-20 right-4 md:bottom-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 active:bg-primary/80 touch-manipulation transition-colors"
        title="Connect Softphone"
      >
        <Phone className="w-4 h-4" />
        <span className="text-sm font-medium hidden md:inline">Connect Phone</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-4 z-50 w-72 select-none">
      {/* Header bar — always visible */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${collapsed && !activeCall ? "rounded-b-xl" : ""} ${stateColor[state]} text-white cursor-pointer`}
        onClick={() => !activeCall && setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {state === "registered" ? <Wifi className="w-4 h-4" /> : state === "error" ? <WifiOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          <span className="text-sm font-medium">{stateLabel[state]}</span>
        </div>
        <div className="flex items-center gap-1">
          {!activeCall && (
            <button onClick={(e) => { e.stopPropagation(); disconnect(); }} className="p-1 hover:bg-white/20 rounded" title="Disconnect">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!activeCall && (collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
        </div>
      </div>

      {/* Collapsed = hide body when no active call */}
      {(collapsed && !activeCall) ? null : (
        <div className="bg-bg-card border border-t-0 border-border rounded-b-xl shadow-2xl overflow-hidden">
          {/* Error display */}
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Incoming call UI */}
          {state === "ringing" && activeCall?.direction === "inbound" && (
            <div className="p-4 space-y-3">
              <div className="text-center space-y-1">
                <PhoneIncoming className="w-8 h-8 text-blue-500 mx-auto animate-bounce" />
                <p className="text-lg font-bold text-text-primary">
                  {activeCall.callerIdName || formatPhone(activeCall.remoteNumber)}
                </p>
                {activeCall.callerIdName && (
                  <p className="text-sm text-text-secondary">{formatPhone(activeCall.remoteNumber)}</p>
                )}
                {lookup.data?.found && lookup.data.customer && (
                  <p className="text-xs text-primary font-medium">
                    {lookup.data.customer.first_name} {lookup.data.customer.last_name}
                    {lookup.data.customer.address_line1 && ` — ${lookup.data.customer.address_line1}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={hangup} className="flex-1 py-3 rounded-lg bg-red-500 text-white font-semibold active:bg-red-600 touch-manipulation">
                  Decline
                </button>
                <button onClick={answer} className="flex-1 py-3 rounded-lg bg-green-500 text-white font-semibold active:bg-green-600 touch-manipulation">
                  Answer
                </button>
              </div>
              <button onClick={toVoicemail} className="w-full py-2 rounded-lg border border-border text-text-secondary text-sm flex items-center justify-center gap-1.5 active:bg-bg-hover touch-manipulation">
                <Voicemail className="w-4 h-4" /> Send to Voicemail
              </button>
            </div>
          )}

          {/* Active call controls */}
          {(state === "active" || state === "calling") && activeCall && (
            <div className="p-3 space-y-3">
              {/* Call info */}
              <div className="text-center space-y-0.5">
                <p className="text-sm text-text-secondary flex items-center justify-center gap-1">
                  {activeCall.direction === "inbound" ? <PhoneIncoming className="w-3.5 h-3.5" /> : <PhoneOutgoing className="w-3.5 h-3.5" />}
                  {activeCall.direction === "inbound" ? "Inbound" : "Outbound"}
                </p>
                <p className="text-base font-semibold text-text-primary">{formatPhone(activeCall.remoteNumber)}</p>
                {lookup.data?.found && lookup.data.customer && (
                  <p className="text-xs text-primary">
                    {lookup.data.customer.first_name} {lookup.data.customer.last_name}
                  </p>
                )}
              </div>

              {/* Control buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={toggleMute}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium touch-manipulation transition-colors ${
                    activeCall.muted ? "bg-red-100 dark:bg-red-950/40 text-red-600" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {activeCall.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {activeCall.muted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={toggleHold}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium touch-manipulation transition-colors ${
                    activeCall.held ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {activeCall.held ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {activeCall.held ? "Resume" : "Hold"}
                </button>
                <button
                  onClick={() => setShowDtmf(!showDtmf)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium touch-manipulation transition-colors ${
                    showDtmf ? "bg-primary/10 text-primary" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Hash className="w-5 h-5" />
                  Keypad
                </button>
                <button
                  onClick={() => setShowTransfer(!showTransfer)}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary hover:text-text-primary touch-manipulation transition-colors"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  Transfer
                </button>
              </div>

              {/* DTMF keypad */}
              {showDtmf && (
                <div className="grid grid-cols-3 gap-1.5">
                  {DTMF_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleDtmfPress(key)}
                      className="py-3 rounded-lg bg-bg-hover text-text-primary text-lg font-medium active:bg-bg-tertiary touch-manipulation"
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
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary"
                  />
                  <button onClick={handleTransfer} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium">
                    <PhoneForwarded className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Hangup */}
              <button
                onClick={hangup}
                className="w-full py-3 rounded-lg bg-red-500 text-white font-semibold flex items-center justify-center gap-2 active:bg-red-600 touch-manipulation"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
            </div>
          )}

          {/* Dialer — when registered and no active call */}
          {state === "registered" && !activeCall && (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter number..."
                  value={formatPhone(dialInput)}
                  onChange={(e) => setDialInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleDial()}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleDial}
                  disabled={dialInput.replace(/\D/g, "").length < 7}
                  className="px-4 py-2.5 rounded-lg bg-green-500 text-white disabled:opacity-40 active:bg-green-600 touch-manipulation"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
