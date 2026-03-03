import { Monitor, Wifi, WifiOff, Clock, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSocAgents, useAgentSummary } from "@/api/hooks/useSecurity";

function formatDate(ts: string) {
  if (ts.startsWith("9999")) return "Always on";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SecurityAgents() {
  const { data: summary, isLoading: summaryLoading } = useAgentSummary();
  const { data, isLoading } = useSocAgents();

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Security Agents</h1>
            <p className="text-sm text-text-secondary">
              Wazuh endpoint agents — monitoring, threat detection, and compliance
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Agents</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {summaryLoading ? "..." : summary?.total ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Active</p>
                  <p className="text-3xl font-bold text-green-500 mt-1">
                    {summaryLoading ? "..." : summary?.active ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Disconnected</p>
                  <p className="text-3xl font-bold text-red-500 mt-1">
                    {summaryLoading ? "..." : summary?.disconnected ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Pending</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-1">
                    {summaryLoading ? "..." : summary?.pending ?? 0}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Endpoint Agents
              {data && (
                <span className="text-text-secondary font-normal ml-2">
                  ({data.total})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Name</div>
              <div className="col-span-2">IP Address</div>
              <div className="col-span-2">OS</div>
              <div className="col-span-2">Groups</div>
              <div className="col-span-1">Version</div>
              <div className="col-span-2 text-right">Last Seen</div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-text-secondary">Loading agents...</div>
            ) : !data?.agents.length ? (
              <div className="p-8 text-center text-text-secondary">No agents found</div>
            ) : (
              data.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/50 hover:bg-bg-muted/50 transition-colors items-center"
                >
                  <div className="col-span-1">
                    <Badge
                      variant={
                        agent.status === "active"
                          ? "success"
                          : agent.status === "disconnected"
                            ? "danger"
                            : "warning"
                      }
                      size="sm"
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-text-secondary">ID: {agent.id}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-text-primary font-mono">{agent.ip}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-text-primary truncate">{agent.os}</p>
                    <p className="text-xs text-text-secondary">{agent.os_version}</p>
                  </div>
                  <div className="col-span-2">
                    {agent.group.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {agent.group.map((g) => (
                          <Badge key={g} variant="outline" size="sm">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
                    )}
                  </div>
                  <div className="col-span-1">
                    <span className="text-xs text-text-secondary">{agent.version.replace("Wazuh ", "")}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-text-secondary">
                      {formatDate(agent.last_keepalive)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
