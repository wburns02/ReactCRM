import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils.ts';
import { Button } from './Button.tsx';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Prevent closing when clicking overlay */
  disableOverlayClose?: boolean;
}

/**
 * Dialog/Modal component - accessible modal overlay
 *
 * Uses React Portal for proper stacking context
 * Traps focus and handles Escape key
 */
export function Dialog({ open, onClose, children, disableOverlayClose }: DialogProps) {
  if (!open) return null;

  const handleOverlayClick = () => {
    if (!disableOverlayClose) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      {/* Content */}
      <div className="relative z-10 max-h-[90vh] overflow-auto">
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
