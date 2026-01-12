import {
  useState,
  useRef,
  useEffect,
  useId,
  type ReactNode,
  type ReactElement,
  cloneElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Tooltip position types
 */
type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "start" | "center" | "end";

interface TooltipProps {
  /** The element that triggers the tooltip */
  children: ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    "aria-describedby"?: string;
  }>;
  /** Tooltip content */
  content: ReactNode;
  /** Side to show tooltip */
  side?: TooltipSide;
  /** Alignment on the side */
  align?: TooltipAlign;
  /** Delay before showing (ms) */
  delayShow?: number;
  /** Delay before hiding (ms) */
  delayHide?: number;
  /** Additional class for tooltip container */
  className?: string;
  /** Disable the tooltip */
  disabled?: boolean;
}

/**
 * Tooltip component
 *
 * Accessible tooltip that follows WAI-ARIA tooltip pattern.
 * Shows on hover/focus with configurable delay.
 */
export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  delayShow = 200,
  delayHide = 0,
  className,
  disabled,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const tooltipId = useId();

  // Calculate position
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    // Calculate based on side
    switch (side) {
      case "top":
        top = trigger.top - tooltip.height - gap;
        left = trigger.left + trigger.width / 2;
        break;
      case "bottom":
        top = trigger.bottom + gap;
        left = trigger.left + trigger.width / 2;
        break;
      case "left":
        top = trigger.top + trigger.height / 2;
        left = trigger.left - tooltip.width - gap;
        break;
      case "right":
        top = trigger.top + trigger.height / 2;
        left = trigger.right + gap;
        break;
    }

    // Adjust for alignment
    if (side === "top" || side === "bottom") {
      switch (align) {
        case "start":
          left = trigger.left;
          break;
        case "end":
          left = trigger.right - tooltip.width;
          break;
        case "center":
          left = left - tooltip.width / 2;
          break;
      }
    } else {
      switch (align) {
        case "start":
          top = trigger.top;
          break;
        case "end":
          top = trigger.bottom - tooltip.height;
          break;
        case "center":
          top = top - tooltip.height / 2;
          break;
      }
    }

    // Keep tooltip in viewport
    const padding = 8;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltip.width - padding),
    );
    top = Math.max(
      padding,
      Math.min(top, window.innerHeight - tooltip.height - padding),
    );

    setPosition({ top, left });
  };

  const show = () => {
    if (disabled) return;
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayShow);
  };

  const hide = () => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delayHide);
  };

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      // Recalculate on scroll/resize
      window.addEventListener("scroll", calculatePosition, true);
      window.addEventListener("resize", calculatePosition);
      return () => {
        window.removeEventListener("scroll", calculatePosition, true);
        window.removeEventListener("resize", calculatePosition);
      };
    }
  }, [isVisible]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Clone child to add event handlers
  const trigger = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      hide();
    },
    "aria-describedby": isVisible ? tooltipId : undefined,
  });

  return (
    <>
      <span ref={triggerRef} className="inline-block">
        {trigger}
      </span>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className={cn(
              "fixed z-[100] max-w-xs rounded-md bg-bg-inverse px-3 py-1.5 text-sm text-text-inverse shadow-md",
              "animate-in fade-in-0 zoom-in-95 duration-100",
              className,
            )}
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                "absolute h-2 w-2 rotate-45 bg-bg-inverse",
                side === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2",
                side === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2",
                side === "left" && "right-[-4px] top-1/2 -translate-y-1/2",
                side === "right" && "left-[-4px] top-1/2 -translate-y-1/2",
              )}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Simple tooltip wrapper for icon buttons
 */
export function TooltipButton({
  children,
  tooltip,
  ...props
}: {
  children: ReactNode;
  tooltip: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip content={tooltip}>
      <button type="button" {...props}>
        {children}
      </button>
    </Tooltip>
  );
}
