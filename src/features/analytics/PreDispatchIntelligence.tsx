import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAIWorkOrderPredictions } from "@/api/hooks/useAIDispatch";
import { cn } from "@/lib/utils";

interface PreDispatchIntelligenceProps {
  workOrderId: string;
  className?: string;
}

/**
 * PreDispatchIntelligence - AI-powered pre-dispatch insights for FTFR improvement
 *
 * Displays:
 * - Predicted parts needed (with probability)
 * - Similar past jobs with solutions
 * - Recommended technician based on expertise
 * - Estimated duration
 *
 * This is the "Pre-dispatch Intelligence" phase of the FTFR Engine.
 */
export function PreDispatchIntelligence({
  workOrderId,
  className,
}: PreDispatchIntelligenceProps) {
  const [showAllParts, setShowAllParts] = useState(false);
  const [showAllSimilarJobs, setShowAllSimilarJobs] = useState(false);

  const {
    data: predictions,
    isLoading,
    error,
  } = useAIWorkOrderPredictions(workOrderId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">AI</span>
            Pre-Dispatch Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-20 w-full" />
            <Skeleton variant="rounded" className="h-32 w-full" />
            <Skeleton variant="rounded" className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !predictions) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-text-muted">
            AI predictions not available for this work order
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleParts = showAllParts
    ? predictions.predicted_parts
    : predictions.predicted_parts.slice(0, 3);

  const visibleSimilarJobs = showAllSimilarJobs
    ? predictions.similar_jobs
    : predictions.similar_jobs.slice(0, 2);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
            AI
          </span>
          Pre-Dispatch Intelligence
          <Badge variant="primary" className="text-xs">
            FTFR Boost
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estimated Duration */}
        {predictions.estimated_duration_minutes > 0 && (
          <div className="flex items-center justify-between p-4 bg-bg-muted rounded-lg">
            <div>
              <p className="text-sm text-text-secondary">Estimated Duration</p>
              <p className="text-2xl font-bold text-text-primary">
                {Math.floor(predictions.estimated_duration_minutes / 60)}h{" "}
                {predictions.estimated_duration_minutes % 60}m
              </p>
            </div>
            <div className="text-4xl opacity-30">+</div>
          </div>
        )}

        {/* Recommended Technician */}
        {predictions.recommended_technician && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-secondary">
                Recommended Technician
              </p>
              <Badge variant="success" className="text-xs">
                Best Match
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {predictions.recommended_technician.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {predictions.recommended_technician.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {predictions.recommended_technician.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Predicted Parts */}
        {predictions.predicted_parts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-text-primary flex items-center gap-2">
                Predicted Parts Needed
                <span className="text-xs text-text-muted">
                  ({predictions.predicted_parts.length} items)
                </span>
              </h4>
            </div>
            <div className="space-y-2">
              {visibleParts.map((part, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                      #
                    </div>
                    <span className="font-medium text-text-primary">
                      {part.name}
                    </span>
                  </div>
                  <Badge
                    variant={
                      part.probability >= 0.8
                        ? "success"
                        : part.probability >= 0.5
                          ? "warning"
                          : "default"
                    }
                    className="text-xs"
                  >
                    {Math.round(part.probability * 100)}% likely
                  </Badge>
                </div>
              ))}
              {predictions.predicted_parts.length > 3 && (
                <button
                  onClick={() => setShowAllParts(!showAllParts)}
                  className="text-sm text-primary hover:underline"
                >
                  {showAllParts
                    ? "Show less"
                    : `Show ${predictions.predicted_parts.length - 3} more parts`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Similar Past Jobs */}
        {predictions.similar_jobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-text-primary flex items-center gap-2">
                Similar Past Jobs
                <Badge variant="primary" className="text-xs">
                  {predictions.similar_jobs.filter((j) => j.success).length}/
                  {predictions.similar_jobs.length} successful
                </Badge>
              </h4>
            </div>
            <div className="space-y-3">
              {visibleSimilarJobs.map((job, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    job.success
                      ? "bg-success/5 border-success/20"
                      : "bg-warning/5 border-warning/20",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant={job.success ? "success" : "warning"}
                      className="text-xs"
                    >
                      {job.success ? "Fixed First Time" : "Required Follow-up"}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      Job #{job.id}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{job.solution}</p>
                </div>
              ))}
              {predictions.similar_jobs.length > 2 && (
                <button
                  onClick={() => setShowAllSimilarJobs(!showAllSimilarJobs)}
                  className="text-sm text-primary hover:underline"
                >
                  {showAllSimilarJobs
                    ? "Show less"
                    : `View ${predictions.similar_jobs.length - 2} more similar jobs`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* FTFR Impact Notice */}
        <div className="p-3 bg-gradient-to-r from-success/10 to-primary/10 rounded-lg border border-success/20">
          <p className="text-sm text-text-secondary flex items-center gap-2">
            <span className="text-success">++</span>
            Using this intelligence can improve your First-Time Fix Rate by up
            to 15%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export function PreDispatchIntelligenceCompact({
  workOrderId,
  className,
}: Pick<PreDispatchIntelligenceProps, "workOrderId" | "className">) {
  const { data: predictions, isLoading } =
    useAIWorkOrderPredictions(workOrderId);

  if (isLoading || !predictions) {
    return null;
  }

  const hasInsights =
    predictions.predicted_parts.length > 0 ||
    predictions.similar_jobs.length > 0 ||
    predictions.recommended_technician;

  if (!hasInsights) return null;

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {predictions.predicted_parts.length > 0 && (
        <Badge variant="outline" className="text-xs">
          {predictions.predicted_parts.length} parts predicted
        </Badge>
      )}
      {predictions.similar_jobs.length > 0 && (
        <Badge variant="outline" className="text-xs">
          {predictions.similar_jobs.length} similar jobs
        </Badge>
      )}
      {predictions.recommended_technician && (
        <Badge variant="success" className="text-xs">
          Best: {predictions.recommended_technician.name}
        </Badge>
      )}
    </div>
  );
}

export default PreDispatchIntelligence;
