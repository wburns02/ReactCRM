import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * Input component matching MAC Septic design system
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-bg-card px-3 py-2 text-sm",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
