/**
 * Cash Flow Dashboard Component
 * Real-time cash flow intelligence and forecasting
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useCashFlowForecast,
  useARAgingReport,
  useRevenueIntelligence,
  useCollectionRecommendations,
  useSendPaymentReminder,
} from '@/api/hooks/useFintech';
import type { CashFlowPeriod } from '@/api/types/fintech';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

export function CashFlowDashboard() {
  const [period, setPeriod] = useState<CashFlowPeriod>('weekly');

  const { data: forecast, isLoading: forecastLoading } = useCashFlowForecast(period);
  const { data: arAging, isLoading: arLoading } = useARAgingReport();
  const { data: revenue, isLoading: revenueLoading } = useRevenueIntelligence();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cash Flow Intelligence</h1>
          <p className="text-text-secondary">
            Monitor cash flow, receivables, and revenue insights
          </p>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as CashFlowPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Current Cash"
          value={formatCurrency(forecast?.current_cash || 0)}
          trend={null}
          loading={forecastLoading}
        />
        <MetricCard
          title="Projected (End of Period)"
          value={formatCurrency(forecast?.projected_ending_cash || 0)}
          trend={
            forecast
              ? (forecast.projected_ending_cash - forecast.current_cash) /
                forecast.current_cash
              : null
          }
          loading={forecastLoading}
        />
        <MetricCard
          title="Outstanding AR"
          value={formatCurrency(arAging?.total_outstanding || 0)}
          subtitle={`${arAging?.collection_rate?.toFixed(0) || 0}% collection rate`}
          loading={arLoading}
        />
        <MetricCard
          title="Avg Invoice Value"
          value={formatCurrency(revenue?.average_invoice_value || 0)}
          loading={revenueLoading}
        />
      </div>

      {/* Alerts */}
      {forecast?.alerts && forecast.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecast.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg',
                    alert.severity === 'critical' && 'bg-error/10 border border-error/30',
                    alert.severity === 'warning' && 'bg-warning/10 border border-warning/30',
                    alert.severity === 'info' && 'bg-info/10 border border-info/30'
                  )}
                >
                  <span className="text-xl">
                    {alert.severity === 'critical' && '🚨'}
                    {alert.severity === 'warning' && '⚠️'}
                    {alert.severity === 'info' && 'ℹ️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    {alert.recommended_action && (
                      <p className="text-sm text-text-secondary mt-1">
                        Recommended: {alert.recommended_action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging */}
        <ARAgingCard data={arAging} loading={arLoading} />

        {/* Revenue by Service */}
        <RevenueByServiceCard data={revenue} loading={revenueLoading} />
      </div>

      {/* Cash Flow Forecast Chart (simplified table view) */}
      <CashFlowForecastCard data={forecast} loading={forecastLoading} />

      {/* Collection Recommendations */}
      <CollectionRecommendationsCard />
    </div>
  );
}

