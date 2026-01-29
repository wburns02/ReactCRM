import { useState } from "react";
import {
  useCostReportsSummary,
  useRecentWorkOrders,
  useWorkOrderCostSummary,
  useWorkOrderProfitability,
  COST_TYPES,
} from "../api/jobCosting";
import { JobCostList } from "../components/JobCostList";
import { JobProfitabilityPanel } from "../components/JobProfitabilityPanel";
import { JobCostCalculator } from "../components/JobCostCalculator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

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

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calculator" | "reports">("calculator");

  const { data: reports, isLoading } = useCostReportsSummary(
    dateRange.from,
    dateRange.to,
  );

  const { data: workOrdersData } = useRecentWorkOrders(50);

  // Work order specific data
  const { data: workOrderSummary, refetch: refetchSummary } = useWorkOrderCostSummary(
    selectedWorkOrderId
  );
  const { data: workOrderProfitability } = useWorkOrderProfitability(
    selectedWorkOrderId
  );

  const selectedWorkOrder = workOrdersData?.work_orders.find(
    (wo) => wo.id === selectedWorkOrderId
  );

  const getCostTypeIcon = (type: string): string => {
    return COST_TYPES.find((t) => t.value === type)?.icon || "📋";
  };

  const handleCostAdded = () => {
    refetchSummary();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            💰 Job Costing
          </h1>
          <p className="text-text-muted mt-1">
            Calculate and track job costs with pay rates, dump fees, and commissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "calculator" ? "primary" : "secondary"}
            onClick={() => setViewMode("calculator")}
          >
            🧮 Calculator
          </Button>
          <Button
            variant={viewMode === "reports" ? "primary" : "secondary"}
            onClick={() => setViewMode("reports")}
          >
            📊 Reports
          </Button>
        </div>
      </div>

      {/* Work Order Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📋</span> Select Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-muted block mb-2">
                Choose a work order to analyze or add costs
              </label>
              <select
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
              >
                <option value="">Select a work order...</option>
                {workOrdersData?.work_orders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.id.slice(0, 8)}... - {wo.job_type || "Unknown"} - {wo.status} - {formatCurrency(wo.total_amount)}
                  </option>
                ))}
              </select>
            </div>
            {selectedWorkOrder && (
              <div className="p-3 bg-bg-secondary rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-text-muted">Job Type:</span>
                    <span className="ml-2 text-text-primary font-medium">
                      {selectedWorkOrder.job_type || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Status:</span>
                    <Badge variant="info" className="ml-2">
                      {selectedWorkOrder.status || "Unknown"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-text-muted">Revenue:</span>
                    <span className="ml-2 text-success font-bold">
                      {formatCurrency(selectedWorkOrder.total_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Date:</span>
                    <span className="ml-2 text-text-primary">
                      {selectedWorkOrder.scheduled_start
                        ? new Date(selectedWorkOrder.scheduled_start).toLocaleDateString()
                        : "Not scheduled"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {viewMode === "calculator" ? (
        <>
          {/* Job Cost Calculator */}
          <JobCostCalculator
            workOrderId={selectedWorkOrderId || undefined}
            jobTotal={selectedWorkOrder?.total_amount || 0}
            onCostAdded={handleCostAdded}
          />

          {/* Work Order Cost Summary */}
          {selectedWorkOrderId && workOrderSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📊</span> Work Order Costs
                  <Badge variant="info">{workOrderSummary.cost_count} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-bg-hover rounded-lg text-center">
                    <p className="text-sm text-text-muted">Total Costs</p>
                    <p className="text-xl font-bold text-danger">
                      {formatCurrency(workOrderSummary.total_costs)}
                    </p>
                  </div>
                  <div className="p-3 bg-bg-hover rounded-lg text-center">
                    <p className="text-sm text-text-muted">Labor</p>
                    <p className="text-xl font-bold text-text-primary">
                      {formatCurrency(workOrderSummary.labor_costs)}
                    </p>
                  </div>
                  <div className="p-3 bg-bg-hover rounded-lg text-center">
                    <p className="text-sm text-text-muted">Materials</p>
                    <p className="text-xl font-bold text-text-primary">
                      {formatCurrency(workOrderSummary.material_costs)}
                    </p>
                  </div>
                  <div className="p-3 bg-bg-hover rounded-lg text-center">
                    <p className="text-sm text-text-muted">Other</p>
                    <p className="text-xl font-bold text-text-primary">
                      {formatCurrency(workOrderSummary.other_costs)}
                    </p>
                  </div>
                </div>

                {/* Profitability */}
                {workOrderProfitability && (
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-medium text-text-primary mb-3">Profitability</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-text-muted">Revenue</p>
                        <p className="text-lg font-bold text-success">
                          {formatCurrency(workOrderProfitability.revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Costs</p>
                        <p className="text-lg font-bold text-danger">
                          {formatCurrency(workOrderProfitability.total_costs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Gross Profit</p>
                        <p className={`text-lg font-bold ${
                          workOrderProfitability.gross_profit >= 0 ? "text-success" : "text-danger"
                        }`}>
                          {formatCurrency(workOrderProfitability.gross_profit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Margin</p>
                        <p className={`text-lg font-bold ${
                          workOrderProfitability.profit_margin_percent >= 35 ? "text-success" :
                          workOrderProfitability.profit_margin_percent >= 25 ? "text-yellow-500" : "text-danger"
                        }`}>
                          {workOrderProfitability.profit_margin_percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Costs for this work order */}
                <div className="mt-4">
                  <JobCostList workOrderId={selectedWorkOrderId} />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

export default JobCostingPage;
