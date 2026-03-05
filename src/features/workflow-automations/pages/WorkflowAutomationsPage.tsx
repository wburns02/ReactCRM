import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useWorkflows,
  useToggleWorkflow,
  useDeleteWorkflow,
  useTestWorkflow,
} from "@/api/hooks/useWorkflowAutomations";
import { TRIGGER_TYPE_LABELS, STATUS_COLORS } from "../constants";
import { cn } from "@/lib/utils";
import {
  Plus,
  Zap,
  Play,
  Pause,
  Trash2,
  Edit,
  FlaskConical,
  MoreVertical,
  Activity,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { Workflow } from "@/api/types/workflowAutomations";

const STATUS_TABS = [
  { key: undefined as string | undefined, label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Draft" },
];

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function WorkflowAutomationsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useWorkflows(page, statusFilter);
  const toggleMutation = useToggleWorkflow();
  const deleteMutation = useDeleteWorkflow();
  const testMutation = useTestWorkflow();

  const workflows = data?.items ?? [];
  const totalActive = workflows.filter((w) => w.status === "active").length;
  const totalPaused = workflows.filter((w) => w.status === "paused").length;
  const totalRuns = workflows.reduce((sum, w) => sum + w.run_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workflow Automations</h1>
          <p className="text-text-secondary">Automate repetitive business processes with trigger-action workflows</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/automations/new")} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase">Total</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{data?.total ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-text-muted uppercase">Active</span>
          </div>
          <p className="text-xl font-bold text-green-600">{totalActive}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Pause className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-text-muted uppercase">Paused</span>
          </div>
          <p className="text-xl font-bold text-yellow-600">{totalPaused}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase">Total Runs</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{totalRuns}</p>
        </CardContent></Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-background-secondary rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={statusFilter === tab.key ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-background-secondary animate-pulse rounded-lg" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No workflows yet"
          description="Create your first automation to streamline your business processes"
          action={{ label: "Create Workflow", onClick: () => navigate("/automations/new") }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase">
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Trigger</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Runs</th>
                  <th className="py-3 px-4 text-left">Last Run</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <WorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    actionMenuOpen={actionMenuOpen === workflow.id}
                    deleteConfirm={deleteConfirm === workflow.id}
                    onRowClick={() => navigate(`/automations/${workflow.id}`)}
                    onToggleMenu={() => setActionMenuOpen(actionMenuOpen === workflow.id ? null : workflow.id)}
                    onCloseMenu={() => setActionMenuOpen(null)}
                    onEdit={() => { setActionMenuOpen(null); navigate(`/automations/${workflow.id}/edit`); }}
                    onTest={() => { setActionMenuOpen(null); testMutation.mutate(workflow.id); }}
                    onToggle={() => { setActionMenuOpen(null); toggleMutation.mutate(workflow.id); }}
                    onDeleteClick={() => { setActionMenuOpen(null); setDeleteConfirm(workflow.id); }}
                    onDeleteConfirm={() => { deleteMutation.mutate(workflow.id); setDeleteConfirm(null); }}
                    onDeleteCancel={() => setDeleteConfirm(null)}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WorkflowRow({
  workflow,
  actionMenuOpen,
  deleteConfirm,
  onRowClick,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onTest,
  onToggle,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  workflow: Workflow;
  actionMenuOpen: boolean;
  deleteConfirm: boolean;
  onRowClick: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onTest: () => void;
  onToggle: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const statusStyle = STATUS_COLORS[workflow.status] ?? STATUS_COLORS.draft;

  return (
    <tr className="border-b border-border/50 hover:bg-background-secondary/50 cursor-pointer" onClick={onRowClick}>
      <td className="py-3 px-4">
        <p className="font-medium text-text-primary">{workflow.name}</p>
        {workflow.description && (
          <p className="text-xs text-text-muted truncate max-w-xs">{workflow.description}</p>
        )}
      </td>
      <td className="py-3 px-4">
        <span className="text-text-secondary text-xs">{TRIGGER_TYPE_LABELS[workflow.trigger_type] ?? workflow.trigger_type}</span>
      </td>
      <td className="py-3 px-4">
        <Badge className={cn("text-xs", statusStyle.bg, statusStyle.text)}>
          {workflow.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-right text-text-secondary">{workflow.run_count}</td>
      <td className="py-3 px-4">
        <span className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(workflow.last_run_at)}
        </span>
      </td>
      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        {deleteConfirm ? (
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xs text-error mr-1">Delete?</span>
            <Button size="sm" variant="danger" onClick={onDeleteConfirm}>Yes</Button>
            <Button size="sm" variant="ghost" onClick={onDeleteCancel}>No</Button>
          </div>
        ) : (
          <div className="relative">
            <Button size="sm" variant="ghost" onClick={onToggleMenu}>
              <MoreVertical className="w-4 h-4" />
            </Button>
            {actionMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                <div className="absolute right-0 top-8 z-20 bg-white border border-border rounded-lg shadow-lg py-1 w-40">
                  <button onClick={onEdit} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-secondary w-full text-left">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={onTest} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-secondary w-full text-left">
                    <FlaskConical className="w-3.5 h-3.5" /> Test Run
                  </button>
                  <button onClick={onToggle} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-secondary w-full text-left">
                    {workflow.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {workflow.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button onClick={onDeleteClick} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 w-full text-left text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
