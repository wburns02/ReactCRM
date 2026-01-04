import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import type { TechPerformanceItem } from '../api.ts';

interface TechnicianPerformanceTableProps {
  data: TechPerformanceItem[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getPerformanceLevel = (completionRate: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' } => {
  if (completionRate >= 95) return { label: 'Excellent', variant: 'success' };
  if (completionRate >= 85) return { label: 'Good', variant: 'warning' };
  if (completionRate >= 75) return { label: 'Average', variant: 'secondary' };
  return { label: 'Needs Improvement', variant: 'danger' };
};

const getRatingStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  return '⭐'.repeat(fullStars) + (halfStar ? '½' : '');
};

export function TechnicianPerformanceTable({ data }: TechnicianPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📈 Technician Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-text-muted font-medium">Technician</th>
                  <th className="text-right p-3 text-text-muted font-medium">Completed</th>
                  <th className="text-right p-3 text-text-muted font-medium">Assigned</th>
                  <th className="text-right p-3 text-text-muted font-medium">Completion %</th>
                  <th className="text-right p-3 text-text-muted font-medium">Revenue</th>
                  <th className="text-right p-3 text-text-muted font-medium">Jobs/Day</th>
                  <th className="text-right p-3 text-text-muted font-medium">On-Time %</th>
                  <th className="text-center p-3 text-text-muted font-medium">Rating</th>
                  <th className="text-center p-3 text-text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((tech) => {
                  const performance = getPerformanceLevel(tech.completion_rate);
                  return (
                    <tr key={tech.technician_id} className="border-b border-border/50 hover:bg-bg-hover">
                      <td className="p-3">
                        <Link
                          to={`/technicians/${tech.technician_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {tech.technician_name}
                        </Link>
                      </td>
                      <td className="p-3 text-right font-semibold text-text-primary">
                        {tech.jobs_completed}
                      </td>
                      <td className="p-3 text-right text-text-secondary">
                        {tech.jobs_assigned}
                      </td>
                      <td className="p-3 text-right">
                        <span className={tech.completion_rate >= 90 ? 'text-success' : tech.completion_rate >= 75 ? 'text-warning' : 'text-danger'}>
                          {tech.completion_rate}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-success">
                        {formatCurrency(tech.revenue_generated)}
                      </td>
                      <td className="p-3 text-right text-text-secondary">
                        {tech.jobs_per_day}
                      </td>
                      <td className="p-3 text-right">
                        <span className={tech.on_time_rate >= 90 ? 'text-success' : 'text-warning'}>
                          {tech.on_time_rate}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span title={`${tech.customer_rating} / 5`}>
                          {getRatingStars(tech.customer_rating)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={performance.variant}>{performance.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-text-muted">No technician data available</p>
          </div>
        )}

        {/* Summary stats */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {data.reduce((sum, t) => sum + t.jobs_completed, 0)}
              </p>
              <p className="text-sm text-text-muted">Total Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {formatCurrency(data.reduce((sum, t) => sum + t.revenue_generated, 0))}
              </p>
              <p className="text-sm text-text-muted">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">
                {data.length > 0
                  ? (data.reduce((sum, t) => sum + t.completion_rate, 0) / data.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-text-muted">Avg Completion Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {data.length > 0
                  ? (data.reduce((sum, t) => sum + t.jobs_per_day, 0) / data.length).toFixed(2)
                  : 0}
              </p>
              <p className="text-sm text-text-muted">Avg Jobs/Day</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {data.filter(t => t.completion_rate >= 95).length}
              </p>
              <p className="text-sm text-text-muted">Top Performers</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
