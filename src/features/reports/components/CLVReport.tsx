import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import type { CustomerLTVItem } from '../api.ts';

interface CLVReportProps {
  data: CustomerLTVItem[];
  averageLTV: number;
  totalAnalyzed: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getLTVTier = (ltv: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'primary' } => {
  if (ltv >= 2000) return { label: 'High Value', variant: 'success' };
  if (ltv >= 1000) return { label: 'Growing', variant: 'primary' };
  if (ltv >= 500) return { label: 'Standard', variant: 'warning' };
  return { label: 'New', variant: 'danger' };
};

export function CLVReport({ data, averageLTV, totalAnalyzed }: CLVReportProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            💎 Customer Lifetime Value
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-text-muted">Avg LTV:</span>
              <span className="ml-2 font-semibold text-text-primary">{formatCurrency(averageLTV)}</span>
            </div>
            <div>
              <span className="text-text-muted">Analyzed:</span>
              <span className="ml-2 font-semibold text-text-primary">{totalAnalyzed}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-text-muted font-medium">Rank</th>
                  <th className="text-left p-3 text-text-muted font-medium">Customer</th>
                  <th className="text-right p-3 text-text-muted font-medium">Lifetime Value</th>
                  <th className="text-right p-3 text-text-muted font-medium">Total Jobs</th>
                  <th className="text-right p-3 text-text-muted font-medium">Tenure</th>
                  <th className="text-right p-3 text-text-muted font-medium">Monthly Avg</th>
                  <th className="text-center p-3 text-text-muted font-medium">Tier</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 25).map((customer, index) => {
                  const tier = getLTVTier(customer.lifetime_value);
                  return (
                    <tr key={customer.customer_id} className="border-b border-border/50 hover:bg-bg-hover">
                      <td className="p-3 text-text-muted">
                        {index + 1 <= 3 ? (
                          <span className="text-lg">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          `#${index + 1}`
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/customers/${customer.customer_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {customer.customer_name}
                        </Link>
                      </td>
                      <td className="p-3 text-right font-semibold text-success">
                        {formatCurrency(customer.lifetime_value)}
                      </td>
                      <td className="p-3 text-right text-text-secondary">
                        {customer.total_jobs}
                      </td>
                      <td className="p-3 text-right text-text-secondary">
                        {customer.tenure_months} mo
                      </td>
                      <td className="p-3 text-right text-text-secondary">
                        {formatCurrency(customer.monthly_value)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={tier.variant}>{tier.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-text-muted">No customer data available</p>
          </div>
        )}

        {/* Summary stats */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {formatCurrency(data.slice(0, 10).reduce((sum, c) => sum + c.lifetime_value, 0))}
              </p>
              <p className="text-sm text-text-muted">Top 10 Combined LTV</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {data.length > 0 ? Math.round(data.reduce((sum, c) => sum + c.total_jobs, 0) / data.length) : 0}
              </p>
              <p className="text-sm text-text-muted">Avg Jobs/Customer</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">
                {data.length > 0 ? Math.round(data.reduce((sum, c) => sum + c.tenure_months, 0) / data.length) : 0} mo
              </p>
              <p className="text-sm text-text-muted">Avg Tenure</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {data.filter(c => c.lifetime_value >= 2000).length}
              </p>
              <p className="text-sm text-text-muted">High Value Customers</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
