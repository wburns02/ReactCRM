import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { useMarketingAnalytics } from "@/api/hooks/useMarketingHub.ts";

function MetricCard({
  label,
  value,
  subtext,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="text-sm text-text-secondary">{label}</div>
        <div className="text-2xl font-bold text-text-primary mt-1">{value}</div>
        {subtext && (
          <div
            className={`text-xs mt-1 ${
              trend === "up"
                ? "text-green-500"
                : trend === "down"
                  ? "text-red-500"
                  : "text-text-secondary"
            }`}
          >
            {trend === "up" && "↑ "}
            {trend === "down" && "↓ "}
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">{value}</span>
      </div>
      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MarketingAnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const { data, isLoading } = useMarketingAnalytics(periodDays);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketing"
              className="text-text-secondary hover:text-primary"
            >
              Marketing
            </Link>
            <span className="text-text-secondary">/</span>
            <h1 className="text-2xl font-semibold text-text-primary">
              Marketing Analytics
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            ROI tracking, acquisition metrics & campaign performance
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodDays === d
                  ? "bg-primary text-white"
                  : "bg-surface-hover text-text-secondary hover:text-text-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={isLoading ? "..." : fmt(data?.revenue?.total || 0)}
          subtext={`${data?.revenue?.completed_jobs || 0} jobs completed`}
          trend="up"
        />
        <MetricCard
          label="Avg Job Value"
          value={isLoading ? "..." : fmt(data?.revenue?.avg_job_value || 0)}
          subtext={`LTV est. ${fmt(data?.revenue?.ltv_estimate || 0)}`}
        />
        <MetricCard
          label="New Customers"
          value={
            isLoading ? "..." : String(data?.acquisition?.new_customers || 0)
          }
          subtext={`CAC: ${fmt(data?.acquisition?.customer_acquisition_cost || 0)}`}
        />
        <MetricCard
          label="Marketing ROI"
          value={
            isLoading
              ? "..."
              : data?.roi?.total_spend
                ? `${data.roi.roi_percent}%`
                : "N/A"
          }
          subtext={
            data?.roi?.total_spend
              ? `${fmt(data.roi.total_spend)} spent`
              : "No ad spend tracked"
          }
          trend={
            (data?.roi?.roi_percent || 0) > 0
              ? "up"
              : (data?.roi?.roi_percent || 0) < 0
                ? "down"
                : "neutral"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📥</span> Customer Acquisition by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-surface-hover rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(data?.acquisition?.lead_sources || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([source, count]) => {
                    const total = data?.acquisition?.new_customers || 1;
                    const sourceLabels: Record<string, string> = {
                      online_booking: "Online Booking",
                      direct: "Direct / Walk-in",
                      referral: "Referral",
                      google_ads: "Google Ads",
                      unknown: "Unknown",
                      phone: "Phone Call",
                      social_media: "Social Media",
                    };
                    const colors: Record<string, string> = {
                      online_booking: "bg-blue-500",
                      direct: "bg-green-500",
                      referral: "bg-purple-500",
                      google_ads: "bg-yellow-500",
                      unknown: "bg-gray-400",
                      phone: "bg-orange-500",
                      social_media: "bg-pink-500",
                    };
                    return (
                      <ProgressBar
                        key={source}
                        label={sourceLabels[source] || source}
                        value={count as number}
                        max={total}
                        color={colors[source] || "bg-primary"}
                      />
                    );
                  })}
                {Object.keys(data?.acquisition?.lead_sources || {}).length ===
                  0 && (
                  <p className="text-text-secondary text-sm text-center py-4">
                    No acquisition data for this period
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📧</span> Email Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-surface-hover rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-surface-secondary">
                    <div className="text-2xl font-bold text-text-primary">
                      {data?.campaigns?.total || 0}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Campaigns Sent
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-secondary">
                    <div className="text-2xl font-bold text-text-primary">
                      {(data?.campaigns?.emails_sent || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Emails Delivered
                    </div>
                  </div>
                </div>

                <ProgressBar
                  label={`Open Rate (${data?.campaigns?.open_rate || 0}%)`}
                  value={data?.campaigns?.emails_opened || 0}
                  max={data?.campaigns?.emails_sent || 1}
                  color="bg-blue-500"
                />
                <ProgressBar
                  label={`Click Rate (${data?.campaigns?.click_rate || 0}%)`}
                  value={data?.campaigns?.emails_clicked || 0}
                  max={data?.campaigns?.emails_sent || 1}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="Conversions"
                  value={data?.campaigns?.conversions || 0}
                  max={data?.campaigns?.emails_sent || 1}
                  color="bg-purple-500"
                />

                {(data?.campaigns?.total || 0) === 0 && (
                  <div className="text-center pt-2">
                    <Link
                      to="/marketing/email-marketing"
                      className="text-primary text-sm hover:underline"
                    >
                      Create your first campaign
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Google Ads ROI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>📈</span> Google Ads ROI
            </CardTitle>
            <Link to="/marketing/ads">
              <Badge variant="info">View Details</Badge>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-surface-secondary text-center">
              <div className="text-xl font-bold text-text-primary">
                {fmt(data?.ads?.spend || 0)}
              </div>
              <div className="text-xs text-text-secondary mt-1">Ad Spend</div>
            </div>
            <div className="p-4 rounded-lg bg-surface-secondary text-center">
              <div className="text-xl font-bold text-text-primary">
                {data?.ads?.conversions || 0}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Conversions
              </div>
            </div>
            <div className="p-4 rounded-lg bg-surface-secondary text-center">
              <div className="text-xl font-bold text-green-500">
                {data?.ads?.roas ? `${data.ads.roas}x` : "N/A"}
              </div>
              <div className="text-xs text-text-secondary mt-1">ROAS</div>
            </div>
            <div className="p-4 rounded-lg bg-surface-secondary text-center">
              <div className="text-xl font-bold text-text-primary">
                {data?.ads?.conversions && data?.ads?.spend
                  ? fmt(data.ads.spend / data.ads.conversions)
                  : "N/A"}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Cost per Conversion
              </div>
            </div>
          </div>
          {(data?.ads?.spend || 0) === 0 && (
            <p className="text-text-secondary text-sm text-center mt-4">
              Connect Google Ads in{" "}
              <Link to="/integrations" className="text-primary hover:underline">
                Integrations
              </Link>{" "}
              to see real ad performance data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💰</span> Revenue Attribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="text-3xl font-bold text-green-600">
                {fmt(data?.revenue?.total || 0)}
              </div>
              <div className="text-sm text-text-secondary mt-2">
                Total Revenue ({periodDays}d)
              </div>
              <div className="text-xs text-green-600 mt-1">
                {data?.revenue?.completed_jobs || 0} completed jobs
              </div>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-600">
                {fmt(data?.revenue?.avg_job_value || 0)}
              </div>
              <div className="text-sm text-text-secondary mt-2">
                Avg Job Value
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Per completed service
              </div>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="text-3xl font-bold text-purple-600">
                {fmt(data?.revenue?.ltv_estimate || 0)}
              </div>
              <div className="text-sm text-text-secondary mt-2">
                Customer LTV
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Estimated lifetime value
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
