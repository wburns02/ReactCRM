import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils.ts';
import { Button } from './Button.tsx';

/**
 * Focusable element selectors for focus trap
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Prevent closing when clicking overlay */
  disableOverlayClose?: boolean;
  /** Label for accessibility (required for screen readers) */
  ariaLabel?: string;
  /** ID of element that labels the dialog */
  ariaLabelledBy?: string;
  /** ID of element that describes the dialog */
  ariaDescribedBy?: string;
}

/**
 * Dialog/Modal component - accessible modal overlay
 *
 * Features:
 * - Uses React Portal for proper stacking context
 * - Traps focus within dialog (Tab cycles through focusable elements)
 * - Handles Escape key to close
 * - Returns focus to trigger element on close
 * - Prevents body scroll when open
 * - ARIA attributes for screen readers
 */
export function Dialog({
  open,
  onClose,
  children,
  disableOverlayClose,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element when opening
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab key focus trapping
      if (e.key === 'Tab' && contentRef.current) {
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTORS
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => el.offsetParent !== null
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first, go to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last, go to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onClose]
  );

  // Focus first element when dialog opens
  useEffect(() => {
    if (!open || !contentRef.current) return;

    // Focus first focusable element
    const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTORS
    );
    const focusable = Array.from(focusableElements).filter(
      (el) => el.offsetParent !== null
    );

    requestAnimationFrame(() => {
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (contentRef.current) {
        // Fallback: focus the content container itself
        contentRef.current.focus();
      }
    });

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      // Return focus on close
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = () => {
    if (!disableOverlayClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      {/* Content - tabIndex for fallback focus when no focusable elements */}
      <div
        ref={contentRef}
        className="relative z-10 max-h-[90vh] overflow-auto focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
  /** Width size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function DialogContent({ children, className, size = 'md' }: DialogContentProps) {
  return (
    <div
      className={cn(
        'bg-bg-card rounded-lg shadow-xl border border-border',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        {
          'w-[400px]': size === 'sm',
          'w-[500px]': size === 'md',
          'w-[600px]': size === 'lg',
          'w-[800px]': size === 'xl',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogHeader({ children, className, onClose }: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-border',
        className
      )}
    >
      <div className="font-semibold text-lg text-text-primary">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-bg-hover"
          aria-label="Close dialog"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}

export interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-hover/50',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Confirm dialog - simple yes/no confirmation
 */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="sm">
        <DialogHeader onClose={onClose}>{title}</DialogHeader>
        <DialogBody>
          <p className="text-text-secondary">{message}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
