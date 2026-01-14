/**
 * CustomerSatisfaction - NPS/ratings visualization
 * Shows overall score, rating distribution, recent reviews, and trend over time
 */

import { useState, memo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  formatChartDate,
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
} from "./utils/chartConfig.ts";

export interface CustomerReview {
  id: string;
  customerName: string;
  rating: number;
  comment?: string;
  workOrderId: string;
  technicianName: string;
  date: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface SatisfactionTrend {
  date: string;
  avgRating: number;
  responseCount: number;
  nps: number;
}

interface CustomerSatisfactionProps {
  overallScore: number;
  totalResponses: number;
  npsScore: number;
  ratingDistribution: RatingDistribution[];
  recentReviews: CustomerReview[];
  trendData: SatisfactionTrend[];
  isLoading?: boolean;
  className?: string;
}

type ViewMode = "overview" | "reviews" | "trend";

/**
 * Star rating display
 */
function StarRating({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-warning">
          &#9733;
        </span>
      ))}
      {hasHalfStar && <span className="text-warning">&#9734;</span>}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-text-muted">
          &#9734;
        </span>
      ))}
    </div>
  );
}

/**
 * Overall score gauge display
 */
function ScoreGauge({
  score,
  maxScore = 5,
}: {
  score: number;
  maxScore?: number;
}) {
  const percentage = (score / maxScore) * 100;
  const getColor = () => {
    if (percentage >= 80) return CHART_COLORS.success;
    if (percentage >= 60) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-bg-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={getColor()}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-primary">
            {score.toFixed(1)}
          </span>
          <span className="text-sm text-text-secondary">/ {maxScore}</span>
        </div>
      </div>
      <div className="mt-2">
        <StarRating rating={score} size="md" />
      </div>
    </div>
  );
}

/**
 * NPS Score display
 */
function NPSDisplay({ score }: { score: number }) {
  const getCategory = () => {
    if (score >= 50) return { label: "Excellent", color: "success" };
    if (score >= 0) return { label: "Good", color: "warning" };
    return { label: "Needs Improvement", color: "danger" };
  };

  const category = getCategory();

  return (
    <div className="text-center">
      <p className="text-sm text-text-secondary mb-1">Net Promoter Score</p>
      <p
        className={`text-4xl font-bold ${
          category.color === "success"
            ? "text-success"
            : category.color === "warning"
              ? "text-warning"
              : "text-danger"
        }`}
      >
        {score >= 0 ? "+" : ""}
        {score}
      </p>
      <Badge variant={category.color as any} className="mt-2">
        {category.label}
      </Badge>
    </div>
  );
}

/**
 * Rating distribution bar chart
 */
const RatingDistributionChart = memo(function RatingDistributionChart({
  data,
}: {
  data: RatingDistribution[];
}) {
  const chartData = data.map((d) => ({
    rating: `${d.rating} Star${d.rating !== 1 ? "s" : ""}`,
    count: d.count,
    fill:
      d.rating >= 4
        ? CHART_COLORS.success
        : d.rating >= 3
          ? CHART_COLORS.warning
          : CHART_COLORS.danger,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, bottom: 0, left: 60 }}
      >
        <CartesianGrid {...GRID_STYLE} horizontal={false} />
        <XAxis type="number" {...AXIS_STYLE} />
        <YAxis type="category" dataKey="rating" {...AXIS_STYLE} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
          formatter={(value) => [value, "Responses"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Bar key={index} dataKey="count" fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

/**
 * Recent reviews list
 */
const ReviewsList = memo(function ReviewsList({
  reviews,
}: {
  reviews: CustomerReview[];
}) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No reviews available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-text-primary">
                {review.customerName}
              </p>
              <p className="text-xs text-text-muted">
                {formatChartDate(review.date)} - Tech: {review.technicianName}
              </p>
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>
          {review.comment && (
            <p className="text-sm text-text-secondary mt-2 line-clamp-3">
              "{review.comment}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * Satisfaction trend chart
 */
const TrendChart = memo(function TrendChart({
  data,
}: {
  data: SatisfactionTrend[];
}) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatChartDate(point.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, bottom: 0, left: 0 }}
      >
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="dateLabel" {...AXIS_STYLE} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" domain={[0, 5]} {...AXIS_STYLE} />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[-100, 100]}
          {...AXIS_STYLE}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
          formatter={(value, name) => [
            name === "avgRating"
              ? Number(value).toFixed(2)
              : name === "nps"
                ? `${Number(value) >= 0 ? "+" : ""}${value}`
                : value,
            name === "avgRating"
              ? "Avg Rating"
              : name === "nps"
                ? "NPS"
                : "Responses",
          ]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="avgRating"
          stroke={CHART_COLORS.warning}
          strokeWidth={2}
          name="Avg Rating"
          dot={{ fill: CHART_COLORS.warning, r: 4 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="nps"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          name="NPS"
          dot={{ fill: CHART_COLORS.primary, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-48" />
        <div className="flex items-center gap-8">
          <Skeleton variant="circular" className="w-32 h-32" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="rounded" className="h-20 w-full" />
            <Skeleton variant="rounded" className="h-20 w-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Main CustomerSatisfaction component
 */
export const CustomerSatisfaction = memo(function CustomerSatisfaction({
  overallScore,
  totalResponses,
  npsScore,
  ratingDistribution,
  recentReviews,
  trendData,
  isLoading = false,
  className = "",
}: CustomerSatisfactionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (totalResponses === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg">Customer Satisfaction</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128522;</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No feedback yet
            </h3>
            <p className="text-text-secondary">
              Customer satisfaction data will appear once reviews are collected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Customer Satisfaction</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Based on {totalResponses.toLocaleString()} responses
            </p>
          </div>
          <div className="flex items-center gap-1 bg-bg-muted rounded-md p-0.5">
            {(["overview", "reviews", "trend"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === mode
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {viewMode === "overview" && (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ScoreGauge score={overallScore} />
              <NPSDisplay score={npsScore} />
            </div>
            <div className="flex-1 w-full">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Rating Distribution
              </h4>
              <RatingDistributionChart data={ratingDistribution} />
            </div>
          </div>
        )}

        {viewMode === "reviews" && <ReviewsList reviews={recentReviews} />}

        {viewMode === "trend" && <TrendChart data={trendData} />}
      </CardContent>
    </Card>
  );
});

export default CustomerSatisfaction;
