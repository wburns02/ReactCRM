import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { EmailComposeModal } from "@/features/communications/components/EmailComposeModal";

interface ComposeParams {
  to: string;
  subject?: string;
  body?: string;
  customerId?: string;
  customerName?: string;
}

interface EmailComposeContextValue {
  openEmailCompose: (params: ComposeParams) => void;
}

const EmailComposeContext = createContext<EmailComposeContextValue | null>(null);

export function EmailComposeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<ComposeParams>({ to: "" });
  const [composeKey, setComposeKey] = useState(0);

  const openEmailCompose = useCallback((p: ComposeParams) => {
    setParams(p);
    setComposeKey((k) => k + 1); // Force remount so defaultEmail applies
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <EmailComposeContext.Provider value={{ openEmailCompose }}>
      {children}
      <EmailComposeModal
        key={composeKey}
        open={open}
        onClose={handleClose}
        defaultEmail={params.to}
        customerId={params.customerId}
        customerName={params.customerName}
      />
    </EmailComposeContext.Provider>
  );
}

export function useEmailCompose(): EmailComposeContextValue {
  const ctx = useContext(EmailComposeContext);
  if (!ctx) {
    throw new Error("useEmailCompose must be used within EmailComposeProvider");
  }
  return ctx;
}
