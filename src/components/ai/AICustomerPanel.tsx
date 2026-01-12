/**
 * AI Customer Insights Panel
 * Shows AI-generated insights for a customer
 */
import {
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCustomerInsights } from "@/hooks/useAI";

interface AICustomerPanelProps {
  customerId: number;
  customerName?: string;
}

/**
 * AI insights panel for customer detail view
 */
export function AICustomerPanel({
  customerId,
  customerName,
}: AICustomerPanelProps) {
  const { data: insights, isLoading, error } = useCustomerInsights(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>🤖</span> AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-bg-muted rounded w-3/4" />
            <div className="h-4 bg-bg-muted rounded w-1/2" />
            <div className="h-4 bg-bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>🤖</span> AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            AI insights are not available for this customer at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const SentimentIcon =
    insights.sentiment === "positive"
      ? ThumbsUp
      : insights.sentiment === "negative"
        ? ThumbsDown
        : Minus;

  const sentimentColor =
    insights.sentiment === "positive"
      ? "text-success"
      : insights.sentiment === "negative"
        ? "text-danger"
        : "text-text-muted";

  const sentimentBg =
    insights.sentiment === "positive"
      ? "bg-success/10"
      : insights.sentiment === "negative"
        ? "bg-danger/10"
        : "bg-bg-muted";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span>🤖</span> AI Insights
          {customerName && (
            <span className="text-text-muted font-normal">
              for {customerName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm text-text-secondary">{insights.summary}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Sentiment */}
          <div className={`p-3 rounded-lg ${sentimentBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <SentimentIcon className={`w-4 h-4 ${sentimentColor}`} />
              <span className="text-xs text-text-muted">Sentiment</span>
            </div>
            <p className={`text-sm font-medium capitalize ${sentimentColor}`}>
              {insights.sentiment}
            </p>
          </div>

          {/* Risk Score */}
          <div
            className={`p-3 rounded-lg ${
              insights.risk_score > 70
                ? "bg-danger/10"
                : insights.risk_score > 40
                  ? "bg-warning/10"
                  : "bg-success/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle
                className={`w-4 h-4 ${
                  insights.risk_score > 70
                    ? "text-danger"
                    : insights.risk_score > 40
                      ? "text-warning"
                      : "text-success"
                }`}
              />
              <span className="text-xs text-text-muted">Risk</span>
            </div>
            <p className="text-sm font-medium">{insights.risk_score}%</p>
          </div>

          {/* Lifetime Value */}
          <div className="p-3 rounded-lg bg-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-text-muted">LTV</span>
            </div>
            <p className="text-sm font-medium text-primary">
              ${insights.lifetime_value_prediction.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AICustomerPanel;
