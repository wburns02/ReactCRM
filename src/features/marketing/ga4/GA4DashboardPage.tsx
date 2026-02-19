import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useGA4Traffic,
  useGA4Sources,
  useGA4Comparison,
  useGA4Pages,
  useGA4Devices,
  useGA4Geo,
  useGA4Realtime,
  useIntegrationSettings,
} from "@/api/hooks/useMarketingHub.ts";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

/** Format a value already in percentage form (e.g. 45.2 → "45.2%") */
function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function ChangeIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;
  const color = isNeutral ? "text-text-muted" : isPositive ? "text-success" : "text-error";
  const arrow = value > 0 ? "+" : "";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow}{value.toFixed(1)}%
    </span>
  );
}

export function GA4DashboardPage() {
  const [days, setDays] = useState(30);

  const { data: settings } = useIntegrationSettings();
  const { data: traffic, isLoading: trafficLoading } = useGA4Traffic(days);
  const { data: sources } = useGA4Sources(days);
  const { data: comparison } = useGA4Comparison(days);
  const { data: pages } = useGA4Pages(days);
  const { data: devices } = useGA4Devices(days);
  const { data: geo } = useGA4Geo(days);
  const { data: realtime } = useGA4Realtime();

  const isConfigured = settings?.integrations?.ga4?.configured;

  if (!isConfigured) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">&larr; Back</Button>
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">GA4 Analytics</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-4">📊</p>
            <h2 className="text-xl font-semibold text-text-primary mb-2">GA4 Not Connected</h2>
            <p className="text-text-secondary mb-4">
              Connect Google Analytics 4 to see real-time website traffic and conversion data.
            </p>
            <Link to="/integrations">
              <Button>Go to Integrations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // API shape: { period_days, totals: { sessions, users, ... }, daily: [...] }
  const totals = traffic?.data?.totals;
  const daily = traffic?.data?.daily;

  // API shape: { period_days, current_period: {...}, previous_period: {...}, changes: { metric: { change_percent, ... } } }
  const comp = comparison?.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">&larr; Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">GA4 Website Analytics</h1>
            <p className="text-sm text-text-secondary mt-1">
              Real-time traffic, conversions & audience insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {realtime?.data && (
            <Badge variant={realtime.data.active_users > 0 ? "default" : "secondary"}>
              {realtime.data.active_users} active now
            </Badge>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-surface border border-border rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {trafficLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-bg-hover rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : totals ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Sessions</p>
              <p className="text-2xl font-bold text-text-primary">{formatNumber(totals.sessions)}</p>
              {comp?.changes?.sessions && <ChangeIndicator value={comp.changes.sessions.change_percent} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Users</p>
              <p className="text-2xl font-bold text-text-primary">{formatNumber(totals.users)}</p>
              {comp?.changes?.users && <ChangeIndicator value={comp.changes.users.change_percent} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Bounce Rate</p>
              <p className="text-2xl font-bold text-text-primary">{formatPct(totals.bounce_rate)}</p>
              {comp?.changes?.bounce_rate && <ChangeIndicator value={comp.changes.bounce_rate.change_percent} inverted />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Avg Duration</p>
              <p className="text-2xl font-bold text-text-primary">{formatDuration(totals.avg_session_duration)}</p>
              {comp?.changes?.avg_duration && <ChangeIndicator value={comp.changes.avg_duration.change_percent} />}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Period Comparison */}
      {comp && (
        <Card>
          <CardHeader>
            <CardTitle>Period Comparison ({days}d vs previous {days}d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">Metric</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Current</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Previous</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Sessions", key: "sessions" },
                    { label: "Users", key: "users" },
                    { label: "Pageviews", key: "pageviews" },
                    { label: "Conversions", key: "conversions" },
                  ].map((row) => {
                    const change = comp.changes?.[row.key];
                    return (
                      <tr key={row.label} className="border-b border-border/50">
                        <td className="py-2 text-text-primary">{row.label}</td>
                        <td className="py-2 text-right font-medium text-text-primary">
                          {formatNumber(comp.current_period?.[row.key] ?? 0)}
                        </td>
                        <td className="py-2 text-right text-text-secondary">
                          {formatNumber(comp.previous_period?.[row.key] ?? 0)}
                        </td>
                        <td className="py-2 text-right">
                          {change && <ChangeIndicator value={change.change_percent} />}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-border/50">
                    <td className="py-2 text-text-primary">Bounce Rate</td>
                    <td className="py-2 text-right font-medium text-text-primary">
                      {formatPct(comp.current_period?.bounce_rate ?? 0)}
                    </td>
                    <td className="py-2 text-right text-text-secondary">
                      {formatPct(comp.previous_period?.bounce_rate ?? 0)}
                    </td>
                    <td className="py-2 text-right">
                      {comp.changes?.bounce_rate && <ChangeIndicator value={comp.changes.bounce_rate.change_percent} inverted />}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-primary">Avg Duration</td>
                    <td className="py-2 text-right font-medium text-text-primary">
                      {formatDuration(comp.current_period?.avg_duration ?? 0)}
                    </td>
                    <td className="py-2 text-right text-text-secondary">
                      {formatDuration(comp.previous_period?.avg_duration ?? 0)}
                    </td>
                    <td className="py-2 text-right">
                      {comp.changes?.avg_duration && <ChangeIndicator value={comp.changes.avg_duration.change_percent} />}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources — API: { channel, sessions, users, engaged_sessions, conversions, engagement_rate } */}
        {sources?.data?.sources && (
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.data.sources.slice(0, 8).map((source: Record<string, unknown>, i: number) => {
                  const maxSessions = (sources.data.sources[0]?.sessions as number) || 1;
                  const sessions = (source.sessions as number) || 0;
                  const width = Math.max(5, (sessions / maxSessions) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-primary font-medium truncate mr-2">
                          {source.channel as string}
                        </span>
                        <span className="text-text-secondary whitespace-nowrap">
                          {formatNumber(sessions)} sessions
                        </span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-text-muted mt-0.5">
                        <span>{formatNumber((source.users as number) || 0)} users</span>
                        <span>Engagement: {(source.engagement_rate as number)?.toFixed(1) ?? 0}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Pages — API: { path, pageviews, users, avg_duration, bounce_rate } */}
        {pages?.data?.pages && (
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-text-secondary font-medium">Page</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Views</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Bounce</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.data.pages.slice(0, 10).map((page: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-text-primary truncate max-w-[200px]" title={page.path as string}>
                          {page.path as string}
                        </td>
                        <td className="py-2 text-right text-text-primary">{formatNumber(page.pageviews as number)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatPct(page.bounce_rate as number)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatDuration(page.avg_duration as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices — API: { device, sessions, users, percentage } */}
        {devices?.data?.devices && (
          <Card>
            <CardHeader>
              <CardTitle>Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.data.devices.map((d: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-2xl w-10 text-center">
                      {d.device === "desktop" ? "🖥️" :
                       d.device === "mobile" ? "📱" : "📟"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary capitalize">
                          {d.device as string}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {formatNumber(d.sessions as number)} ({(d.percentage as number)?.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${d.percentage as number}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geographic — API: { region, city, sessions, users } */}
        {geo?.data?.locations && (
          <Card>
            <CardHeader>
              <CardTitle>Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-text-secondary font-medium">Location</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Sessions</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geo.data.locations.slice(0, 10).map((loc: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-text-primary">
                          {loc.city && loc.city !== "(not set)" ? `${loc.city}, ${loc.region}` : loc.region as string}
                        </td>
                        <td className="py-2 text-right text-text-primary">{formatNumber(loc.sessions as number)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatNumber(loc.users as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily Traffic Chart */}
      {daily && daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sessions ({days} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-32">
              {daily.map((day: Record<string, unknown>, i: number) => {
                const daySessions = (day.sessions as number) || 0;
                const maxSessions = Math.max(...daily.map((d: Record<string, unknown>) => (d.sessions as number) || 0), 1);
                const height = Math.max(2, (daySessions / maxSessions) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-colors group relative"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${daySessions} sessions`}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-text-primary whitespace-nowrap shadow-lg z-10">
                      {daySessions}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>{daily[0]?.date as string}</span>
              <span>{daily[daily.length - 1]?.date as string}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Realtime — API: { active_users, by_device: { desktop: n, mobile: n }, timestamp } */}
      {realtime?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
              Realtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-3xl font-bold text-text-primary">{realtime.data.active_users}</p>
                <p className="text-sm text-text-secondary">Active users right now</p>
              </div>
              {realtime.data.by_device && Object.keys(realtime.data.by_device).length > 0 && (
                <div className="flex-1 border-l border-border pl-6">
                  <p className="text-sm text-text-secondary mb-2">By device</p>
                  <div className="space-y-1">
                    {Object.entries(realtime.data.by_device).map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between text-sm">
                        <span className="text-text-primary capitalize">{device}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
