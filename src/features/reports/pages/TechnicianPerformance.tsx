import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTechnicianMetrics } from '../api.ts';
import { DateRangePicker } from '../components/DateRangePicker.tsx';
import { ExportButton } from '../components/ExportButton.tsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange } from '../types.ts';

/**
 * TechnicianPerformance - Detailed technician performance metrics
 */

export function TechnicianPerformance() {
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
  const [sortBy, setSortBy] = useState<'jobs' | 'revenue' | 'satisfaction'>('jobs');

  // Fetch technician data
  const { data: technicianData, isLoading } = useTechnicianMetrics(dateRange);

  // Sort technicians
  const sortedTechnicians = technicianData?.technicians.slice().sort((a, b) => {
    switch (sortBy) {
      case 'jobs':
        return b.jobs_completed - a.jobs_completed;
      case 'revenue':
        return b.total_revenue - a.total_revenue;
      case 'satisfaction':
        return (b.customer_satisfaction || 0) - (a.customer_satisfaction || 0);
      default:
        return 0;
    }
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
            <h1 className="text-3xl font-bold text-text-primary">
              Technician Performance
            </h1>
            <p className="text-text-secondary mt-1">
              Analyze individual technician metrics and productivity
            </p>
          </div>
          <ExportButton reportType="technician" dateRange={dateRange} />
        </div>

        {/* Date Range Picker */}
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading technician data...</div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && technicianData && sortedTechnicians && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Total Technicians
              </h3>
              <p className="text-3xl font-bold text-text-primary">
                {technicianData.technicians.length}
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Total Jobs Completed
              </h3>
              <p className="text-3xl font-bold text-text-primary">
                {technicianData.technicians.reduce(
                  (sum, tech) => sum + tech.jobs_completed,
                  0
                )}
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Total Revenue
              </h3>
              <p className="text-3xl font-bold text-text-primary">
                {formatCurrency(
                  technicianData.technicians.reduce(
                    (sum, tech) => sum + tech.total_revenue,
                    0
                  )
                )}
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Avg Satisfaction
              </h3>
              <p className="text-3xl font-bold text-text-primary">
                {(
                  technicianData.technicians.reduce(
                    (sum, tech) => sum + (tech.customer_satisfaction || 0),
                    0
                  ) / technicianData.technicians.length
                ).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Jobs Completed Chart */}
          <div className="bg-bg-card border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Jobs Completed by Technician
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTechnicians}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="technician_name"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="jobs_completed" fill="#22c55e" name="Jobs Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div className="bg-bg-card border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Revenue by Technician
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTechnicians}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="technician_name"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="total_revenue" fill="#0091ae" name="Total Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Technician Table */}
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Technician Details
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('jobs')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    sortBy === 'jobs'
                      ? 'bg-primary text-white'
                      : 'bg-bg-body text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Sort by Jobs
                </button>
                <button
                  onClick={() => setSortBy('revenue')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    sortBy === 'revenue'
                      ? 'bg-primary text-white'
                      : 'bg-bg-body text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Sort by Revenue
                </button>
                <button
                  onClick={() => setSortBy('satisfaction')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    sortBy === 'satisfaction'
                      ? 'bg-primary text-white'
                      : 'bg-bg-body text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Sort by Rating
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      Technician
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Jobs
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Avg Job Value
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Avg Duration
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      On-Time %
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTechnicians.map((tech) => (
                    <tr
                      key={tech.technician_id}
                      className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-text-primary font-medium">
                        {tech.technician_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">
                        {tech.jobs_completed}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary text-right font-medium">
                        {formatCurrency(tech.total_revenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">
                        {formatCurrency(tech.total_revenue / tech.jobs_completed)}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">
                        {tech.average_job_duration_hours?.toFixed(1) || 'N/A'} hrs
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">
                        {tech.on_time_completion_rate.toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary text-right">
                        <span className="inline-flex items-center gap-1">
                          <span>⭐</span>
                          {tech.customer_satisfaction?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
