import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useOnboardingProgress,
  useOnboardingRecommendations,
  useSkipOnboardingTask,
} from "@/api/hooks/useOnboardingAI";
import { Button } from "@/components/ui/Button";

/**
 * AI-powered onboarding assistant
 * Guides new users through the CRM setup and learning process
 */
export function OnboardingAssistant() {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "progress" | "tasks" | "recommendations"
  >("progress");
  const navigate = useNavigate();

  const {
    data: progress,
    isLoading: loadingProgress,
    refetch,
  } = useOnboardingProgress();
  const { data: recommendations, isLoading: loadingRecs } =
    useOnboardingRecommendations();

  const skipTask = useSkipOnboardingTask();

  const handleSkipTask = async (taskId: string) => {
    await skipTask.mutateAsync(taskId);
    refetch();
  };

  const handleGoToTask = (url?: string) => {
    if (url) {
      navigate(url);
      setShowPanel(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "setup":
        return "&#9881;";
      case "learn":
        return "&#128218;";
      case "practice":
        return "&#9889;";
      case "customize":
        return "&#127912;";
      default:
        return "&#10003;";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "required":
        return "bg-red-500/20 text-red-400";
      case "recommended":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      >
        <span>&#10024;</span>
        <span className="text-sm font-medium">Onboarding Guide</span>
        {progress && progress.completion_percent < 100 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {progress.completion_percent}%
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-bg-primary border border-purple-500/30 rounded-lg shadow-2xl z-50 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-border rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#10024;</span>
            <h4 className="font-medium text-text-primary">
              Onboarding Assistant
            </h4>
          </div>
          <button
            onClick={() => setShowPanel(false)}
            className="text-text-muted hover:text-text-primary"
          >
            &#10005;
          </button>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary">Setup Progress</span>
              <span className="text-purple-400 font-medium">
                {progress.completion_percent}%
              </span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${progress.completion_percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["progress", "tasks", "recommendations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab === "progress"
              ? "Overview"
              : tab === "tasks"
                ? "Tasks"
                : "Tips"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {(loadingProgress || loadingRecs) && (
          <div className="flex items-center gap-2 text-text-secondary py-4 justify-center">
            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && progress && !loadingProgress && (
          <div className="space-y-4">
            {/* Current Phase */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <span className="text-xs text-purple-400 block mb-1">
                Current Phase
              </span>
              <span className="font-medium text-text-primary">
                {progress.current_phase.name}
              </span>
              <p className="text-xs text-text-secondary mt-1">
                {progress.current_phase.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-green-400">
                  {progress.completed_tasks.length}
                </span>
                <span className="text-xs text-text-muted block">Completed</span>
              </div>
              <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-text-primary">
                  {progress.pending_tasks.length}
                </span>
                <span className="text-xs text-text-muted block">Remaining</span>
              </div>
            </div>

            {/* Time Estimate */}
            <div className="text-center py-2">
              <span className="text-xs text-text-muted">
                Estimated time to complete:
              </span>
              <span className="text-sm text-text-primary font-medium block">
                ~{progress.estimated_time_remaining} minutes
              </span>
            </div>

            {/* Next Task */}
            {progress.pending_tasks[0] && (
              <div>
                <span className="text-xs text-text-muted block mb-2">
                  Up Next
                </span>
                <div className="bg-bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-lg"
                      dangerouslySetInnerHTML={{
                        __html: getCategoryIcon(
                          progress.pending_tasks[0].category,
                        ),
                      }}
                    />
                    <span className="font-medium text-text-primary text-sm">
                      {progress.pending_tasks[0].title}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-3">
                    {progress.pending_tasks[0].description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleGoToTask(progress.pending_tasks[0].action_url)
                    }
                  >
                    Start Task
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && progress && !loadingProgress && (
          <div className="space-y-2">
            {progress.pending_tasks.map((task) => (
              <div
                key={task.id}
                className="bg-bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-base"
                      dangerouslySetInnerHTML={{
                        __html: getCategoryIcon(task.category),
                      }}
                    />
                    <span className="font-medium text-text-primary text-sm">
                      {task.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-2">
                  {task.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    ~{task.estimated_minutes} min
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSkipTask(task.id)}
                      className="text-xs text-text-muted hover:text-text-secondary"
                    >
                      Skip
                    </button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleGoToTask(task.action_url)}
                    >
                      Start
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {progress.pending_tasks.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">&#127881;</span>
                <span className="text-text-primary font-medium">
                  All tasks complete!
                </span>
                <p className="text-xs text-text-secondary mt-1">
                  You've finished the onboarding process.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === "recommendations" && recommendations && !loadingRecs && (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rec.priority === "high"
                        ? "bg-red-400"
                        : rec.priority === "medium"
                          ? "bg-yellow-400"
                          : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium text-text-primary text-sm">
                    {rec.title}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-2">
                  {rec.description}
                </p>
                <div className="bg-purple-500/10 rounded p-2 mb-2">
                  <span className="text-xs text-purple-400">
                    {"→"} {rec.estimated_impact}
                  </span>
                </div>
                <details className="text-xs">
                  <summary className="text-text-muted cursor-pointer hover:text-text-secondary">
                    View steps ({rec.next_steps.length})
                  </summary>
                  <ol className="mt-2 ml-4 list-decimal text-text-secondary space-y-1">
                    {rec.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-bg-tertiary rounded-b-lg">
        <div className="flex items-center justify-between text-xs">
          <button className="text-text-muted hover:text-text-secondary">
            Skip onboarding
          </button>
          <button className="text-purple-400 hover:text-purple-300">
            Help & Resources
          </button>
        </div>
      </div>
    </div>
  );
}
