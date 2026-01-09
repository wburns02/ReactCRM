import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Billing Overview Dashboard
 */
export function BillingOverview() {
  const { data: stats } = useQuery({
    queryKey: ['billing-stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/billing/stats');
        return response.data;
      } catch {
        return {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        };
      }
    },
  });

  const kpis = [
    {
      label: 'Total Revenue (MTD)',
      value: `$${(stats?.total_revenue || 0).toLocaleString()}`,
      icon: '💰',
      color: 'text-success',
    },
    {
      label: 'Outstanding Invoices',
      value: `$${(stats?.outstanding_invoices || 0).toLocaleString()}`,
      icon: '🧾',
      color: 'text-warning',
    },
    {
      label: 'Pending Estimates',
      value: stats?.pending_estimates || 0,
      icon: '📊',
      color: 'text-info',
    },
    {
      label: 'Active Payment Plans',
      value: stats?.active_payment_plans || 0,
      icon: '📈',
      color: 'text-primary',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Billing Overview</h1>
        <p className="text-text-muted">Financial metrics and billing management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-sm text-text-muted">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Link
          to="/invoices"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <span className="text-xl">🧾</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Invoices</h3>
              <p className="text-sm text-text-muted">View all invoices</p>
            </div>
          </div>
        </Link>

        <Link
          to="/estimates"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Estimates</h3>
              <p className="text-sm text-text-muted">Create & manage estimates</p>
            </div>
          </div>
        </Link>

        <Link
          to="/billing/payment-plans"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Payment Plans</h3>
              <p className="text-sm text-text-muted">Financing options</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Recent Activity</h2>
        </div>
        <div className="p-8 text-center text-text-muted">
          <span className="text-4xl block mb-2">📋</span>
          <p>No recent billing activity</p>
        </div>
      </div>
    </div>
  );
}
