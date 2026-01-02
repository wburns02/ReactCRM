import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAIDispatchStats } from '@/api/hooks/useAIDispatch';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * AI Dispatch Stats Widget
 *
 * Shows AI dispatch performance metrics for dashboards
 */
export const AIDispatchStats = memo(function AIDispatchStats({
  className,
}: {
  className?: string;
}) {
  const { data: stats, isLoading } = useAIDispatchStats();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span> AI Dispatch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton variant="text" className="h-8 w-24" />
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-4 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🤖</span> AI Dispatch Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metric */}
          <div>
            <div className="text-3xl font-bold text-text-primary">
              {stats.time_saved_minutes}
              <span className="text-lg text-text-muted ml-1">min saved</span>
            </div>
            <p className="text-sm text-text-secondary">
              Through automated scheduling
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <div className="text-xl font-semibold text-text-primary">
                {stats.suggestions_today}
              </div>
              <div className="text-xs text-text-muted">Suggestions</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-success">
                {Math.round(stats.acceptance_rate * 100)}%
              </div>
              <div className="text-xs text-text-muted">Acceptance Rate</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-text-primary">
                {stats.suggestions_accepted}
              </div>
              <div className="text-xs text-text-muted">Accepted</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-primary">
                {stats.auto_executions}
              </div>
              <div className="text-xs text-text-muted">Auto-Executed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
