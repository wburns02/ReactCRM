import { useState, useEffect, useCallback } from "react";
import { useSharedWebPhone } from "@/context/WebPhoneContext";
import { ScreenPop } from "./components/ScreenPop";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

/**
 * Global screen pop that renders at the AppLayout level.
 * Persists across page navigation — call stays active when moving between pages.
 * Shows during active calls AND after call ends until agent dismisses.
 */
export function GlobalScreenPop() {
  const { state, activeCall } = useSharedWebPhone();

  // Track the call that triggered the screen pop
  const [screenPopCall, setScreenPopCall] = useState(activeCall);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // When a new call starts, reset and show screen pop
  useEffect(() => {
    if (activeCall) {
      setScreenPopCall(activeCall);
      setCallEnded(false);
      setDismissed(false);
      setCollapsed(false);
    }
  }, [activeCall?.remoteNumber]);

  // Track call duration
  useEffect(() => {
    if (state !== "active" || !activeCall) return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state, activeCall]);

  // Detect call end
  useEffect(() => {
    if (!activeCall && screenPopCall && !callEnded) {
      setCallEnded(true);
    }
  }, [activeCall, screenPopCall, callEnded]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setScreenPopCall(null);
    setCallDuration(0);
    setCallEnded(false);
  }, []);

  // Nothing to show
  if (!screenPopCall || dismissed) return null;

  // Collapsed tab on the right edge
  if (collapsed) {
    return (
      <div className="fixed top-1/3 right-0 z-40">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 px-2 py-6 bg-primary text-white rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
          title="Show call panel"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-medium [writing-mode:vertical-lr] rotate-180">
            Call Panel
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-12 right-0 z-40 w-[340px] h-[calc(100vh-48px)] bg-bg-card border-l border-border shadow-xl overflow-y-auto">
      {/* Collapse / dismiss controls */}
      <div className="sticky top-0 z-10 bg-bg-card border-b border-border px-2 py-1.5 flex items-center justify-between">
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary"
          title="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
          {callEnded ? "Call Ended" : "Active Call"}
        </span>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScreenPop
        activeCall={screenPopCall}
        callDuration={callDuration}
        callEnded={callEnded}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
