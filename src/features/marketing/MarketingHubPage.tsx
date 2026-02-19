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
  useMarketingOverview,
  useAdsPerformance,
  useLeadPipeline,
  usePendingReviews,
  useAIRecommendations,
  useIntegrationSettings,
  useMarketingAnalytics,
} from "@/api/hooks/useMarketingHub.ts";

interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "leads",
    label: "Lead Pipeline",
    icon: "🔥",
    href: "/marketing/leads",
    description: "Manage prospects & AI lead scoring",
  },
  {
    id: "google-ads",
    label: "Google Ads",
    icon: "📈",
    href: "/marketing/ads",
    description: "Campaign performance & optimization",
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: "⭐",
    href: "/marketing/reviews",
    description: "Respond to customer reviews",
  },
  {
    id: "seo",
    label: "SEO Tools",
    icon: "🔍",
    href: "/marketing/seo",
    description: "Keywords, rankings & content strategy",
  },
  {
    id: "ai-content",
    label: "AI Content",
    icon: "🤖",
    href: "/marketing/ai-content",
    description: "Generate marketing content with AI",
  },
  {
    id: "ga4",
    label: "GA4 Analytics",
    icon: "📊",
    href: "/marketing/ga4",
    description: "Website traffic, sources & conversions",
  },
  {
    id: "analytics",
    label: "Analytics & ROI",
    icon: "📉",
    href: "/marketing/analytics",
    description: "Revenue attribution & campaign ROI",
  },
];

