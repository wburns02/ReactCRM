/**
 * Checkbox Component
 * Accessible standalone checkbox with proper ARIA support
 */
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label for the checkbox */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error state */
  error?: boolean;
  /** Indeterminate state (for parent checkboxes) */
  indeterminate?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      indeterminate,
      size = 'md',
      className,
      id: customId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const descId = description ? `${id}-desc` : undefined;

    const sizeClasses = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const labelSizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <div className="flex items-start gap-3">
        <input
          ref={(element) => {
            // Handle both ref and indeterminate
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref) {
              ref.current = element;
            }
            if (element) {
              element.indeterminate = indeterminate ?? false;
            }
          }}
          id={id}
          type="checkbox"
          className={cn(
            'rounded border transition-colors',
            'text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger' : 'border-border',
            sizeClasses[size],
            className
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
                  'font-medium text-text-primary cursor-pointer select-none',
                  labelSizeClasses[size],
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                id={descId}
                className={cn('text-text-muted', size === 'sm' ? 'text-xs' : 'text-sm')}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/**
 * CheckboxGroup - Container for multiple checkboxes
 */
export interface CheckboxGroupProps {
  /** Group label */
  label?: string;
  /** Group description */
  description?: string;
  /** Error message */
  error?: string;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Children checkboxes */
  children: React.ReactNode;
  /** Additional class */
  className?: string;
}

export function CheckboxGroup({
  label,
  description,
  error,
  orientation = 'vertical',
  children,
  className,
}: CheckboxGroupProps) {
  const groupId = useId();

  return (
    <div
      role="group"
      aria-labelledby={label ? `${groupId}-label` : undefined}
      aria-describedby={error ? `${groupId}-error` : description ? `${groupId}-desc` : undefined}
      className={cn('space-y-3', className)}
    >
      {label && (
        <div id={`${groupId}-label`} className="text-sm font-medium text-text-primary">
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
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {children}
      </div>
      {error && (
        <p id={`${groupId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
