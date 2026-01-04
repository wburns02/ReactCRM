import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import type { RevenueByServiceItem } from '../api.ts';

interface RevenueByServiceChartProps {
  data: RevenueByServiceItem[];
  totalRevenue: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatServiceType = (type: string) => {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export function RevenueByServiceChart({ data, totalRevenue }: RevenueByServiceChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    name: formatServiceType(item.service_type),
    color: COLORS[index % COLORS.length],
    percentage: totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Revenue by Service Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-muted">No service data available</p>
            </div>
          )}
        </div>

        {/* Summary table */}
        {data.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left p-2">Service</th>
                  <th className="text-right p-2">Jobs</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 5).map((item) => (
                  <tr key={item.service_type} className="border-t border-border/50">
                    <td className="p-2 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </td>
                    <td className="text-right p-2">{item.job_count}</td>
                    <td className="text-right p-2">{formatCurrency(item.revenue)}</td>
                    <td className="text-right p-2 text-text-muted">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
