import { useState } from "react";
import { useCostReportsSummary, COST_TYPES } from "../api/jobCosting.ts";
import { JobCostList } from "../components/JobCostList.tsx";
import { JobProfitabilityPanel } from "../components/JobProfitabilityPanel.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatCurrency } from "@/lib/utils.ts";

export function JobCostingPage() {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
    () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      return {
        from: thirtyDaysAgo.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    },
  );

  const { data: reports, isLoading } = useCostReportsSummary(
    dateRange.from,
    dateRange.to,
  );

  const getCostTypeIcon = (type: string): string => {
    return COST_TYPES.find((t) => t.value === type)?.icon || "📋";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          💰 Job Costing
        </h1>
        <p className="text-text-muted mt-1">
          Track and manage job costs, analyze profitability
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-sm text-text-muted">
            From:
          </label>
          <input
            id="date-from"
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, from: e.target.value }))
            }
            className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-sm text-text-muted">
            To:
          </label>
          <input
            id="date-to"
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, to: e.target.value }))
            }
            className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Costs</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading
                    ? "-"
                    : formatCurrency(reports?.summary?.total_costs || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Billable Amount</p>
                <p className="text-2xl font-bold text-success">
                  {isLoading
                    ? "-"
                    : formatCurrency(reports?.summary?.total_billable || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-2xl">📈</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Billed</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading
                    ? "-"
                    : formatCurrency(reports?.summary?.billed_amount || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Unbilled</p>
                <p className="text-2xl font-bold text-warning">
                  {isLoading
                    ? "-"
                    : formatCurrency(reports?.summary?.unbilled_amount || 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {reports?.summary?.cost_count || 0} entries
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full text-2xl">⏳</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Profitability Panel */}
      <JobProfitabilityPanel
        dateRange={{ start: dateRange.from, end: dateRange.to }}
      />

      {/* Cost Breakdown by Type */}
      {reports?.by_type && Object.keys(reports.by_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Costs by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(reports.by_type).map(([type, data]) => (
                <div key={type} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getCostTypeIcon(type)}</span>
                    <span className="font-medium capitalize text-text-primary">
                      {type}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(data.total)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {data.count} entries
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown by Technician */}
      {reports?.by_technician &&
        Object.keys(reports.by_technician).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Costs by Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                        Technician
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                        Entries
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reports.by_technician).map(
                      ([name, data]) => (
                        <tr
                          key={name}
                          className="border-b border-border hover:bg-bg-hover"
                        >
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-2">
                              <span>👷</span>
                              <span className="text-text-primary">{name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-text-muted">
                            {data.count}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-text-primary">
                            {formatCurrency(data.total)}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      {/* All Costs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Job Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <JobCostList />
        </CardContent>
      </Card>
    </div>
  );
}

export default JobCostingPage;
