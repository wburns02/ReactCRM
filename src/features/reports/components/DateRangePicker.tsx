import { useState } from "react";
import type { DateRange, TimePeriod } from "../types.ts";

/**
 * DateRangePicker - Select date range for reports
 */

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const [period, setPeriod] = useState<TimePeriod>("month");

  // Get date range for preset periods
  const getPresetDateRange = (preset: TimePeriod): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;

    switch (preset) {
      case "today":
        startDate = today;
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case "quarter":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return dateRange;
    }

    return {
      start_date: startDate.toISOString().split("T")[0],
      end_date: today.toISOString().split("T")[0],
    };
  };

  const handlePresetChange = (preset: TimePeriod) => {
    setPeriod(preset);
    if (preset !== "custom") {
      onChange(getPresetDateRange(preset));
    }
  };

  const handleCustomDateChange = (
    field: "start_date" | "end_date",
    value: string,
  ) => {
    onChange({
      ...dateRange,
      [field]: value,
    });
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {/* Preset periods */}
      <div className="flex gap-2">
        {(
          [
            "today",
            "week",
            "month",
            "quarter",
            "year",
            "custom",
          ] as TimePeriod[]
        ).map((p) => (
          <button
            key={p}
            onClick={() => handlePresetChange(p)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              period === p
                ? "bg-primary text-white"
                : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {period === "custom" && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) =>
              handleCustomDateChange("start_date", e.target.value)
            }
            className="px-3 py-2 text-sm border border-border rounded-md bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-text-secondary">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => handleCustomDateChange("end_date", e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
