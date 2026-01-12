import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RevenueDataPoint } from "../types.ts";

/**
 * RevenueChart - Line or Bar chart showing revenue over time
 */

interface RevenueChartProps {
  data: RevenueDataPoint[];
  chartType?: "line" | "bar";
  showWorkOrders?: boolean;
  className?: string;
}

export function RevenueChart({
  data,
  chartType = "line",
  showWorkOrders = false,
  className = "",
}: RevenueChartProps) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-2">
            {formatDate(payload[0].payload.date)}
          </p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm text-text-secondary">
              {entry.name}:{" "}
              <span className="font-semibold text-text-primary">
                {entry.dataKey === "revenue"
                  ? formatCurrency(entry.value)
                  : entry.value.toLocaleString()}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-bg-card border border-border rounded-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Revenue Over Time
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        {chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            {showWorkOrders && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#0091ae"
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: "#0091ae", r: 4 }}
              activeDot={{ r: 6 }}
            />
            {showWorkOrders && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="work_orders"
                stroke="#22c55e"
                strokeWidth={2}
                name="Work Orders"
                dot={{ fill: "#22c55e", r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="revenue" fill="#0091ae" name="Revenue" />
            {showWorkOrders && (
              <Bar dataKey="work_orders" fill="#22c55e" name="Work Orders" />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
