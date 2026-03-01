import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCampaignAnalytics } from "../useCampaignAnalytics";
import { CALL_STATUS_CONFIG, type ContactCallStatus } from "../types";
import {
  PhoneCall,
  Timer,
  Signal,
  Star,
  RefreshCw,
  Download,
  ArrowUpDown,
  Search,
} from "lucide-react";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  labelStyle: {
    color: "#111827",
    fontWeight: 600,
  },
};

const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#e5e7eb",
};

interface CampaignAnalyticsProps {
  campaignId: string;
}

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const {
    kpis,
    dispositionBreakdown,
    callsOverTime,
    funnel,
    bestHours,
    callLog,
    exportCSV,
    totalContacts,
    calledCount,
  } = useCampaignAnalytics(campaignId);

  const [logSearch, setLogSearch] = useState("");
  const [logSort, setLogSort] = useState<"name" | "date" | "attempts">("date");
  const [logSortDir, setLogSortDir] = useState<"asc" | "desc">("desc");

  const filteredLog = useMemo(() => {
    let list = [...callLog];
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.contactName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.zone?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const dir = logSortDir === "asc" ? 1 : -1;
      if (logSort === "name") return a.contactName.localeCompare(b.contactName) * dir;
      if (logSort === "attempts") return (a.attempts - b.attempts) * dir;
      // date
      return ((a.lastCallDate ?? "").localeCompare(b.lastCallDate ?? "")) * dir;
    });
    return list;
  }, [callLog, logSearch, logSort, logSortDir]);

  function toggleSort(col: typeof logSort) {
    if (logSort === col) {
      setLogSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLogSort(col);
      setLogSortDir("desc");
    }
  }

  function formatPhone(digits: string) {
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
  }

  if (totalContacts === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        No contacts in this campaign. Import contacts to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={<PhoneCall className="w-4 h-4" />}
          label="Calls/Hour"
          value={kpis.callsPerHour.toFixed(1)}
          color="text-blue-600"
        />
        <KPICard
          icon={<Timer className="w-4 h-4" />}
          label="Avg Duration"
          value={kpis.avgDuration > 0 ? `${Math.floor(kpis.avgDuration / 60)}:${(kpis.avgDuration % 60).toString().padStart(2, "0")}` : "-"}
          color="text-purple-600"
        />
        <KPICard
          icon={<Signal className="w-4 h-4" />}
          label="Connect Rate"
          value={`${kpis.connectRate.toFixed(0)}%`}
          sub={`${calledCount} called`}
          color="text-emerald-600"
        />
        <KPICard
          icon={<Star className="w-4 h-4" />}
          label="Interest Rate"
          value={`${kpis.interestRate.toFixed(0)}%`}
          sub="of connected"
          color="text-emerald-700"
        />
        <KPICard
          icon={<RefreshCw className="w-4 h-4" />}
          label="Callback Conv."
          value={`${kpis.callbackConversionRate.toFixed(0)}%`}
          sub="of re-calls"
          color="text-indigo-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disposition Donut */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Disposition Breakdown</h3>
          {dispositionBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={dispositionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dispositionBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => [value, "Contacts"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {dispositionBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-text-secondary truncate">{item.name}</span>
                    <span className="ml-auto font-medium text-text-primary tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-sm">
              No call data yet
            </div>
          )}
        </div>

        {/* Calls Over Time */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Calls Over Time</h3>
          {callsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={callsOverTime} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(d: string) => {
                    const dt = new Date(d + "T00:00:00");
                    return `${dt.getMonth() + 1}/${dt.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="calls" name="Total Calls" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="connected" name="Connected" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-sm">
              No call data yet
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Conversion Funnel</h3>
          <div className="space-y-2.5">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary">{step.label}</span>
                  <span className="font-medium text-text-primary tabular-nums">
                    {step.value} ({step.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-5 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(step.percentage, 1)}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Calling Hours */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Best Calling Hours</h3>
          {bestHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bestHours} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [
                    name === "connectRate" ? `${value.toFixed(0)}%` : value,
                    name === "connectRate" ? "Connect Rate" : "Total Calls",
                  ]}
                />
                <Bar dataKey="connectRate" name="connectRate" fill="#0091ae" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-sm">
              No call data yet
            </div>
          )}
        </div>
      </div>

      {/* Call Log Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Call Log</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                placeholder="Search..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-bg-body text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary w-48"
              />
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-hover text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-hover z-10">
              <tr className="border-b border-border text-text-secondary text-xs">
                <th className="px-3 py-2 text-left font-medium">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-text-primary">
                    Contact <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium">Phone</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">
                  <button onClick={() => toggleSort("attempts")} className="flex items-center gap-1 hover:text-text-primary">
                    Attempts <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-text-primary">
                    Last Call <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.slice(0, 100).map((row) => {
                const statusConf = CALL_STATUS_CONFIG[row.status];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-bg-hover/50"
                  >
                    <td className="px-3 py-2 font-medium text-text-primary">
                      {row.contactName}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                      {formatPhone(row.phone)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.color}`}
                      >
                        {statusConf.icon} {statusConf.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary text-xs tabular-nums">
                      {row.attempts}
                    </td>
                    <td className="px-3 py-2 text-text-secondary text-xs">
                      {row.lastCallDate
                        ? new Date(row.lastCallDate).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-text-tertiary text-xs max-w-[200px] truncate">
                      {row.notes || "-"}
                    </td>
                  </tr>
                );
              })}
              {filteredLog.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-text-tertiary text-sm">
                    {calledCount === 0 ? "No calls made yet" : "No matching results"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLog.length > 100 && (
          <div className="px-4 py-2 text-xs text-text-tertiary border-t border-border">
            Showing 100 of {filteredLog.length} entries. Export CSV for full data.
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color}`}>{icon}</div>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
      {sub && <div className="text-[10px] text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}
