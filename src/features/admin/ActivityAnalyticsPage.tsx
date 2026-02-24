import { useState } from "react";
import {
  useActivityStats,
  useActivityLog,
  useLoginSessions,
  type ActivityEntry,
  type SessionEntry,
} from "@/api/hooks/useUserActivity";

// ── Helpers ─────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-100 text-green-800",
  logout: "bg-gray-100 text-gray-800",
  login_failed: "bg-red-100 text-red-800",
  mfa_verified: "bg-blue-100 text-blue-800",
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-indigo-100 text-indigo-800",
  action: "bg-cyan-100 text-cyan-800",
  navigation: "bg-purple-100 text-purple-800",
  security: "bg-red-100 text-red-800",
  system: "bg-gray-100 text-gray-800",
};

// ── Stat Card ───────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    purple: "border-purple-200 bg-purple-50",
    cyan: "border-cyan-200 bg-cyan-50",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

// ── Bar Chart (simple) ──────────────────────────────────

function SimpleBar({
  items,
  labelKey,
  valueKey,
  color = "bg-blue-500",
}: {
  items: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (!items?.length) return <p className="text-sm text-gray-400">No data</p>;
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0));
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={`${String(item[labelKey])}-${String(item[valueKey])}`} className="flex items-center gap-2 text-sm">
          <span className="w-28 truncate text-gray-600 text-right">
            {String(item[labelKey])}
          </span>
          <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
            <div
              className={`h-full ${color} rounded transition-all`}
              style={{
                width: max ? `${(Number(item[valueKey]) / max) * 100}%` : "0%",
              }}
            />
          </div>
          <span className="w-10 text-right font-medium text-gray-700">
            {Number(item[valueKey]).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────

export function ActivityAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<"overview" | "log" | "sessions">("overview");
  const [logPage, setLogPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEmail, setFilterEmail] = useState("");

  const stats = useActivityStats(days);
  const log = useActivityLog({
    page: logPage,
    page_size: 30,
    category: filterCategory || undefined,
    user_email: filterEmail || undefined,
    days,
  });
  const sessions = useLoginSessions({
    page: sessionPage,
    page_size: 25,
    days,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Analytics</h1>
          <p className="text-sm text-gray-500">
            Track who's using the system, when, and how
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(["overview", "log", "sessions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "log" ? "Activity Log" : t === "sessions" ? "Login Sessions" : "Overview"}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <>
          {stats.isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading analytics...</div>
          ) : stats.error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load stats. Make sure you're logged in as admin.
            </div>
          ) : stats.data ? (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  label="Active Users"
                  value={stats.data.active_users}
                  sub={`Last ${days} days`}
                  color="blue"
                />
                <StatCard
                  label="Total Events"
                  value={stats.data.total_events.toLocaleString()}
                  color="purple"
                />
                <StatCard
                  label="Logins"
                  value={stats.data.total_logins}
                  color="green"
                />
                <StatCard
                  label="Failed Logins"
                  value={stats.data.failed_logins}
                  color="red"
                />
                <StatCard
                  label="Avg Response"
                  value={
                    stats.data.response_time.avg_ms
                      ? `${stats.data.response_time.avg_ms}ms`
                      : "—"
                  }
                  sub={
                    stats.data.response_time.p95_ms
                      ? `P95: ${stats.data.response_time.p95_ms}ms`
                      : ""
                  }
                  color="cyan"
                />
                <StatCard
                  label="Peak Response"
                  value={
                    stats.data.response_time.max_ms
                      ? `${stats.data.response_time.max_ms}ms`
                      : "—"
                  }
                  color="amber"
                />
              </div>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Most Active Users */}
                <div className="bg-white rounded-lg border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Most Active Users
                  </h3>
                  <SimpleBar
                    items={stats.data.top_users}
                    labelKey="email"
                    valueKey="count"
                    color="bg-blue-500"
                  />
                </div>

                {/* Top Actions */}
                <div className="bg-white rounded-lg border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Top Actions
                  </h3>
                  <SimpleBar
                    items={stats.data.by_action}
                    labelKey="action"
                    valueKey="count"
                    color="bg-indigo-500"
                  />
                </div>

                {/* Most Accessed Resources */}
                <div className="bg-white rounded-lg border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Most Accessed Resources
                  </h3>
                  <SimpleBar
                    items={stats.data.top_resources}
                    labelKey="resource"
                    valueKey="count"
                    color="bg-emerald-500"
                  />
                </div>

                {/* Activity by Hour */}
                <div className="bg-white rounded-lg border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Activity by Hour (UTC)
                  </h3>
                  {stats.data.by_hour.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">
                      {Array.from({ length: 24 }, (_, h) => {
                        const entry = stats.data!.by_hour.find((e) => e.hour === h);
                        const count = entry?.count || 0;
                        const max = Math.max(
                          ...stats.data!.by_hour.map((e) => e.count)
                        );
                        const pct = max ? (count / max) * 100 : 0;
                        return (
                          <div
                            key={h}
                            className="flex-1 bg-purple-400 rounded-t hover:bg-purple-600 transition-colors"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${h}:00 — ${count} events`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No data</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </div>

                {/* Daily Activity Trend */}
                <div className="bg-white rounded-lg border p-5 md:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Daily Activity
                  </h3>
                  {stats.data.by_day.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">
                      {stats.data.by_day.map((d) => {
                        const max = Math.max(
                          ...stats.data!.by_day.map((e) => e.count)
                        );
                        const pct = max ? (d.count / max) * 100 : 0;
                        return (
                          <div
                            key={d.day}
                            className="flex-1 bg-blue-400 rounded-t hover:bg-blue-600 transition-colors"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${d.day}: ${d.count} events`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No data yet</p>
                  )}
                  {stats.data.by_day.length > 0 && (
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{stats.data.by_day[0]?.day}</span>
                      <span>
                        {stats.data.by_day[stats.data.by_day.length - 1]?.day}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Activity Log Tab */}
      {tab === "log" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setLogPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Categories</option>
              <option value="auth">Auth</option>
              <option value="action">Action</option>
              <option value="navigation">Navigation</option>
              <option value="security">Security</option>
            </select>
            <input
              type="text"
              placeholder="Filter by email..."
              value={filterEmail}
              onChange={(e) => {
                setFilterEmail(e.target.value);
                setLogPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-48"
            />
          </div>

          {/* Table */}
          {log.isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : log.error ? (
            <div className="text-center py-8 text-red-500">Failed to load activity log</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3">When</th>
                      <th className="pb-2 pr-3">User</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2 pr-3">Action</th>
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3">IP</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.data?.items.map((entry: ActivityEntry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                          {timeAgo(entry.created_at)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {entry.user_email || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              CATEGORY_COLORS[entry.category] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-600 max-w-xs truncate">
                          {entry.description || "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-400 text-xs font-mono">
                          {entry.ip_address || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {entry.status_code ? (
                            <span
                              className={`text-xs font-medium ${
                                entry.status_code >= 400
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {entry.status_code}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-xs text-gray-400">
                          {entry.response_time_ms
                            ? `${entry.response_time_ms}ms`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {log.data && log.data.pages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Page {log.data.page} of {log.data.pages} ({log.data.total} records)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage <= 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setLogPage((p) =>
                          Math.min(log.data!.pages, p + 1)
                        )
                      }
                      disabled={logPage >= (log.data?.pages || 1)}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {log.data?.items.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg font-medium">No activity recorded yet</p>
                  <p className="text-sm mt-1">
                    Activity tracking has just been enabled. Events will appear here as users interact with the system.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Login Sessions Tab */}
      {tab === "sessions" && (
        <div className="space-y-4">
          {sessions.isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : sessions.error ? (
            <div className="text-center py-8 text-red-500">Failed to load sessions</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3">When</th>
                      <th className="pb-2 pr-3">User</th>
                      <th className="pb-2 pr-3">Event</th>
                      <th className="pb-2 pr-3">IP Address</th>
                      <th className="pb-2 pr-3">Source</th>
                      <th className="pb-2">Browser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data?.items.map((entry: SessionEntry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="text-gray-900">
                            {formatDate(entry.created_at)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {timeAgo(entry.created_at)}
                          </div>
                        </td>
                        <td className="py-2 pr-3 font-medium">
                          {entry.user_email || "Unknown"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-400 text-xs font-mono">
                          {entry.ip_address || "—"}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {entry.source || "—"}
                        </td>
                        <td className="py-2 text-xs text-gray-400 max-w-xs truncate">
                          {entry.user_agent
                            ? entry.user_agent.substring(0, 60) + "..."
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sessions.data && (sessions.data.total || 0) > 25 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {sessions.data.total} total sessions
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                      disabled={sessionPage <= 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setSessionPage((p) => p + 1)}
                      disabled={
                        (sessions.data?.items.length || 0) < 25
                      }
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {sessions.data?.items.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg font-medium">No login sessions recorded yet</p>
                  <p className="text-sm mt-1">
                    Login/logout events will appear here as users sign in and out.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
