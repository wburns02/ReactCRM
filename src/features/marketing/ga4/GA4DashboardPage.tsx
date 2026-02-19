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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ChangeIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.01;
  const color = isNeutral ? "text-text-muted" : isPositive ? "text-success" : "text-error";
  const arrow = value > 0 ? "+" : "";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow}{(value * 100).toFixed(1)}%
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

  const t = traffic?.data;
  const c = comparison?.data;

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
      ) : t ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Sessions</p>
              <p className="text-2xl font-bold text-text-primary">{formatNumber(t.sessions)}</p>
              {c?.changes && <ChangeIndicator value={c.changes.sessions} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Users</p>
              <p className="text-2xl font-bold text-text-primary">{formatNumber(t.users)}</p>
              {c?.changes && <ChangeIndicator value={c.changes.users} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Bounce Rate</p>
              <p className="text-2xl font-bold text-text-primary">{formatPercent(t.bounce_rate)}</p>
              {c?.changes && <ChangeIndicator value={c.changes.bounce_rate} inverted />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Avg Duration</p>
              <p className="text-2xl font-bold text-text-primary">{formatDuration(t.avg_session_duration)}</p>
              {c?.changes && <ChangeIndicator value={c.changes.avg_session_duration} />}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Period Comparison */}
      {c && (
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
                    { label: "Sessions", current: c.current.sessions, previous: c.previous.sessions, change: c.changes.sessions },
                    { label: "Users", current: c.current.users, previous: c.previous.users, change: c.changes.users },
                    { label: "Pageviews", current: c.current.pageviews, previous: c.previous.pageviews, change: c.changes.pageviews },
                    { label: "Conversions", current: c.current.conversions, previous: c.previous.conversions, change: c.changes.conversions },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-2 text-text-primary">{row.label}</td>
                      <td className="py-2 text-right font-medium text-text-primary">{formatNumber(row.current)}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(row.previous)}</td>
                      <td className="py-2 text-right"><ChangeIndicator value={row.change} /></td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/50">
                    <td className="py-2 text-text-primary">Bounce Rate</td>
                    <td className="py-2 text-right font-medium text-text-primary">{formatPercent(c.current.bounce_rate)}</td>
                    <td className="py-2 text-right text-text-secondary">{formatPercent(c.previous.bounce_rate)}</td>
                    <td className="py-2 text-right"><ChangeIndicator value={c.changes.bounce_rate} inverted /></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-primary">Avg Duration</td>
                    <td className="py-2 text-right font-medium text-text-primary">{formatDuration(c.current.avg_session_duration)}</td>
                    <td className="py-2 text-right text-text-secondary">{formatDuration(c.previous.avg_session_duration)}</td>
                    <td className="py-2 text-right"><ChangeIndicator value={c.changes.avg_session_duration} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        {sources?.data?.sources && (
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.data.sources.slice(0, 8).map((source, i) => {
                  const maxSessions = sources.data.sources[0]?.sessions || 1;
                  const width = Math.max(5, (source.sessions / maxSessions) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-primary font-medium truncate mr-2">
                          {source.source}/{source.medium}
                        </span>
                        <span className="text-text-secondary whitespace-nowrap">
                          {formatNumber(source.sessions)} sessions
                        </span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-text-muted mt-0.5">
                        <span>{source.channel_group}</span>
                        <span>Bounce: {formatPercent(source.bounce_rate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Pages */}
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
                    {pages.data.pages.slice(0, 10).map((page, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-text-primary truncate max-w-[200px]" title={page.page_path}>
                          {page.page_path}
                        </td>
                        <td className="py-2 text-right text-text-primary">{formatNumber(page.pageviews)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatPercent(page.bounce_rate)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatDuration(page.avg_time_on_page)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices */}
        {devices?.data?.devices && (
          <Card>
            <CardHeader>
              <CardTitle>Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.data.devices.map((device, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-2xl w-10 text-center">
                      {device.device_category === "desktop" ? "🖥️" :
                       device.device_category === "mobile" ? "📱" : "📟"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary capitalize">
                          {device.device_category}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {formatNumber(device.sessions)} ({formatPercent(device.percentage / 100)})
                        </span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${device.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geographic */}
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
                      <th className="text-right py-2 text-text-secondary font-medium">Bounce</th>
                      <th className="text-right py-2 text-text-secondary font-medium">Conv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geo.data.locations.slice(0, 10).map((loc, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-text-primary">
                          {loc.city && loc.city !== "(not set)" ? `${loc.city}, ${loc.region}` : loc.region}
                        </td>
                        <td className="py-2 text-right text-text-primary">{formatNumber(loc.sessions)}</td>
                        <td className="py-2 text-right text-text-secondary">{formatPercent(loc.bounce_rate)}</td>
                        <td className="py-2 text-right">
                          {loc.conversions > 0 ? (
                            <Badge variant="default">{loc.conversions}</Badge>
                          ) : (
                            <span className="text-text-muted">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily Traffic Chart (simple bar visualization) */}
      {t?.daily && t.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sessions ({days} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-32">
              {t.daily.map((day, i) => {
                const maxSessions = Math.max(...t.daily.map((d) => d.sessions), 1);
                const height = Math.max(2, (day.sessions / maxSessions) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-colors group relative"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${day.sessions} sessions`}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-text-primary whitespace-nowrap shadow-lg z-10">
                      {day.sessions}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>{t.daily[0]?.date}</span>
              <span>{t.daily[t.daily.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Realtime */}
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
              {realtime.data.pages && realtime.data.pages.length > 0 && (
                <div className="flex-1 border-l border-border pl-6">
                  <p className="text-sm text-text-secondary mb-2">Active pages</p>
                  <div className="space-y-1">
                    {realtime.data.pages.slice(0, 5).map((page, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-text-primary truncate mr-2">{page.page_path}</span>
                        <Badge variant="secondary">{page.active_users}</Badge>
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
