import {
  Shield,
  Activity,
  AlertTriangle,
  Monitor,
  Server,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  useSocHealth,
  useAgentSummary,
  useAlertSummary,
  useEscalationStats,
} from "@/api/hooks/useSecurity";

const severityColor: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-400",
};

export function SecurityDashboard() {
  const { data: health, isLoading: healthLoading } = useSocHealth();
  const { data: agents, isLoading: agentsLoading } = useAgentSummary();
  const { data: alertSummary, isLoading: alertsLoading } = useAlertSummary("24h");
  const { data: escalation } = useEscalationStats();

  const isLoading = healthLoading || agentsLoading || alertsLoading;

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Security Operations Center
              </h1>
              <p className="text-sm text-text-secondary">
                Real-time threat monitoring powered by Wazuh SIEM + AI
              </p>
            </div>
          </div>
          {health && (
            <Badge
              variant={health.overall === "healthy" ? "success" : health.overall === "degraded" ? "warning" : "danger"}
            >
              {health.overall === "healthy" ? "All Systems Healthy" : health.overall.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Alerts (24h)</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {isLoading ? "..." : alertSummary?.total?.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Active Agents</p>
                  <p className="text-3xl font-bold text-green-500 mt-1">
                    {isLoading ? "..." : agents?.active ?? 0}
                    <span className="text-lg text-text-secondary font-normal">
                      /{agents?.total ?? 0}
                    </span>
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">AI Triaged</p>
                  <p className="text-3xl font-bold text-purple-500 mt-1">
                    {escalation?.total_triaged ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Critical</p>
                  <p className="text-3xl font-bold text-red-500 mt-1">
                    {isLoading ? "..." : alertSummary?.severity?.critical ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Severity (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {alertSummary ? (
                <div className="space-y-3">
                  {Object.entries(alertSummary.severity)
                    .sort(([, a], [, b]) => b - a)
                    .map(([level, count]) => {
                      const pct = alertSummary.total
                        ? Math.round((count / alertSummary.total) * 100)
                        : 0;
                      return (
                        <div key={level} className="flex items-center gap-3">
                          <span
                            className={`text-sm font-medium w-16 capitalize ${severityColor[level] || "text-text-secondary"}`}
                          >
                            {level}
                          </span>
                          <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                level === "critical"
                                  ? "bg-red-500"
                                  : level === "high"
                                    ? "bg-orange-500"
                                    : level === "medium"
                                      ? "bg-yellow-500"
                                      : "bg-blue-400"
                              }`}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className="text-sm text-text-secondary w-20 text-right">
                            {count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-text-secondary text-sm">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts by Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alerts by Agent (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {alertSummary ? (
                <div className="space-y-3">
                  {alertSummary.by_agent.map((entry) => {
                    const pct = alertSummary.total
                      ? Math.round((entry.count / alertSummary.total) * 100)
                      : 0;
                    return (
                      <div key={entry.agent} className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-text-secondary shrink-0" />
                        <span className="text-sm font-medium text-text-primary w-36 truncate">
                          {entry.agent}
                        </span>
                        <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <span className="text-sm text-text-secondary w-20 text-right">
                          {entry.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-secondary text-sm">Loading...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Infrastructure Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Infrastructure Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {health?.services.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-bg-muted/50 border border-border/50"
                >
                  {svc.status === "healthy" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  ) : svc.status === "degraded" ? (
                    <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {svc.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {svc.version || svc.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
