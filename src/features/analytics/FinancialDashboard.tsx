import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  usePnL,
  useCashFlowForecast,
  useARaging,
  useMarginsByType,
  useTechProfitability,
  useContractRevenue,
} from "@/api/hooks/useFinancialAnalytics";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import type { PnLResponse } from "@/api/types/financialAnalytics";
import type { ARAgingResponse } from "@/api/types/financialAnalytics";
import type { ContractRevenueResponse } from "@/api/types/financialAnalytics";
import type { TechProfitabilityResponse } from "@/api/types/financialAnalytics";

type TabKey = "overview" | "pnl" | "receivables" | "team";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "pnl", label: "Revenue & P&L", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "receivables", label: "Receivables", icon: <FileText className="w-4 h-4" /> },
  { key: "team", label: "Team & Contracts", icon: <Users className="w-4 h-4" /> },
];

const CHART_COLORS = {
  blue: "#3B82F6",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  orange: "#F97316",
};

const AR_COLORS: Record<string, string> = {
  current: CHART_COLORS.green,
  days_30: CHART_COLORS.blue,
  days_60: CHART_COLORS.yellow,
  days_90: CHART_COLORS.orange,
  days_90_plus: CHART_COLORS.red,
};

// -- Health Alert System --

interface HealthAlert {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  message: string;
}

