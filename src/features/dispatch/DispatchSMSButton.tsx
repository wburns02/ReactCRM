import { useNotifyTech } from "@/api/hooks/useDispatch";
import { Send } from "lucide-react";

interface DispatchSMSButtonProps {
  workOrderId: string;
  technicianName?: string;
  className?: string;
}

/**
 * Reusable button to SMS the assigned technician about a work order.
 * Drop into work order detail page, schedule context menu, etc.
 */
export function DispatchSMSButton({ workOrderId, technicianName, className }: DispatchSMSButtonProps) {
  const notify = useNotifyTech();

  return (
    <button
      onClick={() => notify.mutate(workOrderId)}
      disabled={notify.isPending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors touch-manipulation disabled:opacity-50 ${className ?? ""}`}
    >
      <Send className="w-3.5 h-3.5" />
      {notify.isPending ? "Sending..." : `Notify ${technicianName || "Tech"}`}
    </button>
  );
}
