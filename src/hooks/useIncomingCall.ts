import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type { IncomingCallPayload, CallEndedPayload } from "@/api/types/incoming-call";

export function useIncomingCall() {
  const ws = useWebSocket({ autoConnect: true });
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!ws.lastMessage) return;
    const msg = ws.lastMessage as { type: string; data?: unknown };

    if (msg.type === "incoming_call") {
      const payload = msg.data as IncomingCallPayload;
      setIncomingCall(payload);
      setIsOpen(true);

      // Desktop notification
      if ("Notification" in window && Notification.permission === "granted") {
        const name = payload.customer?.name || "Unknown Caller";
        new Notification("Incoming Call", {
          body: `${name} - ${payload.caller_display}`,
          icon: "/favicon.ico",
          tag: "incoming-call",
        });
      }

      // Play ring sound (use system beep as fallback)
      try {
        if (!audioRef.current) {
          // Generate a simple ring tone using Web Audio API
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          gain.gain.value = 0.3;
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 1000);
        }
      } catch {
        // Audio not available
      }
    }

    if (msg.type === "call_ended") {
      // Auto-dismiss after a short delay
      setTimeout(() => {
        setIsOpen(false);
        setIncomingCall(null);
      }, 3000);
    }
  }, [ws.lastMessage]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    setIncomingCall(null);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return { incomingCall, isOpen, dismiss };
}
