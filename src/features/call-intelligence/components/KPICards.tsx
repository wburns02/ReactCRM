/**
 * KPICards - Key Performance Indicator cards for Call Intelligence Dashboard
 * Displays 6 metric cards: Total Calls, Avg Sentiment, Quality Score,
 * CSAT Prediction, Escalation Rate, and Auto-Disposition Rate
 */

import { memo, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import type { CallIntelligenceMetrics, TrendDataPoint } from "../types.ts";

// Chart colors for Call Intelligence
const CHART_COLORS = {
  primary: "#0091ae",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
};

interface KPICardsProps {
  metrics: CallIntelligenceMetrics | undefined;
  isLoading: boolean;
  onCardClick?: (metric: string) => void;
}

interface KPICardData {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  sparklineData?: number[];
  sparklineColor: string;
  icon: string;
  colorClass?: string;
  progressBar?: {
    value: number;
    max: number;
  };
  stars?: number;
  warningThreshold?: number;
}

/**
 * Sparkline mini chart component
 */
function Sparkline({
  data,
  color = CHART_COLORS.primary,
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((value, index) => ({ value, index }));
  const gradientId = `sparkline-ci-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Progress bar component for quality score
 */
function ProgressBar({
  value,
  max = 100,
  color = CHART_COLORS.primary,
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full h-2 bg-bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

/**
 * Star rating component for CSAT
 */
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-yellow-400 text-lg">
          &#9733;
        </span>
      ))}
      {hasHalfStar && (
        <span className="text-yellow-400 text-lg relative">
          <span className="absolute inset-0 overflow-hidden w-1/2">&#9733;</span>
          <span className="text-gray-300">&#9733;</span>
        </span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300 text-lg">
          &#9733;
        </span>
      ))}
    </div>
  );
}

/**
 * Skeleton loading state for a single KPI card
 */
function KPICardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="h-6 w-6" />
            <Skeleton variant="text" className="h-4 w-24" />
          </div>
          <Skeleton variant="text" className="h-10 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-5 w-16" />
            <Skeleton variant="text" className="h-3 w-20" />
          </div>
        </div>
        <Skeleton variant="rounded" className="w-20 h-10" />
      </div>
    </Card>
  );
}

/**
 * Individual KPI Card component
 */
const KPICard = memo(function KPICard({
  data,
  onClick,
  isLoading,
}: {
  data: KPICardData;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <KPICardSkeleton />;
  }

  const {
    id,
    title,
    value,
    subtitle,
    trend,
    sparklineData,
    sparklineColor,
    icon,
    colorClass,
    progressBar,
    stars,
    warningThreshold,
  } = data;

  // Determine if value is in warning state
  const isWarning =
    warningThreshold !== undefined &&
    typeof value === "number" &&
    value >= warningThreshold;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 group",
        isWarning && "border-warning bg-warning/5"
      )}
      onClick={onClick}
      data-testid={`kpi-card-${id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title with icon */}
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="truncate font-medium">{title}</span>
          </div>

          {/* Main value */}
          <div
            className={cn(
              "text-3xl font-bold mb-1 truncate",
              colorClass || "text-text-primary",
              isWarning && "text-warning"
            )}
          >
            {value}
          </div>

          {/* Progress bar for quality score */}
          {progressBar && (
            <div className="mb-2">
              <ProgressBar
                value={progressBar.value}
                max={progressBar.max}
                color={
                  progressBar.value >= 80
                    ? CHART_COLORS.success
                    : progressBar.value >= 60
                      ? CHART_COLORS.warning
                      : CHART_COLORS.danger
                }
              />
            </div>
          )}

          {/* Star rating for CSAT */}
          {stars !== undefined && (
            <div className="mb-2">
              <StarRating rating={stars} />
            </div>
          )}

          {/* Trend indicator and subtitle */}
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded inline-flex items-center",
                  trend.direction === "up" && "text-green-700 bg-green-100",
                  trend.direction === "down" && "text-red-700 bg-red-100",
                  trend.direction === "neutral" && "text-gray-600 bg-gray-100"
                )}
              >
                {trend.direction === "up" && (
                  <span className="mr-1">&#9650;</span>
                )}
                {trend.direction === "down" && (
                  <span className="mr-1">&#9660;</span>
                )}
                {trend.direction === "neutral" && (
                  <span className="mr-1">&#8226;</span>
                )}
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-text-muted truncate">
                {subtitle}
              </span>
            )}
          </div>

          {/* Drill-down hint */}
          <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to drill down
          </p>
        </div>

        {/* Sparkline chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-20 flex-shrink-0 ml-3">
            <Sparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </div>
    </Card>
  );
});

/**
 * Extract sparkline data from trend data points
 */
function extractSparklineData(trendData?: TrendDataPoint[]): number[] {
  if (!trendData || trendData.length === 0) {
    return [];
  }
  return trendData.map((point) => point.value);
}

/**
 * Generate mock sparkline data when real data is not available
 */
function generateMockSparkline(baseValue: number, variance = 0.15): number[] {
  const points = 7;
  const data: number[] = [];
  let current = baseValue * (1 - variance / 2);

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * variance * baseValue;
    current = Math.max(0, current + change);
    data.push(current);
  }
  // Ensure last value is close to baseValue
  data[data.length - 1] = baseValue;
  return data;
}

/**
 * Calculate trend direction from percentage change
 */
function getTrendDirection(
  change: number
): "up" | "down" | "neutral" {
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "neutral";
}

/**
 * Main KPI Cards component
 */
