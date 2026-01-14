/**
 * TechnicianAvailability Component
 * Capacity heatmap showing technician availability across days
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  parseISO,
  eachDayOfInterval,
} from "date-fns";
import { useTechnicianCapacity } from "./hooks/useScheduling.ts";

interface TechnicianAvailabilityProps {
  onCellClick?: (
    technicianId: string,
    technicianName: string,
    date: string,
  ) => void;
  daysToShow?: number;
  className?: string;
}

/**
 * Get color based on utilization percentage
 */
function getUtilizationColor(utilization: number): string {
  if (utilization === 0) return "bg-gray-100";
  if (utilization < 25) return "bg-green-100";
  if (utilization < 50) return "bg-green-300";
  if (utilization < 75) return "bg-yellow-300";
  if (utilization < 90) return "bg-orange-300";
  return "bg-red-400";
}

/**
 * Get text color for utilization
 */
function getUtilizationTextColor(utilization: number): string {
  if (utilization === 0) return "text-gray-500";
  if (utilization < 50) return "text-green-700";
  if (utilization < 75) return "text-yellow-700";
  return "text-red-700";
}

export function TechnicianAvailability({
  onCellClick,
  daysToShow = 14,
  className,
}: TechnicianAvailabilityProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return startOfWeek(today);
  });

  const endDate = useMemo(
    () => addDays(startDate, daysToShow - 1),
    [startDate, daysToShow],
  );

  const { data: capacityData, isLoading } = useTechnicianCapacity(
    format(startDate, "yyyy-MM-dd"),
    format(endDate, "yyyy-MM-dd"),
  );

  // Navigation handlers
  const navigatePrev = () => {
    setStartDate((prev) => subDays(prev, 7));
  };

  const navigateNext = () => {
    setStartDate((prev) => addDays(prev, 7));
  };

  const goToToday = () => {
    setStartDate(startOfWeek(new Date()));
  };

  // Generate date headers
  const dateHeaders = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate }).map(
      (date) => ({
        date: format(date, "yyyy-MM-dd"),
        dayName: format(date, "EEE"),
        dayNum: format(date, "d"),
        isToday:
          format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }),
    );
  }, [startDate, endDate]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-text-secondary mt-4">
            Loading availability data...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Technician Availability</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev}>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Date headers */}
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-bg-muted border-b border-r border-border p-3 text-left min-w-[150px]">
                  <span className="text-sm font-medium text-text-secondary">
                    Technician
                  </span>
                </th>
                {dateHeaders.map((header) => (
                  <th
                    key={header.date}
                    className={cn(
                      "border-b border-border p-2 text-center min-w-[60px]",
                      header.isWeekend && "bg-bg-muted/50",
                      header.isToday && "bg-primary/10",
                    )}
                  >
                    <div className="text-xs text-text-secondary">
                      {header.dayName}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        header.isToday
                          ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                          : "text-text-primary",
                      )}
                    >
                      {header.dayNum}
                    </div>
                  </th>
                ))}
                <th className="border-b border-border p-2 text-center min-w-[80px] bg-bg-muted">
                  <span className="text-xs font-medium text-text-secondary">
                    Avg
                  </span>
                </th>
              </tr>
            </thead>

            {/* Technician rows */}
            <tbody>
              {capacityData.length === 0 ? (
                <tr>
                  <td
                    colSpan={dateHeaders.length + 2}
                    className="text-center py-12 text-text-secondary"
                  >
                    No technicians found
                  </td>
                </tr>
              ) : (
                capacityData.map((techData) => (
                  <tr
                    key={techData.technician.id}
                    className="hover:bg-bg-hover/50"
                  >
                    {/* Technician name */}
                    <td className="sticky left-0 z-10 bg-bg-card border-b border-r border-border p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {techData.technicianName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {techData.technicianName}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {techData.totalJobs} jobs total
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {techData.days.map((day) => {
                      const header = dateHeaders.find(
                        (h) => h.date === day.date,
                      );
                      return (
                        <td
                          key={day.date}
                          className={cn(
                            "border-b border-border p-1 text-center cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:ring-inset",
                            header?.isWeekend && "bg-bg-muted/30",
                          )}
                          onClick={() =>
                            onCellClick?.(
                              techData.technician.id,
                              techData.technicianName,
                              day.date,
                            )
                          }
                          title={`${techData.technicianName} - ${format(parseISO(day.date), "MMM d")}: ${day.jobCount} jobs, ${day.utilization.toFixed(0)}% utilized`}
                        >
                          <div
                            className={cn(
                              "rounded p-1.5 min-h-[40px] flex flex-col items-center justify-center",
                              getUtilizationColor(day.utilization),
                            )}
                          >
                            {day.jobCount > 0 && (
                              <>
                                <span
                                  className={cn(
                                    "text-sm font-bold",
                                    getUtilizationTextColor(day.utilization),
                                  )}
                                >
                                  {day.jobCount}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px]",
                                    getUtilizationTextColor(day.utilization),
                                  )}
                                >
                                  {day.utilization.toFixed(0)}%
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Average column */}
                    <td className="border-b border-border p-2 text-center bg-bg-muted">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          getUtilizationTextColor(techData.averageUtilization),
                        )}
                      >
                        {techData.averageUtilization.toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="border-t border-border p-4 bg-bg-muted">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">
                Capacity:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: "Free", color: "bg-gray-100" },
                  { label: "<25%", color: "bg-green-100" },
                  { label: "<50%", color: "bg-green-300" },
                  { label: "<75%", color: "bg-yellow-300" },
                  { label: "<90%", color: "bg-orange-300" },
                  { label: "Full", color: "bg-red-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className={cn("w-4 h-4 rounded", item.color)} />
                    <span className="text-xs text-text-secondary">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-text-muted">
              Click a cell to view or schedule for that day
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
