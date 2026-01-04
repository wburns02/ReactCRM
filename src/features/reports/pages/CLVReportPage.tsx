import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerLTV } from '../api.ts';
import { CLVReport } from '../components/CLVReport.tsx';

export function CLVReportPage() {
  const [topN, setTopN] = useState(50);
  const { data, isLoading, error } = useCustomerLTV(topN);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <Link to="/reports" className="hover:text-primary">Reports</Link>
          <span>/</span>
          <span>Customer Lifetime Value</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Customer Lifetime Value</h1>
            <p className="text-text-secondary mt-1">
              Analyze customer value, retention, and profitability
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">Show top:</label>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-md bg-bg-body text-text-primary"
            >
              <option value={25}>25 customers</option>
              <option value={50}>50 customers</option>
              <option value={100}>100 customers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading customer lifetime value data...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="text-danger">Failed to load customer data. Please try again.</p>
        </div>
      )}

      {/* Report content */}
      {!isLoading && !error && data && (
        <CLVReport
          data={data.customers}
          averageLTV={data.average_ltv}
          totalAnalyzed={data.total_customers_analyzed}
        />
      )}
    </div>
  );
}

export default CLVReportPage;
