import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { apiClient } from "@/api/client.ts";

// ---------------------------------------------------------------------------
// Inline TanStack Query hooks for Nashville Ads endpoints
// ---------------------------------------------------------------------------

function useNashvilleDashboard() {
  return useQuery({
    queryKey: ["marketing", "nashville", "dashboard"],
    queryFn: async () => {
      const res = await apiClient.get("/marketing-hub/nashville/dashboard");
      return res.data;
    },
    refetchInterval: 300_000, // 5 min auto-refresh
  });
}

function useNashvilleSearchTerms(days: number = 1) {
  return useQuery({
    queryKey: ["marketing", "nashville", "search-terms", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/search-terms?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleKeywords(days: number = 7) {
  return useQuery({
    queryKey: ["marketing", "nashville", "keywords", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/keywords?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleWasteAlerts() {
  return useQuery({
    queryKey: ["marketing", "nashville", "waste-alerts"],
    queryFn: async () => {
      const res = await apiClient.get("/marketing-hub/nashville/waste-alerts");
      return res.data;
    },
    refetchInterval: 300_000,
  });
}

function useNashvilleImpressionShare(days: number = 7) {
  return useQuery({
    queryKey: ["marketing", "nashville", "impression-share", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/impression-share?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleAutomationStatus() {
  return useQuery({
    queryKey: ["marketing", "nashville", "automation-status"],
    queryFn: async () => {
      const res = await apiClient.get("/marketing-hub/nashville/automation-status");
      return res.data;
    },
  });
}

function useNashvilleNegativeCandidates(days: number = 7) {
  return useQuery({
    queryKey: ["marketing", "nashville", "negative-candidates", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/negative-keyword-candidates?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleHourlyBids(days: number = 30) {
  return useQuery({
    queryKey: ["marketing", "nashville", "hourly-bids", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/hourly-bid-analysis?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleDailyBids(days: number = 90) {
  return useQuery({
    queryKey: ["marketing", "nashville", "daily-bids", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/daily-bid-analysis?days=${days}`);
      return res.data;
    },
  });
}

function useNashvillePauseCandidates(days: number = 30) {
  return useQuery({
    queryKey: ["marketing", "nashville", "pause-candidates", days],
    queryFn: async () => {
      const res = await apiClient.get(`/marketing-hub/nashville/pause-candidates?days=${days}`);
      return res.data;
    },
  });
}

function useNashvilleBudgetPacing() {
  return useQuery({
    queryKey: ["marketing", "nashville", "budget-pacing"],
    queryFn: async () => {
      const res = await apiClient.get("/marketing-hub/nashville/budget-pacing");
      return res.data;
    },
    refetchInterval: 300_000,
  });
}

function useNashvilleDailyReport() {
  return useQuery({
    queryKey: ["marketing", "nashville", "daily-report"],
    queryFn: async () => {
      const res = await apiClient.get("/marketing-hub/nashville/daily-report");
      return res.data;
    },
  });
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);

const fmtNum = (v: number) => new Intl.NumberFormat("en-US").format(v);

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "live" | "search-terms" | "keywords" | "waste" | "automations";
type AutoTab = "overview" | "negatives" | "hourly" | "daily" | "pausing" | "pacing" | "report";

interface HourlyBucket {
  hour: number;
  cost: number;
  clicks: number;
  impressions: number;
}

interface CampaignRow {
  id: string;
  name: string;
  spend: number;
  clicks: number;
  conversions: number;
  budget: number;
  budget_used_pct: number;
}

interface SearchTermRow {
  search_term: string;
  term?: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  flag: "competitor" | "irrelevant" | "brand" | "good" | null;
}

interface KeywordRow {
  keyword: string;
  match_type: string;
  clicks: number;
  impressions: number;
  conversions: number;
  avg_cpc: number;
  cpc?: number;
  cost: number;
  search_is: number | null;
  impression_share?: number;
}

interface WasteAlert {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  cost: number;
}

interface AutomationItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  last_run?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NashvilleDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [autoTab, setAutoTab] = useState<AutoTab>("overview");
  const [searchDays, setSearchDays] = useState(1);
  const [keywordDays, setKeywordDays] = useState(7);
  const [applyingNeg, setApplyingNeg] = useState(false);
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading, dataUpdatedAt } = useNashvilleDashboard();
  const { data: searchTermsData, isLoading: searchLoading } = useNashvilleSearchTerms(searchDays);
  const { data: keywordsData, isLoading: keywordsLoading } = useNashvilleKeywords(keywordDays);
  const { data: wasteData, isLoading: wasteLoading } = useNashvilleWasteAlerts();
  const { data: impressionData } = useNashvilleImpressionShare();
  const { data: automationData, isLoading: autoLoading } = useNashvilleAutomationStatus();
  const { data: negData, isLoading: negLoading } = useNashvilleNegativeCandidates();
  const { data: hourlyBidData, isLoading: hourlyBidLoading } = useNashvilleHourlyBids();
  const { data: dailyBidData, isLoading: dailyBidLoading } = useNashvilleDailyBids();
  const { data: pauseData, isLoading: pauseLoading } = useNashvillePauseCandidates();
  const { data: pacingData } = useNashvilleBudgetPacing();
  const { data: reportData, isLoading: reportLoading } = useNashvilleDailyReport();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["marketing", "nashville"] });
  }, [queryClient]);

  const handleApplyNegatives = useCallback(async (keywords: { keyword_text: string; match_type: string }[]) => {
    setApplyingNeg(true);
    try {
      await apiClient.post("/marketing-hub/nashville/apply-negative-keywords", { keywords });
      queryClient.invalidateQueries({ queryKey: ["marketing", "nashville", "negative-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["marketing", "nashville", "search-terms"] });
    } finally {
      setApplyingNeg(false);
    }
  }, [queryClient]);

  // Budget health — API returns budget_summary with total_daily_budget, total_today_spend, etc.
  const budgetSummary = dashboard?.budget_summary;
  const dailyBudget: number = budgetSummary?.total_daily_budget ?? 0;
  const todaySpend: number = budgetSummary?.total_today_spend ?? 0;
  const remaining: number = budgetSummary?.total_remaining ?? (dailyBudget - todaySpend);
  const pacingPct: number = dailyBudget > 0 ? todaySpend / dailyBudget : 0;

  const pacingColor =
    pacingPct > 1.0
      ? "text-red-600"
      : pacingPct > 0.85
        ? "text-yellow-600"
        : "text-green-600";

  const pacingBg =
    pacingPct > 1.0
      ? "bg-red-600"
      : pacingPct > 0.85
        ? "bg-yellow-500"
        : "bg-green-500";

  const pacingLabel =
    pacingPct > 1.0
      ? "Over Budget"
      : pacingPct > 0.85
        ? "Watch Pacing"
        : "On Track";

  // KPI values — API returns today.totals with cost, clicks, impressions, conversions, calls, cpa
  const totals = dashboard?.today?.totals;
  const kpis = {
    spend_today: totals?.cost ?? 0,
    clicks: totals?.clicks ?? 0,
    impressions: totals?.impressions ?? 0,
    conversions: totals?.conversions ?? 0,
    calls: totals?.calls ?? 0,
    cpa: totals?.cpa ?? 0,
  };

  // Hourly data
  const hourlyData: HourlyBucket[] = dashboard?.hourly ?? [];
  const maxHourlyCost = Math.max(...(hourlyData.map((h) => h.cost) || [1]), 1);

  // Campaign data — API nests campaigns inside today.campaigns
  const campaigns: CampaignRow[] = dashboard?.today?.campaigns ?? [];

  // Search terms — API returns { terms: [...], summary: { total_waste } }
  const searchTerms: SearchTermRow[] = searchTermsData?.terms ?? [];
  const totalWaste: number = searchTermsData?.summary?.total_waste ?? 0;

  // Keywords — API returns { data: [...] }
  const keywords: KeywordRow[] = keywordsData?.data ?? [];
  const sortedKeywords = [...keywords].sort((a, b) => b.cost - a.cost);

  // Waste alerts
  const alerts: WasteAlert[] = wasteData?.alerts ?? [];

  // Automations — API returns object keyed by automation name, convert to array
  const automations: AutomationItem[] = automationData?.automations
    ? Object.entries(automationData.automations as Record<string, { enabled: boolean; description: string; action_id?: string }>).map(
        ([key, val]) => ({
          id: key,
          name: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: val.description || "",
          enabled: val.enabled ?? false,
        }),
      )
    : [];

  // Impression share
  const impressionShareSummary = impressionData?.summary;

  // Tabs config
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "live", label: "Live Dashboard" },
    { key: "search-terms", label: "Search Terms" },
    { key: "keywords", label: "Keywords" },
    { key: "waste", label: "Waste Alerts", count: alerts.length },
    { key: "automations", label: "Automations" },
  ];

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--";

  // Flag badge helper
  const flagBadge = (flag: SearchTermRow["flag"]) => {
    if (!flag || flag === "good") return null;
    if (flag === "competitor")
      return <Badge variant="danger">Competitor</Badge>;
    if (flag === "irrelevant")
      return <Badge variant="warning">Irrelevant</Badge>;
    if (flag === "brand")
      return <Badge variant="info">Brand</Badge>;
    return null;
  };

  // Severity badge
  const severityBadge = (severity: WasteAlert["severity"]) => {
    if (severity === "high") return <Badge variant="danger">HIGH</Badge>;
    if (severity === "medium") return <Badge variant="warning">MEDIUM</Badge>;
    return <Badge variant="info">LOW</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ============================================================= */}
      {/* HEADER                                                        */}
      {/* ============================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/marketing/ads">
            <Button variant="ghost" size="sm">
              &larr; Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Nashville Ads Command Center
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Real-time Google Ads performance for Nashville market
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span
              className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"
              title="Auto-refreshing every 5 minutes"
            />
            <span>Auto-refresh 5m</span>
            <span className="text-text-secondary/60">|</span>
            <span>Updated {lastUpdated}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* BUDGET SUMMARY BAR                                            */}
      {/* ============================================================= */}
      <Card className="border-l-4 border-l-primary">
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-8 flex-wrap">
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
                  Daily Budget
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {isLoading ? "..." : fmt(dailyBudget)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
                  Today's Spend
                </p>
                <p className={`text-xl font-bold ${pacingColor}`}>
                  {isLoading ? "..." : fmt(todaySpend)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
                  Remaining
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {isLoading ? "..." : fmt(Math.max(remaining, 0))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 min-w-[220px]">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">Budget Pacing</span>
                  <span className={`text-xs font-semibold ${pacingColor}`}>
                    {isLoading ? "..." : fmtPct(pacingPct)}
                  </span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pacingBg}`}
                    style={{ width: `${Math.min(pacingPct * 100, 100)}%` }}
                  />
                </div>
              </div>
              <Badge
                variant={
                  pacingPct > 1.0
                    ? "danger"
                    : pacingPct > 0.85
                      ? "warning"
                      : "success"
                }
              >
                {pacingLabel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================= */}
      {/* KPI CARDS                                                     */}
      {/* ============================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Spend Today",
            value: isLoading ? "..." : fmt(kpis.spend_today),
            color: "text-text-primary",
          },
          {
            label: "Clicks",
            value: isLoading ? "..." : fmtNum(kpis.clicks),
            color: "text-primary",
          },
          {
            label: "Impressions",
            value: isLoading ? "..." : fmtNum(kpis.impressions),
            color: "text-text-primary",
          },
          {
            label: "Conversions",
            value: isLoading ? "..." : fmtNum(kpis.conversions),
            color: "text-green-600",
          },
          {
            label: "Calls",
            value: isLoading ? "..." : fmtNum(kpis.calls),
            color: "text-blue-600",
          },
          {
            label: "CPA",
            value: isLoading ? "..." : fmt(kpis.cpa),
            color: kpis.cpa > 120 ? "text-red-600" : kpis.cpa > 80 ? "text-yellow-600" : "text-green-600",
          },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-1">
                {card.label}
              </p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ============================================================= */}
      {/* TABS                                                          */}
      {/* ============================================================= */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[18px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================= */}
      {/* LIVE DASHBOARD TAB                                            */}
      {/* ============================================================= */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {/* Hourly Spend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Spend Today</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-[160px] bg-surface-hover rounded" />
              ) : hourlyData.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  No hourly data available yet today.
                </p>
              ) : (
                <div className="flex items-end gap-1 h-[160px]">
                  {hourlyData.map((h) => {
                    const barHeight =
                      maxHourlyCost > 0 ? (h.cost / maxHourlyCost) * 120 : 2;
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                      >
                        <span className="text-[10px] text-text-secondary font-medium">
                          {fmt(h.cost).replace("$", "")}
                        </span>
                        <div
                          style={{ height: `${barHeight}px` }}
                          className="bg-primary hover:bg-primary/80 rounded-t w-full min-h-[2px] transition-colors cursor-default"
                          title={`${h.hour}:00 — ${fmt(h.cost)} | ${fmtNum(h.clicks)} clicks | ${fmtNum(h.impressions)} impr`}
                        />
                        <span className="text-[10px] text-text-secondary">
                          {h.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Breakdown */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-10 bg-surface-hover rounded" />
                      <div className="h-10 bg-surface-hover rounded" />
                      <div className="h-10 bg-surface-hover rounded" />
                    </div>
                  ) : campaigns.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-8">
                      No campaign data available.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 font-medium text-text-secondary">Campaign</th>
                            <th className="pb-2 font-medium text-text-secondary text-right">Spend</th>
                            <th className="pb-2 font-medium text-text-secondary text-right">Clicks</th>
                            <th className="pb-2 font-medium text-text-secondary text-right">Conv.</th>
                            <th className="pb-2 font-medium text-text-secondary text-right">Budget Used</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaigns.map((c) => {
                            const usedPct = c.budget_used_pct ?? (c.budget > 0 ? c.spend / c.budget : 0);
                            const usedColor =
                              usedPct > 1.0
                                ? "text-red-600"
                                : usedPct > 0.85
                                  ? "text-yellow-600"
                                  : "text-green-600";
                            return (
                              <tr
                                key={c.id}
                                className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                              >
                                <td className="py-2.5 font-medium text-text-primary">
                                  {c.name}
                                </td>
                                <td className="py-2.5 text-right">{fmt(c.spend)}</td>
                                <td className="py-2.5 text-right">{fmtNum(c.clicks)}</td>
                                <td className="py-2.5 text-right">{fmtNum(c.conversions)}</td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 bg-surface-hover rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          usedPct > 1.0
                                            ? "bg-red-500"
                                            : usedPct > 0.85
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(usedPct * 100, 100)}%`,
                                        }}
                                      />
                                    </div>
                                    <span className={`font-medium ${usedColor}`}>
                                      {fmtPct(usedPct)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Impression Share Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Impression Share</CardTitle>
              </CardHeader>
              <CardContent>
                {impressionShareSummary ? (
                  <div className="space-y-4">
                    {[
                      {
                        label: "Search Impr. Share",
                        value: impressionShareSummary.search_impression_share,
                      },
                      {
                        label: "Lost (Budget)",
                        value: impressionShareSummary.lost_budget,
                      },
                      {
                        label: "Lost (Rank)",
                        value: impressionShareSummary.lost_rank,
                      },
                      {
                        label: "Top Impr. Share",
                        value: impressionShareSummary.top_impression_share,
                      },
                      {
                        label: "Abs. Top Impr. Share",
                        value: impressionShareSummary.abs_top_impression_share,
                      },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-text-secondary">
                            {metric.label}
                          </span>
                          <span className="text-xs font-semibold text-text-primary">
                            {metric.value != null ? fmtPct(metric.value) : "--"}
                          </span>
                        </div>
                        <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-500"
                            style={{
                              width: `${Math.min((metric.value ?? 0) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary text-center py-8">
                    <p>No impression share data available.</p>
                    <p className="text-xs mt-1">
                      Data appears once campaigns have sufficient volume.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SEARCH TERMS TAB                                              */}
      {/* ============================================================= */}
      {activeTab === "search-terms" && (
        <div className="space-y-6">
          {/* Waste callout */}
          {totalWaste > 0 && (
            <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20">
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <span className="text-red-600 text-xl font-bold">$</span>
                  </div>
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                      Estimated Waste from Flagged Search Terms
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {fmt(totalWaste)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Search Terms Report</CardTitle>
                <select
                  value={searchDays}
                  onChange={(e) => setSearchDays(Number(e.target.value))}
                  className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm"
                >
                  <option value={1}>Today</option>
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-surface-hover rounded" />
                  <div className="h-8 bg-surface-hover rounded" />
                  <div className="h-8 bg-surface-hover rounded" />
                  <div className="h-8 bg-surface-hover rounded" />
                </div>
              ) : searchTerms.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  No search term data available for this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium text-text-secondary">Search Term</th>
                        <th className="pb-2 font-medium text-text-secondary">Flag</th>
                        <th className="pb-2 font-medium text-text-secondary text-right">Clicks</th>
                        <th className="pb-2 font-medium text-text-secondary text-right">Impr.</th>
                        <th className="pb-2 font-medium text-text-secondary text-right">Cost</th>
                        <th className="pb-2 font-medium text-text-secondary text-right">Conv.</th>
                        <th className="pb-2 font-medium text-text-secondary text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchTerms.map((t, idx) => (
                        <tr
                          key={`${t.search_term}-${idx}`}
                          className={`border-b border-border/50 hover:bg-surface-hover/50 transition-colors ${
                            t.flag === "competitor" || t.flag === "irrelevant"
                              ? "bg-red-50/50 dark:bg-red-950/10"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 font-medium text-text-primary max-w-[300px] truncate">
                            {t.search_term}
                          </td>
                          <td className="py-2.5">{flagBadge(t.flag)}</td>
                          <td className="py-2.5 text-right">{fmtNum(t.clicks)}</td>
                          <td className="py-2.5 text-right">{fmtNum(t.impressions)}</td>
                          <td className="py-2.5 text-right">{fmt(t.cost)}</td>
                          <td className="py-2.5 text-right">{fmtNum(t.conversions)}</td>
                          <td className="py-2.5 text-right">
                            {(t.flag === "competitor" || t.flag === "irrelevant") && (
                              <Button variant="danger" size="sm">
                                + Negative
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* KEYWORDS TAB                                                  */}
      {/* ============================================================= */}
      {activeTab === "keywords" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Keyword Performance</CardTitle>
              <select
                value={keywordDays}
                onChange={(e) => setKeywordDays(Number(e.target.value))}
                className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {keywordsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-surface-hover rounded" />
                <div className="h-8 bg-surface-hover rounded" />
                <div className="h-8 bg-surface-hover rounded" />
              </div>
            ) : sortedKeywords.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                No keyword data available for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-text-secondary">Keyword</th>
                      <th className="pb-2 font-medium text-text-secondary">Match Type</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">Clicks</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">Impr.</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">Conv.</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">CPC</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">Cost</th>
                      <th className="pb-2 font-medium text-text-secondary text-right">Impr. Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedKeywords.map((k, idx) => (
                      <tr
                        key={`${k.keyword}-${idx}`}
                        className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                      >
                        <td className="py-2.5 font-medium text-text-primary max-w-[250px] truncate">
                          {k.keyword}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              k.match_type === "EXACT"
                                ? "success"
                                : k.match_type === "PHRASE"
                                  ? "info"
                                  : "secondary"
                            }
                            size="sm"
                          >
                            {k.match_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">{fmtNum(k.clicks)}</td>
                        <td className="py-2.5 text-right">{fmtNum(k.impressions)}</td>
                        <td className="py-2.5 text-right">{fmtNum(k.conversions)}</td>
                        <td className="py-2.5 text-right">{fmt(k.avg_cpc)}</td>
                        <td className="py-2.5 text-right font-medium">{fmt(k.cost)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 bg-surface-hover rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{
                                  width: `${Math.min((k.search_is ?? 0) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs">
                              {k.search_is != null
                                ? fmtPct(k.search_is)
                                : "--"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================= */}
      {/* WASTE ALERTS TAB                                              */}
      {/* ============================================================= */}
      {activeTab === "waste" && (
        <div className="space-y-4">
          {wasteLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-surface-hover rounded" />
              <div className="h-20 bg-surface-hover rounded" />
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <span className="text-green-600 text-2xl font-bold">&#10003;</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    No Waste Alerts
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Your campaigns are running efficiently. We will alert you if
                    we detect any wasted spend.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === "high"
                    ? "border-l-red-500"
                    : alert.severity === "medium"
                      ? "border-l-yellow-500"
                      : "border-l-blue-400"
                }`}
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-0.5">
                      {severityBadge(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" size="sm">
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-primary">{alert.message}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-text-secondary">Estimated Cost</p>
                      <p className="text-lg font-bold text-red-600">{fmt(alert.cost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* AUTOMATIONS TAB                                               */}
      {/* ============================================================= */}
      {activeTab === "automations" && (
        <div className="space-y-4">
          {/* Automation sub-tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
            {([
              ["overview", "Overview"],
              ["negatives", "Negative Keywords"],
              ["hourly", "Hourly Bids"],
              ["daily", "Day-of-Week"],
              ["pausing", "Keyword Pausing"],
              ["pacing", "Budget Pacing"],
              ["report", "Daily Report"],
            ] as [AutoTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAutoTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t whitespace-nowrap transition-colors ${
                  autoTab === key
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* OVERVIEW — status cards for all automations */}
          {autoTab === "overview" && (
            autoLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-surface-hover rounded" />
                <div className="h-16 bg-surface-hover rounded" />
              </div>
            ) : (
              <div className="space-y-3">
                {automations.map((auto) => (
                  <Card key={auto.id}>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                          auto.enabled ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                        }`}>
                          <div className={`h-3 w-3 rounded-full ${auto.enabled ? "bg-green-500" : "bg-gray-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-text-primary text-sm">{auto.name}</h4>
                            <Badge variant={auto.enabled ? "success" : "secondary"} size="sm">
                              {auto.enabled ? "Active" : "Off"}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-secondary">{auto.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* NEGATIVE KEYWORDS — candidates + apply */}
          {autoTab === "negatives" && (
            negLoading ? (
              <div className="animate-pulse h-40 bg-surface-hover rounded" />
            ) : (
              <div className="space-y-4">
                {negData?.summary && (
                  <Card>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-secondary">Estimated Waste (7d)</p>
                          <p className="text-2xl font-bold text-red-600">{fmt(negData.summary.total_waste)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-secondary">Candidates</p>
                          <p className="text-2xl font-bold text-text-primary">{negData.summary.candidate_count}</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={applyingNeg || !negData?.candidates?.length}
                          onClick={() => {
                            const kws = (negData.candidates || []).map((c: { search_term: string; recommended_match_type: string }) => ({
                              keyword_text: c.search_term,
                              match_type: c.recommended_match_type || "EXACT",
                            }));
                            handleApplyNegatives(kws);
                          }}
                        >
                          {applyingNeg ? "Applying..." : "Apply All Negatives"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-4 text-text-secondary font-medium">Search Term</th>
                        <th className="py-2 pr-4 text-text-secondary font-medium">Reason</th>
                        <th className="py-2 pr-4 text-text-secondary font-medium text-right">Cost</th>
                        <th className="py-2 pr-4 text-text-secondary font-medium text-right">Clicks</th>
                        <th className="py-2 pr-4 text-text-secondary font-medium text-right">Conv</th>
                        <th className="py-2 text-text-secondary font-medium">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(negData?.candidates || []).map((c: { search_term: string; reason: string; cost: number; clicks: number; conversions: number; recommended_match_type: string }, i: number) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4 text-text-primary">{c.search_term}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={c.reason === "competitor" ? "danger" : c.reason === "irrelevant" ? "warning" : "secondary"} size="sm">
                              {c.reason}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-right text-text-primary">{fmt(c.cost)}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{c.clicks}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{c.conversions}</td>
                          <td className="py-2 text-xs text-text-secondary">{c.recommended_match_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!negData?.candidates || negData.candidates.length === 0) && (
                    <p className="text-center py-8 text-sm text-text-secondary">No negative keyword candidates found.</p>
                  )}
                </div>
              </div>
            )
          )}

          {/* HOURLY BID ANALYSIS */}
          {autoTab === "hourly" && (
            hourlyBidLoading ? (
              <div className="animate-pulse h-40 bg-surface-hover rounded" />
            ) : (
              <div className="space-y-4">
                {(hourlyBidData?.recommendations || []).length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Bid Recommendations</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(hourlyBidData.recommendations as { hour: number; action: string; bid_modifier: number; reason: string }[]).map((r, i: number) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                            r.action === "increase" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                          }`}>
                            <div>
                              <span className="font-medium text-sm text-text-primary">
                                {r.hour}:00 — {r.action === "increase" ? "Increase" : "Decrease"} bids to {r.bid_modifier}x
                              </span>
                              <p className="text-xs text-text-secondary">{r.reason}</p>
                            </div>
                            <Badge variant={r.action === "increase" ? "success" : "danger"} size="sm">
                              {r.action === "increase" ? "+" : ""}{((r.bid_modifier - 1) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader><CardTitle>Hourly Performance (30d)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="py-1.5 pr-3 text-text-secondary">Hour</th>
                            <th className="py-1.5 pr-3 text-right text-text-secondary">Clicks</th>
                            <th className="py-1.5 pr-3 text-right text-text-secondary">Impr</th>
                            <th className="py-1.5 pr-3 text-right text-text-secondary">Conv</th>
                            <th className="py-1.5 pr-3 text-right text-text-secondary">Cost</th>
                            <th className="py-1.5 text-right text-text-secondary">Conv Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(hourlyBidData?.hours || []).filter((h: { impressions: number }) => h.impressions > 0).map((h: { hour: number; clicks: number; impressions: number; conversions: number; cost: number; conv_rate: number }, i: number) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-1.5 pr-3 text-text-primary font-medium">{h.hour}:00</td>
                              <td className="py-1.5 pr-3 text-right">{h.clicks}</td>
                              <td className="py-1.5 pr-3 text-right">{fmtNum(h.impressions)}</td>
                              <td className="py-1.5 pr-3 text-right font-medium">{h.conversions}</td>
                              <td className="py-1.5 pr-3 text-right">{fmt(h.cost)}</td>
                              <td className="py-1.5 text-right">{(h.conv_rate * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          )}

          {/* DAY-OF-WEEK BID ANALYSIS */}
          {autoTab === "daily" && (
            dailyBidLoading ? (
              <div className="animate-pulse h-40 bg-surface-hover rounded" />
            ) : (
              <div className="space-y-4">
                {(dailyBidData?.recommendations || []).length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Day-of-Week Bid Recommendations</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(dailyBidData.recommendations as { day: string; action: string; bid_modifier: number; reason: string }[]).map((r, i: number) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                            r.action === "increase" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                          }`}>
                            <div>
                              <span className="font-medium text-sm text-text-primary">
                                {r.day} — {r.action === "increase" ? "Increase" : "Decrease"} bids to {r.bid_modifier}x
                              </span>
                              <p className="text-xs text-text-secondary">{r.reason}</p>
                            </div>
                            <Badge variant={r.action === "increase" ? "success" : "danger"} size="sm">
                              {r.action === "increase" ? "+" : ""}{((r.bid_modifier - 1) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader><CardTitle>Day-of-Week Performance (90d)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="py-2 pr-4 text-text-secondary font-medium">Day</th>
                            <th className="py-2 pr-4 text-right text-text-secondary font-medium">Clicks</th>
                            <th className="py-2 pr-4 text-right text-text-secondary font-medium">Impr</th>
                            <th className="py-2 pr-4 text-right text-text-secondary font-medium">Conv</th>
                            <th className="py-2 pr-4 text-right text-text-secondary font-medium">Cost</th>
                            <th className="py-2 text-right text-text-secondary font-medium">CPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dailyBidData?.days || []).map((d: { day: string; clicks: number; impressions: number; conversions: number; cost: number; cpa: number | null }, i: number) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 pr-4 font-medium text-text-primary">{d.day}</td>
                              <td className="py-2 pr-4 text-right">{d.clicks}</td>
                              <td className="py-2 pr-4 text-right">{fmtNum(d.impressions)}</td>
                              <td className="py-2 pr-4 text-right font-semibold">{d.conversions}</td>
                              <td className="py-2 pr-4 text-right">{fmt(d.cost)}</td>
                              <td className="py-2 text-right">{d.cpa ? fmt(d.cpa) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          )}

          {/* KEYWORD PAUSING CANDIDATES */}
          {autoTab === "pausing" && (
            pauseLoading ? (
              <div className="animate-pulse h-40 bg-surface-hover rounded" />
            ) : (
              <div className="space-y-4">
                {pauseData?.summary && (
                  <Card>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-secondary">Potential Savings (30d)</p>
                          <p className="text-2xl font-bold text-green-600">{fmt(pauseData.summary.potential_savings)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-secondary">Pause Candidates</p>
                          <p className="text-2xl font-bold text-text-primary">{pauseData.summary.candidate_count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {(pauseData?.candidates || []).length === 0 ? (
                  <Card>
                    <CardContent>
                      <div className="text-center py-8">
                        <p className="text-green-600 font-semibold">All keywords performing well</p>
                        <p className="text-sm text-text-secondary mt-1">No keywords meet the pause threshold ($50+ spend, 0 conversions).</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-2 pr-4 text-text-secondary font-medium">Keyword</th>
                          <th className="py-2 pr-4 text-text-secondary font-medium">Match</th>
                          <th className="py-2 pr-4 text-text-secondary font-medium">Reason</th>
                          <th className="py-2 pr-4 text-right text-text-secondary font-medium">Cost</th>
                          <th className="py-2 pr-4 text-right text-text-secondary font-medium">Clicks</th>
                          <th className="py-2 text-right text-text-secondary font-medium">Conv</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pauseData.candidates as { keyword: string; match_type: string; reason: string; cost: number; clicks: number; conversions: number }[]).map((c, i: number) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-4 text-text-primary font-medium">{c.keyword}</td>
                            <td className="py-2 pr-4 text-xs text-text-secondary">{c.match_type}</td>
                            <td className="py-2 pr-4"><Badge variant="danger" size="sm">{c.reason.replace(/_/g, " ")}</Badge></td>
                            <td className="py-2 pr-4 text-right text-red-600 font-medium">{fmt(c.cost)}</td>
                            <td className="py-2 pr-4 text-right">{c.clicks}</td>
                            <td className="py-2 text-right">{c.conversions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}

          {/* BUDGET PACING */}
          {autoTab === "pacing" && (
            <div className="space-y-4">
              {pacingData?.summary && (
                <Card>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-text-secondary">Daily Budget</p>
                        <p className="text-lg font-bold text-text-primary">{fmt(pacingData.summary.total_daily_budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Today&apos;s Spend</p>
                        <p className="text-lg font-bold text-text-primary">{fmt(pacingData.summary.total_today_spend)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Remaining</p>
                        <p className="text-lg font-bold text-green-600">{fmt(pacingData.summary.total_remaining)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Hour {pacingData.summary.current_hour} of 24</p>
                        <p className="text-lg font-bold text-text-primary">{pacingData.summary.overall_pacing_pct}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {(pacingData?.campaigns || []).map((c: { campaign: string; daily_budget: number; today_spend: number; remaining: number; projected_eod_spend: number; projected_over_under: number; status: string; hourly_rate: number; recommended_hourly: number }, i: number) => (
                <Card key={i}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-text-primary">{c.campaign}</h4>
                      <Badge variant={c.status === "on_track" ? "success" : c.status === "overspending" ? "danger" : "warning"} size="sm">
                        {c.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-text-secondary">Budget:</span> <span className="font-medium">{fmt(c.daily_budget)}</span></div>
                      <div><span className="text-text-secondary">Spent:</span> <span className="font-medium">{fmt(c.today_spend)}</span></div>
                      <div><span className="text-text-secondary">Projected EOD:</span> <span className={`font-medium ${c.projected_over_under > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(c.projected_eod_spend)}</span></div>
                      <div><span className="text-text-secondary">Rate:</span> <span className="font-medium">{fmt(c.hourly_rate)}/hr</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* DAILY REPORT */}
          {autoTab === "report" && (
            reportLoading ? (
              <div className="animate-pulse h-40 bg-surface-hover rounded" />
            ) : reportData ? (
              <div className="space-y-4">
                {/* Alerts */}
                {(reportData.alerts || []).length > 0 && (
                  <Card>
                    <CardContent>
                      <div className="space-y-2">
                        {(reportData.alerts as string[]).map((alert, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                            <span className="text-yellow-600 font-medium">!</span>
                            <span className="text-text-primary">{alert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle>Today&apos;s Performance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-text-secondary">Spend</span><span className="font-medium">{fmt(reportData.performance?.total_spend ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Clicks</span><span className="font-medium">{reportData.performance?.clicks ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Impressions</span><span className="font-medium">{fmtNum(reportData.performance?.impressions ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Conversions</span><span className="font-medium">{reportData.performance?.conversions ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">CPA</span><span className="font-medium">{fmt(reportData.performance?.cpa ?? 0)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Waste Analysis</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-text-secondary">Total Waste</span><span className="font-medium text-red-600">{fmt(reportData.waste_analysis?.total_waste ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Waste % of Spend</span><span className="font-medium">{reportData.waste_analysis?.waste_pct_of_spend ?? 0}%</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Budget Utilization</span><span className="font-medium">{reportData.budget?.utilization_pct ?? 0}%</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Top Keywords */}
                {(reportData.top_keywords || []).length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Top Converting Keywords (Today)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(reportData.top_keywords as { keyword: string; conversions: number; cost: number; clicks: number }[]).map((kw, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-text-primary font-medium">{kw.keyword}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-green-600 font-medium">{kw.conversions} conv</span>
                              <span className="text-text-secondary">{fmt(kw.cost)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-center py-8 text-sm text-text-secondary">Unable to generate daily report.</p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
