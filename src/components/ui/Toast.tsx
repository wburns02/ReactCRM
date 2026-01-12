import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Toast Types
 */
export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * Convenience function to create toasts
 */
export function toast(_options: Omit<Toast, "id">) {
  // This will be replaced by the actual implementation when the provider mounts
  console.warn("Toast called before ToastProvider mounted");
}

let toastFn: (options: Omit<Toast, "id">) => string = () => {
  console.warn("Toast called before ToastProvider mounted");
  return "";
};

export function showToast(options: Omit<Toast, "id">) {
  return toastFn(options);
}

/**
 * Toast Provider - wrap your app with this
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Register global toast function
  useEffect(() => {
    toastFn = addToast;
    return () => {
      toastFn = () => {
        console.warn("Toast called after ToastProvider unmounted");
        return "";
      };
    };
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast Container - renders toasts in a portal
 */
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body,
  );
}

/**
 * Individual Toast Item
 */
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const {
    id,
    title,
    description,
    variant = "default",
    duration = 5000,
    action,
  } = toast;

  // Auto-dismiss
  useEffect(() => {
    if (duration === 0) return; // Duration 0 = sticky

    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const variantStyles = {
    default: "bg-bg-card border-border text-text-primary",
    success: "bg-success/10 border-success text-success",
    error: "bg-danger/10 border-danger text-danger",
    warning: "bg-warning/10 border-warning text-warning",
    info: "bg-info/10 border-info text-info",
  };

  const iconPaths = {
    default: null,
    success: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    ),
    error: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
    info: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-[360px] rounded-lg border shadow-lg p-4",
        "animate-in slide-in-from-right-full duration-300",
        variantStyles[variant],
      )}
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {iconPaths[variant] && (
          <svg
            className="h-5 w-5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {iconPaths[variant]}
          </svg>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="mt-1 text-sm opacity-80">{description}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Convenience exports for common toast types
 */
export const toastSuccess = (title: string, description?: string) =>
  showToast({ title, description, variant: "success" });

export const toastError = (title: string, description?: string) =>
  showToast({ title, description, variant: "error" });

export const toastWarning = (title: string, description?: string) =>
  showToast({ title, description, variant: "warning" });

export const toastInfo = (title: string, description?: string) =>
  showToast({ title, description, variant: "info" });