// Metric Card
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number | null;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-text-secondary">{title}</p>
        {loading ? (
          <div className="h-8 bg-background-secondary animate-pulse rounded mt-1" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== null && trend !== undefined && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend >= 0 ? 'text-success' : 'text-error'
                  )}
                >
                  {trend >= 0 ? '+' : ''}
                  {(trend * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-text-muted mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// AR Aging Card
function ARAgingCard({
  data,
  loading,
}: {
  data?: ReturnType<typeof useARAgingReport>['data'];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounts Receivable Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-background-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const buckets = [
    { label: 'Current', value: data.current, color: 'bg-success' },
    { label: '31-60 days', value: data.days_31_60, color: 'bg-warning' },
    { label: '61-90 days', value: data.days_61_90, color: 'bg-orange-500' },
    { label: '90+ days', value: data.over_90, color: 'bg-error' },
  ];

  const total = data.total_outstanding || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable Aging</CardTitle>
        <p className="text-sm text-text-secondary">
          Total Outstanding: {formatCurrency(data.total_outstanding)}
        </p>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="h-8 rounded-lg overflow-hidden flex mb-4">
          {buckets.map((bucket) => {
            const width = (bucket.value / total) * 100;
            if (width === 0) return null;
            return (
              <div
                key={bucket.label}
                className={cn('h-full', bucket.color)}
                style={{ width: `${width}%` }}
                title={`${bucket.label}: ${formatCurrency(bucket.value)}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded', bucket.color)} />
              <span className="text-sm text-text-secondary">{bucket.label}</span>
              <span className="text-sm font-medium ml-auto">
                {formatCurrency(bucket.value)}
              </span>
            </div>
          ))}
        </div>

        {/* At-risk customers */}
        {data.customers_at_risk && data.customers_at_risk.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-text-primary mb-2">
              Customers at Risk
            </p>
            <div className="space-y-2">
              {data.customers_at_risk.slice(0, 3).map((customer) => (
                <div
                  key={customer.customer_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-secondary">{customer.customer_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(customer.total_outstanding)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {customer.oldest_invoice_days}d overdue
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Revenue by Service Card
function RevenueByServiceCard({
  data,
  loading,
}: {
  data?: ReturnType<typeof useRevenueIntelligence>['data'];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-background-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue by Service Type</CardTitle>
          {data.seasonal_trend.is_peak_season && (
            <Badge className="bg-success/10 text-success">Peak Season</Badge>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          Total Revenue: {formatCurrency(data.total_revenue)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.revenue_by_service.map((service) => (
            <div key={service.service_type}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">{service.service_type}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(service.revenue)}</span>
                  <span
                    className={cn(
                      'text-xs',
                      service.trend === 'up' && 'text-success',
                      service.trend === 'down' && 'text-error',
                      service.trend === 'stable' && 'text-text-muted'
                    )}
                  >
                    {service.trend === 'up' && '↑'}
                    {service.trend === 'down' && '↓'}
                    {service.trend === 'stable' && '→'}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${service.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top customers */}
        {data.top_customers && data.top_customers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-text-primary mb-2">Top Customers</p>
            <div className="space-y-2">
              {data.top_customers.slice(0, 3).map((customer, i) => (
                <div
                  key={customer.customer_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-secondary">
                    {i + 1}. {customer.customer_name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(customer.ytd_revenue)} YTD
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Cash Flow Forecast Card
function CashFlowForecastCard({
  data,
  loading,
}: {
  data?: ReturnType<typeof useCashFlowForecast>['data'];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 bg-background-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.forecasts.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Forecast</CardTitle>
        <p className="text-sm text-text-secondary">
          {formatDate(data.start_date)} - {formatDate(data.end_date)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-text-secondary font-medium">Date</th>
                <th className="text-right py-2 text-text-secondary font-medium">Revenue</th>
                <th className="text-right py-2 text-text-secondary font-medium">Expenses</th>
                <th className="text-right py-2 text-text-secondary font-medium">Cash Flow</th>
                <th className="text-right py-2 text-text-secondary font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.forecasts.map((forecast) => (
                <tr key={forecast.date} className="border-b border-border/50">
                  <td className="py-2">{formatDate(forecast.date)}</td>
                  <td className="py-2 text-right text-success">
                    +{formatCurrency(forecast.projected_revenue)}
                  </td>
                  <td className="py-2 text-right text-error">
                    -{formatCurrency(forecast.projected_expenses)}
                  </td>
                  <td
                    className={cn(
                      'py-2 text-right font-medium',
                      forecast.projected_cash_flow >= 0 ? 'text-success' : 'text-error'
                    )}
                  >
                    {forecast.projected_cash_flow >= 0 ? '+' : ''}
                    {formatCurrency(forecast.projected_cash_flow)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs',
                        forecast.confidence >= 0.8 && 'bg-success/10 text-success',
                        forecast.confidence >= 0.5 &&
                          forecast.confidence < 0.8 &&
                          'bg-warning/10 text-warning',
                        forecast.confidence < 0.5 && 'bg-error/10 text-error'
                      )}
                    >
                      {(forecast.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Collection Recommendations Card
function CollectionRecommendationsCard() {
  const { data, isLoading } = useCollectionRecommendations();
  const sendReminder = useSendPaymentReminder();

  const handleSendReminder = async (customerId: string) => {
    try {
      await sendReminder.mutateAsync({
        customer_id: customerId,
        invoice_ids: [],
        channel: 'email',
      });
      alert('Payment reminder sent successfully');
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collection Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-background-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.recommendations.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Recommendations</CardTitle>
        <p className="text-sm text-text-secondary">
          AI-powered suggestions to improve collections
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.recommendations.map((rec) => (
            <div
              key={rec.customer_id}
              className="flex items-start gap-4 p-4 border border-border rounded-lg"
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full mt-2',
                  rec.priority === 'high' && 'bg-error',
                  rec.priority === 'medium' && 'bg-warning',
                  rec.priority === 'low' && 'bg-success'
                )}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{rec.customer_name}</span>
                  <span className="text-error font-medium">
                    {formatCurrency(rec.total_overdue)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-2">
                  {rec.days_overdue} days overdue • {rec.recommended_action}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {(rec.success_probability * 100).toFixed(0)}% success probability
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendReminder(rec.customer_id)}
                    disabled={sendReminder.isPending}
                  >
                    Send Reminder
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
