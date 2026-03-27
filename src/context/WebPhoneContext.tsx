import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/api/client";

// Types
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
  startTime: number;
  muted: boolean;
  held: boolean;
  recording: boolean;
  session: any;
}

interface WebPhoneContextType {
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

const WebPhoneContext = createContext<WebPhoneContextType | null>(null);

export function useSharedWebPhone(): WebPhoneContextType {
  const ctx = useContext(WebPhoneContext);
  if (!ctx) {
    throw new Error("useSharedWebPhone must be used within WebPhoneProvider");
  }
  return ctx;
}

export function WebPhoneProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PhoneState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const webPhoneRef = useRef<any>(null);
  const callSessionRef = useRef<any>(null);
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

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }

      const { data } = await apiClient.get("/ringcentral/sip-provision");
      const sipInfo: SipInfo = data.sipInfo;

      const WebPhoneModule = await import("ringcentral-web-phone");
      const WebPhone = WebPhoneModule.default;

      const webPhone = new WebPhone({ sipInfo, debug: false });

      webPhone.on("inboundCall", (session: any) => {
        callSessionRef.current = session;

        const fromHeader = session.request?.from?.uri?.user || session.remoteIdentity?.uri?.user || "";
        const paiHeader = session.request?.getHeader?.("P-Asserted-Identity") || "";
        const paiMatch = paiHeader.match?.(/sip:(\+?\d+)@/);
        const rawRemote = session.remoteNumber || "";
        let callerNumber = paiMatch?.[1] || fromHeader || rawRemote || "Unknown";

        if (callerNumber.startsWith("+1") && callerNumber.length === 12) {
          callerNumber = callerNumber.slice(2);
        } else if (callerNumber.startsWith("1") && callerNumber.length === 11) {
          callerNumber = callerNumber.slice(1);
        }

        console.log("[WebPhone] Inbound call:", callerNumber);

        // Desktop notification
        const callerDisplay = callerNumber.length === 10
          ? `(${callerNumber.slice(0, 3)}) ${callerNumber.slice(3, 6)}-${callerNumber.slice(6)}`
          : callerNumber;
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Incoming Call", {
              body: session.rcApiCallInfo?.callerIdName || callerDisplay,
              icon: "/favicon.ico",
              tag: "webphone-incoming",
              requireInteraction: true,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
          }
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
          muted: false, held: false, recording: false,
          session,
        });
        setState("ringing");

        session.on("disposed", () => {
          callSessionRef.current = null;
          setActiveCall(null);
          setState("registered");
        });
      });

      await webPhone.start();
      webPhoneRef.current = webPhone;
      setState("registered");
    } catch (err: any) {
      console.error("[WebPhone] Connection failed:", err);
      setError(err?.message || "Failed to connect");
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
      const session = await webPhoneRef.current.call(number, fromNumber || undefined);
      callSessionRef.current = session;
      setActiveCall({
        direction: "outbound", remoteNumber: number,
        startTime: Date.now(), muted: false, held: false, recording: false, session,
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
    if (!session) return;
    try {
      await session.answer();
      setState("active");
    } catch (err: any) {
      setError(err?.message || "Failed to answer");
    }
  }, []);

  const hangup = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;
    try { await session.hangup(); } catch {}
    callSessionRef.current = null;
    setActiveCall(null);
    setState("registered");
  }, []);

  const toggleMute = useCallback(() => {
    const session = callSessionRef.current;
    if (!session) return;
    if (activeCall?.muted) { session.unmute(); } else { session.mute(); }
    setActiveCall((prev) => prev ? { ...prev, muted: !prev.muted } : null);
  }, [activeCall]);

  const toggleHold = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;
    if (activeCall?.held) { await session.unhold(); } else { await session.hold(); }
    setActiveCall((prev) => prev ? { ...prev, held: !prev.held } : null);
  }, [activeCall]);

  const sendDtmf = useCallback((tone: string) => {
    callSessionRef.current?.sendDtmf(tone);
  }, []);

  const transfer = useCallback(async (target: string) => {
    const session = callSessionRef.current;
    if (session) await session.transfer(target);
  }, []);

  const toVoicemail = useCallback(async () => {
    const session = callSessionRef.current;
    if (session) await session.toVoicemail();
  }, []);

  return (
    <WebPhoneContext.Provider value={{
      state, error, activeCall,
      connect, disconnect, call, answer, hangup,
      toggleMute, toggleHold, sendDtmf, transfer, toVoicemail,
    }}>
      {children}
    </WebPhoneContext.Provider>
  );
}