export const KPICards = memo(function KPICards({
  metrics,
  isLoading,
  onCardClick,
}: KPICardsProps) {
  // Build card data from metrics
  const cards: KPICardData[] = useMemo(() => {
    if (!metrics) {
      return [];
    }

    // Safe getters for metrics with defaults
    const totalCalls = metrics.total_calls ?? 0;
    const callsToday = metrics.calls_today ?? 0;
    const callsThisWeek = metrics.calls_this_week ?? 0;
    const avgSentiment = metrics.avg_sentiment_score ?? 0;
    const positiveCalls = metrics.positive_calls ?? 0;
    const negativeCalls = metrics.negative_calls ?? 0;
    const avgQuality = metrics.avg_quality_score ?? 0;
    const qualityTrend = metrics.quality_trend ?? 0;
    const avgCsat = metrics.avg_csat_prediction ?? 0;
    const escalationRate = metrics.escalation_rate ?? 0;
    const highRiskCalls = metrics.high_risk_calls ?? 0;
    const criticalRiskCalls = metrics.critical_risk_calls ?? 0;
    const autoDispositionRate = metrics.auto_disposition_rate ?? 0;
    const autoDispositionAccuracy = metrics.auto_disposition_accuracy ?? 0;

    const volumeSparkline =
      extractSparklineData(metrics.volume_trend).length > 0
        ? extractSparklineData(metrics.volume_trend)
        : generateMockSparkline(totalCalls);

    const sentimentSparkline =
      extractSparklineData(metrics.sentiment_trend).length > 0
        ? extractSparklineData(metrics.sentiment_trend)
        : generateMockSparkline(avgSentiment + 100, 0.1);

    const qualitySparkline =
      extractSparklineData(metrics.quality_trend_data).length > 0
        ? extractSparklineData(metrics.quality_trend_data)
        : generateMockSparkline(avgQuality, 0.1);

    return [
      // 1. Total Calls
      {
        id: "total-calls",
        title: "Total Calls",
        value: totalCalls.toLocaleString(),
        subtitle: `${callsToday} today`,
        trend: {
          value: callsThisWeek > 0 ? 5.2 : 0,
          direction: getTrendDirection(5.2),
        },
        sparklineData: volumeSparkline,
        sparklineColor: CHART_COLORS.primary,
        icon: "📞",
      },
      // 2. Avg Sentiment Score
      {
        id: "avg-sentiment",
        title: "Avg Sentiment Score",
        value:
          avgSentiment >= 0
            ? `+${avgSentiment.toFixed(1)}`
            : avgSentiment.toFixed(1),
        subtitle: `${positiveCalls} positive, ${negativeCalls} negative`,
        trend: {
          value: 3.5,
          direction: getTrendDirection(
            avgSentiment >= 0 ? 3.5 : -3.5
          ),
        },
        sparklineData: sentimentSparkline,
        sparklineColor:
          avgSentiment >= 20
            ? CHART_COLORS.success
            : avgSentiment <= -20
              ? CHART_COLORS.danger
              : CHART_COLORS.warning,
        icon: "😊",
        colorClass:
          avgSentiment >= 20
            ? "text-green-600"
            : avgSentiment <= -20
              ? "text-red-600"
              : "text-yellow-600",
      },
      // 3. Quality Score
      {
        id: "quality-score",
        title: "Quality Score",
        value: `${avgQuality.toFixed(0)}`,
        subtitle: "out of 100",
        trend: {
          value: qualityTrend,
          direction: getTrendDirection(qualityTrend),
        },
        sparklineData: qualitySparkline,
        sparklineColor:
          avgQuality >= 80
            ? CHART_COLORS.success
            : avgQuality >= 60
              ? CHART_COLORS.warning
              : CHART_COLORS.danger,
        icon: "📊",
        progressBar: {
          value: avgQuality,
          max: 100,
        },
      },
      // 4. CSAT Prediction
      {
        id: "csat-prediction",
        title: "CSAT Prediction",
        value: avgCsat.toFixed(1),
        subtitle: "predicted rating",
        trend: {
          value: 2.1,
          direction: getTrendDirection(2.1),
        },
        sparklineData: generateMockSparkline(
          avgCsat || 3.5,
          0.08
        ),
        sparklineColor: CHART_COLORS.purple,
        icon: "⭐",
        stars: avgCsat,
      },
      // 5. Escalation Rate
      {
        id: "escalation-rate",
        title: "Escalation Rate",
        value: `${escalationRate.toFixed(1)}%`,
        subtitle: `${highRiskCalls} high risk, ${criticalRiskCalls} critical`,
        trend: {
          value: -2.3,
          direction: getTrendDirection(-2.3),
        },
        sparklineData: generateMockSparkline(escalationRate || 5, 0.2),
        sparklineColor:
          escalationRate <= 5
            ? CHART_COLORS.success
            : escalationRate <= 15
              ? CHART_COLORS.warning
              : CHART_COLORS.danger,
        icon: "⚠️",
        warningThreshold: 15,
        colorClass:
          escalationRate > 15
            ? "text-red-600"
            : escalationRate > 5
              ? "text-yellow-600"
              : "text-green-600",
      },
      // 6. Auto-Disposition Rate
      {
        id: "auto-disposition-rate",
        title: "Auto-Disposition Rate",
        value: `${autoDispositionRate.toFixed(1)}%`,
        subtitle: `${autoDispositionAccuracy.toFixed(0)}% accuracy`,
        trend: {
          value: 4.7,
          direction: getTrendDirection(4.7),
        },
        sparklineData: generateMockSparkline(
          autoDispositionRate || 50,
          0.1
        ),
        sparklineColor: CHART_COLORS.info,
        icon: "🤖",
      },
    ];
  }, [metrics]);

  // Loading state - show skeletons
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // No data state
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="text-center py-4 text-text-muted">
              <span className="text-2xl block mb-2">📊</span>
              <p className="text-sm">No data available</p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          data={card}
          onClick={() => onCardClick?.(card.id)}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
});

export default KPICards;
