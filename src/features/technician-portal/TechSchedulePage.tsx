import { useState, useMemo, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { useTechSchedule } from "@/api/hooks/useTechPortal.ts";
import {
  STATUS_COLORS,
  JOB_TYPE_LABELS,
  STATUS_LABELS,
} from "@/api/types/techPortal.ts";
import type { ScheduleJob } from "@/api/types/techPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";

// ── Constants ───────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const JOB_TYPE_ICONS: Record<string, string> = {
  pumping: "\uD83D\uDCA7",
  repair: "\uD83D\uDD27",
  inspection: "\uD83D\uDD0D",
  installation: "\u2692\uFE0F",
  maintenance: "\u2699\uFE0F",
  emergency: "\uD83D\uDEA8",
  grease_trap: "\uD83E\uDEE7",
  other: "\uD83D\uDCC4",
};

const STATUS_BG_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 border-l-blue-500 dark:bg-blue-950/30",
  yellow: "bg-yellow-50 border-l-yellow-500 dark:bg-yellow-950/30",
  orange: "bg-orange-50 border-l-orange-500 dark:bg-orange-950/30",
  green: "bg-green-50 border-l-green-500 dark:bg-green-950/30",
  red: "bg-red-50 border-l-red-500 dark:bg-red-950/30",
  gray: "bg-gray-50 border-l-gray-400 dark:bg-gray-900/30",
};

const STATUS_BADGE_VARIANT: Record<
  string,
  "info" | "warning" | "success" | "danger" | "default"
