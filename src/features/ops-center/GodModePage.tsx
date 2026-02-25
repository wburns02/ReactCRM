import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { useOpsLiveState, useDispatchRecommend } from "@/hooks/useOpsCenter.ts";
import { apiClient } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import type {
  OpsTechnician,
  OpsJob,
  OpsAlert,
  DispatchRecommendation,
} from "@/api/types/opsCenter.ts";

// ─── Weather Badge ───────────────────────────────────────

const WEATHER_ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌧️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "🌨️", 80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

function WeatherBadge({ weather }: { weather: { temperature_f: number; windspeed_mph: number; weather_code: number | null } | null }) {
  if (!weather) return null;
  const icon = WEATHER_ICONS[weather.weather_code ?? 0] || "🌡️";
  return (
    <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-sm dark:bg-sky-950/30">
      <span className="text-lg">{icon}</span>
      <span className="font-semibold text-sky-700 dark:text-sky-300">{weather.temperature_f}°F</span>
      <span className="text-xs text-sky-600 dark:text-sky-400">{weather.windspeed_mph} mph</span>
    </div>
  );
}

// ─── KPI Strip ───────────────────────────────────────────

function KPIStrip({ stats }: { stats: { total_jobs: number; completed: number; in_progress: number; remaining: number; unassigned: number; on_duty_techs: number; revenue_today: number; utilization_pct: number } }) {
  const items = [
    { label: "Jobs", value: stats.total_jobs, color: "text-blue-600" },
    { label: "Done", value: stats.completed, color: "text-green-600" },
    { label: "Active", value: stats.in_progress, color: "text-amber-600" },
    { label: "Left", value: stats.remaining, color: "text-gray-600" },
    { label: "Unassigned", value: stats.unassigned, color: stats.unassigned > 0 ? "text-red-600" : "text-gray-400" },
    { label: "Techs On", value: stats.on_duty_techs, color: "text-purple-600" },
    { label: "Revenue", value: `$${(stats.revenue_today / 1000).toFixed(1)}K`, color: "text-emerald-600" },
    { label: "Util", value: `${stats.utilization_pct}%`, color: "text-indigo-600" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col items-center min-w-[60px]">
          <span className={`text-lg font-bold ${i.color}`}>{i.value}</span>
          <span className="text-[10px] text-gray-500">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────

function AlertBanner({ alerts, onClickAlert }: { alerts: OpsAlert[]; onClickAlert: (woId: string) => void }) {
  if (alerts.length === 0) return null;

  const dangerAlerts = alerts.filter((a) => a.severity === "danger");
  const warnAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-1">
      {dangerAlerts.map((a, i) => (
        <div
          key={`d${i}`}
          onClick={() => onClickAlert(a.work_order_id)}
          className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 cursor-pointer hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
        >
          <span className="text-lg">🚨</span>
          <span className="flex-1">{a.message}</span>
          <span className="text-xs font-medium">DISPATCH →</span>
        </div>
      ))}
      {warnAlerts.slice(0, 3).map((a, i) => (
        <div
          key={`w${i}`}
          onClick={() => onClickAlert(a.work_order_id)}
          className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800 cursor-pointer hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <span>⚠️</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tech Card ───────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  on_job: "bg-amber-500",
  in_progress: "bg-amber-500",
  on_site: "bg-amber-500",
  enroute: "bg-blue-500",
  offline: "bg-gray-400",
};

function TechCard({ tech, isSelected, onClick }: { tech: OpsTechnician; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
      }`}
    >
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${STATUS_COLORS[tech.status] || STATUS_COLORS.offline}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{tech.name}</p>
        <p className="text-xs text-gray-500">
          {tech.jobs_today} jobs
          {tech.active_job && <span className="ml-1 text-amber-600">• {tech.active_job.job_type}</span>}
        </p>
      </div>
      {tech.location_source === "gps" && (
        <span className="text-[10px] text-green-500 font-medium">GPS</span>
      )}
    </div>
  );
}

// ─── Job Row ─────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  emergency: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  urgent: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  completed: "text-green-600",
  in_progress: "text-amber-600",
  on_site: "text-amber-600",
  enroute: "text-blue-600",
  scheduled: "text-gray-500",
  confirmed: "text-gray-500",
};

function JobRow({ job, onDispatch }: { job: OpsJob; onDispatch: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${JOB_STATUS_COLORS[job.status] || "text-gray-500"}`}>
            {job.wo_number}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.normal}`}>
            {job.priority}
          </span>
          <span className="text-xs text-gray-400">{job.job_type}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{job.address}</p>
      </div>
      <div className="text-right shrink-0">
        {job.time_window_start && <p className="text-xs text-gray-500">{job.time_window_start.slice(0, 5)}</p>}
        {job.assigned_technician ? (
          <p className="text-xs text-gray-400 truncate max-w-[80px]">{job.assigned_technician}</p>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onDispatch(job.id)} className="text-xs h-6 px-2">
            Assign
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Dispatch Modal ──────────────────────────────────────

function DispatchPanel({
  workOrderId,
  onClose,
  onAssigned,
}: {
  workOrderId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { data, isLoading } = useDispatchRecommend(workOrderId);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function handleAssign(techId: string, techName: string) {
    setAssigning(techId);
    try {
      await apiClient.post(`/dispatch/assign/${workOrderId}`, { technician_id: techId });
      toastSuccess(`Assigned to ${techName}`);
      onAssigned();
    } catch {
      toastError("Assignment failed");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            AI Dispatch — {data?.wo_number || "Loading..."}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        {data && (
          <p className="text-xs text-gray-500">
            {data.job_type} • {data.priority} priority
          </p>
        )}
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-2">
            {data?.recommendations.map((rec, i) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{rec.name}</p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>Score: {rec.dispatch_score}</span>
                    {rec.distance_miles && <span>{rec.distance_miles} mi</span>}
                    {rec.estimated_travel_minutes && <span>~{rec.estimated_travel_minutes}min</span>}
                  </div>
                  <p className="text-[10px] text-gray-400">{rec.dispatch_factors.join(" • ")}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssign(rec.id, rec.name)}
                  disabled={assigning !== null}
                  className="text-xs h-7 px-3"
                >
                  {assigning === rec.id ? "..." : "Assign"}
                </Button>
              </div>
            ))}
            {data?.recommendations.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No technicians available</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main God Mode Page ──────────────────────────────────

export function GodModePage() {
  const { data, isLoading, refetch } = useOpsLiveState();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [dispatchJobId, setDispatchJobId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<"all" | "unassigned" | "active" | "emergency">("all");

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((j) => {
      if (jobFilter === "unassigned") return !j.technician_id;
      if (jobFilter === "active") return ["in_progress", "on_site", "enroute"].includes(j.status);
      if (jobFilter === "emergency") return j.priority === "emergency" || j.priority === "urgent";
      return true;
    });
  }, [data, jobFilter]);

  const selectedTechJobs = useMemo(() => {
    if (!data || !selectedTech) return [];
    return data.jobs.filter((j) => j.technician_id === selectedTech);
  }, [data, selectedTech]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-96 rounded-xl col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Operations Center</h1>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
          <WeatherBadge weather={data.weather} />
        </div>
        <KPIStrip stats={data.stats} />
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-850">
          <AlertBanner alerts={data.alerts} onClickAlert={(id) => setDispatchJobId(id)} />
        </div>
      )}

      {/* Main Content — 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Technicians */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-3 space-y-2 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Technicians ({data.stats.on_duty_techs}/{data.stats.total_techs})
          </h2>
          {data.technicians
            .sort((a, b) => (a.status === "on_job" ? -1 : 1) - (b.status === "on_job" ? -1 : 1))
            .map((t) => (
              <TechCard
                key={t.id}
                tech={t}
                isSelected={selectedTech === t.id}
                onClick={() => setSelectedTech(selectedTech === t.id ? null : t.id)}
              />
            ))}
        </div>

        {/* Center: Jobs / Map placeholder */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Tech detail strip */}
          {selectedTech && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold">
                    {data.technicians.find((t) => t.id === selectedTech)?.name}'s Route Today
                  </h3>
                  <button onClick={() => setSelectedTech(null)} className="text-xs text-gray-400 hover:text-gray-600">
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5">
                  {selectedTechJobs.length === 0 ? (
                    <p className="text-xs text-gray-500">No jobs assigned today</p>
                  ) : (
                    selectedTechJobs.map((j) => <JobRow key={j.id} job={j} onDispatch={setDispatchJobId} />)
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job filters */}
          <div className="flex items-center gap-2">
            {(["all", "unassigned", "active", "emergency"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setJobFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  jobFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {f}
                {f === "unassigned" && data.stats.unassigned > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 text-white px-1.5 text-[10px]">{data.stats.unassigned}</span>
                )}
              </button>
            ))}
            <div className="ml-auto text-xs text-gray-400">{filteredJobs.length} jobs</div>
          </div>

          {/* Job list */}
          <div className="space-y-1.5">
            {filteredJobs.map((j) => (
              <JobRow key={j.id} job={j} onDispatch={setDispatchJobId} />
            ))}
            {filteredJobs.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No jobs match this filter</div>
            )}
          </div>
        </div>

        {/* Right: Dispatch Panel */}
        {dispatchJobId && (
          <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto p-3 dark:border-gray-700 dark:bg-gray-850">
            <DispatchPanel
              workOrderId={dispatchJobId}
              onClose={() => setDispatchJobId(null)}
              onAssigned={() => {
                setDispatchJobId(null);
                refetch();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
