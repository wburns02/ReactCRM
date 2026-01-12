import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/**
 * Textarea component matching MAC Septic design system
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border bg-bg-card px-3 py-2 text-sm",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-y",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
