import { useNavigate } from "react-router-dom";
import {
  useTechnicianDashboard,
  useTechCommissions,
  useTechCurrentPeriod,
  useTechJobs,
} from "@/api/hooks/useTechPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";

// ── Helpers ──────────────────────────────────────────────────

function formatTime(t: string): string {
  const parts = t.split(":");
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    if (!isNaN(hour)) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minute} ${period}`;
    }
  }
  return t;
}

// ── Main Component ──────────────────────────────────────────

export function TechHomePage() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading: dashLoading } = useTechnicianDashboard();
  const { data: period } = useTechCurrentPeriod();
  const { data: commissions } = useTechCommissions({ status: "pending" });

  const today = new Date().toISOString().split("T")[0];
  const { data: todayJobs, isLoading: jobsLoading } = useTechJobs({
    scheduled_date_from: today,
    scheduled_date_to: today,
    page_size: 20,
  });

  const earned = dashboard?.pay_this_period ?? 0;
  const threshold = period?.backboard_guarantee ?? 0;
  const onTrack = earned > threshold && threshold > 0;
  const pendingCount = commissions?.items?.length ?? 0;
  const jobs = todayJobs?.items ?? [];
  const scheduledJobs = jobs.filter((j: Record<string, unknown>) => j.status === "scheduled" || j.status === "en_route" || j.status === "in_progress");
  const completedJobs = jobs.filter((j: Record<string, unknown>) => j.status === "completed");

  if (dashLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}
        </h1>
        <span className="text-sm text-text-muted">{formatDate(today)}</span>
      </div>

      {/* Commission Card */}
      <Card className="bg-gradient-to-br from-green-600 to-emerald-800 text-white border-0 cursor-pointer" onClick={() => navigate("/portal/pay")}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <span className="text-xl">💰</span> This Pay Period
            </h2>
            {pendingCount > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-4xl font-black tracking-tight text-center mb-2">
            {formatCurrency(earned)}
          </p>
          {threshold > 0 && (
            <div className="mb-1">
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${onTrack ? "bg-yellow-400" : "bg-white/60"}`}
                  style={{ width: `${Math.min(100, Math.round((earned / threshold) * 100))}%` }}
                />
              </div>
              <p className="text-green-200 text-xs mt-1 text-center">
                {onTrack ? "Above guarantee!" : `${formatCurrency(earned)} of ${formatCurrency(threshold)} guarantee`}
              </p>
            </div>
          )}
          <p className="text-green-200 text-xs text-center">Tap for full earnings breakdown</p>
        </CardContent>
      </Card>

      {/* Today's Jobs Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer" onClick={() => navigate("/portal/jobs")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-black text-primary">{jobs.length}</p>
            <p className="text-xs text-text-muted mt-1">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-black text-blue-600">{scheduledJobs.length}</p>
            <p className="text-xs text-text-muted mt-1">Remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-black text-green-600">{completedJobs.length}</p>
            <p className="text-xs text-text-muted mt-1">Done</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Job List */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <span className="text-xl">📋</span> Today's Schedule
        </h2>
        {jobsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <p className="text-text-secondary">No jobs scheduled for today</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(jobs as Array<Record<string, unknown>>)
              .sort((a, b) => {
                const ta = (a.time_window_start as string) || "99:99";
                const tb = (b.time_window_start as string) || "99:99";
                return ta.localeCompare(tb);
              })
              .map((job) => (
                <Card
                  key={job.id as string}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    job.status === "completed" ? "opacity-60" : ""
                  }`}
                  onClick={() => navigate(`/portal/jobs/${job.id}`)}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="w-16 text-center flex-shrink-0">
                        {job.time_window_start ? (
                          <p className="text-lg font-black text-primary">
                            {formatTime(job.time_window_start as string)}
                          </p>
                        ) : (
                          <p className="text-sm text-text-muted">TBD</p>
                        )}
                      </div>
                      {/* Job info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">
                          {(job.customer_name as string) || "Unknown"}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {(job.service_address_line1 as string) || ""}
                          {job.service_city ? `, ${job.service_city}` : ""}
                        </p>
                      </div>
                      {/* Phone */}
                      {job.customer_phone && (
                        <a
                          href={`tel:${job.customer_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                        >
                          📞
                        </a>
                      )}
                      {/* Status indicator */}
                      <div className="flex-shrink-0">
                        {job.status === "completed" ? (
                          <span className="text-green-500 text-lg">✅</span>
                        ) : job.status === "in_progress" ? (
                          <span className="text-blue-500 text-lg">🔧</span>
                        ) : job.status === "en_route" ? (
                          <span className="text-orange-500 text-lg">🚛</span>
                        ) : (
                          <span className="text-gray-400 text-lg">📅</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/portal/time-clock")}
        >
          <CardContent className="pt-4 pb-4 text-center">
            <span className="text-3xl block mb-1">⏰</span>
            <p className="text-sm font-medium text-text-primary">Time Clock</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/portal/pay")}
        >
          <CardContent className="pt-4 pb-4 text-center">
            <span className="text-3xl block mb-1">💵</span>
            <p className="text-sm font-medium text-text-primary">My Earnings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
