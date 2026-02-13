import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import {
  useDispatchRecommendation,
  useDispatchAssign,
  type TechRecommendation,
} from "@/api/hooks/useDispatch.ts";
import { apiClient } from "@/api/client.ts";

function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "success" : score >= 50 ? "warning" : "danger";
  return <Badge variant={variant}>{score}</Badge>;
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const variant =
    availability === "available"
      ? "success"
      : availability === "on_job"
        ? "warning"
        : "danger";
  return (
    <Badge variant={variant}>
      {availability === "on_job"
        ? "On Job"
        : availability === "heavy_load"
          ? "Heavy Load"
          : "Available"}
    </Badge>
  );
}

function TechCard({
  tech,
  onAssign,
  isAssigning,
}: {
  tech: TechRecommendation;
  onAssign: () => void;
  isAssigning: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface-secondary transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{tech.name}</span>
          <ScoreBadge score={tech.score} />
          <AvailabilityBadge availability={tech.availability} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
          {tech.distance_miles != null && (
            <span>
              {tech.distance_miles} mi
              {tech.location_source && ` (${tech.location_source})`}
            </span>
          )}
          {tech.estimated_travel_minutes != null && (
            <span>~{tech.estimated_travel_minutes} min</span>
          )}
          <span>
            {tech.job_load.scheduled_today} jobs today
            {tech.job_load.active_jobs > 0 &&
              ` (${tech.job_load.active_jobs} active)`}
          </span>
        </div>
        {tech.skills_missing.length > 0 && (
          <div className="mt-1 text-xs text-orange-600">
            Missing skill: {tech.skills_missing.join(", ")}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="primary"
        onClick={onAssign}
        disabled={isAssigning}
        className="ml-3 shrink-0"
      >
        Assign
      </Button>
    </div>
  );
}

export function SmartAssign({
  workOrderId,
  onAssigned,
}: {
  workOrderId: string;
  onAssigned?: () => void;
}) {
  const [recommendations, setRecommendations] = useState<
    TechRecommendation[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assignMutation = useDispatchAssign();

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(
        `/dispatch/recommend/${workOrderId}`,
      );
      setRecommendations(data.recommended_technicians || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to get recommendations",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (techId: string) => {
    await assignMutation.mutateAsync({
      workOrderId,
      technicianId: techId,
    });
    setRecommendations(null);
    onAssigned?.();
  };

  if (!recommendations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span>
            Smart Dispatch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            AI-powered technician recommendation based on proximity, skills,
            and availability.
          </p>
          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}
          <Button
            onClick={fetchRecommendations}
            disabled={isLoading}
            variant="primary"
            className="w-full"
          >
            {isLoading ? "Finding best techs..." : "Get Recommendations"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span>
            Recommended Technicians
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRecommendations(null)}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">
            No technicians available for this job type and location.
          </p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((tech) => (
              <TechCard
                key={tech.technician_id}
                tech={tech}
                onAssign={() => handleAssign(tech.technician_id)}
                isAssigning={assignMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
