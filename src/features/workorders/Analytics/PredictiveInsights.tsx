/**
 * PredictiveInsights - AI-powered predictions and forecasting
 * Shows demand forecast, busy period alerts, equipment failure predictions, revenue projections
 */

import { useState, memo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatChartDate,
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
} from './utils/chartConfig.ts';

export interface DemandForecast {
  date: string;
  predicted: number;
  actual?: number;
  lowerBound: number;
  upperBound: number;
}

export interface BusyPeriodAlert {
  id: string;
  startDate: string;
  endDate: string;
  expectedVolume: number;
  normalVolume: number;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface EquipmentAlert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  failureProbability: number;
  predictedDate: string;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RevenueProjection {
  date: string;
  projected: number;
  optimistic: number;
  pessimistic: number;
  actual?: number;
}

interface PredictiveInsightsProps {
  demandForecast: DemandForecast[];
  busyPeriodAlerts: BusyPeriodAlert[];
  equipmentAlerts: EquipmentAlert[];
  revenueProjections: RevenueProjection[];
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'demand' | 'alerts' | 'equipment' | 'revenue';

/**
 * Confidence interval area chart for demand forecast
 */
const DemandForecastChart = memo(function DemandForecastChart({
  data,
}: {
  data: DemandForecast[];
}) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatChartDate(point.date),
    confidenceRange: [point.lowerBound, point.upperBound],
  }));

  const today = new Date().toISOString().split('T')[0];
  const todayIndex = chartData.findIndex((d) => d.date >= today);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="dateLabel" {...AXIS_STYLE} tick={{ fontSize: 11 }} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value, name) => [
            value,
            name === 'predicted' ? 'Predicted Jobs' :
            name === 'actual' ? 'Actual Jobs' :
            name === 'upperBound' ? 'Upper Bound' :
            name === 'lowerBound' ? 'Lower Bound' : name
          ]}
        />
        <Legend />
        {/* Confidence interval band */}
        <Area
          type="monotone"
          dataKey="upperBound"
          stroke="transparent"
          fill="url(#confidenceGradient)"
          name="Upper Bound"
        />
        <Area
          type="monotone"
          dataKey="lowerBound"
          stroke="transparent"
          fill="white"
          name="Lower Bound"
        />
        {/* Actual line (historical) */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke={CHART_COLORS.success}
          strokeWidth={2}
          name="Actual"
          dot={{ fill: CHART_COLORS.success, r: 3 }}
          connectNulls
        />
        {/* Predicted line */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Predicted"
          dot={{ fill: CHART_COLORS.primary, r: 3 }}
        />
        {/* Today reference line */}
        {todayIndex >= 0 && (
          <ReferenceLine
            x={chartData[todayIndex]?.dateLabel}
            stroke={CHART_COLORS.gray}
            strokeDasharray="3 3"
            label={{ value: 'Today', position: 'top', fill: CHART_COLORS.gray, fontSize: 11 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
});

/**
 * Busy period alerts list
 */
const BusyPeriodAlerts = memo(function BusyPeriodAlerts({
  alerts,
}: {
  alerts: BusyPeriodAlert[];
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">&#128198;</div>
        <p className="text-text-secondary">No busy periods predicted in the selected timeframe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border-l-4 bg-bg-muted ${
            alert.severity === 'high' ? 'border-danger' :
            alert.severity === 'medium' ? 'border-warning' : 'border-primary'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">
                  {formatChartDate(alert.startDate)} - {formatChartDate(alert.endDate)}
                </span>
                <Badge variant={getSeverityColor(alert.severity) as any}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1">{alert.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3">
            <div>
              <p className="text-xs text-text-muted">Expected Volume</p>
              <p className="text-lg font-semibold text-text-primary">{alert.expectedVolume}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Normal Volume</p>
              <p className="text-lg text-text-secondary">{alert.normalVolume}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Increase</p>
              <p className="text-lg font-semibold text-warning">
                +{((alert.expectedVolume / alert.normalVolume - 1) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Equipment failure alerts
 */
const EquipmentAlerts = memo(function EquipmentAlerts({
  alerts,
}: {
  alerts: EquipmentAlert[];
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">&#128295;</div>
        <p className="text-text-secondary">No equipment issues predicted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-text-primary">{alert.equipmentName}</p>
              <p className="text-xs text-text-muted">ID: {alert.equipmentId}</p>
            </div>
            <Badge variant={getPriorityColor(alert.priority) as any}>
              {alert.priority.toUpperCase()}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-text-muted">Failure Probability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      alert.failureProbability >= 70 ? 'bg-danger' :
                      alert.failureProbability >= 40 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${alert.failureProbability}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {alert.failureProbability}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted">Predicted Date</p>
              <p className="text-sm text-text-primary">{formatChartDate(alert.predictedDate)}</p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-bg-body rounded-md">
            <p className="text-xs text-text-muted">Suggested Action</p>
            <p className="text-sm text-text-secondary">{alert.suggestedAction}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Revenue projections chart
 */
const RevenueProjectionsChart = memo(function RevenueProjectionsChart({
  data,
}: {
  data: RevenueProjection[];
}) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatChartDate(point.date),
  }));

  const today = new Date().toISOString().split('T')[0];
  const todayIndex = chartData.findIndex((d) => d.date >= today);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="dateLabel" {...AXIS_STYLE} tick={{ fontSize: 11 }} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatCurrencyCompact} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value) => [formatCurrency(Number(value)), '']}
        />
        <Legend />
        {/* Optimistic projection */}
        <Line
          type="monotone"
          dataKey="optimistic"
          stroke={CHART_COLORS.success}
          strokeWidth={1}
          strokeDasharray="5 5"
          name="Optimistic"
          dot={false}
        />
        {/* Pessimistic projection */}
        <Line
          type="monotone"
          dataKey="pessimistic"
          stroke={CHART_COLORS.danger}
          strokeWidth={1}
          strokeDasharray="5 5"
          name="Pessimistic"
          dot={false}
        />
        {/* Base projection */}
        <Line
          type="monotone"
          dataKey="projected"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          name="Projected"
          dot={{ fill: CHART_COLORS.primary, r: 3 }}
        />
        {/* Actual */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke={CHART_COLORS.info}
          strokeWidth={2}
          name="Actual"
          dot={{ fill: CHART_COLORS.info, r: 4 }}
          connectNulls
        />
        {/* Today reference line */}
        {todayIndex >= 0 && (
          <ReferenceLine
            x={chartData[todayIndex]?.dateLabel}
            stroke={CHART_COLORS.gray}
            strokeDasharray="3 3"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-6 w-48" />
          <Skeleton variant="rounded" className="h-8 w-32" />
        </div>
        <Skeleton variant="rounded" className="h-[300px]" />
      </div>
    </Card>
  );
}

/**
 * Main PredictiveInsights component
 */
export const PredictiveInsights = memo(function PredictiveInsights({
  demandForecast,
  busyPeriodAlerts,
  equipmentAlerts,
  revenueProjections,
  isLoading = false,
  className = '',
}: PredictiveInsightsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('demand');

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const getAlertCount = () => {
    const busyHigh = busyPeriodAlerts.filter((a) => a.severity === 'high').length;
    const equipCritical = equipmentAlerts.filter((a) => a.priority === 'critical' || a.priority === 'high').length;
    return busyHigh + equipCritical;
  };

  const alertCount = getAlertCount();

  return (
    <Card className={`p-6 ${className}`}>
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Predictive Insights</CardTitle>
            <Badge variant="default" className="text-xs">
              AI-Powered
            </Badge>
            {alertCount > 0 && (
              <Badge variant="danger" className="text-xs">
                {alertCount} Alert{alertCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 bg-bg-muted rounded-md p-0.5">
            {([
              { key: 'demand', label: 'Demand' },
              { key: 'alerts', label: 'Busy Periods' },
              { key: 'equipment', label: 'Equipment' },
              { key: 'revenue', label: 'Revenue' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === key
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {viewMode === 'demand' && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Predicted job volume for the next 30 days with 80% confidence interval
            </p>
            <DemandForecastChart data={demandForecast} />
          </>
        )}

        {viewMode === 'alerts' && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Predicted high-demand periods - plan staffing accordingly
            </p>
            <BusyPeriodAlerts alerts={busyPeriodAlerts} />
          </>
        )}

        {viewMode === 'equipment' && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Equipment maintenance predictions based on usage patterns
            </p>
            <EquipmentAlerts alerts={equipmentAlerts} />
          </>
        )}

        {viewMode === 'revenue' && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Revenue projections based on historical trends and booking patterns
            </p>
            <RevenueProjectionsChart data={revenueProjections} />
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default PredictiveInsights;
