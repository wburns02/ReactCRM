import { useEffect, useRef, useCallback } from "react";
import { clearAuthToken } from "@/api/client";

/**
 * Session timeout hook for security
 *
 * Automatically logs user out after a period of inactivity.
 * Resets timeout on user activity (mouse, keyboard, touch, scroll).
 *
 * SECURITY: Prevents session hijacking from unattended devices.
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes before timeout

interface UseSessionTimeoutOptions {
  onTimeout?: () => void;
  onWarning?: () => void;
  timeoutMs?: number;
  warningMs?: number;
  enabled?: boolean;
}

export function useSessionTimeout({
  onTimeout,
  onWarning,
  timeoutMs = IDLE_TIMEOUT_MS,
  warningMs = WARNING_BEFORE_TIMEOUT_MS,
  enabled = true,
}: UseSessionTimeoutOptions = {}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const handleTimeout = useCallback(() => {
    // Clear auth and redirect to login
    clearAuthToken();
    window.dispatchEvent(new CustomEvent("auth:timeout"));

    if (onTimeout) {
      onTimeout();
    } else {
      // Default behavior: redirect to login with message
      const currentPath = window.location.pathname;
      window.location.href = `/login?timeout=1&return=${encodeURIComponent(currentPath)}`;
    }
  }, [onTimeout]);

  const handleWarning = useCallback(() => {
    if (!hasWarnedRef.current && onWarning) {
      hasWarnedRef.current = true;
      onWarning();
    }
  }, [onWarning]);

  const resetTimeout = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Reset warning state
    hasWarnedRef.current = false;

    if (!enabled) return;

    // Set warning timer
    if (onWarning && warningMs < timeoutMs) {
      warningRef.current = setTimeout(handleWarning, timeoutMs - warningMs);
    }

    // Set timeout timer
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [enabled, timeoutMs, warningMs, handleTimeout, handleWarning, onWarning]);

  useEffect(() => {
    if (!enabled) return;

    // Activity events that reset the timeout
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "visibilitychange",
    ];

    const handleActivity = () => {
      // Only reset on actual user activity, not programmatic events
      if (document.visibilityState === "visible") {
        resetTimeout();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [enabled, resetTimeout]);

  return {
    resetTimeout,
  };
}
