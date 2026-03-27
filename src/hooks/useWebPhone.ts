import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/api/client.ts";

// Types matching ringcentral-web-phone SDK
interface SipInfo {
  authorizationId: string;
  domain: string;
  outboundProxy: string;
  outboundProxyBackup: string;
  username: string;
  password: string;
  stunServers: string[];
}

export type PhoneState = "idle" | "connecting" | "registered" | "ringing" | "calling" | "active" | "error";

export interface ActiveCall {
  direction: "inbound" | "outbound";
  remoteNumber: string;
  callerIdName?: string;
  callSid?: string;
  startTime: number;
  muted: boolean;
  held: boolean;
  recording: boolean;
  session: any; // CallSession from SDK
}

interface UseWebPhoneReturn {
  state: PhoneState;
  error: string | null;
  activeCall: ActiveCall | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  call: (number: string, fromNumber?: string) => Promise<void>;
  answer: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleHold: () => Promise<void>;
  sendDtmf: (tone: string) => void;
  transfer: (target: string) => Promise<void>;
  toVoicemail: () => Promise<void>;
}

export function useWebPhone(): UseWebPhoneReturn {
  const [state, setState] = useState<PhoneState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const webPhoneRef = useRef<any>(null);
  const callSessionRef = useRef<any>(null);
  // Ref to hold state — avoids recreating `call` callback on every state change
  const stateRef = useRef<PhoneState>(state);
  stateRef.current = state;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webPhoneRef.current && !webPhoneRef.current.disposed) {
        webPhoneRef.current.dispose().catch(() => {});
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setState("connecting");
      setError(null);

      // Request notification permission for incoming call alerts
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }

      // 1. Fetch SIP credentials from our backend
      const { data } = await apiClient.get("/ringcentral/sip-provision");
      const sipInfo: SipInfo = data.sipInfo;

      // 1b. Find the existing WebRTC device that has phone lines assigned
      // The SIP provision creates a NEW empty WebPhone device with its own authorizationId.
      // We override authorizationId with the existing device's ID so the SIP REGISTER
      // identifies as the device that actually has phone lines. RC routes calls to
      // devices based on their registration identity.
      try {
        const devResp = await apiClient.get("/ringcentral/extensions/~/device");
        const devices = devResp.data?.records || [];
        const deviceWithLines = devices.find((d: any) => d.phoneLines?.length > 0);
        if (deviceWithLines) {
          console.log("[WebPhone] Overriding authorizationId:", sipInfo.authorizationId, "->", deviceWithLines.id,
            "Lines:", deviceWithLines.phoneLines.map((l: any) => l.phoneInfo?.phoneNumber));
          sipInfo.authorizationId = deviceWithLines.id;
        }
      } catch (e) {
        console.warn("[WebPhone] Could not fetch devices:", e);
      }

      // 2. Dynamic import of WebPhone (heavy SDK, only load when needed)
      const WebPhoneModule = await import("ringcentral-web-phone");
      const WebPhone = WebPhoneModule.default;

      // 3. Create WebPhone instance
      const webPhone = new WebPhone({
        sipInfo,
        debug: false,
      });

      // 4. Listen for incoming calls
      webPhone.on("inboundCall", (session: any) => {
        callSessionRef.current = session;

        // Extract caller number from multiple possible sources
        // The SDK sometimes scrambles remoteNumber — try SIP headers first
        const fromHeader = session.request?.from?.uri?.user
          || session.remoteIdentity?.uri?.user
          || "";
        const paiHeader = session.request?.getHeader?.("P-Asserted-Identity") || "";
        const paiMatch = paiHeader.match?.(/sip:(\+?\d+)@/);
        const rawRemote = session.remoteNumber || "";

        // Prefer P-Asserted-Identity > From header > remoteNumber
        let callerNumber = paiMatch?.[1] || fromHeader || rawRemote || "Unknown";

        // Strip leading +1 for US numbers
        if (callerNumber.startsWith("+1") && callerNumber.length === 12) {
          callerNumber = callerNumber.slice(2);
        } else if (callerNumber.startsWith("1") && callerNumber.length === 11) {
          callerNumber = callerNumber.slice(1);
        }

        console.log("[WebPhone] Inbound call — remote:", rawRemote, "from:", fromHeader, "PAI:", paiHeader, "resolved:", callerNumber);

        // Desktop notification + auto-navigate to Web Phone
        const callerDisplay = callerNumber.length === 10
          ? `(${callerNumber.slice(0,3)}) ${callerNumber.slice(3,6)}-${callerNumber.slice(6)}`
          : callerNumber;
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Incoming Call", {
              body: `${session.rcApiCallInfo?.callerIdName || callerDisplay}`,
              icon: "/favicon.ico",
              tag: "webphone-incoming",
              requireInteraction: true,
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          }
          // Navigate to /web-phone if not already there
          if (!window.location.pathname.includes("/web-phone")) {
            window.location.href = "/web-phone";
          }
        } catch (e) {
          console.warn("[WebPhone] Notification error:", e);
        }

        setActiveCall({
          direction: "inbound",
          remoteNumber: callerNumber,
          callerIdName: session.rcApiCallInfo?.callerIdName,
          startTime: Date.now(),
          muted: false,
          held: false,
          recording: false,
          session,
        });
        setState("ringing");

        session.on("disposed", () => {
          callSessionRef.current = null;
          setActiveCall(null);
          setState("registered");
        });
      });

      // 5. Start SIP registration
      await webPhone.start();
      webPhoneRef.current = webPhone;
      setState("registered");
    } catch (err: any) {
      console.error("[WebPhone] Connection failed:", err);
      setError(err?.message || "Failed to connect softphone");
      setState("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (webPhoneRef.current && !webPhoneRef.current.disposed) {
      webPhoneRef.current.dispose().catch(() => {});
      webPhoneRef.current = null;
    }
    callSessionRef.current = null;
    setActiveCall(null);
    setState("idle");
  }, []);

  const call = useCallback(async (number: string, fromNumber?: string) => {
    if (!webPhoneRef.current || stateRef.current !== "registered") {
      setError("Phone not connected");
      return;
    }
    try {
      setState("calling");
      const callOpts = fromNumber ? { fromNumber } : undefined;
      const session = await webPhoneRef.current.call(number, callOpts);
      callSessionRef.current = session;
      setActiveCall({
        direction: "outbound",
        remoteNumber: number,
        startTime: Date.now(),
        muted: false,
        held: false,
        recording: false,
        session,
      });

      session.on("answered", () => setState("active"));
      session.on("disposed", () => {
        callSessionRef.current = null;
        setActiveCall(null);
        setState("registered");
      });
    } catch (err: any) {
      console.error("[WebPhone] Call failed:", err);
      setError(err?.message || "Call failed");
      setState("registered");
    }
  }, []);

  const answer = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session || session.direction !== "inbound") return;
    try {
      await session.answer();
      setState("active");
      setActiveCall((prev) => prev ? { ...prev } : null);
    } catch (err: any) {
      setError(err?.message || "Failed to answer");
    }
  }, []);

  const hangup = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;
    try {
      await session.hangup();
    } catch {
      // Session may already be disposed
    }
    callSessionRef.current = null;
    setActiveCall(null);
    setState("registered");
  }, []);

  const toggleMute = useCallback(() => {
    const session = callSessionRef.current;
    if (!session) return;
    if (activeCall?.muted) {
      session.unmute();
    } else {
      session.mute();
    }
    setActiveCall((prev) => prev ? { ...prev, muted: !prev.muted } : null);
  }, [activeCall?.muted]);

  const toggleHold = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;
    try {
      if (activeCall?.held) {
        await session.unhold();
      } else {
        await session.hold();
      }
      setActiveCall((prev) => prev ? { ...prev, held: !prev.held } : null);
    } catch (err: any) {
      setError(err?.message || "Hold failed");
    }
  }, [activeCall?.held]);

  const sendDtmf = useCallback((tone: string) => {
    callSessionRef.current?.sendDtmf(tone);
  }, []);

  const transfer = useCallback(async (target: string) => {
    const session = callSessionRef.current;
    if (!session) return;
    try {
      await session.transfer(target);
    } catch (err: any) {
      setError(err?.message || "Transfer failed");
    }
  }, []);

  const toVoicemail = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session || session.direction !== "inbound") return;
    try {
      await session.toVoicemail();
    } catch (err: any) {
      setError(err?.message || "Voicemail redirect failed");
    }
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
