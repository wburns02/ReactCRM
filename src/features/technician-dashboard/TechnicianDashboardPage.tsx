import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTechnicianDashboard,
  useClockIn,
  useClockOut,
  useStartJob,
  useCompleteJob,
} from "@/api/hooks/useTechnicianDashboard.ts";
import type { TechDashboardJob } from "@/api/types/technicianDashboard.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { formatCurrency } from "@/lib/utils.ts";

// ─── Helpers ──────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatElapsedTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const start = new Date(isoString).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - start) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const STATUS_BADGE_VARIANT: Record<string, "info" | "warning" | "success" | "danger" | "default"> = {
  blue: "info",
  yellow: "warning",
  orange: "warning",
  green: "success",
  red: "danger",
  gray: "default",
};

const STATUS_BORDER_COLOR: Record<string, string> = {
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-500",
  orange: "border-l-orange-500",
  green: "border-l-green-500",
  red: "border-l-red-500",
  gray: "border-l-gray-400",
};

// ─── Welcome Banner + Clock ──────────────────────────────

function WelcomeBanner({
  firstName,
  totalJobs,
  isClockedIn,
  clockInTime,
  onClockIn,
  onClockOut,
  isClockLoading,
}: {
  firstName: string;
  totalJobs: number;
  isClockedIn: boolean;
  clockInTime: string | null | undefined;
  onClockIn: () => void;
  onClockOut: () => void;
  isClockLoading: boolean;
}) {
  return (
    <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0">
      <CardContent className="pt-6 pb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {firstName || "there"}!
          </h1>
          <p className="text-blue-100 text-lg mt-1">
            {formatTodayDate()}
            {totalJobs > 0 && ` · ${totalJobs} job${totalJobs !== 1 ? "s" : ""} today`}
          </p>
        </div>

        {isClockedIn && clockInTime && (
          <p className="text-blue-200 text-sm mb-3">
            Clocked in {formatElapsedTime(clockInTime)} ago
          </p>
        )}

        <Button
          onClick={isClockedIn ? onClockOut : onClockIn}
          disabled={isClockLoading}
          className={`w-full h-16 text-xl font-bold rounded-xl shadow-lg ${
            isClockedIn
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isClockLoading
            ? "..."
            : isClockedIn
              ? "CLOCK OUT"
              : "CLOCK IN"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Job Card ─────────────────────────────────────────────

function JobCard({
  job,
  onStartJob,
  onCompleteJob,
  isActionLoading,
}: {
  job: TechDashboardJob;
  onStartJob: (id: string) => void;
  onCompleteJob: (id: string) => void;
  isActionLoading: boolean;
}) {
  const isCompleted = job.status === "completed";
  const isCancelled = job.status === "cancelled";
  const canStart = job.status === "scheduled" || job.status === "en_route";
  const canComplete = job.status === "in_progress";
  const borderColor = STATUS_BORDER_COLOR[job.status_color] || "border-l-gray-400";
  const badgeVariant = STATUS_BADGE_VARIANT[job.status_color] || "default";

  // Build Google Maps link
  const mapsQuery = [job.address, job.city, "TX"].filter(Boolean).join(", ");
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`;

  return (
    <Card
      className={`border-l-4 ${borderColor} ${
        isCompleted ? "opacity-60" : ""
      } ${isCancelled ? "opacity-40" : ""}`}
    >
      <CardContent className="pt-4 pb-4">
        {/* Header: job type + status badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-base sm:text-lg font-bold text-text-primary min-w-0">
            {job.job_type_label}
            {" · "}
            {job.customer_name}
          </p>
          <Badge variant={badgeVariant} size="md" className="flex-shrink-0">
            {job.status_label}
          </Badge>
        </div>

        {/* Address — tappable for directions */}
        {job.address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-lg">📍</span>
            <span className="underline">{job.address}</span>
          </a>
        )}

        {/* Time window */}
        {job.time_window && (
          <p className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <span className="text-lg">🕐</span>
            {job.time_window}
            {job.estimated_duration_hours && (
              <span className="text-text-muted">
                ({job.estimated_duration_hours}h est.)
              </span>
            )}
          </p>
        )}

        {/* Notes */}
        {job.notes && (
          <p className="flex items-center gap-2 text-text-secondary text-sm mb-3 line-clamp-2">
            <span className="text-lg">📝</span>
            {job.notes}
          </p>
        )}

        {/* Action buttons */}
        {canStart && (
          <Button
            onClick={() => onStartJob(job.id)}
            disabled={isActionLoading}
            className="w-full h-14 text-lg font-bold rounded-xl mt-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isActionLoading ? "..." : "START JOB"}
          </Button>
        )}
        {canComplete && (
          <Button
            onClick={() => onCompleteJob(job.id)}
            disabled={isActionLoading}
            className="w-full h-14 text-lg font-bold rounded-xl mt-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isActionLoading ? "..." : "COMPLETE JOB"}
          </Button>
        )}
        {isCompleted && (
          <p className="text-center text-green-600 font-medium mt-2 text-lg">
            ✅ All Done
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Stats ─────────────────────────────────────────

function QuickStats({
  completedJobs,
  hoursWorked,
  remainingJobs,
}: {
  completedJobs: number;
  hoursWorked: number;
  remainingJobs: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Card>
        <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 text-center">
          <p className="text-2xl sm:text-4xl font-bold text-green-600">{completedJobs}</p>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Done</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 text-center">
          <p className="text-2xl sm:text-4xl font-bold text-blue-600">{hoursWorked}</p>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Hours</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 text-center">
          <p className={`text-2xl sm:text-4xl font-bold ${remainingJobs > 0 ? "text-orange-500" : "text-green-600"}`}>
            {remainingJobs}
          </p>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Left</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── My Pay ──────────────────────────────────────────────

function PayThisPeriod({
  periodLabel,
  nextPayday,
  commissionsEarned,
  jobsCompletedPeriod,
  backboardThreshold,
  onTrack,
}: {
  periodLabel: string | null | undefined;
  nextPayday: string | null | undefined;
  commissionsEarned: number;
  jobsCompletedPeriod: number;
  backboardThreshold: number;
  onTrack: boolean;
}) {
  const progressPct = backboardThreshold > 0
    ? Math.min(100, Math.round((commissionsEarned / backboardThreshold) * 100))
    : 0;

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-2xl">💰</span> My Pay
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-text-secondary">Earned so far</span>
            <span className="text-xl sm:text-3xl font-bold text-green-600">
              {formatCurrency(commissionsEarned)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">Jobs this period</span>
            <span className="text-lg font-semibold text-text-primary">{jobsCompletedPeriod}</span>
          </div>

          {nextPayday && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Next payday</span>
              <span className="text-lg font-semibold text-text-primary">{nextPayday}</span>
            </div>
          )}

          {/* Progress bar toward guarantee */}
          <div className="mt-4">
            <div className="w-full bg-bg-muted rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  onTrack ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {onTrack ? (
              <p className="text-sm text-green-600 font-medium mt-2">
                You're above the guarantee!
              </p>
            ) : (
              <p className="text-sm text-text-muted mt-2">
                {formatCurrency(commissionsEarned)} of {formatCurrency(backboardThreshold)} guarantee
              </p>
            )}
          </div>

          {periodLabel && (
            <p className="text-xs text-text-muted mt-2">Pay period: {periodLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── How I'm Doing ───────────────────────────────────────

function HowImDoing({
  jobsThisWeek,
  jobsLastWeek,
  avgDurationMinutes,
}: {
  jobsThisWeek: number;
  jobsLastWeek: number;
  avgDurationMinutes: number;
}) {
  const trend = jobsThisWeek - jobsLastWeek;
  const trendIcon = trend > 0 ? "↑" : trend < 0 ? "↓" : "—";
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-text-muted";

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-2xl">⭐</span> How I'm Doing
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">This week</span>
            <span className="text-lg font-semibold text-text-primary">
              {jobsThisWeek} jobs{" "}
              <span className={`${trendColor} ml-1`}>{trendIcon}</span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Last week</span>
            <span className="text-lg font-semibold text-text-muted">{jobsLastWeek} jobs</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Avg job time</span>
            <span className="text-lg font-semibold text-text-primary">
              {formatDuration(avgDurationMinutes)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto animate-pulse">
      <Skeleton className="h-44 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-52 rounded-xl" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export function TechnicianDashboardPage() {
  const { data, isLoading, refetch } = useTechnicianDashboard();
  const queryClient = useQueryClient();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const startJob = useStartJob();
  const completeJob = useCompleteJob();
  const [actionJobId, setActionJobId] = useState<string | null>(null);

  const invalidateAndRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["technician-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["employee"] });
    refetch();
  }, [queryClient, refetch]);

  const handleClockIn = useCallback(async () => {
    try {
      // Try to get GPS location
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS optional — proceed without it
      }
      await clockIn.mutateAsync({ latitude, longitude });
      toastSuccess("Clocked in!");
      invalidateAndRefetch();
    } catch {
      toastError("Couldn't clock in. Try again.");
    }
  }, [clockIn, invalidateAndRefetch]);

  const handleClockOut = useCallback(async () => {
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS optional
      }
      await clockOut.mutateAsync({ latitude, longitude });
      toastSuccess("Clocked out!");
      invalidateAndRefetch();
    } catch {
      toastError("Couldn't clock out. Try again.");
    }
  }, [clockOut, invalidateAndRefetch]);

  const handleStartJob = useCallback(
    async (jobId: string) => {
      setActionJobId(jobId);
      try {
        await startJob.mutateAsync({ jobId });
        toastSuccess("Job started!");
        invalidateAndRefetch();
      } catch {
        toastError("Couldn't start job. Try again.");
      } finally {
        setActionJobId(null);
      }
    },
    [startJob, invalidateAndRefetch],
  );

  const handleCompleteJob = useCallback(
    async (jobId: string) => {
      setActionJobId(jobId);
      try {
        await completeJob.mutateAsync({ jobId });
        toastSuccess("Job completed!");
        invalidateAndRefetch();
      } catch {
        toastError("Couldn't complete job. Try again.");
      } finally {
        setActionJobId(null);
      }
    },
    [completeJob, invalidateAndRefetch],
  );

  // Memoize sorted jobs
  const jobs = useMemo(() => data?.todays_jobs ?? [], [data]);

  if (isLoading) return <DashboardSkeleton />;

  const tech = data?.technician;
  const clock = data?.clock_status;
  const stats = data?.today_stats;
  const pay = data?.pay_this_period;
  const perf = data?.performance;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      {/* Section 1: Welcome + Clock */}
      <WelcomeBanner
        firstName={tech?.first_name || ""}
        totalJobs={stats?.total_jobs || 0}
        isClockedIn={clock?.is_clocked_in || false}
        clockInTime={clock?.clock_in_time}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        isClockLoading={clockIn.isPending || clockOut.isPending}
      />

      {/* Section 2: Today's Jobs */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          My Jobs Today
          {(stats?.remaining_jobs ?? 0) > 0 && (
            <span className="text-sm font-normal text-text-muted ml-auto">
              {stats?.remaining_jobs} left
            </span>
          )}
        </h2>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">😎</p>
              <p className="text-lg text-text-secondary">
                No jobs scheduled today
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onStartJob={handleStartJob}
                onCompleteJob={handleCompleteJob}
                isActionLoading={actionJobId === job.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Quick Stats */}
      <QuickStats
        completedJobs={stats?.completed_jobs || 0}
        hoursWorked={stats?.hours_worked || 0}
        remainingJobs={stats?.remaining_jobs || 0}
      />

      {/* Section 4: My Pay */}
      <PayThisPeriod
        periodLabel={pay?.period_label}
        nextPayday={pay?.next_payday}
        commissionsEarned={pay?.commissions_earned || 0}
        jobsCompletedPeriod={pay?.jobs_completed_period || 0}
        backboardThreshold={pay?.backboard_threshold || 2307.69}
        onTrack={pay?.on_track || false}
      />

      {/* Section 5: How I'm Doing */}
      <HowImDoing
        jobsThisWeek={perf?.jobs_this_week || 0}
        jobsLastWeek={perf?.jobs_last_week || 0}
        avgDurationMinutes={perf?.avg_job_duration_minutes || 0}
      />
    </div>
  );
}
