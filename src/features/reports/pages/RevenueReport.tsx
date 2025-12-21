import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRevenueMetrics } from '../api.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { DateRangePicker } from '../components/DateRangePicker.tsx';
import { RevenueChart } from '../components/RevenueChart.tsx';
import { ServiceTypeBreakdown } from '../components/ServiceTypeBreakdown.tsx';
import { ExportButton } from '../components/ExportButton.tsx';
import type { DateRange } from '../types.ts';

/**
 * RevenueReport - Detailed revenue analysis page
 */

export function RevenueReport() {
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
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Fetch revenue data
  const { data: revenueData, isLoading } = useRevenueMetrics(dateRange);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              to="/reports"
              className="text-sm text-primary hover:underline mb-2 inline-block"
            >
              ← Back to Reports
            </Link>
            <h1 className="text-3xl font-bold text-text-primary">Revenue Report</h1>
            <p className="text-text-secondary mt-1">
              Detailed analysis of revenue trends and service performance
            </p>
          </div>
          <ExportButton reportType="revenue" dateRange={dateRange} />
        </div>

        {/* Date Range Picker */}
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading revenue data...</div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && revenueData && (
        <>
          {/* Key Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Revenue"
              value={revenueData.metrics.total_revenue}
              changePercent={revenueData.metrics.total_revenue_change_percent}
              icon="💰"
              format="currency"
            />
            <MetricCard
              title="Work Orders Completed"
              value={revenueData.metrics.work_orders_completed}
              changePercent={revenueData.metrics.work_orders_completed_change_percent}
              icon="✅"
              format="number"
            />
            <MetricCard
              title="Average Job Value"
              value={revenueData.metrics.average_job_value}
              changePercent={revenueData.metrics.average_job_value_change_percent}
              icon="📊"
              format="currency"
            />
            <MetricCard
              title="New Customers"
              value={revenueData.metrics.new_customers}
              changePercent={revenueData.metrics.new_customers_change_percent}
              icon="👥"
              format="number"
            />
          </div>

          {/* Revenue Chart with Controls */}
          <div className="bg-bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Revenue Trends
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    chartType === 'line'
                      ? 'bg-primary text-white'
                      : 'bg-bg-body text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Line Chart
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    chartType === 'bar'
                      ? 'bg-primary text-white'
                      : 'bg-bg-body text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Bar Chart
                </button>
              </div>
            </div>
            <RevenueChart
              data={revenueData.revenue_over_time}
              chartType={chartType}
              showWorkOrders={true}
            />
          </div>

          {/* Service Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ServiceTypeBreakdown data={revenueData.service_breakdown} />

            {/* Service Type Table */}
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Service Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                        Service Type
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                        Jobs
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                        Revenue
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                        Avg Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.service_breakdown.map((service) => (
                      <tr
                        key={service.service_type}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 px-4 text-sm text-text-primary">
                          {service.service_type}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary text-right">
                          {service.count}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary text-right font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          }).format(service.revenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary text-right">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          }).format(service.revenue / service.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Customer Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Repeat Customer Rate</span>
                  <span className="text-lg font-semibold text-text-primary">
                    {revenueData.metrics.repeat_customer_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Customer Satisfaction Score
                  </span>
                  <span className="text-lg font-semibold text-text-primary">
                    {revenueData.metrics.customer_satisfaction_score?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Report Period
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Start Date</span>
                  <span className="text-lg font-semibold text-text-primary">
                    {new Date(revenueData.date_range.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">End Date</span>
                  <span className="text-lg font-semibold text-text-primary">
                    {new Date(revenueData.date_range.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
