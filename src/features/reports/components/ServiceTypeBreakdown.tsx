import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { ServiceBreakdown } from '../types.ts';

/**
 * ServiceTypeBreakdown - Pie chart showing service type distribution
 */

interface ServiceTypeBreakdownProps {
  data: ServiceBreakdown[];
  className?: string;
}

const COLORS = [
  '#0091ae', // MAC Dark Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

export function ServiceTypeBreakdown({ data, className = '' }: ServiceTypeBreakdownProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-text-primary mb-2">
            {data.service_type}
          </p>
          <p className="text-sm text-text-secondary">
            Count: <span className="font-medium text-text-primary">{data.count}</span>
          </p>
          <p className="text-sm text-text-secondary">
            Revenue:{' '}
            <span className="font-medium text-text-primary">
              {formatCurrency(data.revenue)}
            </span>
          </p>
          <p className="text-sm text-text-secondary">
            Percentage:{' '}
            <span className="font-medium text-text-primary">
              {data.percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label - uses Recharts PieLabelRenderProps which includes payload
  const renderLabel = (props: { payload?: ServiceBreakdown }) => {
    if (!props.payload) return '';
    return `${props.payload.service_type} (${props.payload.percentage.toFixed(0)}%)`;
  };

  return (
    <div className={`bg-bg-card border border-border rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Service Type Breakdown
      </h3>

      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="service_type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={renderLabel}
                labelLine={true}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with counts and revenue */}
          <div className="mt-4 space-y-2">
            {data.map((entry, index) => (
              <div
                key={entry.service_type}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-text-primary font-medium">
                    {entry.service_type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-text-secondary">
                  <span>{entry.count} jobs</span>
                  <span className="font-medium">{formatCurrency(entry.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-text-muted">
          No service data available
        </div>
      )}
    </div>
  );
}
