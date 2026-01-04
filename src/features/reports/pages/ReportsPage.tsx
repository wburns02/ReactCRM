import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRevenueMetrics, useCustomerMetrics, usePipelineMetrics } from '../api.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { DateRangePicker } from '../components/DateRangePicker.tsx';
import { RevenueChart } from '../components/RevenueChart.tsx';
import { ServiceTypeBreakdown } from '../components/ServiceTypeBreakdown.tsx';
import type { DateRange } from '../types.ts';

/**
 * ReportsPage - Main reports dashboard with overview metrics
 */

export function ReportsPage() {
  // Default to last 30 days
  const getDefaultDateRange = (): DateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // Fetch report data
  const { data: revenueData, isLoading: revenueLoading } = useRevenueMetrics(dateRange);
  const { isLoading: customerLoading } = useCustomerMetrics(dateRange);
  const { data: pipelineData, isLoading: pipelineLoading } = usePipelineMetrics();

  const isLoading = revenueLoading || customerLoading || pipelineLoading;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Reports Dashboard</h1>
            <p className="text-text-secondary mt-1">
              Overview of business performance and key metrics
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading reports...</div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Revenue"
              value={revenueData?.metrics.total_revenue || 0}
              changePercent={revenueData?.metrics.total_revenue_change_percent}
              icon="💰"
              format="currency"
            />
            <MetricCard
              title="Work Orders Completed"
              value={revenueData?.metrics.work_orders_completed || 0}
              changePercent={revenueData?.metrics.work_orders_completed_change_percent}
              icon="✅"
              format="number"
            />
            <MetricCard
              title="Average Job Value"
              value={revenueData?.metrics.average_job_value || 0}
              changePercent={revenueData?.metrics.average_job_value_change_percent}
              icon="📊"
              format="currency"
            />
            <MetricCard
              title="New Customers"
              value={revenueData?.metrics.new_customers || 0}
              changePercent={revenueData?.metrics.new_customers_change_percent}
              icon="👥"
              format="number"
            />
            <MetricCard
              title="Repeat Customer Rate"
              value={revenueData?.metrics.repeat_customer_rate || 0}
              changePercent={revenueData?.metrics.repeat_customer_rate_change_percent}
              icon="🔁"
              format="percent"
            />
            <MetricCard
              title="Customer Satisfaction"
              value={revenueData?.metrics.customer_satisfaction_score || 0}
              changePercent={revenueData?.metrics.customer_satisfaction_score_change_percent}
              icon="⭐"
              format="number"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RevenueChart
              data={revenueData?.revenue_over_time || []}
              chartType="line"
              showWorkOrders={true}
            />
            <ServiceTypeBreakdown
              data={revenueData?.service_breakdown || []}
            />
          </div>

          {/* Pipeline Metrics */}
          {pipelineData && (
            <div className="bg-bg-card border border-border rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Sales Pipeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="Pipeline Value"
                  value={pipelineData.total_pipeline_value}
                  icon="💼"
                  format="currency"
                />
                <MetricCard
                  title="Total Prospects"
                  value={pipelineData.total_prospects}
                  icon="🎯"
                  format="number"
                />
                <MetricCard
                  title="Conversion Rate"
                  value={pipelineData.conversion_rate || 0}
                  icon="📈"
                  format="percent"
                />
                <MetricCard
                  title="Average Deal Size"
                  value={pipelineData.average_deal_size || 0}
                  icon="💵"
                  format="currency"
                />
              </div>
            </div>
          )}

          {/* Quick Links to Detailed Reports */}
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Detailed Reports
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/reports/revenue"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <h4 className="font-semibold text-text-primary">Revenue Report</h4>
                  <p className="text-sm text-text-secondary">
                    Detailed revenue analysis and trends
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/technicians"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">👷</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Technician Performance
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Individual technician metrics
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/clv"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">💎</span>
                <div>
                  <h4 className="font-semibold text-text-primary">Customer Lifetime Value</h4>
                  <p className="text-sm text-text-secondary">
                    Customer value and retention analysis
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/service"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">🔧</span>
                <div>
                  <h4 className="font-semibold text-text-primary">Revenue by Service</h4>
                  <p className="text-sm text-text-secondary">
                    Revenue breakdown by service type
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/location"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">📍</span>
                <div>
                  <h4 className="font-semibold text-text-primary">Revenue by Location</h4>
                  <p className="text-sm text-text-secondary">
                    Geographic revenue analysis
                  </p>
                </div>
              </Link>
              <Link
                to="/customers"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <h4 className="font-semibold text-text-primary">Customer Analytics</h4>
                  <p className="text-sm text-text-secondary">
                    Customer growth and retention
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
