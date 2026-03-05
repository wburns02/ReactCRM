import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useWorkflow,
  useWorkflowExecutions,
  useToggleWorkflow,
  useTestWorkflow,
  useDeleteWorkflow,
} from "@/api/hooks/useWorkflowAutomations";
import {
  TRIGGER_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  CONDITION_TYPE_LABELS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_BG,
} from "../constants";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  FlaskConical,
  Play,
  Pause,
  Trash2,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { TestRunResult, ExecutionStep } from "@/api/types/workflowAutomations";

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [execPage] = useState(1);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: executions } = useWorkflowExecutions(id, execPage);
  const toggleMutation = useToggleWorkflow();
  const testMutation = useTestWorkflow();
  const deleteMutation = useDeleteWorkflow();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-background-secondary animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Workflow not found</p>
        <Button variant="ghost" onClick={() => navigate("/automations")} className="mt-4">Back to Automations</Button>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[workflow.status] ?? STATUS_COLORS.draft;
  const stepsCount = workflow.nodes.filter((n) => n.category !== "trigger").length;

  const handleTest = () => {
    if (!id) return;
    testMutation.mutate(id, {
      onSuccess: (result) => setTestResult(result),
    });
  };

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => navigate("/automations"),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/automations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{workflow.name}</h1>
            {workflow.description && <p className="text-sm text-text-muted">{workflow.description}</p>}
          </div>
          <Badge className={cn("text-xs", statusStyle.bg, statusStyle.text)}>{workflow.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleTest} disabled={testMutation.isPending}>
            <FlaskConical className="w-4 h-4 mr-1" /> Test Run
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(id!)}>
            {workflow.status === "active" ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {workflow.status === "active" ? "Pause" : "Activate"}
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/automations/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          {!deleteConfirm ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 text-text-muted" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-error">Delete?</span>
              <Button size="sm" variant="danger" onClick={handleDelete}>Yes</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}>No</Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-background-secondary rounded-lg p-1 w-fit">
        <Button variant={tab === "overview" ? "primary" : "ghost"} size="sm" onClick={() => setTab("overview")}>Overview</Button>
        <Button variant={tab === "history" ? "primary" : "ghost"} size="sm" onClick={() => setTab("history")}>
          Execution History
        </Button>
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-text-muted uppercase">Total Runs</p>
              <p className="text-xl font-bold text-text-primary">{workflow.run_count}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-text-muted uppercase">Steps</p>
              <p className="text-xl font-bold text-text-primary">{stepsCount}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-text-muted uppercase">Trigger</p>
              <p className="text-sm font-medium text-text-primary">{TRIGGER_TYPE_LABELS[workflow.trigger_type] ?? workflow.trigger_type}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-text-muted uppercase">Last Run</p>
              <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {workflow.last_run_at ? new Date(workflow.last_run_at).toLocaleDateString() : "Never"}
              </p>
            </CardContent></Card>
          </div>

          {/* Trigger Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Trigger: {TRIGGER_TYPE_LABELS[workflow.trigger_type] ?? workflow.trigger_type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(workflow.trigger_config).length > 0 ? (
                <pre className="text-xs text-text-secondary bg-background-secondary p-2 rounded">{JSON.stringify(workflow.trigger_config, null, 2)}</pre>
              ) : (
                <p className="text-xs text-text-muted">No additional configuration</p>
              )}
            </CardContent>
          </Card>

          {/* Steps (read-only) */}
          {workflow.nodes.filter((n) => n.category !== "trigger").map((node, idx) => (
            <div key={node.id}>
              <div className="flex justify-center py-1"><div className="w-px h-4 bg-border" /></div>
              <Card className={cn("border-l-4", CATEGORY_COLORS[node.category] ?? "border-l-gray-300")}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-[10px]", CATEGORY_BG[node.category] ?? "bg-gray-50")}>
                      Step {idx + 1}
                    </Badge>
                    <span className="text-sm font-medium text-text-primary">
                      {node.category === "action" ? ACTION_TYPE_LABELS[node.type] :
                        node.category === "condition" ? CONDITION_TYPE_LABELS[node.type] :
                        node.category === "delay" ? `Wait ${(node.config.amount as number) ?? 1} ${(node.config.unit as string) ?? "hours"}` :
                        node.type}
                    </span>
                  </div>
                  {Object.keys(node.config).length > 0 && (
                    <pre className="text-[11px] text-text-muted mt-2 bg-background-secondary p-2 rounded overflow-x-auto">
                      {JSON.stringify(node.config, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Test Result */}
          {testResult && (
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" /> Test Run — {testResult.status}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExecutionTimeline steps={testResult.steps} />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Execution History Tab */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Execution History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!executions?.items || executions.items.length === 0) && !workflow.recent_executions?.length ? (
              <p className="text-sm text-text-muted text-center py-8">No executions yet. Use "Test Run" to simulate a workflow execution.</p>
            ) : (
              <div className="space-y-3">
                {(executions?.items ?? workflow.recent_executions ?? []).map((exec) => (
                  <ExecutionCard key={exec.id} execution={exec} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExecutionCard({ execution }: { execution: { id: string; status: string; started_at?: string | null; completed_at?: string | null; steps_executed: ExecutionStep[] } }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    running: "bg-blue-100 text-blue-800",
    skipped: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Badge className={cn("text-[10px]", statusColors[execution.status] ?? statusColors.skipped)}>
            {execution.status}
          </Badge>
          <span className="text-xs text-text-muted">{execution.id.slice(0, 8)}...</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{execution.started_at ? new Date(execution.started_at).toLocaleString() : "—"}</span>
          <span>{execution.steps_executed.length} steps</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <ExecutionTimeline steps={execution.steps_executed} />
        </div>
      )}
    </div>
  );
}

function ExecutionTimeline({ steps }: { steps: ExecutionStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isError = typeof step.result === "object" && step.result !== null && "error" in (step.result as Record<string, unknown>);
        return (
          <div key={i} className="flex items-start gap-2 text-xs">
            <div className="mt-0.5 shrink-0">
              {isError ? (
                <XCircle className="w-3.5 h-3.5 text-red-500" />
              ) : step.result === "skipped" || step.result === "no" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              )}
            </div>
            <div className="flex-1">
              <span className="font-medium">{step.action}</span>
              <span className="text-text-muted ml-2">
                {typeof step.result === "string" ? step.result : JSON.stringify(step.result)}
              </span>
            </div>
            <span className="text-text-muted text-[10px] shrink-0">
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
