import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "link"
    | "destructive";
  size?: "sm" | "md" | "lg";
}

/**
 * Button component matching MAC Septic design system
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",

          // Variants
          {
            "bg-cta text-white hover:bg-cta-hover": variant === "primary",
            "bg-bg-card text-text-primary border border-border hover:bg-bg-hover":
              variant === "secondary" || variant === "outline",
            "bg-danger text-white hover:bg-danger/90":
              variant === "danger" || variant === "destructive",
            "bg-transparent text-text-primary hover:bg-bg-hover":
              variant === "ghost",
            "bg-transparent text-primary hover:underline": variant === "link",
          },

          // Sizes
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },

          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
