import {
  createContext,
  useContext,
  useState,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs Context
 */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  orientation: "horizontal" | "vertical";
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs");
  }
  return context;
}

/**
 * Tabs Root
 */
interface TabsProps {
  children: ReactNode;
  /** The controlled value of the active tab */
  value?: string;
  /** The default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Orientation for keyboard navigation */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Tabs({
  children,
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? internalValue;

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider
      value={{ value, onValueChange: handleValueChange, orientation }}
    >
      <div
        className={cn(orientation === "vertical" && "flex gap-4", className)}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tab List - contains the tab triggers
 */
interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const { orientation } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    );
    if (!tabs || tabs.length === 0) return;

    const currentIndex = Array.from(tabs).findIndex(
      (tab) => tab === document.activeElement,
    );
    let nextIndex = currentIndex;

    const isHorizontal = orientation === "horizontal";
    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case nextKey:
        e.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      className={cn(
        "flex gap-1",
        orientation === "horizontal"
          ? "flex-row border-b border-border"
          : "flex-col border-r border-border pr-4",
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

/**
 * Tab Trigger - individual tab button
 */
interface TabTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({
  children,
  value,
  className,
  disabled,
}: TabTriggerProps) {
  const { value: activeValue, onValueChange, orientation } = useTabs();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        orientation === "horizontal"
          ? "-mb-px border-b-2"
          : "-mr-px border-r-2",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-text-muted hover:text-text-secondary",
        className,
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

/**
 * Tab Content - panel shown when tab is active
 */
interface TabContentProps {
  children: ReactNode;
  value: string;
  className?: string;
  /** Force render even when inactive (hidden) */
  forceMount?: boolean;
}

export function TabContent({
  children,
  value,
  className,
  forceMount,
}: TabContentProps) {
  const { value: activeValue } = useTabs();
  const isActive = activeValue === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      hidden={!isActive}
      className={cn(
        "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        !isActive && "hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
