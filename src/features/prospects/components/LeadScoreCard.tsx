import { useState } from "react";
import {
  useLeadScore,
  useLeadRecommendations,
} from "@/api/hooks/useLeadScoring";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface LeadScoreCardProps {
  prospectId: string;
}

/**
 * AI-powered lead scoring card
 * Displays lead quality score, conversion probability, and recommendations
 */
export function LeadScoreCard({ prospectId }: LeadScoreCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const {
    data: scoreData,
    isLoading: scoreLoading,
    refetch,
  } = useLeadScore(prospectId);
  const { data: recommendations } = useLeadRecommendations(
    showDetails ? prospectId : undefined,
  );

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      case "F":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "hot":
        return "text-red-400 bg-red-500/20";
      case "warm":
        return "text-yellow-400 bg-yellow-500/20";
      case "cold":
        return "text-blue-400 bg-blue-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case "hot":
        return "🔥";
      case "warm":
        return "☀️";
      case "cold":
        return "❄️";
      default:
        return "•";
    }
  };

  if (scoreLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span>Analyzing lead quality...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-purple-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <CardTitle className="text-base">AI Lead Score</CardTitle>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getEngagementColor(scoreData.engagement_level)}`}
            >
              {getEngagementIcon(scoreData.engagement_level)}{" "}
              {scoreData.engagement_level.toUpperCase()}
            </span>
          </div>
        </CardHeader>
      </div>

      <CardContent className="pt-4">
        {/* Score Display */}
        <div className="flex items-center gap-6 mb-4">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-bg-tertiary"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(scoreData.score / 100) * 220} 220`}
              />
              <defs>
                <linearGradient
                  id="scoreGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-text-primary">
                {scoreData.score}
              </span>
            </div>
          </div>

          {/* Grade and Stats */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-8 h-8 rounded-full ${getGradeColor(scoreData.grade)} flex items-center justify-center text-white font-bold text-sm`}
              >
                {scoreData.grade}
              </span>
              <span className="text-text-secondary text-sm">Grade</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-text-muted block">Conversion</span>
                <span className="font-medium text-text-primary">
                  {scoreData.conversion_probability}%
                </span>
              </div>
              <div>
                <span className="text-text-muted block">Est. Close</span>
                <span className="font-medium text-text-primary">
                  {scoreData.estimated_close_days} days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Factors */}
        {scoreData.scoring_factors.length > 0 && (
          <div className="mb-4">
            <h5 className="text-xs text-text-muted mb-2 uppercase tracking-wide">
              Scoring Factors
            </h5>
            <div className="space-y-2">
              {scoreData.scoring_factors
                .slice(0, showDetails ? undefined : 3)
                .map((factor, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          factor.impact === "positive"
                            ? "text-green-400"
                            : factor.impact === "negative"
                              ? "text-red-400"
                              : "text-yellow-400"
                        }
                      >
                        {factor.impact === "positive"
                          ? "+"
                          : factor.impact === "negative"
                            ? "-"
                            : "•"}
                      </span>
                      <span className="text-text-secondary">{factor.name}</span>
                    </div>
                    <span
                      className={`text-xs ${
                        factor.impact === "positive"
                          ? "text-green-400"
                          : factor.impact === "negative"
                            ? "text-red-400"
                            : "text-text-muted"
                      }`}
                    >
                      {factor.weight > 0 ? `+${factor.weight}` : factor.weight}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {scoreData.recommended_actions.length > 0 && (
          <div className="mb-4">
            <h5 className="text-xs text-text-muted mb-2 uppercase tracking-wide">
              Recommended Actions
            </h5>
            <ul className="space-y-1">
              {scoreData.recommended_actions
                .slice(0, showDetails ? undefined : 2)
                .map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-400 mt-0.5">→</span>
                    <span className="text-text-secondary">{action}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Best Contact Time */}
        {scoreData.best_contact_time && (
          <div className="bg-bg-tertiary rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span>🕐</span>
              <span className="text-text-muted">Best time to contact:</span>
              <span className="text-text-primary font-medium">
                {scoreData.best_contact_time}
              </span>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {showDetails && recommendations && (
          <div className="space-y-4 border-t border-border pt-4 mt-4">
            {/* Next Best Action */}
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-3">
              <h5 className="text-xs text-text-muted mb-1 uppercase tracking-wide">
                Next Best Action
              </h5>
              <p className="text-text-primary font-medium">
                {recommendations.next_best_action}
              </p>
            </div>

            {/* Talking Points */}
            {recommendations.talking_points && (
              <div>
                <h5 className="text-xs text-text-muted mb-2 uppercase tracking-wide">
                  Talking Points
                </h5>
                <ul className="space-y-1">
                  {recommendations.talking_points.map(
                    (point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-400">•</span>
                        <span className="text-text-secondary">{point}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {/* Objection Handlers */}
            {recommendations.objection_handlers &&
              recommendations.objection_handlers.length > 0 && (
                <div>
                  <h5 className="text-xs text-text-muted mb-2 uppercase tracking-wide">
                    Objection Handling
                  </h5>
                  <div className="space-y-2">
                    {recommendations.objection_handlers.map(
                      (
                        handler: { objection: string; response: string },
                        i: number,
                      ) => (
                        <div
                          key={i}
                          className="bg-bg-card border border-border rounded-lg p-2"
                        >
                          <p className="text-xs text-red-400 mb-1">
                            "{handler.objection}"
                          </p>
                          <p className="text-sm text-text-secondary">
                            → {handler.response}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Toggle Details Button */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1"
          >
            {showDetails ? "Show Less" : "Show More Details"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
