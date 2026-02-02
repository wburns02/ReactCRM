/**
 * Insights & Tips Component
 *
 * Provides actionable recommendations that a 12-year-old can understand.
 * Analyzes the marketing data and gives simple, helpful suggestions.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { MarketingMetrics } from "@/api/types/marketingTasks";

interface InsightsTipsProps {
  metrics: MarketingMetrics;
  onOpenContentGenerator: () => void;
  onOpenGBPSync: () => void;
}

interface Insight {
  icon: string;
  title: string;
  description: string;
  type: "success" | "warning" | "action" | "info";
  actionLabel?: string;
  onAction?: () => void;
}

export function InsightsTips({ metrics, onOpenContentGenerator, onOpenGBPSync }: InsightsTipsProps) {
  // Generate insights based on the metrics
  const insights: Insight[] = [];

  // Speed Score insights
  if (metrics.performanceScore >= 80) {
    insights.push({
      icon: "🚀",
      title: "Your website is fast!",
      description: `Speed score: ${metrics.performanceScore}/100. Visitors won't have to wait.`,
      type: "success",
    });
  } else if (metrics.performanceScore >= 50) {
    insights.push({
      icon: "👍",
      title: "Speed is OK, but could be better",
      description: `Speed score: ${metrics.performanceScore}/100. Some visitors might leave if pages load slowly.`,
      type: "info",
    });
  } else if (metrics.performanceScore > 0) {
    insights.push({
      icon: "🐌",
      title: "Your website is a bit slow",
      description: `Speed score: ${metrics.performanceScore}/100. Slow sites lose visitors. Consider optimizing images or upgrading hosting.`,
      type: "warning",
    });
  }

  // SEO Score insights
  if (metrics.seoScore >= 80) {
    insights.push({
      icon: "🔍",
      title: "Google can find you easily!",
      description: `SEO score: ${metrics.seoScore}/100. People searching for your services will find you.`,
      type: "success",
    });
  } else if (metrics.seoScore >= 50) {
    insights.push({
      icon: "👀",
      title: "SEO is OK, room to improve",
      description: `SEO score: ${metrics.seoScore}/100. Adding more content could help people find you.`,
      type: "info",
    });
  } else if (metrics.seoScore > 0) {
    insights.push({
      icon: "🔎",
      title: "SEO needs attention",
      description: `SEO score: ${metrics.seoScore}/100. Google has trouble understanding your site. More content and better descriptions would help.`,
      type: "warning",
    });
  }

  // Reviews insights
  if (metrics.pendingResponses > 0) {
    insights.push({
      icon: "💬",
      title: `${metrics.pendingResponses} review${metrics.pendingResponses > 1 ? "s" : ""} need${metrics.pendingResponses === 1 ? "s" : ""} a reply!`,
      description: "Responding to reviews shows customers you care and can boost your ratings.",
      type: "action",
      actionLabel: "View Reviews",
      onAction: onOpenGBPSync,
    });
  } else if (metrics.totalReviews > 0 && metrics.averageRating >= 4.5) {
    insights.push({
      icon: "⭐",
      title: `Great ratings: ${metrics.averageRating.toFixed(1)} stars!`,
      description: `${metrics.totalReviews} happy customers have left reviews. Keep up the good work!`,
      type: "success",
    });
  } else if (metrics.totalReviews > 0) {
    insights.push({
      icon: "⭐",
      title: `You have ${metrics.totalReviews} reviews`,
      description: `Average rating: ${metrics.averageRating.toFixed(1)} stars. Encouraging happy customers to leave reviews can help!`,
      type: "info",
    });
  }

  // Content insights
  if (metrics.contentGenerated === 0) {
    insights.push({
      icon: "📝",
      title: "Try creating some content!",
      description: "Blog posts and articles help people find your business on Google. Our AI can write them for you.",
      type: "action",
      actionLabel: "Generate Content",
      onAction: onOpenContentGenerator,
    });
  } else if (metrics.contentGenerated < 5) {
    insights.push({
      icon: "📝",
      title: "Keep creating content!",
      description: `You have ${metrics.contentGenerated} piece${metrics.contentGenerated > 1 ? "s" : ""} of content. More content = more ways for customers to find you.`,
      type: "info",
      actionLabel: "Create More",
      onAction: onOpenContentGenerator,
    });
  } else {
    insights.push({
      icon: "📝",
      title: `${metrics.contentGenerated} pieces of content created`,
      description: "Great job! Your content is helping people find your business.",
      type: "success",
    });
  }

  // Keywords insight
  if (metrics.trackedKeywords > 0) {
    insights.push({
      icon: "🔑",
      title: `Tracking ${metrics.trackedKeywords} keywords`,
      description: "These are the words people type into Google to find businesses like yours.",
      type: "info",
    });
  }

  // Get style for insight type
  const getInsightStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "action":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💡</span> Insights & Tips
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Card */}
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {metrics.performanceScore >= 80 && metrics.seoScore >= 80 ? "🎯" :
               metrics.performanceScore >= 50 && metrics.seoScore >= 50 ? "👍" : "📈"}
            </span>
            <div>
              <div className="font-medium text-lg text-primary">
                {metrics.performanceScore >= 80 && metrics.seoScore >= 80
                  ? "Your website is doing great!"
                  : metrics.performanceScore >= 50 && metrics.seoScore >= 50
                  ? "Your website is doing OK"
                  : "Your website has room to grow"}
              </div>
              <div className="text-sm text-text-secondary">
                Here's what we noticed and how you can improve
              </div>
            </div>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getInsightStyle(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{insight.title}</div>
                  <div className="text-sm text-text-secondary mt-1">
                    {insight.description}
                  </div>
                  {insight.actionLabel && insight.onAction && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={insight.onAction}
                      className="mt-2"
                    >
                      {insight.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No insights fallback */}
        {insights.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            <span className="text-4xl block mb-2">🔄</span>
            <p>Checking your website...</p>
            <p className="text-sm">Insights will appear once we have data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
