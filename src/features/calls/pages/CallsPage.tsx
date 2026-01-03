import { useState } from 'react';
import { CallList } from '../components/CallList.tsx';
import { CallDetails } from '../components/CallDetails.tsx';
import { useCallAnalytics, type Call } from '../api/calls.ts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';

export function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const { data: analytics, isLoading: analyticsLoading } = useCallAnalytics();

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            📞 Call Center
          </h1>
          <p className="text-text-muted mt-1">
            View and manage all call logs, recordings, and dispositions
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Calls</p>
                <p className="text-2xl font-bold text-text-primary">
                  {analyticsLoading ? '-' : analytics?.total_calls || 0}
                </p>
                <p className="text-xs text-text-muted mt-1">Last 7 days</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full text-2xl">
                📞
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Answered</p>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsLoading ? '-' : analytics?.answered_calls || 0}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {analytics?.total_calls
                    ? `${Math.round((analytics.answered_calls / analytics.total_calls) * 100)}% answer rate`
                    : '-'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-2xl">
                📥
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Missed</p>
                <p className="text-2xl font-bold text-red-600">
                  {analyticsLoading ? '-' : analytics?.missed_calls || 0}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {analytics?.total_calls
                    ? `${Math.round((analytics.missed_calls / analytics.total_calls) * 100)}% miss rate`
                    : '-'}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full text-2xl">
                📵
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Avg Duration</p>
                <p className="text-2xl font-bold text-text-primary">
                  {analyticsLoading ? '-' : formatDuration(analytics?.avg_duration_seconds || 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">Per call</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-2xl">
                ⏱️
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <CallList onCallSelect={setSelectedCall} />
            </CardContent>
          </Card>
        </div>

        {/* Call details / stats sidebar */}
        <div className="space-y-6">
          {selectedCall ? (
            <CallDetails
              callId={selectedCall.id}
              onClose={() => setSelectedCall(null)}
            />
          ) : (
            <>
              {/* Calls by direction */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    📈 Calls by Direction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-8 bg-bg-muted rounded" />
                      <div className="h-8 bg-bg-muted rounded" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(analytics?.calls_by_direction || {}).map(
                        ([direction, count]) => (
                          <div key={direction} className="flex items-center justify-between">
                            <span className="text-text-primary capitalize">{direction}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        )
                      )}
                      {Object.keys(analytics?.calls_by_direction || {}).length === 0 && (
                        <p className="text-text-muted text-sm">No data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Calls by disposition */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    📊 Calls by Disposition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-6 bg-bg-muted rounded" />
                      <div className="h-6 bg-bg-muted rounded" />
                      <div className="h-6 bg-bg-muted rounded" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(analytics?.calls_by_disposition || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([disposition, count]) => (
                          <div key={disposition} className="flex items-center justify-between">
                            <span className="text-sm text-text-primary capitalize">
                              {disposition.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        ))}
                      {Object.keys(analytics?.calls_by_disposition || {}).length === 0 && (
                        <p className="text-text-muted text-sm">No data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallsPage;
