import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Wrench,
  Activity,
  CheckCircle,
  UserPlus,
  Clock,
  Star,
  Trophy,
  Medal,
  Award,
  ChevronRight,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useExecutiveKPIs,
  useRevenueTrend,
  useServiceMix,
  useTechLeaderboard,
  usePipelineFunnel,
  useRecentActivity,
} from "@/api/hooks/useExecutiveDashboard";
import type {
  ExecutiveKPIs,
  RevenueTrendPoint,
  ServiceMixItem,
  TechLeaderboardItem,
  PipelineStage,
  ActivityEvent,
} from "@/api/types/executiveDashboard";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const formatNumber = (v: number) => v.toLocaleString();

const formatPct = (v: number) => `${v.toFixed(1)}%`;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── KPI Card ─────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  borderColor: string;
  trend?: number;
  sparkData?: number[];
}

function KPICard({ title, value, subtitle, icon, borderColor, trend, sparkData }: KPICardProps) {
  const trendUp = trend !== undefined && trend >= 0;
  const sparkPoints = sparkData?.map((v, i) => ({ x: i, y: v })) ?? [];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-card p-4 shadow-sm",
        "flex flex-col gap-2 relative overflow-hidden",
        `border-l-4`,
      )}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{title}</span>
        <span className="text-text-muted opacity-60">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{subtitle}</span>
        {trend !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trendUp ? "text-emerald-600" : "text-red-500",
            )}
          >
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPct(Math.abs(trend))}
          </span>
        )}
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="h-8 mt-1">
          <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={30}>
            <LineChart data={sparkPoints}>
              <Line
                type="monotone"
                dataKey="y"
                stroke={borderColor}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Revenue Trend Chart ──────────────────────────────────────

const PERIOD_OPTIONS = ["30d", "90d", "12m"] as const;

