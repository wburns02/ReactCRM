import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  usePredictiveScores,
  usePredictiveDashboardStats,
  useCampaignPreview,
} from "@/hooks/usePredictiveService.ts";
import type { PredictiveScore } from "@/api/types/predictiveService.ts";

// ─── Risk Badge ──────────────────────────────────────────

function RiskBadge({ level, score }: { level: string; score: number }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[level] || colors.low}`}>
      {score}
      <span className="capitalize">{level}</span>
    </span>
  );
}

// ─── KPI Cards ───────────────────────────────────────────

function KPICards() {
  const { data: stats, isLoading } = usePredictiveDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: "Active Customers", value: stats.total_active_customers, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Overdue Schedules", value: stats.overdue_schedules, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
    { label: "No Recent Service", value: stats.no_recent_service, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Aerobic Systems", value: stats.aerobic_systems, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: "Jobs This Month", value: stats.jobs_this_month, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Pipeline Revenue", value: `$${(stats.estimated_pipeline_revenue / 1000).toFixed(0)}K`, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl p-4 ${c.bg}`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────

function SummaryBar({ summary }: { summary: { critical: number; high: number; medium: number; low: number; revenue_opportunity: number; actionable_customers: number } }) {
  const total = summary.critical + summary.high + summary.medium + summary.low;
  if (total === 0) return null;

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Distribution</h3>
          <span className="text-sm text-emerald-600 font-semibold">${(summary.revenue_opportunity / 1000).toFixed(0)}K opportunity</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {summary.critical > 0 && <div className="bg-red-500" style={{ width: pct(summary.critical) }} />}
          {summary.high > 0 && <div className="bg-orange-400" style={{ width: pct(summary.high) }} />}
          {summary.medium > 0 && <div className="bg-yellow-400" style={{ width: pct(summary.medium) }} />}
          {summary.low > 0 && <div className="bg-green-400" style={{ width: pct(summary.low) }} />}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{summary.critical} Critical</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />{summary.high} High</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" />{summary.medium} Medium</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" />{summary.low} Low</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Customer Row ────────────────────────────────────────

function CustomerRow({ score, onSelect }: { score: PredictiveScore; onSelect: (s: PredictiveScore) => void }) {
  return (
    <div
      onClick={() => onSelect(score)}
      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{score.customer_name}</p>
          <RiskBadge level={score.risk_level} score={score.risk_score} />
        </div>
        <p className="text-xs text-gray-500 truncate">{score.address}</p>
        <div className="mt-1 flex gap-3 text-xs text-gray-400">
          <span>{score.system_type}</span>
          {score.manufacturer !== "unknown" && <span>{score.manufacturer}</span>}
          {score.tank_size_gallons && <span>{score.tank_size_gallons} gal</span>}
        </div>
      </div>
      <div className="ml-4 text-right shrink-0">
        {score.days_until_due !== null ? (
          <p className={`text-sm font-bold ${score.days_until_due <= 0 ? "text-red-600" : score.days_until_due <= 30 ? "text-orange-600" : "text-gray-600"}`}>
            {score.days_until_due <= 0 ? `${Math.abs(score.days_until_due)}d overdue` : `${score.days_until_due}d`}
          </p>
        ) : (
          <p className="text-xs text-gray-400">No date</p>
        )}
        <p className="text-xs text-gray-400">{score.total_services} services</p>
      </div>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────

function DetailPanel({ score, onClose }: { score: PredictiveScore; onClose: () => void }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{score.customer_name}</h3>
            <p className="text-sm text-gray-500">{score.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge level={score.risk_level} score={score.risk_score} />
          <span className="text-sm text-gray-600 dark:text-gray-400">{score.recommended_action}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">System</p>
            <p className="font-semibold">{score.system_type} {score.manufacturer !== "unknown" ? `(${score.manufacturer})` : ""}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Tank Size</p>
            <p className="font-semibold">{score.tank_size_gallons ? `${score.tank_size_gallons} gal` : "Unknown"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Last Pumped</p>
            <p className="font-semibold">{score.last_pump_date || "Never"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500">Predicted Due</p>
            <p className="font-semibold">{score.predicted_due_date || "N/A"}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 mb-2">Risk Factors</h4>
          <ul className="space-y-1">
            {score.factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-orange-500 mt-0.5">&#9679;</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          {score.phone && (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${score.phone}`}>Call {score.phone}</a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={`/customers/${score.customer_id}`}>View Customer</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Campaign Preview ────────────────────────────────────

function CampaignSection() {
  const { data: campaign, isLoading } = useCampaignPreview({ min_score: 30, days_horizon: 60 });

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!campaign || campaign.target_count === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-Generated Campaign</h3>
            <p className="text-xs text-gray-500">{campaign.name}</p>
          </div>
          <Badge variant="secondary">{campaign.target_count} customers</Badge>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 mb-3">
          <p className="font-medium mb-1">SMS Template:</p>
          <p className="text-xs italic">{campaign.message_template}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs text-gray-500">
            <span>{campaign.breakdown.critical} critical</span>
            <span>{campaign.breakdown.high} high</span>
            <span>{campaign.breakdown.medium} medium</span>
          </div>
          <span className="text-sm font-bold text-emerald-600">${(campaign.estimated_revenue / 1000).toFixed(0)}K est. revenue</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────

export function PredictiveServicePage() {
  const [riskFilter, setRiskFilter] = useState<string | undefined>(undefined);
  const [selectedScore, setSelectedScore] = useState<PredictiveScore | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading } = usePredictiveScores({
    risk_level: riskFilter,
    min_score: 0,
    limit: 25,
    offset: page * 25,
  });

  const filters = [
    { label: "All", value: undefined },
    { label: "Critical", value: "critical" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Predictive Service Engine</h1>
          <p className="text-sm text-gray-500">Know before they call — AI-powered service predictions</p>
        </div>
      </div>

      <KPICards />

      {data?.summary && <SummaryBar summary={data.summary} />}

      <CampaignSection />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => { setRiskFilter(f.value); setPage(0); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              riskFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {f.label}
            {data?.summary && f.value && (
              <span className="ml-1 opacity-70">({data.summary[f.value as keyof typeof data.summary]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex gap-4">
        {/* Score list */}
        <div className="flex-1 space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : data?.scores.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-4xl mb-2">&#10003;</p>
                <p className="text-gray-500">No customers match this filter</p>
              </CardContent>
            </Card>
          ) : (
            data?.scores.map((s) => (
              <CustomerRow key={s.customer_id} score={s} onSelect={setSelectedScore} />
            ))
          )}

          {/* Pagination */}
          {data && data.pagination.total > 25 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 py-1.5">
                {page * 25 + 1}-{Math.min((page + 1) * 25, data.pagination.total)} of {data.pagination.total}
              </span>
              <Button size="sm" variant="outline" disabled={(page + 1) * 25 >= data.pagination.total} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedScore && (
          <div className="hidden lg:block w-96 shrink-0">
            <div className="sticky top-4">
              <DetailPanel score={selectedScore} onClose={() => setSelectedScore(null)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
