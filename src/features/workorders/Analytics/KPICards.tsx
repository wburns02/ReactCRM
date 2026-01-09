/**
 * KPICards - Key Performance Indicator cards for Work Order Analytics
 * Displays total jobs, completion rate, avg revenue, first time fix rate, and customer satisfaction
 */

import { memo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import type { WorkOrderKPIs } from '@/api/types/workOrder.ts';
import {
  formatCurrency,
  formatPercentage,
  CHART_COLORS,
  getTrendDirection,
  calculatePercentageChange,
} from './utils/chartConfig.ts';

interface KPICardsProps {
  kpis: WorkOrderKPIs | null;
  previousKpis?: WorkOrderKPIs | null;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  positiveIsGood?: boolean;
}

/**
 * Sparkline mini chart component
 */
function Sparkline({
  data,
  color = CHART_COLORS.primary,
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((value, index) => ({ value, index }));
  const gradientId = `sparkline-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Individual KPI Card
 */
const KPICard = memo(function KPICard({
  title,
  value,
  change,
  changeLabel,
  sparklineData,
  sparklineColor = CHART_COLORS.primary,
  isLoading = false,
  icon,
  positiveIsGood = true,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-8 w-32" />
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
          <Skeleton variant="rounded" className="w-20 h-10" />
        </div>
      </Card>
    );
  }

  const trendDirection = change !== undefined ? getTrendDirection(change, 0) : 'neutral';
  // trendColor available for future styling needs
  // const __trendColor = getTrendColor(trendDirection, positiveIsGood);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </div>
          <div className="text-2xl font-bold text-text-primary truncate">{value}</div>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <Badge
                variant={trendDirection === 'up' ? (positiveIsGood ? 'success' : 'danger') : trendDirection === 'down' ? (positiveIsGood ? 'danger' : 'success') : 'default'}
                className="text-xs"
              >
                <span className="mr-0.5">
                  {trendDirection === 'up' ? '\u25B2' : trendDirection === 'down' ? '\u25BC' : '\u2022'}
                </span>
                {Math.abs(change).toFixed(1)}%
              </Badge>
              {changeLabel && (
                <span className="text-xs text-text-muted truncate">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 flex-shrink-0 ml-2">
            <Sparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </div>
    </Card>
  );
});

/**
 * Generate sparkline trend data (demo/mock data)
 */
function generateSparklineData(baseValue: number, days = 7): number[] {
  const data: number[] = [];
  let current = baseValue * 0.85;
  for (let i = 0; i < days; i++) {
    const variation = (Math.random() - 0.4) * 0.1 * baseValue;
    current = Math.max(0, current + variation + (baseValue * 0.03));
    data.push(Math.round(current));
  }
  return data;
}

/**
 * KPI Cards Grid Component
 */
export const KPICards = memo(function KPICards({
  kpis,
  previousKpis,
  isLoading = false,
}: KPICardsProps) {
  // Calculate changes from previous period
  const calculateChange = (current: number, previous?: number): number | undefined => {
    if (previous === undefined || previous === null) return undefined;
    return calculatePercentageChange(current, previous);
  };

  // Generate mock sparkline data based on current values
  const jobsSparkline = kpis ? generateSparklineData(kpis.totalCompleted) : [];
  const revenueSparkline = kpis ? generateSparklineData(kpis.totalRevenue) : [];
  const completionSparkline = kpis ? generateSparklineData(kpis.totalCompleted + kpis.totalScheduled) : [];
  const satisfactionSparkline = kpis ? generateSparklineData(kpis.customerSatisfaction * 10) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Total Jobs */}
      <KPICard
        title="Total Jobs"
        value={kpis?.totalCompleted.toLocaleString() ?? '-'}
        change={calculateChange(kpis?.totalCompleted ?? 0, previousKpis?.totalCompleted)}
        changeLabel="vs last period"
        sparklineData={jobsSparkline}
        sparklineColor={CHART_COLORS.primary}
        isLoading={isLoading}
        icon={<span>&#128221;</span>}
        positiveIsGood={true}
      />

      {/* Completion Rate */}
      <KPICard
        title="Completion Rate"
        value={kpis ? formatPercentage((kpis.totalCompleted / Math.max(kpis.totalScheduled, 1)) * 100) : '-'}
        change={calculateChange(
          kpis ? (kpis.totalCompleted / Math.max(kpis.totalScheduled, 1)) * 100 : 0,
          previousKpis ? (previousKpis.totalCompleted / Math.max(previousKpis.totalScheduled, 1)) * 100 : undefined
        )}
        changeLabel="vs last period"
        sparklineData={completionSparkline}
        sparklineColor={CHART_COLORS.success}
        isLoading={isLoading}
        icon={<span>&#10003;</span>}
        positiveIsGood={true}
      />

      {/* Avg Revenue per Job */}
      <KPICard
        title="Avg Revenue/Job"
        value={kpis ? formatCurrency(kpis.avgRevenuePerJob) : '-'}
        change={calculateChange(kpis?.avgRevenuePerJob ?? 0, previousKpis?.avgRevenuePerJob)}
        changeLabel="vs last period"
        sparklineData={revenueSparkline}
        sparklineColor={CHART_COLORS.info}
        isLoading={isLoading}
        icon={<span>$</span>}
        positiveIsGood={true}
      />

      {/* First Time Fix Rate */}
      <KPICard
        title="First Time Fix Rate"
        value={kpis ? formatPercentage(kpis.firstTimeFixRate) : '-'}
        change={calculateChange(kpis?.firstTimeFixRate ?? 0, previousKpis?.firstTimeFixRate)}
        changeLabel="vs last period"
        sparklineColor={CHART_COLORS.purple}
        isLoading={isLoading}
        icon={<span>&#9733;</span>}
        positiveIsGood={true}
      />

      {/* Customer Satisfaction */}
      <KPICard
        title="Customer Satisfaction"
        value={kpis ? `${kpis.customerSatisfaction.toFixed(1)}/5.0` : '-'}
        change={calculateChange(kpis?.customerSatisfaction ?? 0, previousKpis?.customerSatisfaction)}
        changeLabel="vs last period"
        sparklineData={satisfactionSparkline}
        sparklineColor={CHART_COLORS.warning}
        isLoading={isLoading}
        icon={<span>&#128516;</span>}
        positiveIsGood={true}
      />
    </div>
  );
});

export default KPICards;
