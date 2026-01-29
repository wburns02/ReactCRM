import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useCommissionInsights } from "@/api/hooks/usePayroll.ts";
import type { CommissionInsight } from "@/api/types/payroll.ts";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  X,
} from "lucide-react";

const typeIcons = {
  trend: TrendingUp,
  alert: AlertCircle,
  opportunity: Lightbulb,
};

const severityStyles = {
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  success: "bg-green-500/10 border-green-500/30 text-green-400",
};

function InsightCard({ insight }: { insight: CommissionInsight }) {
  const Icon = typeIcons[insight.type];

  return (
    <div
      className={`rounded-lg border p-4 ${severityStyles[insight.severity]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text-primary">{insight.title}</p>
          <p className="text-sm text-text-secondary mt-1">
            {insight.description}
          </p>
          {insight.metric && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">
                {insight.metric.value}
              </span>
              {insight.metric.change && (
                <span
                  className={`text-sm ${
                    insight.metric.change.startsWith("+")
                      ? "text-success"
                      : insight.metric.change.startsWith("-")
                        ? "text-danger"
                        : "text-text-muted"
                  }`}
                >
                  {insight.metric.change}
                </span>
              )}
            </div>
          )}
          {insight.action && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 p-0 h-auto text-primary hover:text-primary/80"
            >
              {insight.action.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommissionInsightsPanel() {
  const {
    data: insights,
    isLoading,
    refetch,
    isFetching,
  } = useCommissionInsights();
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors p-4 bg-bg-card border border-border rounded-lg w-full"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Show AI Commission Insights</span>
      </button>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 via-bg-card to-blue-500/10 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              AI Commission Insights
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-text-muted hover:text-text-primary"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-bg-muted/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
            <p className="text-text-secondary">
              No insights available yet. Keep approving commissions to generate
              insights!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
