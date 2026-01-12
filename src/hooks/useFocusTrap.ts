import { useEffect, useRef, useCallback, type RefObject } from "react";

/**
 * List of focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
].join(",");

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Element to focus when trap activates. If not provided, focuses first focusable element */
  initialFocus?: RefObject<HTMLElement>;
  /** Element to focus when trap deactivates. If not provided, focuses element that was focused before trap activated */
  returnFocus?: RefObject<HTMLElement>;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
}

/**
 * Hook to trap focus within a container element
 *
 * Essential for accessibility in modals, dialogs, and dropdown menus.
 * Ensures keyboard users can't tab out of the container.
 */
export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions = {},
) {
  const { enabled = true, initialFocus, returnFocus, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    ).filter((el) => {
      // Filter out hidden elements
      return (
        el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden"
      );
    });
  }, []);

  /**
   * Handle tab key navigation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return;

      if (event.key === "Escape") {
        onEscape?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [enabled, getFocusableElements, onEscape],
  );

  /**
   * Focus first element or initial focus target when trap activates
   */
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable
    const elementToFocus = initialFocus?.current || getFocusableElements()[0];
    if (elementToFocus) {
      // Delay focus to ensure element is ready
      requestAnimationFrame(() => {
        elementToFocus.focus();
      });
    }

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Return focus when trap deactivates
      const returnElement =
        returnFocus?.current || previousActiveElement.current;
      if (returnElement && typeof returnElement.focus === "function") {
        requestAnimationFrame(() => {
          returnElement.focus();
        });
      }
    };
  }, [enabled, initialFocus, returnFocus, getFocusableElements, handleKeyDown]);

  /**
   * Handle clicks outside the container - ensure focus stays trapped
   */
  useEffect(() => {
    if (!enabled) return;

    const handleFocusOut = (event: FocusEvent) => {
      if (!containerRef.current) return;

      const relatedTarget = event.relatedTarget as HTMLElement;

      // If focus is leaving the container
      if (relatedTarget && !containerRef.current.contains(relatedTarget)) {
        event.preventDefault();
        // Return focus to first element
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    containerRef.current?.addEventListener("focusout", handleFocusOut);
    return () => {
      containerRef.current?.removeEventListener("focusout", handleFocusOut);
    };
  }, [enabled, getFocusableElements]);

  return containerRef;
}
