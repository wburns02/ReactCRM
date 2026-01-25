import { useState } from "react";
import {
  useMaintenancePredictions,
  useAutoScheduleMaintenance,
  useBatchOptimization,
  type MaintenancePredictionItem,
} from "@/api/hooks/useMaintenanceAI";
import { Button } from "@/components/ui/Button";

interface AutoSchedulePanelProps {
  onScheduleCreated?: (workOrderIds: string[]) => void;
}

/**
 * AI-powered auto-scheduling panel for predictive maintenance
 * Analyzes predictions and automatically schedules optimal service appointments
 */
export function AutoSchedulePanel({
  onScheduleCreated,
}: AutoSchedulePanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [daysAhead, setDaysAhead] = useState(14);
  const [selectedPredictions, setSelectedPredictions] = useState<string[]>([]);

  const { data: predictions, isLoading: loadingPredictions } =
    useMaintenancePredictions({
      days_ahead: daysAhead,
      min_confidence: 0.7,
    });

  const autoSchedule = useAutoScheduleMaintenance();
  const batchOptimize = useBatchOptimization();

  const handleAutoSchedule = async () => {
    const result = await autoSchedule.mutateAsync({
      prediction_ids:
        selectedPredictions.length > 0 ? selectedPredictions : undefined,
      days_ahead: daysAhead,
      max_jobs_per_day: 8,
      optimize_routes: true,
    });

    if (result.scheduled_jobs && onScheduleCreated) {
      onScheduleCreated(result.scheduled_jobs.map((j) => j.work_order_id));
    }
  };

  const handleBatchOptimize = async () => {
    await batchOptimize.mutateAsync({
      date_range: {
        start: new Date().toISOString().split("T")[0],
        end: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      consider_weather: true,
      balance_technician_load: true,
    });
  };

  const togglePrediction = (id: string) => {
    setSelectedPredictions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (predictions?.predictions) {
      setSelectedPredictions(predictions.predictions.map((p) => p.id));
    }
  };

  const clearSelection = () => setSelectedPredictions([]);

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Auto-Schedule</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Auto-Scheduler</h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Days Ahead Selector */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-text-secondary">Schedule window:</label>
        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setDaysAhead(days)}
              className={`px-3 py-1 rounded text-sm ${
                daysAhead === days
                  ? "bg-purple-600 text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Predictions List */}
      {loadingPredictions ? (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing maintenance predictions...</span>
        </div>
      ) : predictions?.predictions && predictions.predictions.length > 0 ? (
        <div className="space-y-3">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {selectedPredictions.length} of {predictions.predictions.length}{" "}
              selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-xs text-text-muted hover:text-text-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Prediction Items */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {predictions.predictions.map((prediction) => (
              <PredictionItem
                key={prediction.id}
                prediction={prediction}
                selected={selectedPredictions.includes(prediction.id)}
                onToggle={() => togglePrediction(prediction.id)}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3 mt-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xs text-text-muted block">
                  High Priority
                </span>
                <span className="text-lg font-bold text-red-400">
                  {
                    predictions.predictions.filter(
                      (p) => p.priority === "high" || p.priority === "critical",
                    ).length
                  }
                </span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">
                  Est. Revenue
                </span>
                <span className="text-lg font-bold text-green-400">
                  $
                  {(
                    predictions.summary?.total_estimated_revenue || 0
                  ).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">
                  Avg Confidence
                </span>
                <span className="text-lg font-bold text-purple-400">
                  {Math.round(
                    (predictions.summary?.average_confidence || 0) * 100,
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-text-muted text-sm">
          No maintenance predictions found for the selected period.
        </div>
      )}

      {/* Auto-Schedule Results */}
      {autoSchedule.data && (
        <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">✓</span>
            <span className="text-sm font-medium text-green-400">
              Successfully scheduled {autoSchedule.data.scheduled_count} jobs
            </span>
          </div>
          {autoSchedule.data.optimization_summary && (
            <div className="text-xs text-text-secondary space-y-1">
              <p>
                Travel time saved:{" "}
                {
                  autoSchedule.data.optimization_summary
                    .travel_time_saved_minutes
                }{" "}
                min
              </p>
              <p>
                Route efficiency:{" "}
                {
                  autoSchedule.data.optimization_summary
                    .route_efficiency_percent
                }
                %
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleAutoSchedule}
          disabled={autoSchedule.isPending}
          className="flex-1"
        >
          {autoSchedule.isPending ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Scheduling...
            </>
          ) : (
            <>
              <span className="mr-2">📅</span>
              Auto-Schedule{" "}
              {selectedPredictions.length > 0
                ? `(${selectedPredictions.length})`
                : "All"}
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={handleBatchOptimize}
          disabled={batchOptimize.isPending}
        >
          {batchOptimize.isPending ? "Optimizing..." : "Optimize Routes"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Individual prediction item component
 */
function PredictionItem({
  prediction,
  selected,
  onToggle,
}: {
  prediction: MaintenancePredictionItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  return (
    <div
      onClick={onToggle}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? "bg-purple-500/10 border-purple-500/50"
          : "bg-bg-card border-border hover:border-purple-500/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500"
          />
          <div>
            <span className="font-medium text-text-primary text-sm">
              {prediction.customer_name}
            </span>
            <span className="text-xs text-text-muted block">
              {prediction.equipment_type} - {prediction.service_type}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(prediction.priority)}`}
          >
            {prediction.priority}
          </span>
          <span className="text-xs text-text-muted block mt-1">
            {Math.round(prediction.confidence * 100)}% confidence
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-text-secondary">
          Due: {new Date(prediction.predicted_date).toLocaleDateString()}
        </span>
        <span className="text-green-400 font-medium">
          ${prediction.estimated_revenue.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
