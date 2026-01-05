/**
 * Financial Dashboard
 * Revenue tracking, AR aging, and margin analysis
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useFinancialSnapshot } from '@/api/hooks/useAnalytics';
import type { RevenuePeriod, ARAgingBucket, MarginByJobType } from '@/api/types/analytics';
import { formatCurrency, cn } from '@/lib/utils';

export function FinancialDashboard() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const { data: snapshot, isLoading } = useFinancialSnapshot();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Financial Dashboard</h1>
          <p className="text-text-secondary">
            Revenue, accounts receivable, and profitability analysis
          </p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={dateRange === period ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDateRange(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-background-secondary animate-pulse rounded-lg" />
          ))}
        </div>
      ) : snapshot ? (
        <>
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshot.revenue_periods.map((period) => (
              <RevenuePeriodCard key={period.period} period={period} />
            ))}
          </div>

          {/* AR Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-warning/50">
              <CardContent className="pt-4">
                <p className="text-xs text-text-muted uppercase">Total Outstanding</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(snapshot.total_outstanding)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-error/50">
              <CardContent className="pt-4">
                <p className="text-xs text-text-muted uppercase">Overdue Amount</p>
                <p className="text-2xl font-bold text-error">
                  {formatCurrency(snapshot.overdue_amount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-text-muted uppercase">Avg Days to Pay</p>
                <p className={cn(
                  'text-2xl font-bold',
                  snapshot.average_days_to_pay <= 30 ? 'text-success' :
                  snapshot.average_days_to_pay <= 45 ? 'text-warning' : 'text-error'
                )}>
                  {snapshot.average_days_to_pay} days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AR Aging & Margins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ARAgingCard buckets={snapshot.ar_aging} />
            <MarginAnalysisCard margins={snapshot.margins_by_type} />
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            No financial data available
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevenuePeriodCard({ period }: { period: RevenuePeriod }) {
  const periodLabels: Record<string, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };

  const isPositive = period.change_pct >= 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-text-muted uppercase">{periodLabels[period.period] || period.period}</p>
        <p className="text-2xl font-bold text-text-primary">{formatCurrency(period.current)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn('text-sm font-medium', isPositive ? 'text-success' : 'text-error')}>
            {isPositive ? '+' : ''}{period.change_pct.toFixed(1)}%
          </span>
          <span className="text-xs text-text-muted">vs previous</span>
        </div>
        {period.target && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Target</span>
              <span>{formatCurrency(period.target)}</span>
            </div>
            <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  (period.progress_pct || 0) >= 100 ? 'bg-success' :
                  (period.progress_pct || 0) >= 75 ? 'bg-info' :
                  (period.progress_pct || 0) >= 50 ? 'bg-warning' : 'bg-error'
                )}
                style={{ width: `${Math.min(period.progress_pct || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1 text-right">
              {(period.progress_pct || 0).toFixed(0)}% of target
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ARAgingCard({ buckets }: { buckets: ARAgingBucket[] }) {
  const bucketStyles: Record<string, string> = {
    current: 'bg-success',
    '1_30': 'bg-info',
    '31_60': 'bg-warning',
    '61_90': 'bg-orange-500',
    '90_plus': 'bg-error',
  };

  // Total for future use: buckets.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable Aging</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stacked bar visualization */}
          <div className="h-8 bg-background-secondary rounded-full overflow-hidden flex">
            {buckets.map((bucket) => (
              <div
                key={bucket.bucket}
                className={cn('h-full', bucketStyles[bucket.bucket])}
                style={{ width: `${bucket.percentage}%` }}
                title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {buckets.map((bucket) => (
              <div key={bucket.bucket} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={cn('w-3 h-3 rounded-full', bucketStyles[bucket.bucket])} />
                  <span className="text-xs text-text-muted">{bucket.label}</span>
                </div>
                <p className="font-semibold">{formatCurrency(bucket.amount)}</p>
                <p className="text-xs text-text-muted">{bucket.count} invoices</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarginAnalysisCard({ margins }: { margins: MarginByJobType[] }) {
  // Sort by margin percentage descending
  const sortedMargins = [...margins].sort((a, b) => b.margin_pct - a.margin_pct);
  const avgMargin = margins.length > 0
    ? margins.reduce((sum, m) => sum + m.margin_pct, 0) / margins.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Margin by Job Type</CardTitle>
          <Badge variant="outline">
            Avg: {(avgMargin * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMargins.map((item) => {
            const marginPct = item.margin_pct * 100;
            const isHighMargin = marginPct >= avgMargin * 100;

            return (
              <div key={item.job_type}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.job_type}</span>
                    <Badge
                      className={cn(
                        'text-xs',
                        isHighMargin ? 'bg-success text-white' : 'bg-warning text-white'
                      )}
                    >
                      {marginPct.toFixed(1)}%
                    </Badge>
                  </div>
                  <span className="text-sm text-text-muted">
                    {item.job_count} jobs
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm text-text-secondary">
                  <div>
                    <span className="text-text-muted">Revenue:</span>{' '}
                    {formatCurrency(item.revenue)}
                  </div>
                  <div>
                    <span className="text-text-muted">Cost:</span>{' '}
                    {formatCurrency(item.cost)}
                  </div>
                  <div className={cn(isHighMargin ? 'text-success' : 'text-warning')}>
                    <span className="text-text-muted">Margin:</span>{' '}
                    {formatCurrency(item.margin)}
                  </div>
                </div>

                {/* Margin bar */}
                <div className="mt-2 h-2 bg-background-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      marginPct >= 40 ? 'bg-success' :
                      marginPct >= 25 ? 'bg-info' :
                      marginPct >= 15 ? 'bg-warning' : 'bg-error'
                    )}
                    style={{ width: `${Math.min(marginPct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
