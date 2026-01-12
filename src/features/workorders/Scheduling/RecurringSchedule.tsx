/**
 * RecurringSchedule Component
 * Setup and manage recurring schedules for work orders
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Checkbox } from "@/components/ui/Checkbox.tsx";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  isAfter,
} from "date-fns";
import type { RecurringPattern } from "@/api/types/workOrder.ts";

interface RecurringScheduleProps {
  value?: RecurringPattern;
  onChange: (pattern: RecurringPattern | null) => void;
  startDate?: string;
  className?: string;
  maxPreviewDates?: number;
}

type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function RecurringSchedule({
  value,
  onChange,
  startDate = format(new Date(), "yyyy-MM-dd"),
  className,
  maxPreviewDates = 10,
}: RecurringScheduleProps) {
  // Local state for form
  const [isEnabled, setIsEnabled] = useState(!!value);
  const [frequency, setFrequency] = useState<Frequency>(
    value?.frequency || "monthly",
  );
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    value?.daysOfWeek || [],
  );
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);
  const [endType, setEndType] = useState<"never" | "date" | "occurrences">(
    value?.endDate
      ? "date"
      : value?.endAfterOccurrences
        ? "occurrences"
        : "never",
  );
  const [endDate, setEndDate] = useState(value?.endDate || "");
  const [endAfterOccurrences, setEndAfterOccurrences] = useState(
    value?.endAfterOccurrences || 10,
  );

  // Build pattern from current state
  const currentPattern = useMemo((): RecurringPattern | null => {
    if (!isEnabled) return null;

    return {
      frequency,
      interval,
      daysOfWeek:
        frequency === "weekly" || frequency === "biweekly"
          ? daysOfWeek
          : undefined,
      dayOfMonth:
        frequency === "monthly" || frequency === "quarterly"
          ? dayOfMonth
          : undefined,
      endDate: endType === "date" ? endDate : undefined,
      endAfterOccurrences:
        endType === "occurrences" ? endAfterOccurrences : undefined,
    };
  }, [
    isEnabled,
    frequency,
    interval,
    daysOfWeek,
    dayOfMonth,
    endType,
    endDate,
    endAfterOccurrences,
  ]);

  // Calculate preview dates
  const previewDates = useMemo(() => {
    if (!currentPattern) return [];

    const dates: string[] = [];
    let currentDate = parseISO(startDate);
    const maxDate = value?.endDate
      ? parseISO(value.endDate)
      : addYears(new Date(), 2);
    const maxOccurrences = value?.endAfterOccurrences || maxPreviewDates;

    while (dates.length < Math.min(maxPreviewDates, maxOccurrences)) {
      if (isAfter(currentDate, maxDate)) break;

      // For weekly patterns, check day of week
      if (
        (frequency === "weekly" || frequency === "biweekly") &&
        daysOfWeek.length > 0
      ) {
        const dayOfWeek = currentDate.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          dates.push(format(currentDate, "yyyy-MM-dd"));
        }
        currentDate = addDays(currentDate, 1);

        // Skip to next week if past Saturday
        if (currentDate.getDay() === 0 && frequency === "weekly") {
          // Already at start of week
        } else if (currentDate.getDay() === 0 && frequency === "biweekly") {
          currentDate = addWeeks(currentDate, 1);
        }
      } else {
        dates.push(format(currentDate, "yyyy-MM-dd"));

        // Advance to next occurrence
        switch (frequency) {
          case "daily":
            currentDate = addDays(currentDate, interval);
            break;
          case "weekly":
            currentDate = addWeeks(currentDate, interval);
            break;
          case "biweekly":
            currentDate = addWeeks(currentDate, 2 * interval);
            break;
          case "monthly":
            currentDate = addMonths(currentDate, interval);
            break;
          case "quarterly":
            currentDate = addMonths(currentDate, 3 * interval);
            break;
          case "yearly":
            currentDate = addYears(currentDate, interval);
            break;
        }
      }
    }

    return dates;
  }, [
    currentPattern,
    startDate,
    frequency,
    daysOfWeek,
    interval,
    maxPreviewDates,
  ]);

  // Handle pattern update
  const handleApply = useCallback(() => {
    onChange(currentPattern);
  }, [onChange, currentPattern]);

  // Toggle enabled state
  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      setIsEnabled(checked);
      if (!checked) {
        onChange(null);
      }
    },
    [onChange],
  );

  // Toggle day of week
  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  // Get frequency description
  const getFrequencyDescription = () => {
    if (!isEnabled) return "Not recurring";

    let desc = "";
    switch (frequency) {
      case "daily":
        desc = interval === 1 ? "Every day" : `Every ${interval} days`;
        break;
      case "weekly":
        if (daysOfWeek.length > 0) {
          const dayNames = daysOfWeek
            .map((d) => DAYS_OF_WEEK[d].label)
            .join(", ");
          desc =
            interval === 1
              ? `Weekly on ${dayNames}`
              : `Every ${interval} weeks on ${dayNames}`;
        } else {
          desc = interval === 1 ? "Every week" : `Every ${interval} weeks`;
        }
        break;
      case "biweekly":
        desc = "Every 2 weeks";
        if (daysOfWeek.length > 0) {
          const dayNames = daysOfWeek
            .map((d) => DAYS_OF_WEEK[d].label)
            .join(", ");
          desc += ` on ${dayNames}`;
        }
        break;
      case "monthly":
        desc =
          interval === 1
            ? `Monthly on day ${dayOfMonth}`
            : `Every ${interval} months on day ${dayOfMonth}`;
        break;
      case "quarterly":
        desc =
          interval === 1
            ? `Quarterly on day ${dayOfMonth}`
            : `Every ${interval * 3} months on day ${dayOfMonth}`;
        break;
      case "yearly":
        desc = interval === 1 ? "Yearly" : `Every ${interval} years`;
        break;
    }

    if (endType === "date" && endDate) {
      desc += ` until ${format(parseISO(endDate), "MMM d, yyyy")}`;
    } else if (endType === "occurrences") {
      desc += ` for ${endAfterOccurrences} occurrences`;
    }

    return desc;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recurring Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              id="recurring-enabled"
              checked={isEnabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            <label
              htmlFor="recurring-enabled"
              className="text-sm text-text-secondary"
            >
              Enable recurring
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEnabled ? (
          <>
            {/* Frequency selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Frequency
              </label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Interval for some frequencies */}
            {(frequency === "daily" ||
              frequency === "monthly" ||
              frequency === "yearly") && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Repeat every
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={interval}
                    onChange={(e) =>
                      setInterval(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-text-secondary">
                    {frequency === "daily"
                      ? "day(s)"
                      : frequency === "monthly"
                        ? "month(s)"
                        : "year(s)"}
                  </span>
                </div>
              </div>
            )}

            {/* Days of week for weekly/biweekly */}
            {(frequency === "weekly" || frequency === "biweekly") && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Repeat on
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDayOfWeek(day.value)}
                      className={cn(
                        "w-10 h-10 rounded-full text-sm font-medium transition-colors",
                        daysOfWeek.includes(day.value)
                          ? "bg-primary text-white"
                          : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of month for monthly/quarterly */}
            {(frequency === "monthly" || frequency === "quarterly") && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Day of month
                </label>
                <Select
                  value={dayOfMonth.toString()}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                  <option value="29">29 (or last day)</option>
                  <option value="30">30 (or last day)</option>
                  <option value="31">31 (or last day)</option>
                </Select>
              </div>
            )}

            {/* End condition */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Ends
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={endType === "never"}
                    onChange={() => setEndType("never")}
                    className="text-primary"
                  />
                  <span className="text-sm text-text-primary">Never</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={endType === "date"}
                    onChange={() => setEndType("date")}
                    className="text-primary"
                  />
                  <span className="text-sm text-text-primary">On date</span>
                  {endType === "date" && (
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-40"
                    />
                  )}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={endType === "occurrences"}
                    onChange={() => setEndType("occurrences")}
                    className="text-primary"
                  />
                  <span className="text-sm text-text-primary">After</span>
                  {endType === "occurrences" && (
                    <>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={endAfterOccurrences}
                        onChange={(e) =>
                          setEndAfterOccurrences(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-text-secondary">
                        occurrences
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 bg-bg-muted rounded-lg">
              <div className="text-sm text-text-secondary">
                Schedule summary:
              </div>
              <div className="text-sm font-medium text-text-primary mt-1">
                {getFrequencyDescription()}
              </div>
            </div>

            {/* Preview dates */}
            {previewDates.length > 0 && (
              <div>
                <div className="text-sm font-medium text-text-secondary mb-2">
                  Next {previewDates.length} occurrences:
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewDates.map((date, idx) => (
                    <Badge key={date} variant="default">
                      {idx + 1}. {format(parseISO(date), "MMM d, yyyy")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Apply button */}
            <Button onClick={handleApply} className="w-full">
              Apply Recurring Schedule
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <div className="text-4xl mb-2">🔄</div>
            <div className="text-sm">
              Enable recurring to set up a schedule pattern
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact recurring badge display
 */
export function RecurringBadge({
  pattern,
  className,
}: {
  pattern: RecurringPattern | null;
  className?: string;
}) {
  if (!pattern) return null;

  const getLabel = () => {
    switch (pattern.frequency) {
      case "daily":
        return pattern.interval === 1 ? "Daily" : `Every ${pattern.interval}d`;
      case "weekly":
        return pattern.interval === 1 ? "Weekly" : `Every ${pattern.interval}w`;
      case "biweekly":
        return "Bi-weekly";
      case "monthly":
        return pattern.interval === 1
          ? "Monthly"
          : `Every ${pattern.interval}mo`;
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return pattern.interval === 1 ? "Yearly" : `Every ${pattern.interval}y`;
      default:
        return "Recurring";
    }
  };

  return (
    <Badge variant="info" className={cn("gap-1", className)}>
      <span>🔄</span>
      <span>{getLabel()}</span>
    </Badge>
  );
}
