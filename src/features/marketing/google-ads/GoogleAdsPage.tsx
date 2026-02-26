import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useAdsPerformance,
  useIntegrationSettings,
  useAdsComparison,
  useAdsAlerts,
  useDailyReport,
} from "@/api/hooks/useMarketingHub.ts";
import { SearchTermsPanel } from "./SearchTermsPanel.tsx";
import { AdGroupsPanel } from "./AdGroupsPanel.tsx";

type Tab = "overview" | "search-terms" | "ad-groups";

export function GoogleAdsPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: adsData, isLoading } = useAdsPerformance(periodDays);
  const { data: settings } = useIntegrationSettings();
  const { data: comparison } = useAdsComparison(1); // vs yesterday
  const { data: alertsData } = useAdsAlerts();
  const { data: reportData } = useDailyReport();

  const isConfigured = settings?.integrations?.google_ads?.configured;
  const alertCount = alertsData?.alerts?.length || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US").format(value);

  const renderChangeIndicator = (metricKey: string) => {
    if (!comparison?.changes?.[metricKey]) return null;
    const c = comparison.changes[metricKey];
    if (c.direction === "flat") return null;
    const isGood =
      metricKey === "cpa" || metricKey === "cost"
        ? c.direction === "down"
        : c.direction === "up";
    const color = isGood ? "text-green-600" : "text-red-600";
    const arrow = c.direction === "up" ? "\u2191" : "\u2193";
    return (
      <span className={`text-xs ${color} ml-1`}>
        {arrow} {Math.abs(c.change_percent)}%
      </span>
    );
  };

  const getCampaignHealth = (campaign: { cost: number; clicks: number; conversions: number }) => {
    const cpa = campaign.conversions > 0 ? campaign.cost / campaign.conversions : Infinity;
    const ctr = campaign.clicks / Math.max(1, 1); // We don't have impressions per campaign in this view
    if (cpa <= 80) return <Badge variant="success">Healthy</Badge>;
    if (cpa <= 120) return <Badge variant="warning">Watch</Badge>;
    return <Badge variant="danger">Over CPA</Badge>;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "search-terms", label: "Search Terms" },
    { key: "ad-groups", label: "Ad Groups" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">
              &larr; Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
              Google Ads Dashboard
              {alertCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                  {alertCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Campaign performance and optimization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-3 py-2 bg-surface border border-border rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {isConfigured ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="warning">Not Connected</Badge>
          )}
        </div>
      </div>

      {!isConfigured && (
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">&#9888;&#65039;</span>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Google Ads Not Connected</h3>
                <p className="text-sm text-text-secondary">
                  Connect your Google Ads account to see real performance data and manage campaigns.
                </p>
              </div>
              <Link to="/integrations">
                <Button variant="primary">Connect Google Ads</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Banner */}
      {alertsData?.alerts && alertsData.alerts.length > 0 && (
        <Card className="border-red-300 dark:border-red-700">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              {alertsData.alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Badge variant={alert.severity === "high" ? "danger" : "warning"}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-text-primary">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics with comparison */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Spend</div>
            <div className="text-2xl font-bold text-text-primary">
              {isLoading ? "..." : formatCurrency(adsData?.metrics?.cost || 0)}
              {renderChangeIndicator("cost")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Clicks</div>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "..." : formatNumber(adsData?.metrics?.clicks || 0)}
              {renderChangeIndicator("clicks")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Impressions</div>
            <div className="text-2xl font-bold text-text-primary">
              {isLoading ? "..." : formatNumber(adsData?.metrics?.impressions || 0)}
              {renderChangeIndicator("impressions")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Conversions</div>
            <div className="text-2xl font-bold text-success">
              {isLoading ? "..." : formatNumber(adsData?.metrics?.conversions || 0)}
              {renderChangeIndicator("conversions")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Cost/Conversion</div>
            <div className="text-2xl font-bold text-warning">
              {isLoading ? "..." : formatCurrency(adsData?.metrics?.cpa || 0)}
              {renderChangeIndicator("cpa")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Daily Report Card */}
          {reportData?.report && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Report — {reportData.report.report_date}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">{reportData.report.summary}</p>
                {reportData.report.deltas && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {Object.entries(reportData.report.deltas).slice(0, 6).map(([key, delta]) => (
                      <div key={key} className="text-center">
                        <p className="text-xs text-text-secondary capitalize">{key.replace("_", " ")}</p>
                        <p className="text-sm font-medium">
                          {typeof delta.current === "number" && delta.current < 1
                            ? `${(delta.current * 100).toFixed(1)}%`
                            : key === "cost" || key === "cpa"
                              ? formatCurrency(delta.current)
                              : delta.current}
                        </p>
                        <p className={`text-xs ${delta.change_percent > 0 ? "text-green-600" : delta.change_percent < 0 ? "text-red-600" : "text-text-secondary"}`}>
                          {delta.change_percent > 0 ? "+" : ""}{delta.change_percent}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-surface-hover rounded w-3/4"></div>
                    <div className="h-4 bg-surface-hover rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-text-secondary">CTR (Click-Through Rate)</span>
                        <span className="text-sm font-medium">
                          {((adsData?.metrics?.ctr || 0) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-hover rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min((adsData?.metrics?.ctr || 0) * 100 * 10, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">Industry average: 3-5%</p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-text-secondary">Conversion Rate</span>
                        <span className="text-sm font-medium">
                          {(((adsData?.metrics?.conversions || 0) / Math.max(1, adsData?.metrics?.clicks || 1)) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-hover rounded-full h-2">
                        <div
                          className="bg-success h-2 rounded-full"
                          style={{ width: `${Math.min(((adsData?.metrics?.conversions || 0) / Math.max(1, adsData?.metrics?.clicks || 1)) * 100 * 5, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">Industry average: 5-10%</p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-text-secondary">Avg. CPC</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency((adsData?.metrics?.cost || 0) / Math.max(1, adsData?.metrics?.clicks || 1))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">ROAS</p>
                          <p className="text-lg font-semibold">
                            {(((adsData?.metrics?.conversions || 0) * 250) / Math.max(1, adsData?.metrics?.cost || 1)).toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaigns with Health Badges */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Campaigns</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-surface-hover rounded"></div>
                    <div className="h-12 bg-surface-hover rounded"></div>
                  </div>
                ) : adsData?.campaigns?.length ? (
                  <div className="space-y-3">
                    {adsData.campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-3 bg-surface-hover rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text-primary">{campaign.name}</p>
                            {getCampaignHealth(campaign)}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {formatNumber(campaign.clicks)} clicks | {formatNumber(campaign.conversions)} conversions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(campaign.cost)}</p>
                          {campaign.conversions > 0 && (
                            <p className="text-xs text-text-secondary">
                              CPA: {formatCurrency(campaign.cost / campaign.conversions)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <p>No campaigns found</p>
                    <p className="text-sm mt-1">
                      {isConfigured ? "Create your first campaign to start advertising" : "Connect Google Ads to view campaigns"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-surface-hover rounded"></div>
                </div>
              ) : adsData?.recommendations?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adsData.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Badge
                          variant={rec.priority === "high" ? "danger" : rec.priority === "medium" ? "warning" : "info"}
                        >
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{rec.type}</p>
                          <p className="text-sm text-text-secondary mt-1">{rec.message}</p>
                          {rec.impact && (
                            <p className="text-xs text-success mt-2">Potential impact: {rec.impact}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <p>No recommendations available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/marketing/seo">
              <Card className="hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer border border-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">&#128273;</span>
                    <div>
                      <h3 className="font-semibold text-text-primary">Keyword Research</h3>
                      <p className="text-sm text-text-secondary">Rankings, volume data & SEO insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/marketing/ai-content">
              <Card className="hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer border border-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">&#128221;</span>
                    <div>
                      <h3 className="font-semibold text-text-primary">Ad Copy Generator</h3>
                      <p className="text-sm text-text-secondary">AI-generated headlines & descriptions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/marketing/analytics">
              <Card className="hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer border border-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">&#128201;</span>
                    <div>
                      <h3 className="font-semibold text-text-primary">ROI & Attribution</h3>
                      <p className="text-sm text-text-secondary">Track ad spend ROI & customer acquisition</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}

      {activeTab === "search-terms" && <SearchTermsPanel />}
      {activeTab === "ad-groups" && <AdGroupsPanel />}
    </div>
  );
}
