import { useState } from "react";
import { AlertTriangle, Search, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSocAlerts, useAlertSummary } from "@/api/hooks/useSecurity";
import type { SocAlert } from "@/api/types/security";

const severityBadge: Record<string, "danger" | "warning" | "info" | "outline"> = {
  Critical: "danger",
  High: "danger",
  Medium: "warning",
  Low: "info",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AlertRow({ alert }: { alert: SocAlert }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge variant={severityBadge[alert.level_info.label] || "outline"} size="sm">
          {alert.level_info.label}
        </Badge>
        <span className="text-xs text-text-secondary w-12 shrink-0 font-mono">
          L{alert.rule_level}
        </span>
        <span className="text-sm text-text-primary flex-1 truncate">
          {alert.rule_description}
        </span>
        <span className="text-xs text-text-secondary shrink-0">
          {alert.agent_name}
        </span>
        <span className="text-xs text-text-secondary shrink-0 w-36 text-right">
          {formatTimestamp(alert.timestamp)}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 bg-bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-text-secondary">Rule ID:</span>{" "}
              <span className="text-text-primary font-mono">{alert.rule_id}</span>
            </div>
            <div>
              <span className="text-text-secondary">Agent:</span>{" "}
              <span className="text-text-primary">{alert.agent_name} ({alert.agent_id})</span>
            </div>
            <div>
              <span className="text-text-secondary">Groups:</span>{" "}
              <span className="text-text-primary">{alert.groups.join(", ") || "—"}</span>
            </div>
            {alert.mitre?.id && alert.mitre.id.length > 0 && (
              <div>
                <span className="text-text-secondary">MITRE:</span>{" "}
                {alert.mitre.id.map((id) => (
                  <a
                    key={id}
                    href={`https://attack.mitre.org/techniques/${id.replace(".", "/")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 mr-1"
                  >
                    {id}
                    <ExternalLink className="inline w-3 h-3 ml-0.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {alert.full_log && (
            <pre className="text-xs text-text-secondary bg-bg-muted p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap break-all">
              {alert.full_log}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function SecurityAlerts() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string | undefined>();
  const [limit, setLimit] = useState(50);

  const params: Record<string, string> = { limit: String(limit) };
  if (severity) params.level = severity;
  if (search) params.q = search;

  const { data, isLoading } = useSocAlerts(params);
  const { data: summary } = useAlertSummary("24h");

  const filters = [
    { label: "All", value: undefined },
    { label: "Critical", value: "13" },
    { label: "High", value: "10" },
    { label: "Medium", value: "5" },
    { label: "Low", value: "1" },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Security Alerts</h1>
            <p className="text-sm text-text-secondary">
              {summary
                ? `${summary.total.toLocaleString()} alerts in the last ${summary.time_range}`
                : "Loading..."}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["critical", "high", "medium", "low"].map((level) => (
            <Card key={level}>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-text-secondary capitalize">{level}</p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${
                    level === "critical"
                      ? "text-red-500"
                      : level === "high"
                        ? "text-orange-500"
                        : level === "medium"
                          ? "text-yellow-500"
                          : "text-blue-400"
                  }`}
                >
                  {summary?.severity?.[level]?.toLocaleString() ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {filters.map((f) => (
              <Button
                key={f.label}
                size="sm"
                variant={severity === f.value ? "default" : "outline"}
                onClick={() => setSeverity(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Alerts Table */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Recent Alerts
                {data && (
                  <span className="text-text-secondary font-normal ml-2">
                    ({data.total.toLocaleString()} total)
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-3">
            {/* Column Headers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <span className="w-16">Severity</span>
              <span className="w-12">Level</span>
              <span className="flex-1">Description</span>
              <span className="w-24">Agent</span>
              <span className="w-36 text-right">Time</span>
              <span className="w-4" />
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-text-secondary">Loading alerts...</div>
            ) : !data?.alerts.length ? (
              <div className="p-8 text-center text-text-secondary">No alerts found</div>
            ) : (
              data.alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
            )}

            {data && data.total > limit && (
              <div className="flex justify-center py-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLimit((l) => l + 50)}
                >
                  Load more ({data.total - limit} remaining)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
