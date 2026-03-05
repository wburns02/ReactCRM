import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  useWorkflow,
  useWorkflowTemplates,
  useCreateWorkflow,
  useUpdateWorkflow,
  useTestWorkflow,
  useToggleWorkflow,
} from "@/api/hooks/useWorkflowAutomations";
import {
  TRIGGER_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  CONDITION_TYPE_LABELS,
  TEMPLATE_VARIABLES,
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_BG,
} from "../constants";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  FlaskConical,
  Play,
  Pause,
  Plus,
  Trash2,
  GripVertical,
  Zap,
  AlertTriangle,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";
import type { WorkflowNode, WorkflowEdge, TestRunResult, WorkflowTemplate } from "@/api/types/workflowAutomations";

let nodeCounter = 100;
function makeNodeId() {
  return `n_${Date.now()}_${++nodeCounter}`;
}

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingWorkflow } = useWorkflow(id);
  const { data: templates } = useWorkflowTemplates();
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const testMutation = useTestWorkflow();
  const toggleMutation = useToggleWorkflow();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("work_order_status_changed");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [status, setStatus] = useState("draft");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(!isEditing);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);

  // Load existing workflow
  useEffect(() => {
    if (existingWorkflow) {
      setName(existingWorkflow.name);
      setDescription(existingWorkflow.description ?? "");
      setTriggerType(existingWorkflow.trigger_type);
      setTriggerConfig((existingWorkflow.trigger_config as Record<string, unknown>) ?? {});
      setNodes(existingWorkflow.nodes);
      setEdges(existingWorkflow.edges);
      setStatus(existingWorkflow.status);
      setShowTemplates(false);
    }
  }, [existingWorkflow]);

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setTriggerType(template.trigger_type);
    setTriggerConfig((template.trigger_config as Record<string, unknown>) ?? {});
    setNodes(template.nodes);
    setEdges(template.edges);
    setShowTemplates(false);
  };

  const handleSave = async () => {
    const formData = {
      name: name || "Untitled Workflow",
      description: description || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      nodes,
      edges,
      status,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, data: formData }, {
        onSuccess: () => navigate(`/automations/${id}`),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: (wf) => navigate(`/automations/${wf.id}`),
      });
    }
  };

  const handleTest = () => {
    if (!id) return;
    testMutation.mutate(id, {
      onSuccess: (result) => setTestResult(result),
    });
  };

  const handleToggle = () => {
    if (!id) return;
    toggleMutation.mutate(id);
  };

  const addNode = (category: string, type: string) => {
    const newNode: WorkflowNode = {
      id: makeNodeId(),
      type,
      category,
      config: {},
      position_x: 300,
      position_y: (nodes.length + 1) * 120,
    };
    setNodes([...nodes, newNode]);

    // Auto-create edge from previous node
    if (nodes.length > 0) {
      const prevNode = nodes[nodes.length - 1];
      setEdges([...edges, { source_id: prevNode.id, target_id: newNode.id }]);
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.source_id !== nodeId && e.target_id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const updateNodeConfig = useCallback((nodeId: string, key: string, value: unknown) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n,
      ),
    );
  }, []);

  const saving = createMutation.isPending || updateMutation.isPending;
  const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.draft;

  // Template selector overlay
  if (showTemplates && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/automations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">New Workflow</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Start from scratch */}
          <Card className="cursor-pointer hover:border-primary/50 transition-colors border-2 border-dashed" onClick={() => setShowTemplates(false)}>
            <CardContent className="pt-6 pb-6 text-center">
              <Plus className="w-8 h-8 mx-auto text-text-muted mb-3" />
              <p className="font-medium text-text-primary">Start from Scratch</p>
              <p className="text-xs text-text-muted mt-1">Build a custom workflow</p>
            </CardContent>
          </Card>

          {/* Templates */}
          {(templates ?? []).map((tpl) => (
            <Card key={tpl.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleLoadTemplate(tpl)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <p className="font-medium text-text-primary text-sm">{tpl.name}</p>
                </div>
                <p className="text-xs text-text-muted mb-3">{tpl.description}</p>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-blue-100 text-blue-700">
                    {TRIGGER_TYPE_LABELS[tpl.trigger_type] ?? tpl.trigger_type}
                  </Badge>
                  <Badge className="text-[10px] bg-gray-100 text-gray-700">
                    {tpl.nodes.length} steps
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(isEditing ? `/automations/${id}` : "/automations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name..."
            className="text-lg font-bold border-none bg-transparent p-0 focus:ring-0 w-64"
          />
          <Badge className={cn("text-xs", statusStyle.bg, statusStyle.text)}>{status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <Button variant="ghost" size="sm" onClick={handleTest} disabled={testMutation.isPending}>
                <FlaskConical className="w-4 h-4 mr-1" /> Test
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToggle}>
                {status === "active" ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {status === "active" ? "Pause" : "Activate"}
              </Button>
            </>
          )}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trigger Section */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Trigger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={triggerType}
                onChange={(e) => { setTriggerType(e.target.value); setTriggerConfig({}); }}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                {Object.entries(TRIGGER_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <TriggerConfigFields triggerType={triggerType} config={triggerConfig} onChange={setTriggerConfig} />
            </CardContent>
          </Card>

          {/* Steps */}
          {nodes.filter((n) => n.category !== "trigger").map((node, idx) => (
            <div key={node.id}>
              {/* Connector line */}
              <div className="flex justify-center py-1">
                <div className="w-px h-6 bg-border" />
              </div>
              <Card
                className={cn(
                  "border-l-4 cursor-pointer transition-all",
                  CATEGORY_COLORS[node.category] ?? "border-l-gray-300",
                  selectedNodeId === node.id && "ring-2 ring-primary/50",
                )}
                onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-text-muted" />
                      <Badge className={cn("text-[10px]", CATEGORY_BG[node.category] ?? "bg-gray-50")}>
                        Step {idx + 1} - {node.category}
                      </Badge>
                      <span className="text-sm font-medium text-text-primary">
                        {getNodeLabel(node)}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-text-muted" />
                    </Button>
                  </div>

                  {/* Inline config when selected */}
                  {selectedNodeId === node.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                      <NodeConfigFields node={node} onUpdate={updateNodeConfig} />
                    </div>
                  )}

                  {/* Condition branching labels */}
                  {node.category === "condition" && (
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Yes</span>
                      <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Add Step */}
          <div className="flex justify-center py-1">
            <div className="w-px h-6 bg-border" />
          </div>
          <AddStepMenu onAdd={addNode} />

          {/* Description */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Description (optional)</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={2}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar (1/3) */}
        <div className="space-y-4">
          {/* Template Variables */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Template Variables</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => navigator.clipboard.writeText(v)}
                    className="text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    title="Click to copy"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-muted mt-2">Click to copy, then paste into message fields</p>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card className={testResult.status === "completed" ? "border-green-200" : "border-red-200"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" /> Test Run Result
                  <Badge className={cn("text-[10px]", testResult.status === "completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                    {testResult.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResult.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{step.action}</span>
                        <span className="text-text-muted ml-1">
                          {typeof step.result === "string" ? step.result : JSON.stringify(step.result)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Workflow Info</CardTitle></CardHeader>
            <CardContent className="text-xs text-text-muted space-y-1">
              <p>Trigger: {TRIGGER_TYPE_LABELS[triggerType] ?? triggerType}</p>
              <p>Steps: {nodes.filter((n) => n.category !== "trigger").length}</p>
              <p>Status: {status}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// -- Sub-components --

function TriggerConfigFields({ triggerType, config, onChange }: {
  triggerType: string;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  if (triggerType === "work_order_status_changed") {
    return (
      <select
        value={(config.status as string) ?? ""}
        onChange={(e) => onChange({ ...config, status: e.target.value })}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
      >
        <option value="">Select status...</option>
        <option value="scheduled">Scheduled</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    );
  }
  if (triggerType === "invoice_overdue") {
    return (
      <Input
        type="number"
        value={(config.days_overdue as number) ?? 7}
        onChange={(e) => onChange({ ...config, days_overdue: parseInt(e.target.value) || 7 })}
        placeholder="Days overdue"
      />
    );
  }
  if (triggerType === "contract_expiring") {
    return (
      <Input
        type="number"
        value={(config.days_before as number) ?? 30}
        onChange={(e) => onChange({ ...config, days_before: parseInt(e.target.value) || 30 })}
        placeholder="Days before expiry"
      />
    );
  }
  if (triggerType === "service_interval_due") {
    return (
      <Input
        type="number"
        value={(config.days_before as number) ?? 7}
        onChange={(e) => onChange({ ...config, days_before: parseInt(e.target.value) || 7 })}
        placeholder="Days before due"
      />
    );
  }
  return null;
}

function NodeConfigFields({ node, onUpdate }: { node: WorkflowNode; onUpdate: (id: string, key: string, value: unknown) => void }) {
  const { id, type, category, config } = node;

  if (category === "condition") {
    if (type === "check_field_value") {
      return (
        <div className="space-y-2">
          <Input placeholder="Field name" value={(config.field as string) ?? ""} onChange={(e) => onUpdate(id, "field", e.target.value)} />
          <select value={(config.operator as string) ?? "equals"} onChange={(e) => onUpdate(id, "operator", e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="greater_than">Greater Than</option>
            <option value="less_than">Less Than</option>
            <option value="is_empty">Is Empty</option>
          </select>
          <Input placeholder="Value" value={(config.value as string) ?? ""} onChange={(e) => onUpdate(id, "value", e.target.value)} />
        </div>
      );
    }
    if (type === "check_service_type") {
      return (
        <select value={(config.service_type as string) ?? ""} onChange={(e) => onUpdate(id, "service_type", e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="">Select type...</option>
          <option value="conventional">Conventional</option>
          <option value="aerobic">Aerobic</option>
          <option value="grease_trap">Grease Trap</option>
          <option value="pumping">Pumping</option>
          <option value="inspection">Inspection</option>
          <option value="repair">Repair</option>
        </select>
      );
    }
    if (type === "check_amount") {
      return (
        <div className="flex gap-2">
          <select value={(config.operator as string) ?? "greater_than"} onChange={(e) => onUpdate(id, "operator", e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="greater_than">Greater Than</option>
            <option value="less_than">Less Than</option>
            <option value="equals">Equals</option>
          </select>
          <Input type="number" placeholder="Amount" value={(config.amount as number) ?? ""} onChange={(e) => onUpdate(id, "amount", parseFloat(e.target.value) || 0)} />
        </div>
      );
    }
    if (type === "check_customer_tag") {
      return <Input placeholder="Tag name" value={(config.tag as string) ?? ""} onChange={(e) => onUpdate(id, "tag", e.target.value)} />;
    }
    return <p className="text-xs text-text-muted">No additional config needed</p>;
  }

  if (category === "action") {
    if (type === "send_sms") {
      return (
        <Textarea
          placeholder="Message template (use {{customer_name}} etc.)"
          value={(config.message as string) ?? ""}
          onChange={(e) => onUpdate(id, "message", e.target.value)}
          rows={3}
        />
      );
    }
    if (type === "send_email") {
      return (
        <div className="space-y-2">
          <Input placeholder="Subject" value={(config.subject as string) ?? ""} onChange={(e) => onUpdate(id, "subject", e.target.value)} />
          <Textarea placeholder="Email body" value={(config.body as string) ?? ""} onChange={(e) => onUpdate(id, "body", e.target.value)} rows={3} />
        </div>
      );
    }
    if (type === "create_work_order") {
      return (
        <div className="space-y-2">
          <select value={(config.service_type as string) ?? ""} onChange={(e) => onUpdate(id, "service_type", e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="">Service type...</option>
            <option value="pumping">Pumping</option>
            <option value="inspection">Inspection</option>
            <option value="maintenance_check">Maintenance Check</option>
            <option value="repair">Repair</option>
          </select>
          <Input placeholder="Description template" value={(config.description as string) ?? ""} onChange={(e) => onUpdate(id, "description", e.target.value)} />
        </div>
      );
    }
    if (type === "generate_invoice") {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={(config.include_tax as boolean) ?? true} onChange={(e) => onUpdate(id, "include_tax", e.target.checked)} />
          Include tax
        </label>
      );
    }
    if (type === "create_task") {
      return (
        <div className="space-y-2">
          <Input placeholder="Task title" value={(config.title as string) ?? ""} onChange={(e) => onUpdate(id, "title", e.target.value)} />
          <Input placeholder="Assign to (role or username)" value={(config.assign_to as string) ?? ""} onChange={(e) => onUpdate(id, "assign_to", e.target.value)} />
          <select value={(config.priority as string) ?? "medium"} onChange={(e) => onUpdate(id, "priority", e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      );
    }
    if (type === "add_note") {
      return <Textarea placeholder="Note text" value={(config.text as string) ?? ""} onChange={(e) => onUpdate(id, "text", e.target.value)} rows={2} />;
    }
    if (type === "webhook") {
      return <Input placeholder="Webhook URL" value={(config.url as string) ?? ""} onChange={(e) => onUpdate(id, "url", e.target.value)} />;
    }
    if (type === "update_field") {
      return (
        <div className="space-y-2">
          <Input placeholder="Entity" value={(config.entity as string) ?? ""} onChange={(e) => onUpdate(id, "entity", e.target.value)} />
          <Input placeholder="Field" value={(config.field as string) ?? ""} onChange={(e) => onUpdate(id, "field", e.target.value)} />
          <Input placeholder="New value" value={(config.value as string) ?? ""} onChange={(e) => onUpdate(id, "value", e.target.value)} />
        </div>
      );
    }
    return null;
  }

  if (category === "delay") {
    return (
      <div className="flex gap-2">
        <Input type="number" placeholder="Amount" value={(config.amount as number) ?? 1} onChange={(e) => onUpdate(id, "amount", parseInt(e.target.value) || 1)} className="w-24" />
        <select value={(config.unit as string) ?? "hours"} onChange={(e) => onUpdate(id, "unit", e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
    );
  }

  return null;
}

function AddStepMenu({ onAdd }: { onAdd: (category: string, type: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<string | null>(null);

  const categories = [
    { key: "condition", label: "Condition", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, types: CONDITION_TYPE_LABELS },
    { key: "action", label: "Action", icon: <Zap className="w-4 h-4 text-emerald-500" />, types: ACTION_TYPE_LABELS },
    { key: "delay", label: "Delay", icon: <Clock className="w-4 h-4 text-purple-500" />, types: { wait_duration: "Wait Duration", wait_until: "Wait Until" } },
  ];

  return (
    <div className="flex justify-center">
      {!open ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-text-muted border border-dashed border-border">
          <Plus className="w-4 h-4 mr-1" /> Add Step
        </Button>
      ) : (
        <Card className="w-80">
          <CardContent className="pt-3 pb-3">
            {!subMenu ? (
              <div className="space-y-1">
                <p className="text-xs text-text-muted mb-2 uppercase">Add Step Type</p>
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSubMenu(cat.key)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-secondary w-full text-left rounded"
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
                <button onClick={() => setOpen(false)} className="text-xs text-text-muted mt-2 hover:underline w-full text-center">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <button onClick={() => setSubMenu(null)} className="text-xs text-text-muted mb-2 hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                {Object.entries(categories.find((c) => c.key === subMenu)?.types ?? {}).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { onAdd(subMenu, key); setOpen(false); setSubMenu(null); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-secondary w-full text-left rounded"
                  >
                    {getNodeIcon(subMenu, key)}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getNodeLabel(node: WorkflowNode): string {
  if (node.category === "action") return ACTION_TYPE_LABELS[node.type] ?? node.type;
  if (node.category === "condition") return CONDITION_TYPE_LABELS[node.type] ?? node.type;
  if (node.category === "delay") {
    const amount = (node.config.amount as number) ?? 1;
    const unit = (node.config.unit as string) ?? "hours";
    return `Wait ${amount} ${unit}`;
  }
  return TRIGGER_TYPE_LABELS[node.type] ?? node.type;
}

function getNodeIcon(category: string, _type: string) {
  if (category === "action") return <Zap className="w-3.5 h-3.5 text-emerald-500" />;
  if (category === "condition") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  if (category === "delay") return <Clock className="w-3.5 h-3.5 text-purple-500" />;
  return <Zap className="w-3.5 h-3.5" />;
}
