import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { cn } from "@/lib/utils.ts";
import type { WorkOrder } from "@/api/types/workOrder.ts";

interface FTFRCardProps {
  className?: string;
  /** Number of days to analyze (default: 30) */
  days?: number;
  /** Whether to show the sparkline trend */
  showSparkline?: boolean;
  /** Whether the card is clickable to expand */
  expandable?: boolean;
}

interface SparklineData {
  week: number;
  rate: number;
}

/**
 * Calculate FTFR for a given period
 */
function calculateFTFR(
  workOrders: WorkOrder[],
  startDate: Date,
  endDate: Date,
): number {
  const ordersInRange = workOrders.filter((wo) => {
    if (!wo.scheduled_date || wo.status !== "completed") return false;
    const woDate = new Date(wo.scheduled_date);
    return woDate >= startDate && woDate <= endDate;
  });

  if (ordersInRange.length === 0) return 0;

  // Count return visits
  let returnVisits = 0;
  ordersInRange.forEach((wo) => {
    if (!wo.scheduled_date || !wo.customer_id) return;
    const woDate = new Date(wo.scheduled_date);
    const fourteenDaysLater = new Date(
      woDate.getTime() + 14 * 24 * 60 * 60 * 1000,
    );

    const hasReturnVisit = workOrders.some((other) => {
      if (other.id === wo.id || other.customer_id !== wo.customer_id)
        return false;
      if (!other.scheduled_date || other.status !== "completed") return false;
      const otherDate = new Date(other.scheduled_date);
      return otherDate > woDate && otherDate <= fourteenDaysLater;
    });

    if (hasReturnVisit) returnVisits++;
  });

  return ((ordersInRange.length - returnVisits) / ordersInRange.length) * 100;
}

/**
 * Generate sparkline data (weekly FTFR over the period)
 */
function generateSparklineData(
  workOrders: WorkOrder[],
  days: number,
): SparklineData[] {
  const data: SparklineData[] = [];
  const weeks = Math.ceil(days / 7);
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rate = calculateFTFR(workOrders, startDate, endDate);
    data.push({ week: weeks - i, rate });
  }

  return data;
}

/**
 * Simple SVG sparkline component
 */
function Sparkline({
  data,
  width = 80,
  height = 24,
}: {
  data: SparklineData[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const maxRate = Math.max(...data.map((d) => d.rate), 100);
  const minRate = Math.min(...data.map((d) => d.rate), 0);
  const range = maxRate - minRate || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - ((d.rate - minRate) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const lastValue = data[data.length - 1];
  const firstValue = data[0];
  const trend = lastValue.rate - firstValue.rate;
  const color = trend >= 0 ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Endpoint dot */}
      <circle
        cx={((data.length - 1) / (data.length - 1 || 1)) * width}
        cy={height - ((lastValue.rate - minRate) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

/**
 * FTFRCard - Compact First-Time Fix Rate display for embedding in dashboards
 *
 * Features:
 * - Displays current FTFR percentage with color coding
 * - Optional sparkline showing trend over time
 * - Click to expand/navigate to full dashboard
 */
export function FTFRCard({
  className,
  days = 30,
  showSparkline = true,
  expandable = true,
}: FTFRCardProps) {
  // Fetch work orders data
  const { data: workOrdersData, isLoading } = useWorkOrders({
    page: 1,
    page_size: 500,
  });

  // Calculate current FTFR
  const { ftfrRate, trend, sparklineData, totalJobs } = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const currentRate = calculateFTFR(workOrders, startDate, now);

    // Calculate previous period for trend
    const prevStartDate = new Date(
      startDate.getTime() - days * 24 * 60 * 60 * 1000,
    );
    const prevRate = calculateFTFR(workOrders, prevStartDate, startDate);
    const trendValue = currentRate - prevRate;

    // Generate sparkline data
    const sparkline = showSparkline
      ? generateSparklineData(workOrders, days)
      : [];

    // Count total jobs in period
    const jobsInPeriod = workOrders.filter((wo) => {
      if (!wo.scheduled_date || wo.status !== "completed") return false;
      const woDate = new Date(wo.scheduled_date);
      return woDate >= startDate && woDate <= now;
    }).length;

    return {
      ftfrRate: currentRate,
      trend: trendValue,
      sparklineData: sparkline,
      totalJobs: jobsInPeriod,
    };
  }, [workOrdersData, days, showSparkline]);

  // Get FTFR color based on rate
  const getFTFRColor = (rate: number) => {
    if (rate >= 90) return "text-success";
    if (rate >= 80) return "text-warning";
    return "text-danger";
  };

  const getFTFRLabel = (rate: number) => {
    if (rate >= 90) return "Excellent";
    if (rate >= 80) return "Good";
    if (rate >= 70) return "Fair";
    return "Needs Improvement";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-bg-muted w-24 mb-2 rounded" />
            <div className="h-8 bg-bg-muted w-20 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <Card
      className={cn(
        expandable && "cursor-pointer hover:border-primary transition-colors",
        className,
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">
              First-Time Fix Rate
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn("text-3xl font-bold", getFTFRColor(ftfrRate))}
              >
                {ftfrRate.toFixed(1)}%
              </span>
              {trend !== 0 && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend > 0 ? "text-success" : "text-danger",
                  )}
                >
                  {trend > 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {getFTFRLabel(ftfrRate)} - {totalJobs} jobs
            </p>
          </div>
          <div className="flex flex-col items-end">
            {showSparkline && sparklineData.length > 1 && (
              <Sparkline data={sparklineData} />
            )}
            <p className="text-xs text-text-muted mt-1">Last {days} days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (expandable) {
    return (
      <Link to="/analytics/ftfr" className="block">
        {content}
      </Link>
    );
  }

  return content;
}
