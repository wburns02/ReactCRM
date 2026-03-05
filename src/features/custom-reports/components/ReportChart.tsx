import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

interface ReportChartProps {
  rows: Record<string, unknown>[];
  chartType: string;
  groupBy?: string[];
  columns?: { field: string; label?: string; aggregation?: string }[];
}

export function ReportChart({ rows, chartType, groupBy = [], columns = [] }: ReportChartProps) {
  const { data, xKey, valueKeys } = useMemo(() => {
    if (!rows.length) return { data: [], xKey: "", valueKeys: [] as string[] };

    const keys = Object.keys(rows[0]);
    const xK = groupBy[0] || keys[0] || "";
    const vKeys = keys.filter((k) => k !== xK && typeof rows[0][k] === "number");

    if (!vKeys.length) {
      const numericKeys = keys.filter((k) =>
        rows.some((r) => typeof r[k] === "number"),
      );
      return { data: rows.slice(0, 50), xKey: xK, valueKeys: numericKeys.filter((k) => k !== xK) };
    }

    return { data: rows.slice(0, 50), xKey: xK, valueKeys: vKeys };
  }, [rows, groupBy]);

  if (!data.length || !valueKeys.length) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        No chart data available. Add numeric columns or group by a field.
      </div>
    );
  }

  const getLabel = (key: string) => {
    const col = columns.find((c) => key.startsWith(c.field));
    return col?.label || key.replace(/_/g, " ");
  };

  if (chartType === "pie") {
    const pieData = data.map((d) => ({
      name: String(d[xKey] ?? "Unknown"),
      value: Number(d[valueKeys[0]] ?? 0),
    }));

    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {valueKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} name={getLabel(k)} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {valueKeys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} name={getLabel(k)} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} stroke={COLORS[i % COLORS.length]} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {valueKeys.map((k, i) => (
          <Bar key={k} dataKey={k} name={getLabel(k)} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