export function MarketingHubPage() {
  const [periodDays] = useState(30);

  // Fetch data from backend
  const { data: overview, isLoading: loadingOverview } =
    useMarketingOverview(periodDays);
  const { data: adsData, isLoading: loadingAds } =
    useAdsPerformance(periodDays);
  const { data: leadsData, isLoading: loadingLeads } = useLeadPipeline();
  const { data: reviewsData, isLoading: loadingReviews } = usePendingReviews();
  const { data: aiRecs, isLoading: loadingRecs } = useAIRecommendations();
  const { data: settings } = useIntegrationSettings();
  const { data: analytics } = useMarketingAnalytics(periodDays);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const totalPipeline = leadsData?.total_pipeline || 0;
  const pipelineValue = leadsData?.pipeline_value || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Marketing Hub
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Centralized marketing automation, analytics & AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="info">Last {periodDays} days</Badge>
          {settings?.integrations?.anthropic?.configured && (
            <Badge variant="success">AI Enabled</Badge>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.id} to={action.href}>
            <Card className="hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer h-full border border-transparent">
              <CardContent className="pt-4 pb-4 text-center">
                <span className="text-2xl block mb-2">{action.icon}</span>
                <div className="font-medium text-text-primary text-sm">
                  {action.label}
                </div>
                <div className="text-xs text-text-secondary mt-1 line-clamp-1">
                  {action.description}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-text-secondary uppercase tracking-wide">
              Revenue
            </div>
            <div className="text-xl font-bold text-text-primary mt-1">
              {formatCurrency(analytics?.revenue?.total || 0)}
            </div>
            <div className="text-xs text-success mt-1">
              {analytics?.revenue?.completed_jobs || 0} jobs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-text-secondary uppercase tracking-wide">
              Ad Spend
            </div>
            <div className="text-xl font-bold text-text-primary mt-1">
              {loadingAds ? "..." : formatCurrency(adsData?.metrics?.cost || 0)}
            </div>
            <div className="text-xs text-success mt-1">
              {adsData?.metrics?.conversions || 0} conversions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-text-secondary uppercase tracking-wide">
              Pipeline
            </div>
            <div className="text-xl font-bold text-warning mt-1">
              {loadingLeads ? "..." : totalPipeline}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {formatCurrency(pipelineValue)} value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-text-secondary uppercase tracking-wide">
              Conversion
            </div>
            <div className="text-xl font-bold text-success mt-1">
              {loadingLeads
                ? "..."
                : `${leadsData?.conversion_rate || 0}%`}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              pipeline to won
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-text-secondary uppercase tracking-wide">
              Reviews
            </div>
            <div className="text-xl font-bold text-info mt-1">
              {loadingReviews ? "..." : reviewsData?.reviews?.length || 0}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              awaiting response
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Ads Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>📈</span> Google Ads
              </CardTitle>
              <Link to="/marketing/ads">
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAds ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-surface-hover rounded w-3/4"></div>
                <div className="h-4 bg-surface-hover rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Clicks</span>
                  <span className="font-medium text-sm">
                    {formatNumber(adsData?.metrics?.clicks || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">
                    Impressions
                  </span>
                  <span className="font-medium text-sm">
                    {formatNumber(adsData?.metrics?.impressions || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">CTR</span>
                  <span className="font-medium text-sm">
                    {((adsData?.metrics?.ctr || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">CPA</span>
                  <span className="font-medium text-sm">
                    {formatCurrency(adsData?.metrics?.cpa || 0)}
                  </span>
                </div>
                {!settings?.integrations?.google_ads?.configured && (
                  <Link to="/integrations">
                    <div className="mt-3 p-2 bg-warning/10 rounded text-sm text-warning text-center cursor-pointer hover:bg-warning/20 transition-colors">
                      Connect Google Ads to see real data
                    </div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>🔥</span> Lead Pipeline
              </CardTitle>
              <Link to="/marketing/leads">
                <Button variant="ghost" size="sm">
                  Kanban
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-surface-hover rounded w-3/4"></div>
                <div className="h-4 bg-surface-hover rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">New</span>
                  <Badge variant="info">{leadsData?.pipeline?.new || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Contacted</span>
                  <Badge variant="warning">
                    {leadsData?.pipeline?.contacted || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Qualified</span>
                  <Badge variant="default">
                    {leadsData?.pipeline?.qualified || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Quoted</span>
                  <Badge variant="warning">
                    {leadsData?.pipeline?.quoted || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Converted</span>
                  <Badge variant="success">
                    {leadsData?.pipeline?.converted || 0}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>⭐</span> Recent Reviews
              </CardTitle>
              <Link to="/marketing/reviews">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-surface-hover rounded w-3/4"></div>
                <div className="h-4 bg-surface-hover rounded w-1/2"></div>
              </div>
            ) : reviewsData?.reviews?.length ? (
              <div className="space-y-3">
                {reviewsData.reviews.slice(0, 3).map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-border pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-sm">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {review.author}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-2 mt-1">
                      {review.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-secondary text-sm mb-2">
                  {(reviewsData as Record<string, unknown>)?.message ||
                    "No pending reviews"}
                </p>
                <Link to="/integrations">
                  <Button variant="secondary" size="sm">
                    Connect Reviews
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>🤖</span> AI Recommendations
            </CardTitle>
            <Link to="/marketing/ai-content">
              <Button variant="secondary" size="sm">
                AI Content Studio
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRecs ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-surface-hover rounded w-3/4"></div>
              <div className="h-4 bg-surface-hover rounded w-1/2"></div>
            </div>
          ) : aiRecs?.recommendations?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecs.recommendations
                .slice(0, 6)
                .map(
                  (
                    rec: {
                      type: string;
                      message: string;
                      priority: string;
                      action?: string;
                      href?: string;
                    },
                    index: number,
                  ) => (
                    <div
                      key={index}
                      className="p-3 bg-surface-hover rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            rec.priority === "high"
                              ? "danger"
                              : rec.priority === "medium"
                                ? "warning"
                                : "default"
                          }
                        >
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-text-secondary uppercase">
                          {rec.type}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary">{rec.message}</p>
                      {rec.action && rec.href && (
                        <Link to={rec.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-primary"
                          >
                            {rec.action} →
                          </Button>
                        </Link>
                      )}
                    </div>
                  ),
                )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                AI recommendations will appear once your data accumulates
              </p>
              <Link to="/integrations">
                <Button variant="primary">Set Up Integrations</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Tools Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/marketing/email-marketing">
          <Card className="hover:bg-surface-hover transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📧</span>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    Email Marketing
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Campaigns, templates & automation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/marketing/analytics">
          <Card className="hover:bg-surface-hover transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📉</span>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    Analytics & ROI
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Revenue attribution & performance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/marketing/seo">
          <Card className="hover:bg-surface-hover transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔍</span>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    SEO Dashboard
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Rankings, keywords & content ideas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Integration Status */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${settings.integrations?.ga4?.configured ? "bg-success" : "bg-error"}`}
                ></span>
                <span className="text-sm">GA4 Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${settings.integrations?.google_ads?.configured ? "bg-success" : "bg-error"}`}
                ></span>
                <span className="text-sm">Google Ads</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${settings.integrations?.anthropic?.configured ? "bg-success" : "bg-error"}`}
                ></span>
                <span className="text-sm">AI (Claude)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${settings.integrations?.openai?.configured ? "bg-success" : "bg-error"}`}
                ></span>
                <span className="text-sm">AI (GPT)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${settings.integrations?.search_console?.configured ? "bg-success" : "bg-error"}`}
                ></span>
                <span className="text-sm">Search Console</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
