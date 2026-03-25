import { useState, useEffect } from "react";
import { useWebPhone } from "./useWebPhone";
import { useTwilioPhone } from "./useTwilioPhone";

type PhoneProvider = "ringcentral" | "twilio";

export function usePhoneProvider(): PhoneProvider {
  const [provider, setProvider] = useState<PhoneProvider>(() => {
    const stored = localStorage.getItem("phone_provider");
    // Default to RingCentral (ICE server fix deployed 2026-03-13)
    return (stored as PhoneProvider) || "ringcentral";
  });

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("phone_provider");
      setProvider((stored as PhoneProvider) || "twilio");
    };
    window.addEventListener("phone_provider_changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("phone_provider_changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return provider;
}

export function usePhone() {
  const provider = usePhoneProvider();
  // Both hooks are inert in "idle" state — they only activate when connect() is called.
  // Only the selected provider's connect/call/etc. will be invoked by consumers.
  const rc = useWebPhone();
  const twilio = useTwilioPhone();
  return provider === "twilio" ? twilio : rc;
}
