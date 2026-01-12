/**
 * Radio Component
 * Accessible standalone radio buttons with proper ARIA support
 */
import {
  forwardRef,
  useId,
  createContext,
  useContext,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// ============================================
// Radio Group Context
// ============================================

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  return useContext(RadioGroupContext);
}

// ============================================
// Radio Component
// ============================================

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** Label for the radio */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error state */
  error?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      size: propSize,
      className,
      id: customId,
      name: propName,
      value,
      checked,
      onChange,
      disabled: propDisabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const descId = description ? `${id}-desc` : undefined;

    // Get context from RadioGroup if available
    const group = useRadioGroup();
    const name = propName || group?.name || "";
    const size = propSize || group?.size || "md";
    const disabled = propDisabled ?? group?.disabled;
    const isChecked = group ? group.value === value : checked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (group?.onChange && value !== undefined) {
        group.onChange(String(value));
      }
      onChange?.(e);
    };

    const sizeClasses = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    const labelSizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "rounded-full border transition-colors",
            "text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-border",
            sizeClasses[size],
            className,
          )}
          aria-describedby={descId}
          aria-invalid={error}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  "font-medium text-text-primary cursor-pointer select-none",
                  labelSizeClasses[size],
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                id={descId}
                className={cn(
                  "text-text-muted",
                  size === "sm" ? "text-xs" : "text-sm",
                )}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Radio.displayName = "Radio";

// ============================================
// RadioGroup Component
// ============================================

export interface RadioGroupProps {
  /** Group name (required for form submission) */
  name: string;
  /** Currently selected value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Group label */
  label?: string;
  /** Group description */
  description?: string;
  /** Error message */
  error?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Size for all radios in group */
  size?: "sm" | "md" | "lg";
  /** Disable all radios */
  disabled?: boolean;
  /** Children Radio components */
  children: React.ReactNode;
  /** Additional class */
  className?: string;
}

export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  label,
  description,
  error,
  orientation = "vertical",
  size = "md",
  disabled,
  children,
  className,
}: RadioGroupProps) {
  const groupId = useId();

  // For uncontrolled usage
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider
      value={{
        name,
        value: currentValue,
        onChange: handleChange,
        disabled,
        size,
      }}
    >
      <div
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={
          error
            ? `${groupId}-error`
            : description
              ? `${groupId}-desc`
              : undefined
        }
        className={cn("space-y-3", className)}
      >
        {label && (
          <div
            id={`${groupId}-label`}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </div>
        )}
        {description && !error && (
          <p id={`${groupId}-desc`} className="text-sm text-text-muted -mt-2">
            {description}
          </p>
        )}
        <div
          className={cn(
            "flex gap-4",
            orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
          )}
        >
          {children}
        </div>
        {error && (
          <p
            id={`${groupId}-error`}
            className="text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </RadioGroupContext.Provider>
  );
}

// Need React import for useState
import React from "react";
