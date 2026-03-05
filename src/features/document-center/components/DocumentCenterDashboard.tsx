import { ReactNode } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { FileText, Send, Eye, Clock } from "lucide-react";
import type { DocumentStats } from "@/api/types/documentCenter.ts";
import { calculateOpenRate } from "@/api/types/documentCenter.ts";

interface DocumentCenterDashboardProps {
  stats: DocumentStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

function StatCard({ title, value, icon, trend, trendUp, className = "" }: StatCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm ${trendUp ? "text-green-600" : "text-red-600"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function DocumentCenterDashboard({ stats, isLoading, error }: DocumentCenterDashboardProps) {
  // Show error state
  if (error) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
        <ApiError error={error} retry={() => window.location.reload()} />
      </Card>
    );
  }

  // Show loading state
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI Cards Loading */}
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate additional metrics
  const openRate = calculateOpenRate(stats.viewed_count ?? 0, stats.sent_this_month ?? 0);

  // Prepare chart data for last 12 months
  const chartData = (stats.monthly_counts ?? []).map((month) => ({
    month: new Date(month.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    invoices: month.invoices,
    quotes: month.quotes,
    "work orders": month.work_orders,
    inspections: month.inspections,
    total: month.total,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={(stats.total_documents ?? 0).toLocaleString()}
          icon={<FileText size={24} />}
        />
        <StatCard
          title="Sent This Month"
          value={(stats.sent_this_month ?? 0).toLocaleString()}
          icon={<Send size={24} />}
        />
        <StatCard
          title="Open Rate"
          value={`${openRate}%`}
          icon={<Eye size={24} />}
          trend={openRate >= 50 ? "Good open rate" : "Low open rate"}
          trendUp={openRate >= 50}
        />
        <StatCard
          title="Pending Drafts"
          value={(stats.pending_drafts ?? 0).toLocaleString()}
          icon={<Clock size={24} />}
          className={(stats.pending_drafts ?? 0) > 10 ? "border-yellow-200 bg-yellow-50" : ""}
        />
      </div>

      {/* Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Documents Generated (Last 12 Months)</h2>
          <p className="text-sm text-gray-600">Track document generation trends by type</p>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-2" />
              <p>No document data available</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: "#e5e7eb" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="invoices"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Invoices"
                />
                <Area
                  type="monotone"
                  dataKey="quotes"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Quotes"
                />
                <Area
                  type="monotone"
                  dataKey="work orders"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                  name="Work Orders"
                />
                <Area
                  type="monotone"
                  dataKey="inspections"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Inspections"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}