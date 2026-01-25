import { useState } from "react";
import {
  useScheduleOptimization,
  useScheduleAnalysis,
  useAutoFillGaps,
} from "@/api/hooks/useSchedulingAI";
import { Button } from "@/components/ui/Button";

interface ScheduleOptimizerPanelProps {
  date?: string;
  onApplyOptimization?: (optimizedSchedule: unknown) => void;
}

/**
 * AI-powered schedule optimization panel
 * Provides route optimization, gap filling, and schedule analysis
 */
export function ScheduleOptimizerPanel({
  date,
  onApplyOptimization,
}: ScheduleOptimizerPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"analyze" | "optimize" | "gaps">(
    "analyze",
  );

  const currentDate = date || new Date().toISOString().split("T")[0];

  const {
    data: analysis,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
  } = useScheduleAnalysis(currentDate);
  const optimizeMutation = useScheduleOptimization();
  const autoFillMutation = useAutoFillGaps();

  const handleOptimize = () => {
    optimizeMutation.mutate({
      date: currentDate,
      optimizeFor: "balanced",
    });
  };

  const handleAutoFill = () => {
    autoFillMutation.mutate({
      date: currentDate,
      minimumGapMinutes: 30,
    });
  };

  const handleApply = () => {
    if (optimizeMutation.data && onApplyOptimization) {
      onApplyOptimization(optimizeMutation.data.optimized_schedule);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getUtilizationColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "text-green-400";
      case "underutilized":
        return "text-yellow-400";
      case "overloaded":
        return "text-red-400";
      default:
        return "text-text-secondary";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Schedule Optimizer</span>
      </button>
    );
  }

  const isLoading =
    activeTab === "analyze"
      ? analysisLoading
      : activeTab === "optimize"
        ? optimizeMutation.isPending
        : autoFillMutation.isPending;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">
            AI Schedule Optimizer
          </h4>
          <span className="text-xs text-text-muted">({currentDate})</span>
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
        <button
          onClick={() => setActiveTab("analyze")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "analyze"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab("optimize")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "optimize"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Optimize Routes
        </button>
        <button
          onClick={() => setActiveTab("gaps")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "gaps"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Fill Gaps
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">
            {activeTab === "analyze"
              ? "Analyzing schedule..."
              : activeTab === "optimize"
                ? "Optimizing routes..."
                : "Finding gaps to fill..."}
          </span>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === "analyze" && analysis && !isLoading && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <span className="text-xs text-text-muted block mb-1">
                Schedule Health
              </span>
              <span
                className={`text-2xl font-bold ${getHealthColor(analysis.overall_health)}`}
              >
                {analysis.overall_health}%
              </span>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <span className="text-xs text-text-muted block mb-1">
                Efficiency Score
              </span>
              <span
                className={`text-2xl font-bold ${getHealthColor(analysis.efficiency_score)}`}
              >
                {analysis.efficiency_score}%
              </span>
            </div>
          </div>

          {/* Technician Utilization */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">
              Technician Utilization
            </span>
            <div className="space-y-2">
              {analysis.utilization_by_tech?.map(
                (
                  tech: {
                    technician: string;
                    utilization: number;
                    status: string;
                  },
                  i: number,
                ) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">
                      {tech.technician}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            tech.status === "optimal"
                              ? "bg-green-500"
                              : tech.status === "underutilized"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${tech.utilization}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm ${getUtilizationColor(tech.status)}`}
                      >
                        {tech.utilization}%
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Issues */}
          {analysis.issues?.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Issues Found
              </span>
              <div className="space-y-2">
                {analysis.issues.map(
                  (
                    issue: {
                      severity: string;
                      type: string;
                      description: string;
                      suggestion: string;
                    },
                    i: number,
                  ) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium uppercase">
                          {issue.severity}
                        </span>
                        <span className="text-sm font-medium">
                          {issue.type}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{issue.description}</p>
                      <p className="text-xs mt-1 opacity-75">
                        → {issue.suggestion}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {analysis.opportunities?.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Opportunities
              </span>
              <ul className="space-y-1">
                {analysis.opportunities.map((opp: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-green-400">+</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Optimize Tab */}
      {activeTab === "optimize" && (
        <div className="space-y-4">
          {!optimizeMutation.data && !optimizeMutation.isPending && (
            <div className="text-center py-4">
              <p className="text-sm text-text-muted mb-3">
                Optimize technician routes to minimize drive time and maximize
                efficiency
              </p>
              <Button
                size="sm"
                onClick={handleOptimize}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Optimize Schedule
              </Button>
            </div>
          )}

          {optimizeMutation.data && (
            <>
              {/* Savings Summary */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <span className="text-sm text-green-400 block mb-2">
                  Optimization Results
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-text-muted">
                      Drive Time Saved
                    </span>
                    <p className="text-lg font-bold text-green-400">
                      {optimizeMutation.data.savings.drive_time_saved_hours} hrs
                      <span className="text-sm ml-1">
                        (
                        {optimizeMutation.data.savings.drive_time_saved_percent}
                        %)
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted">Fuel Saved</span>
                    <p className="text-lg font-bold text-green-400">
                      ${optimizeMutation.data.savings.fuel_cost_saved}
                    </p>
                  </div>
                </div>
                {optimizeMutation.data.savings.additional_job_capacity > 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    +{optimizeMutation.data.savings.additional_job_capacity}{" "}
                    additional job capacity created
                  </p>
                )}
              </div>

              {/* Changes */}
              {optimizeMutation.data.optimized_schedule.filter(
                (j: { change_reason?: string }) => j.change_reason,
              ).length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">
                    Recommended Changes
                  </span>
                  <div className="space-y-2">
                    {optimizeMutation.data.optimized_schedule
                      .filter(
                        (job: { change_reason?: string }) => job.change_reason,
                      )
                      .map(
                        (job: {
                          job_id: string;
                          original_time: string;
                          optimized_time: string;
                          change_reason?: string;
                        }) => (
                          <div
                            key={job.job_id}
                            className="bg-bg-card border border-border rounded-lg p-2"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-text-primary">
                                {job.job_id}
                              </span>
                              <span className="text-xs text-text-muted">
                                {job.original_time} → {job.optimized_time}
                              </span>
                            </div>
                            <p className="text-xs text-purple-400">
                              {job.change_reason}
                            </p>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              {onApplyOptimization && (
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Apply Optimized Schedule
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Gaps Tab */}
      {activeTab === "gaps" && (
        <div className="space-y-4">
          {!autoFillMutation.data && !autoFillMutation.isPending && (
            <div className="text-center py-4">
              <p className="text-sm text-text-muted mb-3">
                Find and fill schedule gaps with pending jobs from the queue
              </p>
              <Button
                size="sm"
                onClick={handleAutoFill}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Auto-Fill Gaps
              </Button>
            </div>
          )}

          {autoFillMutation.data && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">
                    Gaps Found
                  </span>
                  <span className="text-xl font-bold text-text-primary">
                    {autoFillMutation.data.gaps_found}
                  </span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">
                    Gaps Filled
                  </span>
                  <span className="text-xl font-bold text-success">
                    {autoFillMutation.data.gaps_filled}
                  </span>
                </div>
              </div>

              {/* Jobs Added */}
              {autoFillMutation.data.jobs_added?.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">
                    Jobs Added
                  </span>
                  <div className="space-y-2">
                    {autoFillMutation.data.jobs_added.map(
                      (job: {
                        job_id: string;
                        time: string;
                        technician: string;
                      }) => (
                        <div
                          key={job.job_id}
                          className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-2"
                        >
                          <span className="text-sm font-medium text-green-400">
                            {job.job_id}
                          </span>
                          <span className="text-xs text-text-muted">
                            {job.time} - {job.technician}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Remaining Gaps */}
              {autoFillMutation.data.remaining_gaps?.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">
                    Remaining Gaps
                  </span>
                  <div className="space-y-2">
                    {autoFillMutation.data.remaining_gaps.map(
                      (
                        gap: {
                          technician: string;
                          start: string;
                          end: string;
                          reason: string;
                        },
                        i: number,
                      ) => (
                        <div
                          key={i}
                          className="bg-bg-card border border-border rounded-lg p-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-text-primary">
                              {gap.technician}
                            </span>
                            <span className="text-xs text-text-muted">
                              {gap.start} - {gap.end}
                            </span>
                          </div>
                          <p className="text-xs text-yellow-400">
                            {gap.reason}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Capacity Increase */}
              {autoFillMutation.data.capacity_increase > 0 && (
                <p className="text-sm text-success text-center">
                  +{autoFillMutation.data.capacity_increase}% capacity increase
                </p>
              )}
            </>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (activeTab === "analyze") refetchAnalysis();
          else if (activeTab === "optimize") handleOptimize();
          else handleAutoFill();
        }}
        disabled={isLoading}
        className="w-full mt-4"
      >
        Refresh
      </Button>
    </div>
  );
}
