import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Label component for form fields
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium text-text-primary leading-none",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      >
        {children}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    );
  },
);

Label.displayName = "Label";
