import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRevenueByService } from '../api.ts';
import { DateRangePicker } from '../components/DateRangePicker.tsx';
import { RevenueByServiceChart } from '../components/RevenueByServiceChart.tsx';
import type { DateRange } from '../types.ts';

export function ServiceReportPage() {
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
  const { data, isLoading, error } = useRevenueByService(dateRange);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <Link to="/reports" className="hover:text-primary">Reports</Link>
          <span>/</span>
          <span>Revenue by Service</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Revenue by Service Type</h1>
            <p className="text-text-secondary mt-1">
              Breakdown of revenue by service category
            </p>
          </div>
        </div>
        <div className="mt-4">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading service revenue data...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="text-danger">Failed to load service data. Please try again.</p>
        </div>
      )}

      {/* Report content */}
      {!isLoading && !error && data && (
        <RevenueByServiceChart
          data={data.services}
          totalRevenue={data.total_revenue}
        />
      )}
    </div>
  );
}

export default ServiceReportPage;
