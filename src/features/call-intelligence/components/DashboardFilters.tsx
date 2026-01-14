/**
 * DashboardFilters - Filter bar for Call Intelligence Dashboard
 * Provides date range, agent, disposition, sentiment, quality, and escalation filters
 * Responsive: horizontal bar on desktop, collapsible drawer on mobile
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Checkbox } from "@/components/ui/Checkbox.tsx";
import { cn } from "@/lib/utils.ts";
import type {
  DashboardFilters as DashboardFiltersType,
  SentimentLevel,
  EscalationRisk,
} from "../types.ts";
import {
  Filter,
  X,
  Calendar,
  ChevronDown,
  Users,
  MessageSquare,
  Gauge,
  AlertTriangle,
  Check,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface DashboardFiltersProps {
  filters: DashboardFiltersType;
  agents: { id: string; name: string }[];
  dispositions: { id: string; name: string }[];
  onChange: (filters: DashboardFiltersType) => void;
  onClear: () => void;
}

type DatePreset = "today" | "7d" | "30d" | "custom";

// ============================================================================
// Constants
// ============================================================================

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "custom", label: "Custom" },
];

const SENTIMENT_OPTIONS: { value: SentimentLevel; label: string; color: string }[] = [
  { value: "positive", label: "Positive", color: "text-green-600" },
  { value: "neutral", label: "Neutral", color: "text-yellow-600" },
  { value: "negative", label: "Negative", color: "text-red-600" },
];

const ESCALATION_OPTIONS: { value: EscalationRisk; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-green-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-red-600" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the start date for a preset
 */
function getPresetDateRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: string;

  switch (preset) {
    case "today":
      start = end;
      break;
    case "7d":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split("T")[0];
      break;
    case "30d":
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      start = monthAgo.toISOString().split("T")[0];
      break;
    case "custom":
    default:
      start = end;
      break;
  }

  return { start, end };
}

/**
 * Detect current preset from date range
 */
function detectPreset(dateRange: { start: string; end: string }): DatePreset {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  if (dateRange.start === today && dateRange.end === today) {
    return "today";
  }
  if (dateRange.start === weekAgo.toISOString().split("T")[0] && dateRange.end === today) {
    return "7d";
  }
  if (dateRange.start === monthAgo.toISOString().split("T")[0] && dateRange.end === today) {
    return "30d";
  }
  return "custom";
}

// ============================================================================
// Multi-Select Dropdown Component
// ============================================================================

interface MultiSelectDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

function MultiSelectDropdown({
  label,
  icon,
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: trigger.bottom + 4,
      left: trigger.left,
      width: Math.max(trigger.width, 200),
    });
  }, [isOpen]);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const displayValue = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return options.find((o) => o.id === selected[0])?.name || selected[0];
    }
    return `${selected.length} selected`;
  }, [selected, options, placeholder]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border bg-bg-card text-sm",
          "hover:bg-bg-hover transition-colors min-w-[140px] justify-between",
          isOpen ? "border-primary ring-2 ring-primary/20" : "border-border",
          selected.length > 0 && "border-primary/50"
        )}
      >
        <span className="flex items-center gap-2 text-text-secondary">
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-text-primary truncate max-w-[100px]">
            {displayValue}
          </span>
          {selected.length > 0 && (
            <Badge variant="primary" size="sm">
              {selected.length}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 bg-bg-card border border-border rounded-md shadow-lg overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: 300,
            }}
          >
            {/* Header with Select All / Clear */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-muted">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Clear
              </button>
            </div>

            {/* Options */}
            <div className="overflow-y-auto max-h-[240px]">
              {options.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text-muted text-center">
                  No options available
                </div>
              ) : (
                options.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer w-full text-left",
                      "hover:bg-bg-hover transition-colors",
                      selected.includes(option.id) && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        selected.includes(option.id)
                          ? "bg-primary border-primary"
                          : "border-border"
                      )}
                    >
                      {selected.includes(option.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-text-primary">{option.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================================================
// Quality Range Slider Component
// ============================================================================

interface QualityRangeSliderProps {
  min: number;
  max: number;
  onChange: (range: { min: number; max: number }) => void;
}

function QualityRangeSlider({ min, max, onChange }: QualityRangeSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Sync local state with props
  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);
  }, [min, max]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
        onChange({ min: localMin, max: localMax });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, localMin, localMax, onChange]);

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: trigger.bottom + 4,
      left: trigger.left,
    });
  }, [isOpen]);

  const isFiltered = min !== 0 || max !== 100;
  const displayValue = isFiltered ? `${min}-${max}` : "0-100";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border bg-bg-card text-sm",
          "hover:bg-bg-hover transition-colors min-w-[120px] justify-between",
          isOpen ? "border-primary ring-2 ring-primary/20" : "border-border",
          isFiltered && "border-primary/50"
        )}
      >
        <span className="flex items-center gap-2 text-text-secondary">
          <Gauge className="h-4 w-4" />
          <span className="hidden sm:inline">Quality</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-text-primary">{displayValue}</span>
          {isFiltered && (
            <Badge variant="primary" size="sm">
              !
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 bg-bg-card border border-border rounded-md shadow-lg p-4 w-64"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <div className="space-y-4">
              <div className="text-sm font-medium text-text-primary">
                Quality Score Range
              </div>

              {/* Visual range indicator */}
              <div className="relative h-2 bg-bg-muted rounded-full">
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{
                    left: `${localMin}%`,
                    right: `${100 - localMax}%`,
                  }}
                />
              </div>

              {/* Min/Max inputs */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-text-muted mb-1 block">Min</label>
                  <Input
                    type="number"
                    min={0}
                    max={localMax}
                    value={localMin}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(Number(e.target.value), localMax));
                      setLocalMin(val);
                    }}
                    className="h-8"
                  />
                </div>
                <div className="flex-shrink-0 text-text-muted pt-5">-</div>
                <div className="flex-1">
                  <label className="text-xs text-text-muted mb-1 block">Max</label>
                  <Input
                    type="number"
                    min={localMin}
                    max={100}
                    value={localMax}
                    onChange={(e) => {
                      const val = Math.max(localMin, Math.min(Number(e.target.value), 100));
                      setLocalMax(val);
                    }}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Apply button */}
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange({ min: localMin, max: localMax });
                  setIsOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================================================
