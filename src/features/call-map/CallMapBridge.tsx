import { useEffect } from "react";
import { useCallMapStore } from "./callMapStore";
import { useSharedWebPhone } from "@/context/WebPhoneContext";

/**
 * Bridges the WebPhone context to the CallMap store.
 * Must be rendered inside WebPhoneProvider (e.g. inside AppLayout).
 * When an active call exists, it extracts the CallSid and pushes it
 * into the callMapStore so the CallMapProvider can open a WS connection.
 */
export function CallMapBridge() {
  const { setActiveCallSid } = useCallMapStore();
  const { activeCall } = useSharedWebPhone();

  useEffect(() => {
    if (activeCall?.session) {
      // RingCentral Web Phone: session may expose call ID in various places
      const callSid =
        activeCall.session?.parameters?.CallSid ||
        activeCall.session?.callId ||
        activeCall.session?.id ||
        null;
      if (callSid) {
        setActiveCallSid(callSid);
      }
    } else {
      setActiveCallSid(null);
    }
  }, [activeCall, setActiveCallSid]);

  return null;
}
