import { z } from "zod";

export const reportColumnSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
  aggregation: z.string().optional(),
  format: z.string().optional(),
});

export const reportFilterSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

export const customReportSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  report_type: z.string(),
  data_source: z.string(),
  columns: z.array(reportColumnSchema).default([]),
  filters: z.array(reportFilterSchema).default([]),
  group_by: z.array(z.string()).default([]),
  sort_by: z.object({ field: z.string(), direction: z.string() }).nullable().optional(),
  date_range: z.record(z.unknown()).nullable().optional(),
  chart_config: z.record(z.unknown()).nullable().optional(),
  layout: z.record(z.unknown()).nullable().optional(),
  is_favorite: z.boolean().default(false),
  is_shared: z.boolean().default(false),
  schedule: z.record(z.unknown()).nullable().optional(),
  last_generated_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const reportListResponseSchema = z.object({
  items: z.array(customReportSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const snapshotSchema = z.object({
  id: z.string(),
  data: z.array(z.record(z.unknown())).default([]),
  row_count: z.number(),
  generated_at: z.string().nullable().optional(),
});

export const snapshotHistoryItemSchema = z.object({
  id: z.string(),
  row_count: z.number(),
  generated_at: z.string().nullable().optional(),
});

export const reportDetailSchema = customReportSchema.extend({
  latest_snapshot: snapshotSchema.nullable().optional(),
  snapshot_history: z.array(snapshotHistoryItemSchema).default([]),
});

export const dataSourceFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  label: z.string(),
  options: z.array(z.string()).optional(),
});

export const dataSourceMetaSchema = z.object({
  label: z.string(),
  fields: z.array(dataSourceFieldSchema),
  aggregations: z.array(z.string()),
  default_date_field: z.string(),
});

export const dataSourcesResponseSchema = z.record(dataSourceMetaSchema);

export const previewResponseSchema = z.object({
  rows: z.array(z.record(z.unknown())).default([]),
  summary: z.record(z.unknown()).default({}),
  row_count: z.number(),
  error: z.string().optional(),
});

export type ReportColumn = z.infer<typeof reportColumnSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
export type CustomReport = z.infer<typeof customReportSchema>;
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;
export type DataSourceField = z.infer<typeof dataSourceFieldSchema>;
export type DataSourceMeta = z.infer<typeof dataSourceMetaSchema>;
export type PreviewResponse = z.infer<typeof previewResponseSchema>;

export interface ReportFormData {
  name: string;
  description?: string;
  report_type: string;
  data_source: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  group_by: string[];
  sort_by?: { field: string; direction: string } | null;
  date_range?: Record<string, unknown> | null;
  chart_config?: Record<string, unknown> | null;
  is_shared?: boolean;
}
