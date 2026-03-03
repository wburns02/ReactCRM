import { useState, useEffect } from "react";
import { useWebPhone } from "./useWebPhone";
import { useTwilioPhone } from "./useTwilioPhone";

type PhoneProvider = "ringcentral" | "twilio";

export function usePhoneProvider(): PhoneProvider {
  const [provider, setProvider] = useState<PhoneProvider>(() => {
    const stored = localStorage.getItem("phone_provider");
    return (stored as PhoneProvider) || "ringcentral";
  });

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("phone_provider");
      setProvider((stored as PhoneProvider) || "ringcentral");
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
  const rc = useWebPhone();
  const twilio = useTwilioPhone();
  return provider === "twilio" ? twilio : rc;
}