// Checkbox Filter Group Component
// ============================================================================

interface CheckboxFilterGroupProps<T extends string> {
  label: string;
  icon: React.ReactNode;
  options: { value: T; label: string; color?: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

function CheckboxFilterGroup<T extends string>({
  label,
  icon,
  options,
  selected,
  onChange,
}: CheckboxFilterGroupProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: trigger.bottom + 4,
      left: trigger.left,
    });
  }, [isOpen]);

  const toggleOption = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayValue = useMemo(() => {
    if (selected.length === 0) return "All";
    if (selected.length === options.length) return "All";
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} selected`;
  }, [selected, options]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border bg-bg-card text-sm",
          "hover:bg-bg-hover transition-colors min-w-[120px] justify-between",
          isOpen ? "border-primary ring-2 ring-primary/20" : "border-border",
          selected.length > 0 && selected.length < options.length && "border-primary/50"
        )}
      >
        <span className="flex items-center gap-2 text-text-secondary">
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-text-primary truncate max-w-[80px]">
            {displayValue}
          </span>
          {selected.length > 0 && selected.length < options.length && (
            <Badge variant="primary" size="sm">
              {selected.length}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 bg-bg-card border border-border rounded-md shadow-lg p-3 min-w-[160px]"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-bg-hover p-1 rounded"
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    size="sm"
                  />
                  <span className={cn("text-sm", option.color || "text-text-primary")}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================================================
// Mobile Filter Drawer Component
// ============================================================================

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  activeCount: number;
  onClear: () => void;
}

function MobileFilterDrawer({
  isOpen,
  onClose,
  children,
  activeCount,
  onClear,
}: MobileFilterDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-bg-card rounded-t-xl shadow-xl",
          "transform transition-transform duration-300 ease-out",
          "max-h-[80vh] overflow-hidden flex flex-col",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-text-secondary" />
            <span className="font-semibold text-text-primary">Filters</span>
            {activeCount > 0 && (
              <Badge variant="primary">{activeCount} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear All
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-bg-hover"
            >
              <X className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <Button className="w-full" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ============================================================================
// Main DashboardFilters Component
// ============================================================================

export function DashboardFilters({
  filters,
  agents,
  dispositions,
  onChange,
  onClear,
}: DashboardFiltersProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Detect current date preset
  const currentPreset = useMemo(() => detectPreset(filters.dateRange), [filters.dateRange]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentPreset !== "7d") count++; // Default is 7d
    if (filters.agents.length > 0) count++;
    if (filters.dispositions.length > 0) count++;
    if (filters.sentiment.length > 0 && filters.sentiment.length < 3) count++;
    if (filters.qualityRange.min > 0 || filters.qualityRange.max < 100) count++;
    if (filters.escalationRisk.length > 0 && filters.escalationRisk.length < 4) count++;
    return count;
  }, [filters, currentPreset]);

  // Handle date preset change
  const handlePresetChange = useCallback(
    (preset: DatePreset) => {
      if (preset === "custom") {
        setShowCustomDates(true);
      } else {
        setShowCustomDates(false);
        const newRange = getPresetDateRange(preset);
        onChange({ ...filters, dateRange: newRange });
      }
    },
    [filters, onChange]
  );

  // Handle custom date change
  const handleDateChange = useCallback(
    (field: "start" | "end", value: string) => {
      onChange({
        ...filters,
        dateRange: { ...filters.dateRange, [field]: value },
      });
    },
    [filters, onChange]
  );

  // Handle agent filter change
  const handleAgentsChange = useCallback(
    (selected: string[]) => {
      onChange({ ...filters, agents: selected });
    },
    [filters, onChange]
  );

  // Handle disposition filter change
  const handleDispositionsChange = useCallback(
    (selected: string[]) => {
      onChange({ ...filters, dispositions: selected });
    },
    [filters, onChange]
  );

  // Handle sentiment filter change
  const handleSentimentChange = useCallback(
    (selected: SentimentLevel[]) => {
      onChange({ ...filters, sentiment: selected });
    },
    [filters, onChange]
  );

  // Handle quality range change
  const handleQualityChange = useCallback(
    (range: { min: number; max: number }) => {
      onChange({ ...filters, qualityRange: range });
    },
    [filters, onChange]
  );

  // Handle escalation filter change
  const handleEscalationChange = useCallback(
    (selected: EscalationRisk[]) => {
      onChange({ ...filters, escalationRisk: selected });
    },
    [filters, onChange]
  );

  // Filter content (shared between desktop and mobile)
  const filterContent = (
    <>
      {/* Date Range Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary lg:hidden">
          <Calendar className="h-4 w-4" />
          <span>Date Range</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant={currentPreset === preset.id ? "primary" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Custom date pickers */}
        {(showCustomDates || currentPreset === "custom") && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-text-muted">to</span>
            <Input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Agent Filter */}
      <MultiSelectDropdown
        label="Agent"
        icon={<Users className="h-4 w-4" />}
        options={agents}
        selected={filters.agents}
        onChange={handleAgentsChange}
        placeholder="All Agents"
      />

      {/* Disposition Filter */}
      <MultiSelectDropdown
        label="Disposition"
        icon={<MessageSquare className="h-4 w-4" />}
        options={dispositions}
        selected={filters.dispositions}
        onChange={handleDispositionsChange}
        placeholder="All"
      />

      {/* Sentiment Filter */}
      <CheckboxFilterGroup
        label="Sentiment"
        icon={
          <span className="text-base" role="img" aria-label="Sentiment">
            😊
          </span>
        }
        options={SENTIMENT_OPTIONS}
        selected={filters.sentiment}
        onChange={handleSentimentChange}
      />

      {/* Quality Range Filter */}
      <QualityRangeSlider
        min={filters.qualityRange.min}
        max={filters.qualityRange.max}
        onChange={handleQualityChange}
      />

      {/* Escalation Risk Filter */}
      <CheckboxFilterGroup
        label="Escalation"
        icon={<AlertTriangle className="h-4 w-4" />}
        options={ESCALATION_OPTIONS}
        selected={filters.escalationRisk}
        onChange={handleEscalationChange}
      />
    </>
  );

  return (
    <>
      {/* Desktop Filter Bar */}
      <div className="hidden lg:flex items-center gap-3 p-3 bg-bg-card border border-border rounded-lg flex-wrap">
        {/* Date Range Presets */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary" />
          <div className="flex gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant={currentPreset === preset.id ? "primary" : "ghost"}
                size="sm"
                onClick={() => handlePresetChange(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {(showCustomDates || currentPreset === "custom") && (
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="h-8 text-sm w-32"
              />
              <span className="text-text-muted text-sm">to</span>
              <Input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="h-8 text-sm w-32"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Agent Filter */}
        <MultiSelectDropdown
          label="Agent"
          icon={<Users className="h-4 w-4" />}
          options={agents}
          selected={filters.agents}
          onChange={handleAgentsChange}
          placeholder="All Agents"
        />

        {/* Disposition Filter */}
        <MultiSelectDropdown
          label="Disposition"
          icon={<MessageSquare className="h-4 w-4" />}
          options={dispositions}
          selected={filters.dispositions}
          onChange={handleDispositionsChange}
          placeholder="All"
        />

        {/* Sentiment Filter */}
        <CheckboxFilterGroup
          label="Sentiment"
          icon={
            <span className="text-base" role="img" aria-label="Sentiment">
              😊
            </span>
          }
          options={SENTIMENT_OPTIONS}
          selected={filters.sentiment}
          onChange={handleSentimentChange}
        />

        {/* Quality Range Filter */}
        <QualityRangeSlider
          min={filters.qualityRange.min}
          max={filters.qualityRange.max}
          onChange={handleQualityChange}
        />

        {/* Escalation Risk Filter */}
        <CheckboxFilterGroup
          label="Escalation"
          icon={<AlertTriangle className="h-4 w-4" />}
          options={ESCALATION_OPTIONS}
          selected={filters.escalationRisk}
          onChange={handleEscalationChange}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active Filter Count & Clear Button */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="info">{activeFilterCount} filters active</Badge>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setIsMobileDrawerOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="primary">{activeFilterCount}</Badge>
          )}
        </Button>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeCount={activeFilterCount}
        onClear={onClear}
      >
        <div className="space-y-6">{filterContent}</div>
      </MobileFilterDrawer>
    </>
  );
}

export default DashboardFilters;