function deriveHealthAlerts(
  pnl: PnLResponse | undefined,
  arAging: ARAgingResponse | undefined,
  cashFlow: { data: { date: string; cumulative_balance: number }[] } | undefined,
  contractRevenue: ContractRevenueResponse | undefined,
  techProfit: TechProfitabilityResponse | undefined,
): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  if (pnl) {
    if (pnl.gross_margin_pct < 25) {
      alerts.push({
        id: "low-margin",
        severity: "critical",
        message: `Gross margin is ${pnl.gross_margin_pct.toFixed(1)}% — below 25% threshold. Review labor costs and pricing.`,
      });
    } else if (pnl.gross_margin_pct < 35) {
      alerts.push({
        id: "margin-warning",
        severity: "warning",
        message: `Gross margin at ${pnl.gross_margin_pct.toFixed(1)}% — approaching danger zone.`,
      });
    }
  }

  if (arAging) {
    if (arAging.days_90_plus.amount > 5000) {
      alerts.push({
        id: "high-ar",
        severity: "critical",
        message: `${formatCurrency(arAging.days_90_plus.amount)} in invoices are 90+ days overdue. Immediate collection action needed.`,
      });
    }
    if (arAging.days_60.amount + arAging.days_90.amount + arAging.days_90_plus.amount > arAging.current.amount) {
      alerts.push({
        id: "ar-growing",
        severity: "warning",
        message: "Aging receivables exceed current — AR health is deteriorating.",
      });
    }
  }

  if (cashFlow?.data) {
    const negWeek = cashFlow.data.find((w) => w.cumulative_balance < 0);
    if (negWeek) {
      alerts.push({
        id: "cash-negative",
        severity: "critical",
        message: `Cash flow projected to go negative by ${negWeek.date}. Review upcoming expenses.`,
      });
    }
  }

  if (contractRevenue) {
    if (contractRevenue.contracts_expiring_30d > 0) {
      alerts.push({
        id: "contract-expiry",
        severity: "info",
        message: `${contractRevenue.contracts_expiring_30d} contracts expiring in 30 days. Schedule renewal conversations.`,
      });
    }
    if (contractRevenue.renewal_rate < 70) {
      alerts.push({
        id: "low-renewal",
        severity: "warning",
        message: `Renewal rate at ${contractRevenue.renewal_rate.toFixed(0)}% — below 70% target. Review churned accounts.`,
      });
    }
  }

  if (techProfit?.data && techProfit.data.length >= 2) {
    const margins = techProfit.data.map((t) => t.margin_pct);
    const gap = Math.max(...margins) - Math.min(...margins);
    if (gap > 30) {
      alerts.push({
        id: "top-tech-gap",
        severity: "info",
        message: `Technician performance gap of ${gap.toFixed(0)}% — consider coaching for lower performers.`,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-clear",
      severity: "success",
      message: "All financial metrics are healthy. Business is on track.",
    });
  }

  // Sort: critical > warning > info > success
  const order = { critical: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return alerts;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: React.ReactNode }> = {
  critical: { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/20", icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
  warning: { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", icon: <AlertCircle className="w-5 h-5 text-amber-500" /> },
  info: { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", icon: <Info className="w-5 h-5 text-blue-500" /> },
  success: { border: "border-l-green-500", bg: "bg-green-50 dark:bg-green-950/20", icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
};

function HealthAlerts({ alerts }: { alerts: HealthAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  const shown = expanded ? visible : visible.slice(0, 3);
  const remaining = visible.length - 3;

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="health-alerts">
      {shown.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity];
        return (
          <div key={alert.id} className={cn("flex items-start gap-3 p-3 rounded-lg border-l-4", style.border, style.bg)}>
            <div className="mt-0.5 shrink-0">{style.icon}</div>
            <p className="text-sm text-text-primary flex-1">{alert.message}</p>
            <button
              onClick={() => setDismissed((s) => new Set(s).add(alert.id))}
              className="text-text-muted hover:text-text-primary text-xs shrink-0"
            >
              Dismiss
            </button>
          </div>
        );
      })}
      {remaining > 0 && !expanded && (
        <button onClick={() => setExpanded(true)} className="flex items-center gap-1 text-sm text-info hover:underline">
          <ChevronDown className="w-4 h-4" /> Show {remaining} more alert{remaining > 1 ? "s" : ""}
        </button>
      )}
      {expanded && visible.length > 3 && (
        <button onClick={() => setExpanded(false)} className="flex items-center gap-1 text-sm text-info hover:underline">
          <ChevronUp className="w-4 h-4" /> Show fewer
        </button>
      )}
    </div>
  );
}

// -- KPI Card --

function KPICard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-muted uppercase tracking-wide">{title}</p>
          <div className="text-text-muted">{icon}</div>
        </div>
        <p className={cn("text-xl font-bold", color || "text-text-primary")}>{value}</p>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// -- Tab: Overview --

function OverviewTab({
  pnl,
  cashFlow,
  arAging,
  contractRevenue,
  alerts,
}: {
  pnl: PnLResponse | undefined;
  cashFlow: { data: { date: string; projected_inflow: number; projected_outflow: number; cumulative_balance: number }[]; starting_balance: number } | undefined;
  arAging: ARAgingResponse | undefined;
  contractRevenue: ContractRevenueResponse | undefined;
  alerts: HealthAlert[];
}) {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="kpi-row">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(pnl?.revenue ?? 0)}
          icon={<DollarSign className="w-4 h-4" />}
          color={(pnl?.revenue ?? 0) > 0 ? "text-success" : "text-text-primary"}
        />
        <KPICard
          title="Gross Margin"
          value={`${(pnl?.gross_margin_pct ?? 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          color={(pnl?.gross_margin_pct ?? 0) >= 40 ? "text-success" : (pnl?.gross_margin_pct ?? 0) >= 25 ? "text-warning" : "text-error"}
        />
        <KPICard
          title="Cash Position"
          value={formatCurrency(cashFlow?.starting_balance ?? 0)}
          icon={<CreditCard className="w-4 h-4" />}
        />
        <KPICard
          title="Outstanding AR"
          value={formatCurrency(arAging?.total.amount ?? 0)}
          icon={<FileText className="w-4 h-4" />}
          color="text-warning"
        />
        <KPICard
          title="MRR"
          value={formatCurrency(contractRevenue?.mrr ?? 0)}
          subtitle={`ARR: ${formatCurrency(contractRevenue?.arr ?? 0)}`}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <KPICard
          title="Active Contracts"
          value={String(contractRevenue?.active_contracts ?? 0)}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Health Alerts */}
      <HealthAlerts alerts={alerts} />

      {/* Mini Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Sparkline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={pnl?.data ?? []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.blue} fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Sparkline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow Forecast</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={cashFlow?.data ?? []}>
                  <XAxis dataKey="date" tick={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="projected_inflow" stroke={CHART_COLORS.green} fill={CHART_COLORS.green} fillOpacity={0.2} />
                  <Area type="monotone" dataKey="projected_outflow" stroke={CHART_COLORS.red} fill="none" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="cumulative_balance" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MRR Trend Sparkline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">MRR Trend</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <ComposedChart data={contractRevenue?.data ?? []}>
                  <XAxis dataKey="month" tick={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="new_mrr" fill={CHART_COLORS.green} barSize={8} />
                  <Bar dataKey="churned_mrr" fill={CHART_COLORS.red} barSize={8} />
                  <Line type="monotone" dataKey="mrr" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -- Tab: Revenue & P&L --

function PnLTab() {
  const [period, setPeriod] = useState("mtd");
  const { data: pnl } = usePnL(period);
  const { data: margins } = useMarginsByType();

  const sortedMargins = useMemo(
    () => [...(margins?.data ?? [])].sort((a, b) => b.margin_pct - a.margin_pct),
    [margins],
  );

  return (
    <div className="space-y-6">
      {/* Period Selector + Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profit & Loss</CardTitle>
            <div className="flex gap-1">
              {(["mtd", "qtd", "ytd"] as const).map((p) => (
                <Button key={p} variant={period === p ? "primary" : "ghost"} size="sm" onClick={() => setPeriod(p)}>
                  {p.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer>
              <ComposedChart data={pnl?.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  return `${dt.toLocaleString("default", { month: "short" })} ${dt.getDate()}`;
                }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name.replace(/_/g, " ")]} />
                <Legend />
                <Area type="monotone" dataKey="revenue" fill={CHART_COLORS.blue} fillOpacity={0.15} stroke={CHART_COLORS.blue} strokeWidth={2} name="Revenue" />
                <Bar dataKey="labor_cost" fill={CHART_COLORS.red} fillOpacity={0.5} barSize={12} name="Labor Cost" />
                <Bar dataKey="material_cost" fill={CHART_COLORS.orange} fillOpacity={0.5} barSize={12} name="Material Cost" />
                <Area type="monotone" dataKey="gross_profit" fill={CHART_COLORS.green} fillOpacity={0.1} stroke={CHART_COLORS.green} strokeWidth={2} name="Gross Profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* P&L Summary */}
      {pnl && (
        <Card>
          <CardHeader><CardTitle>P&L Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-xs text-text-muted uppercase">Revenue</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(pnl.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Labor Cost</p>
                <p className="text-lg font-bold text-error">{formatCurrency(pnl.cost_of_labor)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Material Cost</p>
                <p className="text-lg font-bold text-warning">{formatCurrency(pnl.material_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Gross Profit</p>
                <p className={cn("text-lg font-bold", pnl.gross_profit >= 0 ? "text-success" : "text-error")}>{formatCurrency(pnl.gross_profit)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Gross Margin</p>
                <p className={cn("text-lg font-bold", pnl.gross_margin_pct >= 40 ? "text-success" : pnl.gross_margin_pct >= 25 ? "text-warning" : "text-error")}>
                  {pnl.gross_margin_pct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin by Job Type */}
      <Card>
        <CardHeader><CardTitle>Margin by Job Type</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: Math.max(300, sortedMargins.length * 50) }}>
            <ResponsiveContainer>
              <BarChart data={sortedMargins} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="job_type" width={120} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" fill={CHART_COLORS.blue} name="Revenue" barSize={16} />
                <Bar dataKey="estimated_cost" fill={CHART_COLORS.red} name="Est. Cost" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {sortedMargins.map((m) => (
              <Badge
                key={m.job_type}
                className={cn(
                  "text-xs text-white",
                  m.margin_pct >= 50 ? "bg-green-600" : m.margin_pct >= 35 ? "bg-blue-600" : m.margin_pct >= 20 ? "bg-yellow-600" : "bg-red-600",
                )}
              >
                {m.job_type}: {m.margin_pct.toFixed(0)}% ({m.job_count} jobs)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Tab: Receivables --

function ReceivablesTab() {
  const { data: arAging } = useARaging();
  const { data: cashFlow } = useCashFlowForecast();

  const donutData = useMemo(() => {
    if (!arAging) return [];
    return [
      { name: "Current", value: arAging.current.amount, count: arAging.current.count, color: AR_COLORS.current },
      { name: "1-30 Days", value: arAging.days_30.amount, count: arAging.days_30.count, color: AR_COLORS.days_30 },
      { name: "31-60 Days", value: arAging.days_60.amount, count: arAging.days_60.count, color: AR_COLORS.days_60 },
      { name: "61-90 Days", value: arAging.days_90.amount, count: arAging.days_90.count, color: AR_COLORS.days_90 },
      { name: "90+ Days", value: arAging.days_90_plus.amount, count: arAging.days_90_plus.count, color: AR_COLORS.days_90_plus },
    ];
  }, [arAging]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Donut */}
        <Card>
          <CardHeader><CardTitle>Accounts Receivable Aging</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 300 }} className="relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-text-muted">Total</p>
                  <p className="text-lg font-bold text-text-primary">{formatCurrency(arAging?.total.amount ?? 0)}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {donutData.map((d) => (
                <div key={d.name} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-text-muted">{d.name}</span>
                  </div>
                  <p className="text-xs font-semibold">{formatCurrency(d.value)}</p>
                  <p className="text-[10px] text-text-muted">{d.count} inv.</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Outstanding */}
        <Card>
          <CardHeader><CardTitle>Top Outstanding Invoices</CardTitle></CardHeader>
          <CardContent>
            {arAging?.top_outstanding && arAging.top_outstanding.length > 0 ? (
              <div className="space-y-3">
                {arAging.top_outstanding.slice(0, 5).map((inv) => (
                  <div key={inv.invoice_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm text-text-primary">{inv.customer_name}</p>
                      <p className="text-xs text-text-muted">{inv.days_outstanding} days outstanding</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formatCurrency(inv.amount)}</span>
                      <Badge
                        className={cn(
                          "text-[10px] text-white",
                          inv.days_outstanding <= 30 ? "bg-green-600" : inv.days_outstanding <= 60 ? "bg-yellow-600" : inv.days_outstanding <= 90 ? "bg-orange-600" : "bg-red-600",
                        )}
                      >
                        {inv.days_outstanding}d
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-8">No outstanding invoices</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Forecast Full Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cash Flow Forecast</CardTitle>
            {cashFlow && <Badge variant="outline">Starting: {formatCurrency(cashFlow.starting_balance)}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer>
              <ComposedChart data={cashFlow?.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  return `${dt.toLocaleString("default", { month: "short" })} ${dt.getDate()}`;
                }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#888" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="projected_inflow" fill={CHART_COLORS.green} fillOpacity={0.2} stroke={CHART_COLORS.green} name="Inflow" />
                <Area type="monotone" dataKey="projected_outflow" fill={CHART_COLORS.red} fillOpacity={0.1} stroke={CHART_COLORS.red} strokeDasharray="4 2" name="Outflow" />
                <Line type="monotone" dataKey="cumulative_balance" stroke={CHART_COLORS.blue} strokeWidth={3} dot={false} name="Balance" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Tab: Team & Contracts --

function TeamContractsTab() {
  const { data: techProfit } = useTechProfitability();
  const { data: contractRevenue } = useContractRevenue();

  const sortedTechs = useMemo(
    () => [...(techProfit?.data ?? [])].sort((a, b) => b.revenue - a.revenue),
    [techProfit],
  );

  return (
    <div className="space-y-6">
      {/* Tech Profitability Table */}
      <Card>
        <CardHeader><CardTitle>Technician Profitability</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="tech-table">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">Est. Cost</th>
                  <th className="py-2 text-right">Margin</th>
                  <th className="py-2 text-right">Margin %</th>
                  <th className="py-2 text-right">Jobs</th>
                  <th className="py-2 text-right">Avg Job</th>
                  <th className="py-2 text-right">Rev/Hr</th>
                </tr>
              </thead>
              <tbody>
                {sortedTechs.map((tech, i) => (
                  <tr key={tech.tech_id} className={cn("border-b border-border/50 hover:bg-background-secondary/50", i === 0 && "bg-amber-50/50 dark:bg-amber-950/10")}>
                    <td className="py-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 font-medium text-text-primary">{tech.name}</td>
                    <td className="py-2 text-right">{formatCurrency(tech.revenue)}</td>
                    <td className="py-2 text-right text-error">{formatCurrency(tech.estimated_cost)}</td>
                    <td className="py-2 text-right text-success">{formatCurrency(tech.margin)}</td>
                    <td className="py-2 text-right">
                      <Badge className={cn("text-[10px] text-white", tech.margin_pct >= 50 ? "bg-green-600" : tech.margin_pct >= 25 ? "bg-yellow-600" : "bg-red-600")}>
                        {tech.margin_pct.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-2 text-right">{tech.jobs}</td>
                    <td className="py-2 text-right">{formatCurrency(tech.avg_job_value)}</td>
                    <td className="py-2 text-right">{formatCurrency(tech.revenue_per_hour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tech Comparison Bar Chart */}
      <Card>
        <CardHeader><CardTitle>Revenue vs Cost by Technician</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={sortedTechs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" fill={CHART_COLORS.blue} name="Revenue" barSize={14} />
                <Bar dataKey="estimated_cost" fill={CHART_COLORS.red} name="Est. Cost" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Contract/MRR Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Metrics */}
        <Card>
          <CardHeader><CardTitle>Contract Revenue Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase">MRR</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(contractRevenue?.mrr ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">ARR</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(contractRevenue?.arr ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Active Contracts</p>
                <p className="text-lg font-bold text-text-primary">{contractRevenue?.active_contracts ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Avg Contract Value</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(contractRevenue?.avg_contract_value ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Expiring in 30d</p>
                <p className="text-lg font-bold">
                  {(contractRevenue?.contracts_expiring_30d ?? 0) > 0 ? (
                    <Badge className="bg-warning text-white">{contractRevenue?.contracts_expiring_30d}</Badge>
                  ) : (
                    <span className="text-success">0</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Renewal Rate</p>
                <p className={cn("text-lg font-bold", (contractRevenue?.renewal_rate ?? 0) >= 70 ? "text-success" : "text-warning")}>
                  {(contractRevenue?.renewal_rate ?? 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRR Trend Chart */}
        <Card>
          <CardHeader><CardTitle>MRR Trend</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer>
                <ComposedChart data={contractRevenue?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="mrr" fill={CHART_COLORS.green} fillOpacity={0.2} stroke={CHART_COLORS.green} strokeWidth={2} name="MRR" />
                  <Bar dataKey="churned_mrr" fill={CHART_COLORS.red} barSize={8} name="Churned" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -- Main Component --

export function FinancialDashboard() {
  const [tab, setTab] = useState<TabKey>("overview");
  const { data: pnl, isLoading: pnlLoading } = usePnL("mtd");
  const { data: cashFlow, isLoading: cfLoading } = useCashFlowForecast();
  const { data: arAging, isLoading: arLoading } = useARaging();
  const { data: contractRevenue, isLoading: crLoading } = useContractRevenue();
  const { data: techProfit } = useTechProfitability();

  const isLoading = pnlLoading || cfLoading || arLoading || crLoading;

  const alerts = useMemo(
    () => deriveHealthAlerts(pnl, arAging, cashFlow, contractRevenue, techProfit),
    [pnl, arAging, cashFlow, contractRevenue, techProfit],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Financial Command Center</h1>
          <p className="text-text-secondary">CFO-grade analytics across revenue, receivables, and team performance</p>
        </div>
        <div className="flex gap-1 bg-background-secondary rounded-lg p-1">
          {TABS.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5"
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-background-secondary animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab pnl={pnl} cashFlow={cashFlow} arAging={arAging} contractRevenue={contractRevenue} alerts={alerts} />
          )}
          {tab === "pnl" && <PnLTab />}
          {tab === "receivables" && <ReceivablesTab />}
          {tab === "team" && <TeamContractsTab />}
        </>
      )}
    </div>
  );
}
