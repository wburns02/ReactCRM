import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/api/client.ts";
import type { PhoneState, ActiveCall } from "./useWebPhone";

interface UseTwilioPhoneReturn {
  state: PhoneState;
  error: string | null;
  activeCall: ActiveCall | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  call: (number: string) => Promise<void>;
  answer: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleHold: () => Promise<void>;
  sendDtmf: (tone: string) => void;
  transfer: (target: string) => Promise<void>;
  toVoicemail: () => Promise<void>;
}

export function useTwilioPhone(): UseTwilioPhoneReturn {
  const [state, setState] = useState<PhoneState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const stateRef = useRef<PhoneState>(state);
  stateRef.current = state;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setState("connecting");
      setError(null);

      // 1. Fetch access token from backend
      const { data } = await apiClient.get("/twilio/token");
      if (!data.token) {
        throw new Error(data.error || "Failed to get Twilio token");
      }

      // 2. Dynamic import of Twilio Voice SDK (heavy, only load when needed)
      const { Device } = await import("@twilio/voice-sdk");

      // 3. Create Device instance
      const device = new Device(data.token, {
        codecPreferences: ["opus" as any, "pcmu" as any],
        logLevel: "warn" as any,
      });

      // 4. Listen for incoming calls
      device.on("incoming", (call: any) => {
        callRef.current = call;
        setActiveCall({
          direction: "inbound",
          remoteNumber: call.parameters?.From || "Unknown",
          callerIdName: call.parameters?.FromCity,
          startTime: Date.now(),
          muted: false,
          held: false,
          recording: false,
          session: call,
        });
        setState("ringing");

        call.on("disconnect", () => {
          callRef.current = null;
          setActiveCall(null);
          setState("registered");
        });

        call.on("cancel", () => {
          callRef.current = null;
          setActiveCall(null);
          setState("registered");
        });
      });

      // 5. Auto-refresh token before expiry
      device.on("tokenWillExpire", async () => {
        try {
          const { data: refreshData } = await apiClient.get("/twilio/token");
          if (refreshData.token) {
            device.updateToken(refreshData.token);
          }
        } catch (err) {
          console.error("[TwilioPhone] Token refresh failed:", err);
        }
      });

      device.on("error", (err: any) => {
        console.error("[TwilioPhone] Device error:", err);
        setError(err?.message || "Twilio device error");
      });

      // 6. Register the device
      await device.register();
      deviceRef.current = device;
      setState("registered");
    } catch (err: any) {
      console.error("[TwilioPhone] Connection failed:", err);
      setError(err?.message || "Failed to connect Twilio");
      setState("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
      callRef.current = null;
    }
    if (deviceRef.current) {
      deviceRef.current.destroy();
      deviceRef.current = null;
    }
    setActiveCall(null);
    setState("idle");
  }, []);

  const call = useCallback(async (number: string) => {
    if (!deviceRef.current || stateRef.current !== "registered") {
      setError("Phone not connected");
      return;
    }
    try {
      setState("calling");

      // Ensure E.164 format
      const to = number.startsWith("+") ? number : `+1${number.replace(/\D/g, "")}`;
      const twilioCall = await deviceRef.current.connect({
        params: { To: to },
      });
      callRef.current = twilioCall;

      setActiveCall({
        direction: "outbound",
        remoteNumber: number,
        startTime: Date.now(),
        muted: false,
        held: false,
        recording: false,
        session: twilioCall,
      });

      twilioCall.on("accept", () => setState("active"));

      twilioCall.on("disconnect", () => {
        callRef.current = null;
        setActiveCall(null);
        setState("registered");
      });

      twilioCall.on("cancel", () => {
        callRef.current = null;
        setActiveCall(null);
        setState("registered");
      });

      twilioCall.on("error", (err: any) => {
        console.error("[TwilioPhone] Call error:", err);
        setError(err?.message || "Call error");
        callRef.current = null;
        setActiveCall(null);
        setState("registered");
      });
    } catch (err: any) {
      console.error("[TwilioPhone] Call failed:", err);
      setError(err?.message || "Call failed");
      setState("registered");
    }
  }, []);

  const answer = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    try {
      c.accept();
      setState("active");
    } catch (err: any) {
      setError(err?.message || "Failed to answer");
    }
  }, []);

  const hangup = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    try {
      c.disconnect();
    } catch {
      // Call may already be disconnected
    }
    callRef.current = null;
    setActiveCall(null);
    setState("registered");
  }, []);

  const toggleMute = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    const newMuted = !c.isMuted();
    c.mute(newMuted);
    setActiveCall((prev) => prev ? { ...prev, muted: newMuted } : null);
  }, []);

  const toggleHold = useCallback(async () => {
    // Twilio Voice SDK v1 has no native hold — use mute as proxy
    const c = callRef.current;
    if (!c) return;
    const newHeld = !activeCall?.held;
    c.mute(newHeld);
    setActiveCall((prev) => prev ? { ...prev, held: newHeld, muted: newHeld } : null);
  }, [activeCall?.held]);

  const sendDtmf = useCallback((tone: string) => {
    callRef.current?.sendDigits(tone);
  }, []);

  const transfer = useCallback(async (_target: string) => {
    console.warn("[TwilioPhone] Transfer not available in browser SDK v1");
    setError("Transfer not available with Twilio browser calling");
  }, []);

  const toVoicemail = useCallback(async () => {
    console.warn("[TwilioPhone] Voicemail drop not available in Twilio mode");
    setError("Voicemail drop not available with Twilio");
  }, []);

  return {
    state,
    error,
    activeCall,
    connect,
    disconnect,
    call,
    answer,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf,
    transfer,
    toVoicemail,
  };
}
