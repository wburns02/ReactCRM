import { useState } from "react";
import {
  useTechnicianCoaching,
  useTeamPerformanceSummary,
  useGenerateCoachingFeedback,
} from "@/api/hooks/useTechnicianCoachAI";
import { Button } from "@/components/ui/Button";

interface TechnicianCoachPanelProps {
  technicianId?: string;
}

/**
 * AI-powered technician performance coaching panel
 * Provides insights, goals, and coaching suggestions
 */
export function TechnicianCoachPanel({
  technicianId,
}: TechnicianCoachPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "goals" | "coaching">(
    "overview",
  );
  const [selectedFeedbackContext, setSelectedFeedbackContext] = useState<
    "weekly_review" | "after_job" | "goal_progress" | "improvement_needed"
  >("weekly_review");

  const { data: coaching, isLoading: loadingCoaching } = useTechnicianCoaching(
    technicianId || "",
  );
  const { data: teamSummary, isLoading: loadingTeam } =
    useTeamPerformanceSummary();
  const generateFeedback = useGenerateCoachingFeedback();

  const handleGenerateFeedback = () => {
    if (technicianId) {
      generateFeedback.mutate({
        technician_id: technicianId,
        context: selectedFeedbackContext,
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case "excellence":
        return "&#127942;";
      case "milestone":
        return "&#127895;";
      case "improvement":
        return "&#128200;";
      default:
        return "&#11088;";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>&#10024;</span>
        <span>AI Performance Coach</span>
      </button>
    );
  }

  const isLoading = loadingCoaching || loadingTeam;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#10024;</span>
          <h4 className="font-medium text-text-primary">Performance Coach</h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["overview", "goals", "coaching"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab === "overview"
              ? "Overview"
              : tab === "goals"
                ? "Goals"
                : "Coaching"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Loading coaching data...</span>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && coaching && !loadingCoaching && (
        <div className="space-y-4">
          {/* Score Card */}
          <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
            <span
              className={`text-4xl font-bold ${getScoreColor(coaching.overall_score)}`}
            >
              {coaching.overall_score}
            </span>
            <span className="text-text-muted text-xs block mt-1">
              Overall Performance Score
            </span>
            <span
              className={`text-xs ${
                coaching.trend === "improving"
                  ? "text-green-400"
                  : coaching.trend === "declining"
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {coaching.trend === "improving"
                ? "&#8593; Improving"
                : coaching.trend === "declining"
                  ? "&#8595; Declining"
                  : "&#8594; Stable"}
            </span>
          </div>

          {/* Strengths */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Strengths
            </span>
            <div className="space-y-2">
              {coaching.strengths.map((strength, i) => (
                <div
                  key={i}
                  className="bg-green-500/10 border border-green-500/30 rounded-lg p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-400">
                      {strength.area}
                    </span>
                    <span className="text-xs text-green-400">
                      {strength.score}%
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {strength.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Focus Areas
            </span>
            <div className="space-y-2">
              {coaching.areas_for_improvement.map((area, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-lg p-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {area.area}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getPriorityBadge(area.priority)}`}
                    >
                      {area.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-red-400">{area.current_score}%</span>
                    <span className="text-text-muted">{"→"}</span>
                    <span className="text-green-400">{area.target_score}%</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {area.action_plan}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Achievements */}
          {coaching.recent_achievements.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Recent Achievements
              </span>
              <div className="space-y-2">
                {coaching.recent_achievements.map((ach, i) => (
                  <div
                    key={i}
                    className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 flex items-start gap-2"
                  >
                    <span
                      className="text-lg"
                      dangerouslySetInnerHTML={{
                        __html: getAchievementIcon(ach.type),
                      }}
                    />
                    <div>
                      <span className="text-sm font-medium text-purple-400">
                        {ach.title}
                      </span>
                      <p className="text-xs text-text-secondary">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && coaching && !loadingCoaching && (
        <div className="space-y-3">
          {coaching.goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">
                  {goal.title}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    goal.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : goal.status === "in_progress"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {goal.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">
                {goal.description}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted">
                  {goal.progress_percent}%
                </span>
              </div>
              <span className="text-xs text-text-muted block mt-2">
                Target: {new Date(goal.target_date).toLocaleDateString()}
              </span>
            </div>
          ))}

          {coaching.goals.length === 0 && (
            <div className="text-center py-4">
              <span className="text-text-muted text-sm">No active goals</span>
            </div>
          )}

          <Button size="sm" variant="secondary" className="w-full">
            + Add New Goal
          </Button>
        </div>
      )}

      {/* Coaching Tab */}
      {activeTab === "coaching" && coaching && !loadingCoaching && (
        <div className="space-y-4">
          {/* AI Feedback Generator */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">
              Generate AI Feedback
            </span>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { value: "weekly_review", label: "Weekly Review" },
                { value: "after_job", label: "After Job" },
                { value: "goal_progress", label: "Goal Progress" },
                { value: "improvement_needed", label: "Improvement" },
              ].map((ctx) => (
                <button
                  key={ctx.value}
                  onClick={() =>
                    setSelectedFeedbackContext(
                      ctx.value as typeof selectedFeedbackContext,
                    )
                  }
                  className={`px-2 py-1.5 rounded text-xs ${
                    selectedFeedbackContext === ctx.value
                      ? "bg-purple-600 text-white"
                      : "bg-bg-tertiary text-text-secondary"
                  }`}
                >
                  {ctx.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleGenerateFeedback}
              disabled={generateFeedback.isPending}
              className="w-full"
            >
              {generateFeedback.isPending
                ? "Generating..."
                : "Generate Feedback"}
            </Button>
          </div>

          {/* Generated Feedback */}
          {generateFeedback.data && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-purple-400 uppercase">
                  {generateFeedback.data.tone}
                </span>
              </div>
              <p className="text-sm text-text-primary mb-3">
                {generateFeedback.data.feedback}
              </p>
              <span className="text-xs text-text-muted block mb-1">
                Action Items:
              </span>
              <ul className="text-xs text-text-secondary space-y-1">
                {generateFeedback.data.action_items.map((item, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-purple-400">&#8226;</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Suggestions */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Coaching Suggestions
            </span>
            <div className="space-y-2">
              {coaching.coaching_suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="bg-bg-card border border-border rounded-lg p-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        sug.type === "training"
                          ? "bg-blue-500/20 text-blue-400"
                          : sug.type === "practice"
                            ? "bg-green-500/20 text-green-400"
                            : sug.type === "recognition"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {sug.type}
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {sug.title}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {sug.description}
                  </p>
                  <p className="text-xs text-purple-400 mt-1">
                    {"→"} {sug.expected_impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Summary (if no specific technician) */}
      {!technicianId && teamSummary && !loadingTeam && (
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-xs text-text-muted block mb-2">
            Team Summary
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded p-2 text-center">
              <span className="text-lg font-bold text-text-primary">
                {teamSummary.team_average_score}
              </span>
              <span className="text-xs text-text-muted block">Team Avg</span>
            </div>
            <div className="bg-bg-card border border-border rounded p-2 text-center">
              <span className="text-lg font-bold text-green-400">
                {teamSummary.team_goals_progress}%
              </span>
              <span className="text-xs text-text-muted block">
                Goals Progress
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
