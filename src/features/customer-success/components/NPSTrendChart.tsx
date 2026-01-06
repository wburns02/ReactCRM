/**
 * NPS Trend Chart Component
 *
 * Displays NPS score trends over time with:
 * - Line chart visualization
 * - Promoter/Detractor breakdown
 * - Period comparison
 * - Survey response rates
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';

interface NPSDataPoint {
  date: string;
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  responses: number;
}

interface NPSTrendChartProps {
  data?: NPSDataPoint[];
  isLoading?: boolean;
  period?: '7d' | '30d' | '90d' | '12m';
  onPeriodChange?: (period: '7d' | '30d' | '90d' | '12m') => void;
}

// Generate sample data for demo
function generateSampleData(period: string): NPSDataPoint[] {
  const now = new Date();
  const points: NPSDataPoint[] = [];
  let numPoints = 7;

  switch (period) {
    case '7d':
      numPoints = 7;
      break;
    case '30d':
      numPoints = 30;
      break;
    case '90d':
      numPoints = 12; // Weekly
      break;
    case '12m':
      numPoints = 12; // Monthly
      break;
  }

  for (let i = numPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    if (period === '12m') {
      date.setMonth(date.getMonth() - i);
    } else if (period === '90d') {
      date.setDate(date.getDate() - i * 7);
    } else {
      date.setDate(date.getDate() - i);
    }

    const baseNPS = 35 + Math.random() * 20;
    const promoters = 50 + Math.random() * 20;
    const detractors = 10 + Math.random() * 15;
    const passives = 100 - promoters - detractors;

    points.push({
      date: date.toISOString().split('T')[0],
      nps: Math.round(baseNPS),
      promoters: Math.round(promoters),
      passives: Math.round(passives),
      detractors: Math.round(detractors),
      responses: Math.floor(50 + Math.random() * 100),
    });
  }

  return points;
}

export function NPSTrendChart({
  data,
  isLoading,
  period = '30d',
  onPeriodChange
}: NPSTrendChartProps) {
  const chartData = useMemo(() => {
    return data || generateSampleData(period);
  }, [data, period]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const latest = chartData[chartData.length - 1];
    const first = chartData[0];
    const avgNPS = chartData.reduce((sum, d) => sum + d.nps, 0) / chartData.length;
    const totalResponses = chartData.reduce((sum, d) => sum + d.responses, 0);
    const change = latest.nps - first.nps;

    return {
      current: latest.nps,
      average: Math.round(avgNPS),
      change,
      totalResponses,
      promoters: latest.promoters,
      passives: latest.passives,
      detractors: latest.detractors,
    };
  }, [chartData]);

  // Calculate SVG path for NPS line
  const { linePath, areaPath, minNPS, maxNPS } = useMemo(() => {
    if (chartData.length === 0) return { linePath: '', areaPath: '', minNPS: 0, maxNPS: 100 };

    const min = Math.min(...chartData.map(d => d.nps)) - 10;
    const max = Math.max(...chartData.map(d => d.nps)) + 10;
    const width = 100;
    const height = 100;

    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((d.nps - min) / (max - min)) * height;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;

    return { linePath: line, areaPath: area, minNPS: min, maxNPS: max };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 w-48 bg-bg-hover rounded mb-4" />
        <div className="h-64 bg-bg-hover rounded" />
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">NPS Trend</h3>
          <p className="text-sm text-text-muted">Track Net Promoter Score over time</p>
        </div>
        <div className="flex items-center gap-1 bg-bg-hover rounded-lg p-1">
          {(['7d', '30d', '90d', '12m'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange?.(p)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                period === p
                  ? 'bg-bg-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{stats.current}</p>
            <p className="text-xs text-text-muted">Current NPS</p>
          </div>
          <div className="text-center">
            <p className={cn(
              'text-3xl font-bold',
              stats.change >= 0 ? 'text-success' : 'text-danger'
            )}>
              {stats.change >= 0 ? '+' : ''}{stats.change}
            </p>
            <p className="text-xs text-text-muted">Change</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{stats.average}</p>
            <p className="text-xs text-text-muted">Average</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{stats.totalResponses}</p>
            <p className="text-xs text-text-muted">Responses</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative h-48 mb-6">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-border"
            />
          ))}
          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#npsGradient)"
            opacity={0.3}
          />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
            vectorEffect="non-scaling-stroke"
          />
          {/* Dots */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 100;
            const y = 100 - ((d.nps - minNPS) / (maxNPS - minNPS)) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                className="fill-primary"
              />
            );
          })}
          <defs>
            <linearGradient id="npsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-text-muted -ml-8">
          <span>{Math.round(maxNPS)}</span>
          <span>{Math.round((maxNPS + minNPS) / 2)}</span>
          <span>{Math.round(minNPS)}</span>
        </div>
      </div>

      {/* Breakdown */}
      {stats && (
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-text-secondary mb-3">Current Breakdown</p>
          <div className="flex items-center gap-4">
            {/* Stacked bar */}
            <div className="flex-1 h-4 rounded-full overflow-hidden flex">
              <div
                className="bg-success h-full"
                style={{ width: `${stats.promoters}%` }}
              />
              <div
                className="bg-warning h-full"
                style={{ width: `${stats.passives}%` }}
              />
              <div
                className="bg-danger h-full"
                style={{ width: `${stats.detractors}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-text-muted">Promoters</span>
              <span className="font-medium text-text-primary">{stats.promoters}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-text-muted">Passives</span>
              <span className="font-medium text-text-primary">{stats.passives}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-text-muted">Detractors</span>
              <span className="font-medium text-text-primary">{stats.detractors}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
