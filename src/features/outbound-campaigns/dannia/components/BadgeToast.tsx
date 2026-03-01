import { useEffect } from "react";
import { showToast } from "@/components/ui/Toast";
import type { DanniaBadge } from "../gamification";

interface BadgeToastProps {
  badge: DanniaBadge;
  onDismiss: () => void;
}

/**
 * Fires a toast notification for a newly earned badge.
 * Auto-dismisses after 4 seconds.
 */
export function BadgeToast({ badge, onDismiss }: BadgeToastProps) {
  useEffect(() => {
    showToast({
      title: `${badge.icon} Badge Earned: ${badge.name}!`,
      description: badge.description,
      variant: "success",
      duration: 4000,
    });
    onDismiss();
  }, [badge, onDismiss]);

  return null;
}
