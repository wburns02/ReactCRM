import { useDanniaStore } from "../danniaStore";
import { MessageSquare } from "lucide-react";

interface SmsSequenceStatusProps {
  contactId: string;
}

export function SmsSequenceStatus({ contactId }: SmsSequenceStatusProps) {
  const steps = useDanniaStore((s) =>
    s.pendingSmsSteps.filter((st) => st.contactId === contactId),
  );

  if (steps.length === 0) return null;

  const pending = steps.filter((s) => s.status === "pending").length;
  const sent = steps.filter((s) => s.status === "sent").length;
  const failed = steps.filter((s) => s.status === "failed").length;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {pending > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          <MessageSquare className="w-3 h-3" />
          {pending} SMS queued
        </span>
      )}
      {sent > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          &#x2713; SMS sent
        </span>
      )}
      {failed > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
          &#x2717; SMS failed
        </span>
      )}
    </div>
  );
}
