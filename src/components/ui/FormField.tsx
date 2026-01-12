import {
  forwardRef,
  type InputHTMLAttributes,
  useId,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { Label } from "./Label";

/**
 * FormField - Accessible form field wrapper
 *
 * Automatically connects label, input, and error message with proper ARIA attributes.
 * Uses useId() for unique IDs, ensuring proper accessibility.
 */
interface FormFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  /** Field label */
  label: string;
  /** Error message */
  error?: string;
  /** Help text shown below input */
  hint?: string;
  /** Whether field is required */
  required?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
  /** Custom ID (optional, auto-generated if not provided) */
  id?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      wrapperClassName,
      id: customId,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    // Build aria-describedby from error and hint
    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        <Label htmlFor={id} required={required}>
          {label}
        </Label>

        <Input
          ref={ref}
          id={id}
          error={!!error}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          className={className}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

/**
 * FormTextarea - Accessible textarea with label and error
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label: string;
  /** Error message */
  error?: string;
  /** Help text shown below input */
  hint?: string;
  /** Whether field is required */
  required?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      hint,
      required,
      wrapperClassName,
      id: customId,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        <Label htmlFor={id} required={required}>
          {label}
        </Label>

        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border bg-bg-card px-3 py-2 text-sm",
            "placeholder:text-text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormTextarea.displayName = "FormTextarea";

/**
 * FormSelect - Accessible select with label and error
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label */
  label: string;
  /** Error message */
  error?: string;
  /** Help text shown below input */
  hint?: string;
  /** Whether field is required */
  required?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
  /** Options for the select */
  children: ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      hint,
      required,
      wrapperClassName,
      id: customId,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        <Label htmlFor={id} required={required}>
          {label}
        </Label>

        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          className={cn(
            "flex h-10 w-full rounded-md border bg-bg-card px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        >
          {children}
        </select>

        {error && (
          <p id={errorId} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormSelect.displayName = "FormSelect";

/**
 * FormCheckbox - Accessible checkbox with label and error
 */
interface FormCheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Field label */
  label: string;
  /** Description shown below checkbox */
  description?: string;
  /** Error message */
  error?: string;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      label,
      description,
      error,
      wrapperClassName,
      id: customId,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const descId = `${id}-desc`;

    const describedBy = [description ? descId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn("space-y-1", wrapperClassName)}>
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            className={cn(
              "h-4 w-4 rounded border-border text-primary",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger",
              className,
            )}
            {...props}
          />
          <div className="flex flex-col">
            <label
              htmlFor={id}
              className="text-sm font-medium text-text-primary cursor-pointer"
            >
              {label}
            </label>
            {description && (
              <p id={descId} className="text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-sm text-danger ml-7" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormCheckbox.displayName = "FormCheckbox";

/**
 * FormRadioGroup - Accessible radio group
 */
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  /** Group label */
  label: string;
  /** Radio options */
  options: RadioOption[];
  /** Current value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Name for radio inputs */
  name: string;
  /** Error message */
  error?: string;
  /** Help text */
  hint?: string;
  /** Required field */
  required?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
}

export function FormRadioGroup({
  label,
  options,
  value,
  onChange,
  name,
  error,
  hint,
  required,
  wrapperClassName,
  orientation = "vertical",
}: FormRadioGroupProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const hintId = `${groupId}-hint`;

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn("space-y-2", wrapperClassName)}
      role="radiogroup"
      aria-labelledby={`${groupId}-label`}
    >
      <div
        id={`${groupId}-label`}
        className="text-sm font-medium text-text-primary"
      >
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </div>

      <div
        className={cn(
          "flex gap-4",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
        aria-describedby={describedBy || undefined}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange?.(option.value)}
                disabled={option.disabled}
                className={cn(
                  "h-4 w-4 border-border text-primary",
                  "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  error && "border-danger",
                )}
                aria-invalid={!!error}
              />
              <div className="flex flex-col">
                <label
                  htmlFor={optionId}
                  className="text-sm text-text-primary cursor-pointer"
                >
                  {option.label}
                </label>
                {option.description && (
                  <span className="text-sm text-text-muted">
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
