/**
 * AI Work Order Helper Component
 * Shows AI recommendations for work orders
 */
import { Clock, Wrench, User, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useWorkOrderRecommendations } from '@/hooks/useAI';

interface AIWorkOrderHelperProps {
  workOrderId: string;
  onAssignTechnician?: (technicianId: number) => void;
}

/**
 * AI helper panel for work order detail view
 */
export function AIWorkOrderHelper({ workOrderId, onAssignTechnician }: AIWorkOrderHelperProps) {
  const { data: recommendations, isLoading, error } = useWorkOrderRecommendations(workOrderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>🤖</span> AI Recommendations
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

  if (error || !recommendations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>🤖</span> AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            AI recommendations are not available for this work order at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span>🤖</span> AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Duration */}
        <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-text-muted">Estimated Duration</p>
            <p className="text-sm font-medium">
              {recommendations.estimated_duration} minutes
              <span className="text-text-muted ml-1">
                ({Math.round(recommendations.estimated_duration / 60 * 10) / 10} hrs)
              </span>
            </p>
          </div>
        </div>

        {/* Recommended Technician */}
        {recommendations.technician_match && (
          <div className="p-3 bg-success/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-success" />
                <div>
                  <p className="text-xs text-text-muted">Best Match Technician</p>
                  <p className="text-sm font-medium">{recommendations.technician_match.name}</p>
                  <p className="text-xs text-text-muted">
                    Match score: {recommendations.technician_match.score}%
                  </p>
                </div>
              </div>
              {onAssignTechnician && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAssignTechnician(recommendations.technician_match!.id)}
                >
                  Assign
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Recommended Parts */}
        {recommendations.recommended_parts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-text-muted" />
              <h4 className="text-xs font-medium text-text-muted uppercase">
                Likely Parts Needed
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendations.recommended_parts.map((part, index) => (
                <Badge key={index} variant="default">
                  {part}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Similar Jobs */}
        {recommendations.similar_jobs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-text-muted" />
              <h4 className="text-xs font-medium text-text-muted uppercase">
                Similar Past Jobs
              </h4>
            </div>
            <div className="space-y-2">
              {recommendations.similar_jobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="p-2 bg-bg-muted rounded text-sm"
                >
                  <p className="text-text-secondary">{job.solution}</p>
                  <p className="text-xs text-text-muted mt-1">WO #{job.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIWorkOrderHelper;
