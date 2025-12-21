import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { useAnalytics } from '@/api/hooks/useEmailMarketing.ts';
import type { SubscriptionTier } from '@/api/types/emailMarketing.ts';

interface AnalyticsTabProps {
  tier: SubscriptionTier;
}

export function AnalyticsTab({ tier }: AnalyticsTabProps) {
  const [days, setDays] = useState(30);

  const { data: analytics, isLoading, error } = useAnalytics(days);

  const dailyStats = analytics?.daily_stats || [];
  const topCampaigns = analytics?.top_campaigns || [];
  const segmentPerformance = analytics?.segment_performance || [];

  // Calculate totals from daily stats
  const totals = dailyStats.reduce(
    (acc, day) => ({
      sent: acc.sent + (day.sent || 0),
      delivered: acc.delivered + (day.delivered || 0),
      opened: acc.opened + (day.opened || 0),
      clicked: acc.clicked + (day.clicked || 0),
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0 }
  );

  const openRate = totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0;
  const clickRate = totals.delivered > 0 ? (totals.clicked / totals.delivered) * 100 : 0;

  if (tier === 'none') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Analytics Unavailable</h3>
          <p className="text-text-secondary">
            Upgrade to a paid plan to access email analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-bg-muted rounded" />
          ))}
        </div>
        <div className="h-64 bg-bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Unable to load analytics</h3>
          <p className="text-text-secondary">Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Email Performance</h3>
        <Select
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-40"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-text-primary">{totals.sent.toLocaleString()}</p>
            <p className="text-sm text-text-muted">Emails Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-text-primary">{totals.delivered.toLocaleString()}</p>
            <p className="text-sm text-text-muted">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-success">{openRate.toFixed(1)}%</p>
            <p className="text-sm text-text-muted">Open Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{clickRate.toFixed(1)}%</p>
            <p className="text-sm text-text-muted">Click Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Stats Chart (Simple bar representation) */}
      {dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Email Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyStats.slice(-14).map((day) => {
                const maxSent = Math.max(...dailyStats.map((d) => d.sent || 0));
                const widthPercent = maxSent > 0 ? ((day.sent || 0) / maxSent) * 100 : 0;

                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-20 text-xs text-text-muted">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 h-6 bg-bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm text-text-secondary">
                      {day.sent || 0}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-primary rounded" /> Sent
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {topCampaigns.length === 0 ? (
              <p className="text-text-muted text-center py-4">No campaign data available</p>
            ) : (
              <div className="space-y-3">
                {topCampaigns.slice(0, 5).map((campaign, index) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-text-muted">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-text-primary">{campaign.name}</p>
                        <p className="text-xs text-text-muted">{campaign.sent} emails sent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        {(campaign.open_rate * 100).toFixed(1)}% open
                      </p>
                      <p className="text-xs text-text-muted">
                        {(campaign.click_rate * 100).toFixed(1)}% click
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Segment Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            {segmentPerformance.length === 0 ? (
              <p className="text-text-muted text-center py-4">No segment data available</p>
            ) : (
              <div className="space-y-3">
                {segmentPerformance.map((segment) => (
                  <div
                    key={segment.segment}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg-muted"
                  >
                    <div>
                      <p className="font-medium text-text-primary capitalize">
                        {segment.segment.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-text-muted">{segment.sent} emails</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        {(segment.open_rate * 100).toFixed(1)}% open
                      </p>
                      <p className="text-xs text-text-muted">
                        {(segment.click_rate * 100).toFixed(1)}% click
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="secondary">
          Export Report
        </Button>
      </div>
    </div>
  );
}
