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
  useLeadPipeline,
  useHotLeads,
  type HotLead,
} from "@/api/hooks/useMarketingHub.ts";

const PIPELINE_STAGES = [
  { key: "new", label: "New Leads", color: "bg-blue-500", icon: "🆕" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500", icon: "📞" },
  { key: "qualified", label: "Qualified", color: "bg-orange-500", icon: "✅" },
  { key: "quoted", label: "Quoted", color: "bg-purple-500", icon: "📋" },
  { key: "negotiation", label: "Negotiation", color: "bg-pink-500", icon: "🤝" },
  { key: "converted", label: "Converted", color: "bg-green-500", icon: "🎉" },
] as const;

function HeatBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="danger">Hot {score}</Badge>;
  if (score >= 50) return <Badge variant="warning">Warm {score}</Badge>;
  return <Badge variant="default">Cool {score}</Badge>;
}

function LeadCard({ lead }: { lead: HotLead }) {
  return (
    <div className="p-3 bg-surface rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-text-primary text-sm truncate">
          {lead.name}
        </span>
        <HeatBadge score={lead.heat_score} />
      </div>
      <div className="space-y-1">
        {lead.city && (
          <div className="text-xs text-text-secondary flex items-center gap-1">
            <span>📍</span> {lead.city}
          </div>
        )}
        <div className="text-xs text-text-secondary flex items-center gap-1">
          <span>💰</span> ${lead.estimated_value.toLocaleString()}
        </div>
        <div className="text-xs text-text-secondary flex items-center gap-1">
          <span>📥</span> {lead.lead_source}
        </div>
        {lead.last_activity && (
          <div className="text-xs text-text-secondary flex items-center gap-1">
            <span>🕐</span>{" "}
            {new Date(lead.last_activity).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadPipelinePage() {
  const { data: pipelineData, isLoading: loadingPipeline } = useLeadPipeline();
  const { data: hotLeadsData, isLoading: loadingLeads } = useHotLeads();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const pipeline = pipelineData?.pipeline;
  const hotLeads: HotLead[] = hotLeadsData?.leads || [];
  const totalPipeline = pipelineData?.total_pipeline || 0;
  const pipelineValue = pipelineData?.pipeline_value || 0;
  const conversionRate = pipelineData?.conversion_rate || 0;

  // Group hot leads by stage
  const leadsByStage: Record<string, HotLead[]> = {};
  for (const lead of hotLeads) {
    const stage = lead.stage === "new_lead" ? "new" : lead.stage;
    if (!leadsByStage[stage]) leadsByStage[stage] = [];
    leadsByStage[stage].push(lead);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketing"
              className="text-text-secondary hover:text-primary"
            >
              Marketing
            </Link>
            <span className="text-text-secondary">/</span>
            <h1 className="text-2xl font-semibold text-text-primary">
              Lead Pipeline
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Visual lead management with AI-powered scoring
          </p>
        </div>
        <Link to="/prospects">
          <Button variant="primary" size="sm">
            Manage Prospects
          </Button>
        </Link>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-text-secondary">Total Pipeline</div>
            <div className="text-2xl font-bold text-primary">
              {loadingPipeline ? "..." : totalPipeline}
            </div>
            <div className="text-xs text-text-secondary">active prospects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-text-secondary">Pipeline Value</div>
            <div className="text-2xl font-bold text-text-primary">
              {loadingPipeline
                ? "..."
                : `$${pipelineValue.toLocaleString()}`}
            </div>
            <div className="text-xs text-text-secondary">estimated revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-text-secondary">Conversion Rate</div>
            <div className="text-2xl font-bold text-success">
              {loadingPipeline ? "..." : `${conversionRate}%`}
            </div>
            <div className="text-xs text-text-secondary">pipeline to won</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-text-secondary">Hot Leads</div>
            <div className="text-2xl font-bold text-danger">
              {loadingLeads
                ? "..."
                : hotLeads.filter((l) => l.heat_score >= 80).length}
            </div>
            <div className="text-xs text-text-secondary">ready to close</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Pipeline */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-4 min-w-max pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const count =
              stage.key === "converted"
                ? pipeline?.converted || 0
                : stage.key === "new"
                  ? pipeline?.new || 0
                  : stage.key === "contacted"
                    ? pipeline?.contacted || 0
                    : stage.key === "qualified"
                      ? pipeline?.qualified || 0
                      : stage.key === "quoted"
                        ? pipeline?.quoted || 0
                        : stage.key === "negotiation"
                          ? pipeline?.negotiation || 0
                          : 0;
            const stageLeads = leadsByStage[stage.key] || [];
            const isSelected = selectedStage === stage.key;

            return (
              <div
                key={stage.key}
                className={`w-[220px] flex-shrink-0 rounded-xl border transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface-secondary"
                }`}
                onClick={() =>
                  setSelectedStage(isSelected ? null : stage.key)
                }
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{stage.icon}</span>
                      <span className="text-sm font-medium text-text-primary">
                        {stage.label}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${stage.color}`}
                    >
                      {loadingPipeline ? "·" : count}
                    </span>
                  </div>
                </div>

                {/* Stage Cards */}
                <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                  {stageLeads.length > 0 ? (
                    stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))
                  ) : count > 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary">
                      {count} lead{count !== 1 ? "s" : ""} in stage
                      <br />
                      <Link
                        to="/prospects"
                        className="text-primary hover:underline"
                      >
                        View in CRM
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-text-secondary">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hot Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>🔥</span> Hot Leads
            </CardTitle>
            <Badge variant="danger">
              {hotLeads.filter((l) => l.heat_score >= 80).length} hot
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLeads ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-hover rounded" />
              ))}
            </div>
          ) : hotLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Stage</th>
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2">City</th>
                  </tr>
                </thead>
                <tbody>
                  {hotLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-text-primary text-sm">
                          {lead.name}
                        </div>
                        {lead.email && (
                          <div className="text-xs text-text-secondary">
                            {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            lead.stage === "negotiation"
                              ? "danger"
                              : lead.stage === "quoted"
                                ? "warning"
                                : "default"
                          }
                        >
                          {lead.stage}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm font-medium">
                        ${lead.estimated_value.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-secondary">
                        {lead.lead_source}
                      </td>
                      <td className="py-3 pr-4">
                        <HeatBadge score={lead.heat_score} />
                      </td>
                      <td className="py-3 text-sm text-text-secondary">
                        {lead.city || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-2">
                No hot leads right now
              </p>
              <p className="text-sm text-text-secondary">
                Leads in the Quoted or Negotiation stage will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
