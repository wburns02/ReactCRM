import { z } from "zod";

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string(),
  config: z.record(z.unknown()).default({}),
  position_x: z.number().default(300),
  position_y: z.number().default(0),
});

export const workflowEdgeSchema = z.object({
  source_id: z.string(),
  target_id: z.string(),
  condition_branch: z.string().nullable().optional(),
});

export const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  trigger_type: z.string(),
  trigger_config: z.record(z.unknown()).default({}),
  nodes: z.array(workflowNodeSchema).default([]),
  edges: z.array(workflowEdgeSchema).default([]),
  status: z.string().default("draft"),
  run_count: z.number().default(0),
  last_run_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const workflowListResponseSchema = z.object({
  items: z.array(workflowSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const executionStepSchema = z.object({
  node_id: z.string(),
  type: z.string(),
  action: z.string(),
  result: z.unknown(),
  timestamp: z.string(),
});

export const workflowExecutionSchema = z.object({
  id: z.string(),
  workflow_id: z.string(),
  trigger_event: z.unknown().nullable(),
  steps_executed: z.array(executionStepSchema).default([]),
  status: z.string(),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const executionListResponseSchema = z.object({
  items: z.array(workflowExecutionSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const workflowDetailSchema = workflowSchema.extend({
  recent_executions: z.array(workflowExecutionSchema).default([]),
});

export const workflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  trigger_type: z.string(),
  trigger_config: z.record(z.unknown()).default({}),
  nodes: z.array(workflowNodeSchema).default([]),
  edges: z.array(workflowEdgeSchema).default([]),
});

export const templatesResponseSchema = z.object({
  templates: z.array(workflowTemplateSchema),
});

export const testRunResultSchema = z.object({
  status: z.string(),
  steps: z.array(executionStepSchema).default([]),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error: z.string().optional(),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type WorkflowDetail = z.infer<typeof workflowDetailSchema>;
export type WorkflowListResponse = z.infer<typeof workflowListResponseSchema>;
export type WorkflowExecution = z.infer<typeof workflowExecutionSchema>;
export type ExecutionStep = z.infer<typeof executionStepSchema>;
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;
export type TestRunResult = z.infer<typeof testRunResultSchema>;

export interface WorkflowFormData {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  status?: string;
}
