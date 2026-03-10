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
  const [searchDays, setSearchDays] = useState(1);
  const [keywordDays, setKeywordDays] = useState(7);
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading, dataUpdatedAt } = useNashvilleDashboard();
  const { data: searchTermsData, isLoading: searchLoading } = useNashvilleSearchTerms(searchDays);
  const { data: keywordsData, isLoading: keywordsLoading } = useNashvilleKeywords(keywordDays);
  const { data: wasteData, isLoading: wasteLoading } = useNashvilleWasteAlerts();
  const { data: impressionData } = useNashvilleImpressionShare();
  const { data: automationData, isLoading: autoLoading } = useNashvilleAutomationStatus();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["marketing", "nashville"] });
  }, [queryClient]);

  // Budget health
  const dailyBudget: number = dashboard?.budget?.daily_total ?? 0;
  const todaySpend: number = dashboard?.budget?.today_spend ?? 0;
  const remaining: number = dailyBudget - todaySpend;
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

  // KPI values
  const kpis = dashboard?.kpis ?? {
    spend_today: 0,
    clicks: 0,
    impressions: 0,
    conversions: 0,
    calls: 0,
    cpa: 0,
  };

  // Hourly data
  const hourlyData: HourlyBucket[] = dashboard?.hourly ?? [];
  const maxHourlyCost = Math.max(...(hourlyData.map((h) => h.cost) || [1]), 1);

  // Campaign data
  const campaigns: CampaignRow[] = dashboard?.campaigns ?? [];

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
          {autoLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-surface-hover rounded" />
              <div className="h-20 bg-surface-hover rounded" />
              <div className="h-20 bg-surface-hover rounded" />
            </div>
          ) : automations.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    No Automations Configured
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Automations will appear here once the Nashville Ads backend
                    is configured.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            automations.map((auto) => (
              <Card key={auto.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                          auto.enabled
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <div
                          className={`h-3 w-3 rounded-full ${
                            auto.enabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-text-primary truncate">
                            {auto.name}
                          </h4>
                          <Badge
                            variant={auto.enabled ? "success" : "secondary"}
                            size="sm"
                          >
                            {auto.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {auto.description}
                        </p>
                        {auto.last_run && (
                          <p className="text-xs text-text-secondary/70 mt-1">
                            Last run:{" "}
                            {new Date(auto.last_run).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
