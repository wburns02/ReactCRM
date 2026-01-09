/**
 * TechnicianPerformance - Technician efficiency leaderboard and metrics
 * Shows jobs completed, avg completion time, customer ratings, and revenue generated
 */

import { useState, useMemo, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import {
  formatCurrency,
  formatDuration,
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
  TOOLTIP_STYLE,
} from './utils/chartConfig.ts';

export interface TechnicianMetrics {
  id: string;
  name: string;
  avatar?: string;
  jobsCompleted: number;
  avgCompletionTime: number; // in hours
  customerRating: number; // 0-5
  revenueGenerated: number;
  efficiency: number; // percentage
  firstTimeFixRate: number; // percentage
}

interface TechnicianPerformanceProps {
  technicians: TechnicianMetrics[];
  isLoading?: boolean;
  viewMode?: 'table' | 'chart';
}

type SortField = keyof Pick<TechnicianMetrics, 'name' | 'jobsCompleted' | 'avgCompletionTime' | 'customerRating' | 'revenueGenerated' | 'efficiency'>;
type SortDirection = 'asc' | 'desc';

/**
 * Rating stars display
 */
function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-warning text-sm">&#9733;</span>
      ))}
      {hasHalfStar && <span className="text-warning text-sm">&#9734;</span>}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-text-muted text-sm">&#9734;</span>
      ))}
      <span className="text-text-secondary text-xs ml-1">({rating.toFixed(1)})</span>
    </div>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({ value, maxValue = 100, color = CHART_COLORS.success }: { value: number; maxValue?: number; color?: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-text-secondary text-xs w-10 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

/**
 * Sortable table header
 */
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase cursor-pointer hover:bg-bg-muted transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-primary">
            {currentDirection === 'asc' ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * Technician leaderboard table
 */
const LeaderboardTable = memo(function LeaderboardTable({
  technicians,
  sortField,
  sortDirection,
  onSort,
}: {
  technicians: TechnicianMetrics[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase w-8">
              #
            </th>
            <SortableHeader label="Technician" field="name" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
            <SortableHeader label="Jobs" field="jobsCompleted" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
            <SortableHeader label="Avg Time" field="avgCompletionTime" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
            <SortableHeader label="Rating" field="customerRating" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
            <SortableHeader label="Revenue" field="revenueGenerated" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
            <SortableHeader label="Efficiency" field="efficiency" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {technicians.map((tech, index) => (
            <tr
              key={tech.id}
              className={`border-b border-border-light hover:bg-bg-hover transition-colors ${
                index % 2 === 0 ? 'bg-bg-body' : 'bg-bg-card'
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center justify-center">
                  {index < 3 ? (
                    <span className={`text-lg ${
                      index === 0 ? 'text-warning' : index === 1 ? 'text-text-muted' : 'text-amber-600'
                    }`}>
                      {index === 0 ? '&#129351;' : index === 1 ? '&#129352;' : '&#129353;'}
                    </span>
                  ) : (
                    <span className="text-text-muted text-sm">{index + 1}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                    {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="font-medium text-text-primary">{tech.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="default">{tech.jobsCompleted}</Badge>
              </td>
              <td className="px-4 py-3 text-text-secondary text-sm">
                {formatDuration(tech.avgCompletionTime)}
              </td>
              <td className="px-4 py-3">
                <RatingStars rating={tech.customerRating} />
              </td>
              <td className="px-4 py-3 text-text-primary font-medium">
                {formatCurrency(tech.revenueGenerated)}
              </td>
              <td className="px-4 py-3">
                <ProgressBar
                  value={tech.efficiency}
                  color={tech.efficiency >= 90 ? CHART_COLORS.success : tech.efficiency >= 70 ? CHART_COLORS.warning : CHART_COLORS.danger}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Performance bar chart view
 */
const PerformanceChart = memo(function PerformanceChart({
  technicians,
}: {
  technicians: TechnicianMetrics[];
}) {
  const chartData = technicians.slice(0, 10).map(tech => ({
    name: tech.name.split(' ')[0], // First name only for chart
    jobs: tech.jobsCompleted,
    revenue: tech.revenueGenerated / 1000, // Show in thousands
    efficiency: tech.efficiency,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 30, bottom: 60, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="name"
          {...AXIS_STYLE}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
        />
        <YAxis yAxisId="left" {...AXIS_STYLE} />
        <YAxis yAxisId="right" orientation="right" {...AXIS_STYLE} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name) => [
            name === 'revenue' ? `$${Number(value).toFixed(1)}k` : value,
            name === 'jobs' ? 'Jobs' : name === 'revenue' ? 'Revenue' : 'Efficiency %',
          ]}
        />
        <Bar yAxisId="left" dataKey="jobs" fill={CHART_COLORS.primary} name="Jobs" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="revenue" fill={CHART_COLORS.success} name="Revenue (k)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

/**
 * Loading skeleton for the component
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
 * Main TechnicianPerformance component
 */
export const TechnicianPerformance = memo(function TechnicianPerformance({
  technicians,
  isLoading = false,
  viewMode = 'table',
}: TechnicianPerformanceProps) {
  const [sortField, setSortField] = useState<SortField>('revenueGenerated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTechnicians = useMemo(() => {
    return [...technicians].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [technicians, sortField, sortDirection]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (technicians.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg">Technician Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128119;</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No technician data available</h3>
            <p className="text-text-secondary">Performance metrics will appear once work orders are completed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Technician Performance</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentViewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-hover'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setCurrentViewMode('chart')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentViewMode === 'chart'
                  ? 'bg-primary text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-hover'
              }`}
            >
              Chart
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {currentViewMode === 'table' ? (
          <LeaderboardTable
            technicians={sortedTechnicians}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        ) : (
          <PerformanceChart technicians={sortedTechnicians} />
        )}
      </CardContent>
    </Card>
  );
});

export default TechnicianPerformance;