function RevenueTrendChart() {
  const [period, setPeriod] = useState<string>("30d");
  const { data: trend, isLoading } = useRevenueTrend(period);

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Revenue Trend</h3>
        <div className="flex gap-1" data-testid="period-toggles">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-muted">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
            <AreaChart data={trend?.data ?? []}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  return `${dt.getMonth() + 1}/${dt.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                fill="url(#revGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Service Mix Donut ────────────────────────────────────────

const DONUT_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function ServiceMixDonut() {
  const { data: mix, isLoading } = useServiceMix();
  const total = mix?.data.reduce((a, b) => a + b.revenue, 0) ?? 0;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Service Mix</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={mix?.data ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="revenue"
                  nameKey="type"
                  stroke="none"
                >
                  {(mix?.data ?? []).map((_: ServiceMixItem, i: number) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-text-primary text-lg font-bold"
                  style={{ fontSize: 16, fontWeight: 700 }}
                >
                  {formatCurrency(total)}
                </text>
                <text
                  x="50%"
                  y="56%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-text-muted"
                  style={{ fontSize: 11 }}
                >
                  Total
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full px-2">
            {(mix?.data ?? []).map((item: ServiceMixItem, i: number) => (
              <div key={item.type} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="text-text-secondary truncate">{item.type}</span>
                <span className="ml-auto text-text-muted">{item.count}</span>
                <span className="text-text-primary font-medium">{formatPct(item.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Technician Leaderboard ───────────────────────────────────

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy size={16} className="text-amber-500" />;
  if (rank === 2) return <Medal size={16} className="text-gray-400" />;
  if (rank === 3) return <Award size={16} className="text-amber-700" />;
  return <span className="w-4 text-center text-xs text-text-muted font-medium">{rank}</span>;
}

function TechLeaderboard() {
  const navigate = useNavigate();
  const { data: lb, isLoading } = useTechLeaderboard();
  const maxRev = Math.max(...(lb?.data.map((t) => t.revenue) ?? [1]));

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Technician Leaderboard</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-text-muted">Loading...</div>
      ) : (
        <div className="space-y-2.5" data-testid="tech-leaderboard">
          {(lb?.data ?? []).map((tech: TechLeaderboardItem, i: number) => (
            <div
              key={tech.id}
              onClick={() => navigate(`/technicians/${tech.id}`)}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover cursor-pointer transition-colors group"
            >
              <div className="flex-shrink-0 w-5 flex justify-center">{rankIcon(i + 1)}</div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                {tech.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary truncate">{tech.name}</span>
                  <span className="text-sm font-semibold text-text-primary ml-2">
                    {formatCurrency(tech.revenue)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-1.5 bg-bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(tech.revenue / maxRev) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{tech.jobs_completed} jobs</span>
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                    <Star size={10} fill="currentColor" />
                    {tech.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-emerald-600">{formatPct(tech.ftfr)} FTFR</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pipeline Funnel ──────────────────────────────────────────

const FUNNEL_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#10b981"];

function PipelineFunnel() {
  const { data: funnel, isLoading } = usePipelineFunnel();
  const maxCount = Math.max(...(funnel?.stages.map((s) => s.count) ?? [1]));

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Sales Pipeline</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-text-muted">Loading...</div>
      ) : (
        <div className="space-y-3" data-testid="pipeline-funnel">
          {(funnel?.stages ?? []).map((stage: PipelineStage, i: number) => (
            <div key={stage.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-primary">{stage.name}</span>
                <span className="text-sm text-text-secondary">
                  {stage.count} &middot; {formatCurrency(stage.value)}
                </span>
              </div>
              <div className="h-6 bg-bg-muted rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 8)}%`,
                    backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                  }}
                >
                  <span className="text-xs text-white font-medium">{stage.count}</span>
                </div>
              </div>
              {i < (funnel?.conversion_rates.length ?? 0) && (
                <div className="text-xs text-text-muted mt-0.5 text-right">
                  {formatPct(funnel!.conversion_rates[i])} conversion
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activity Feed ────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; dotColor: string }> = {
  payment_received: { icon: <DollarSign size={14} />, dotColor: "bg-emerald-500" },
  job_completed: { icon: <CheckCircle size={14} />, dotColor: "bg-blue-500" },
  new_customer: { icon: <UserPlus size={14} />, dotColor: "bg-purple-500" },
  estimate_sent: { icon: <FileText size={14} />, dotColor: "bg-amber-500" },
};

function ActivityFeed() {
  const { data: activity, isLoading } = useRecentActivity();

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Live Activity</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-text-muted">Loading...</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto" data-testid="activity-feed">
          {(activity?.events ?? []).map((evt: ActivityEvent, i: number) => {
            const config = EVENT_CONFIG[evt.type] ?? {
              icon: <Activity size={14} />,
              dotColor: "bg-gray-400",
            };
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0",
                      config.dotColor,
                    )}
                  >
                    {config.icon}
                  </div>
                  {i < (activity?.events.length ?? 0) - 1 && (
                    <div className="w-px h-4 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-text-primary truncate">{evt.message}</p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {timeAgo(evt.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          {(activity?.events ?? []).length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">No recent activity</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Executive Dashboard ─────────────────────────────────

// ── Call Follow-ups Widget ──────────────────────────────────────

function CallFollowUps() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: overdueData } = useQuery({
    queryKey: ["cs", "tasks", "overdue"],
    queryFn: async () => { const { data } = await apiClient.get("/cs/tasks/overdue"); return data; },
    staleTime: 30_000,
  });

  const { data: dueTodayData } = useQuery({
    queryKey: ["cs", "tasks", "due-today"],
    queryFn: async () => { const { data } = await apiClient.get("/cs/tasks/due-today"); return data; },
    staleTime: 30_000,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => { await apiClient.post(`/cs/tasks/${taskId}/complete`, {}); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cs", "tasks"] }); },
  });

  const overdue = overdueData?.items || [];
  const dueToday = dueTodayData?.items || [];
  const allTasks = [...overdue, ...dueToday];

  if (allTasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Phone className="w-5 h-5 text-amber-500" />
          Call Follow-ups
          {overdue.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold">
              {overdue.length} overdue
            </span>
          )}
        </h3>
        <Link to="/cs/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-2">
        {allTasks.slice(0, 8).map((task: any) => {
          const isOverdue = overdue.some((o: any) => o.id === task.id);
          return (
            <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-hover hover:bg-bg-tertiary transition-colors">
              <button
                onClick={() => completeMutation.mutate(task.id)}
                disabled={completeMutation.isPending}
                className="w-5 h-5 rounded-full border-2 border-text-muted hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 transition-colors"
                title="Mark complete"
              >
                {completeMutation.isPending ? <Clock className="w-3 h-3 text-text-muted animate-spin" /> : null}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{task.title}</p>
                <p className="text-xs text-text-muted truncate">{task.contact_name || task.description?.slice(0, 60) || ""}</p>
              </div>
              {isOverdue ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 flex-shrink-0">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              ) : (
                <span className="text-[10px] text-text-muted flex-shrink-0">Due today</span>
              )}
            </div>
          );
        })}
        {allTasks.length > 8 && (
          <p className="text-xs text-text-muted text-center pt-1">+{allTasks.length - 8} more</p>
        )}
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const k: ExecutiveKPIs = kpis ?? {
    revenue_today: 0, revenue_mtd: 0, revenue_last_month: 0, revenue_change_pct: 0,
    jobs_today: 0, jobs_completed_today: 0, jobs_mtd: 0,
    avg_job_value: 0, avg_job_value_change_pct: 0,
    outstanding_invoices: 0, outstanding_amount: 0,
    overdue_invoices: 0, overdue_amount: 0,
    active_customers: 0, new_customers_mtd: 0, customer_churn_rate: 0,
    nps_score: 0, first_time_fix_rate: 0, avg_response_time_hours: 0,
    tech_utilization_pct: 0, on_duty_technicians: 0, total_technicians: 0,
    open_estimates: 0, estimate_conversion_rate: 0,
    active_contracts: 0, contracts_expiring_30d: 0,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6" data-testid="executive-dashboard">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#0c1929] via-[#132a4a] to-[#1a3a6a] p-6 text-white">
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-blue-200 mt-1">{today}</p>
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-blue-200">MTD Revenue</span>{" "}
            <span className="font-semibold">{formatCurrency(k.revenue_mtd)}</span>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-blue-200">Jobs Today</span>{" "}
            <span className="font-semibold">{k.jobs_today}</span>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-blue-200">Active Contracts</span>{" "}
            <span className="font-semibold">{formatNumber(k.active_contracts)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"
        data-testid="kpi-cards"
      >
        <KPICard
          title="Revenue Today"
          value={formatCurrency(k.revenue_today)}
          subtitle={`MTD: ${formatCurrency(k.revenue_mtd)}`}
          icon={<DollarSign size={18} />}
          borderColor="#10b981"
          trend={k.revenue_change_pct}
        />
        <KPICard
          title="Jobs Today"
          value={String(k.jobs_today)}
          subtitle={`${k.jobs_completed_today} completed`}
          icon={<Briefcase size={18} />}
          borderColor="#2563eb"
        />
        <KPICard
          title="Avg Job Value"
          value={formatCurrency(k.avg_job_value)}
          subtitle={`${k.jobs_mtd} jobs MTD`}
          icon={<TrendingUp size={18} />}
          borderColor="#f59e0b"
          trend={k.avg_job_value_change_pct}
        />
        <KPICard
          title="Outstanding"
          value={formatCurrency(k.outstanding_amount)}
          subtitle={`${k.overdue_invoices} overdue`}
          icon={<FileText size={18} />}
          borderColor="#ef4444"
        />
        <KPICard
          title="Customers"
          value={formatNumber(k.active_customers)}
          subtitle={`+${k.new_customers_mtd} this month`}
          icon={<Users size={18} />}
          borderColor="#8b5cf6"
        />
        <KPICard
          title="FTFR"
          value={formatPct(k.first_time_fix_rate)}
          subtitle="First time fix rate"
          icon={<Wrench size={18} />}
          borderColor="#10b981"
        />
        <KPICard
          title="Tech Util"
          value={formatPct(k.tech_utilization_pct)}
          subtitle={`${k.on_duty_technicians}/${k.total_technicians} on duty`}
          icon={<Activity size={18} />}
          borderColor="#6366f1"
        />
      </div>

      {/* Call Follow-ups */}
      <CallFollowUps />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RevenueTrendChart />
        </div>
        <div className="lg:col-span-2">
          <ServiceMixDonut />
        </div>
      </div>

      {/* Leaderboard + Funnel Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TechLeaderboard />
        <PipelineFunnel />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
