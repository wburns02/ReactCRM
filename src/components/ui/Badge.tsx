import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "stage"
    | "primary"
    | "secondary"
    | "outline"
    | "destructive";
  /** For stage variant, pass the stage value */
  stage?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Badge component for status indicators
 */
export function Badge({
  className,
  variant = "default",
  stage,
  size,
  children,
  ...props
}: BadgeProps) {
  // Stage-specific colors
  const stageColors: Record<string, string> = {
    new_lead: "bg-stage-new-lead/10 text-stage-new-lead",
    contacted: "bg-stage-contacted/10 text-stage-contacted",
    qualified: "bg-stage-qualified/10 text-stage-qualified",
    quoted: "bg-stage-quoted/10 text-stage-quoted",
    negotiation: "bg-stage-negotiation/10 text-stage-negotiation",
    won: "bg-stage-won/10 text-stage-won",
    lost: "bg-stage-lost/10 text-stage-lost",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-bg-muted text-text-secondary": variant === "default",
          "bg-success-light text-success": variant === "success",
          "bg-warning-light text-warning": variant === "warning",
          "bg-danger-light text-danger":
            variant === "danger" || variant === "destructive",
          "bg-info-light text-info": variant === "info",
          "bg-primary/10 text-primary": variant === "primary",
          "bg-bg-muted text-text-primary": variant === "secondary",
          "bg-transparent border border-border text-text-secondary":
            variant === "outline",
        },
        // Sizes
        {
          "px-2 py-0.5 text-xs": size === "sm",
          "px-2.5 py-0.5 text-xs": size === "md" || !size,
          "px-3 py-1 text-sm": size === "lg",
        },
        variant === "stage" && stage && stageColors[stage],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