> = {
  blue: "info",
  yellow: "warning",
  orange: "warning",
  green: "success",
  red: "danger",
  gray: "default",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function getWeekDates(referenceDate: Date): Date[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function formatTimeWindow(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start) return null;
  try {
    const s = start.includes("T") ? start : `2000-01-01T${start}`;
    const startFmt = format(parseISO(s), "h:mm a");
    if (!end) return startFmt;
    const e = end.includes("T") ? end : `2000-01-01T${end}`;
    const endFmt = format(parseISO(e), "h:mm a");
    return `${startFmt} - ${endFmt}`;
  } catch {
    return start;
  }
}

function buildMapsUrl(job: ScheduleJob): string | null {
  const parts = [job.service_address_line1, job.service_city, "TX"].filter(
    Boolean,
  );
  if (parts.length <= 1) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(parts.join(", "))}`;
}

// ── Week Navigation Header ──────────────────────────────────────────────

function WeekHeader({
  weekDates,
  onPrevWeek,
  onNextWeek,
  onToday,
  isCurrentWeek,
}: {
  weekDates: Date[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
}) {
  const startLabel = format(weekDates[0], "MMM d");
  const endLabel = format(weekDates[6], "MMM d, yyyy");

  return (
    <div className="sticky top-0 z-10 bg-bg-primary pb-3">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{"\uD83D\uDCC5"}</span>
        <h1 className="text-xl font-bold text-text-primary">My Schedule</h1>
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="flex items-center justify-center w-11 h-11 rounded-lg bg-bg-card border border-border text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {startLabel} &ndash; {endLabel}
          </p>
        </div>

        <button
          onClick={onNextWeek}
          aria-label="Next week"
          className="flex items-center justify-center w-11 h-11 rounded-lg bg-bg-card border border-border text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Today button (only shown when viewing a different week) */}
      {!isCurrentWeek && (
        <button
          onClick={onToday}
          className="mt-2 w-full h-11 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors"
        >
          Jump to Today
        </button>
      )}
    </div>
  );
}

// ── Job Card (compact, expandable) ──────────────────────────────────────

function ScheduleJobCard({
  job,
  isExpanded,
  onToggle,
}: {
  job: ScheduleJob;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = STATUS_COLORS[job.status ?? ""] ?? "gray";
  const bgClass = STATUS_BG_CLASSES[statusColor] ?? STATUS_BG_CLASSES.gray;
  const badgeVariant = STATUS_BADGE_VARIANT[statusColor] ?? "default";
  const statusLabel = STATUS_LABELS[job.status ?? ""] ?? job.status ?? "Unknown";
  const jobTypeLabel =
    JOB_TYPE_LABELS[job.job_type ?? ""] ?? job.job_type ?? "Job";
  const jobIcon = JOB_TYPE_ICONS[job.job_type ?? ""] ?? "\uD83D\uDCC4";
  const timeWindow = formatTimeWindow(
    job.time_window_start,
    job.time_window_end,
  );
  const mapsUrl = buildMapsUrl(job);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left border-l-4 rounded-lg p-3 transition-all ${bgClass} ${
        isExpanded ? "shadow-md" : "shadow-sm"
      }`}
      aria-expanded={isExpanded}
    >
      {/* Compact header: icon + type + status badge */}
      <div className="flex items-center justify-between gap-2 min-h-[28px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">{jobIcon}</span>
          <span className="font-semibold text-sm text-text-primary truncate">
            {jobTypeLabel}
          </span>
        </div>
        <Badge variant={badgeVariant} size="sm">
          {statusLabel}
        </Badge>
      </div>

      {/* Customer name + time (always visible) */}
      {(job.customer_name || timeWindow) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-text-secondary">
          {job.customer_name && (
            <span className="truncate font-medium">{job.customer_name}</span>
          )}
          {job.customer_name && timeWindow && (
            <span className="text-text-muted">{"\u00B7"}</span>
          )}
          {timeWindow && (
            <span className="flex-shrink-0 whitespace-nowrap">{timeWindow}</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div
          className="mt-3 pt-3 border-t border-border/50 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Address */}
          {job.service_address_line1 && (
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{"\uD83D\uDCCD"}</span>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 underline break-words"
                >
                  {job.service_address_line1}
                  {job.service_city ? `, ${job.service_city}` : ""}
                </a>
              ) : (
                <span className="text-sm text-text-secondary break-words">
                  {job.service_address_line1}
                  {job.service_city ? `, ${job.service_city}` : ""}
                </span>
              )}
            </div>
          )}

          {/* Time window (shown again with more detail if expanded) */}
          {timeWindow && (
            <div className="flex items-center gap-2">
              <span className="text-base flex-shrink-0">{"\uD83D\uDD50"}</span>
              <span className="text-sm text-text-secondary">{timeWindow}</span>
              {job.estimated_duration_hours != null && (
                <span className="text-xs text-text-muted">
                  ({job.estimated_duration_hours}h est.)
                </span>
              )}
            </div>
          )}

          {/* Priority */}
          {job.priority && job.priority !== "normal" && (
            <div className="flex items-center gap-2">
              <span className="text-base flex-shrink-0">
                {job.priority === "urgent" || job.priority === "emergency"
                  ? "\u26A0\uFE0F"
                  : job.priority === "high"
                    ? "\u2757"
                    : "\uD83D\uDFE2"}
              </span>
              <span className="text-sm font-medium text-text-secondary capitalize">
                {job.priority} priority
              </span>
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{"\uD83D\uDCDD"}</span>
              <p className="text-sm text-text-secondary leading-relaxed">
                {job.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ── Day Column ──────────────────────────────────────────────────────────

function DayColumn({
  date,
  jobs,
  expandedJobId,
  onToggleJob,
}: {
  date: Date;
  jobs: ScheduleJob[];
  expandedJobId: string | null;
  onToggleJob: (id: string) => void;
}) {
  const today = isToday(date);
  const dayName = DAY_LABELS[date.getDay()];
  const dayNum = format(date, "d");
  const isPast = date < new Date(new Date().toDateString()) && !today;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        today
          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
          : "border-border bg-bg-card"
      } ${isPast ? "opacity-75" : ""}`}
    >
      {/* Day header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 border-b ${
          today
            ? "border-primary/30 dark:border-primary/20"
            : "border-border"
        }`}
      >
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${
            today
              ? "bg-primary text-white"
              : "bg-bg-muted text-text-secondary"
          }`}
        >
          {dayNum}
        </div>
        <span
          className={`text-sm font-semibold ${
            today ? "text-primary dark:text-mac-light-blue" : "text-text-secondary"
          }`}
        >
          {dayName}
          {today && (
            <span className="ml-1.5 text-xs font-normal text-primary">
              Today
            </span>
          )}
        </span>
        {jobs.length > 0 && (
          <span
            className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
              today
                ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-mac-light-blue"
                : "bg-bg-muted text-text-muted"
            }`}
          >
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </span>
        )}
      </div>

      {/* Jobs list */}
      <div className="p-2 space-y-2 min-h-[60px]">
        {jobs.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-4">
            No jobs
          </p>
        ) : (
          jobs.map((job) => (
            <ScheduleJobCard
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => onToggleJob(job.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton variant="rounded" className="h-7 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-11 w-11" />
          <Skeleton variant="rounded" className="h-5 w-48 flex-1 max-w-[200px] mx-auto" />
          <Skeleton variant="rounded" className="h-11 w-11" />
        </div>
      </div>

      {/* Day columns skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Skeleton variant="circular" className="w-9 h-9" />
              <Skeleton variant="text" className="h-4 w-16" />
            </div>
            <div className="p-2 space-y-2">
              {i % 2 === 0 ? (
                <>
                  <Skeleton variant="rounded" className="h-16 w-full" />
                  {i === 0 && (
                    <Skeleton variant="rounded" className="h-16 w-full" />
                  )}
                </>
              ) : (
                <div className="py-4 flex justify-center">
                  <Skeleton variant="text" className="h-4 w-16" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error State ─────────────────────────────────────────────────────────

function ScheduleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-4xl mb-3">{"\u26A0\uFE0F"}</p>
          <p className="text-lg text-text-primary font-semibold mb-1">
            Couldn't load schedule
          </p>
          <p className="text-sm text-text-secondary mb-4">
            Check your connection and try again.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export function TechSchedulePage() {
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Compute week dates (Sun-Sat)
  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);

  // Format start/end for API call (YYYY-MM-DD)
  const startDate = format(weekDates[0], "yyyy-MM-dd");
  const endDate = format(weekDates[6], "yyyy-MM-dd");

  // Check if we're viewing the current week
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const viewingWeekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
    return isSameDay(currentWeekStart, viewingWeekStart);
  }, [referenceDate]);

  // Fetch jobs for the week
  const { data: jobs, isLoading, isError, refetch } = useTechSchedule(
    startDate,
    endDate,
  );

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>();

    // Initialize all days
    for (const date of weekDates) {
      map.set(format(date, "yyyy-MM-dd"), []);
    }

    // Assign jobs to their dates
    if (jobs) {
      for (const job of jobs) {
        if (!job.scheduled_date) continue;

        // Handle date string: could be "YYYY-MM-DD" or ISO datetime
        const dateKey = job.scheduled_date.slice(0, 10);
        const existing = map.get(dateKey);
        if (existing) {
          existing.push(job);
        }
      }
    }

    // Sort jobs within each day by time_window_start
    for (const [, dayJobs] of map) {
      dayJobs.sort((a, b) => {
        const aTime = a.time_window_start ?? "";
        const bTime = b.time_window_start ?? "";
        return aTime.localeCompare(bTime);
      });
    }

    return map;
  }, [jobs, weekDates]);

  // Count total jobs this week
  const totalJobs = useMemo(() => {
    let count = 0;
    for (const [, dayJobs] of jobsByDate) {
      count += dayJobs.length;
    }
    return count;
  }, [jobsByDate]);

  // Navigation handlers
  const handlePrevWeek = useCallback(() => {
    setReferenceDate((d) => subWeeks(d, 1));
    setExpandedJobId(null);
  }, []);

  const handleNextWeek = useCallback(() => {
    setReferenceDate((d) => addWeeks(d, 1));
    setExpandedJobId(null);
  }, []);

  const handleToday = useCallback(() => {
    setReferenceDate(new Date());
    setExpandedJobId(null);
  }, []);

  const handleToggleJob = useCallback((id: string) => {
    setExpandedJobId((prev) => (prev === id ? null : id));
  }, []);

  // Loading state
  if (isLoading) {
    return <ScheduleSkeleton />;
  }

  // Error state
  if (isError) {
    return <ScheduleError onRetry={() => refetch()} />;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      {/* Week navigation */}
      <WeekHeader
        weekDates={weekDates}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        isCurrentWeek={isCurrentWeek}
      />

      {/* Week summary */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-text-secondary">
          {totalJobs === 0
            ? "No jobs this week"
            : `${totalJobs} job${totalJobs !== 1 ? "s" : ""} this week`}
        </span>
      </div>

      {/* Day columns (vertical stack, mobile-first) */}
      <div className="space-y-3">
        {weekDates.map((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayJobs = jobsByDate.get(dateKey) ?? [];
          return (
            <DayColumn
              key={dateKey}
              date={date}
              jobs={dayJobs}
              expandedJobId={expandedJobId}
              onToggleJob={handleToggleJob}
            />
          );
        })}
      </div>

      {/* Color legend */}
      <Card className="mt-6">
        <CardContent className="py-3 px-4">
          <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
            Status Legend
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { key: "scheduled", color: "bg-blue-500", label: "Scheduled" },
              { key: "en_route", color: "bg-yellow-500", label: "En Route" },
              {
                key: "in_progress",
                color: "bg-orange-500",
                label: "In Progress",
              },
              { key: "completed", color: "bg-green-500", label: "Completed" },
              { key: "cancelled", color: "bg-red-500", label: "Cancelled" },
              { key: "draft", color: "bg-gray-400", label: "Draft" },
            ].map(({ key, color, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
