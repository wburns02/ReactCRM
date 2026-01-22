import { z } from "zod";

/**
 * Septic Permit types for the National Septic OCR system.
 * Matches backend Pydantic schemas in app/schemas/septic_permit.py
 */

// ===== ENUMS =====

export const duplicateStatusSchema = z.enum(["pending", "merged", "rejected", "reviewed"]);
export type DuplicateStatus = z.infer<typeof duplicateStatusSchema>;

export const duplicateDetectionMethodSchema = z.enum(["address_hash", "fuzzy_match", "semantic", "manual"]);
export type DuplicateDetectionMethod = z.infer<typeof duplicateDetectionMethodSchema>;

export const importBatchStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export type ImportBatchStatus = z.infer<typeof importBatchStatusSchema>;

export const changeSourceSchema = z.enum(["scraper", "manual", "merge", "api"]);
export type ChangeSource = z.infer<typeof changeSourceSchema>;

// ===== REFERENCE DATA SCHEMAS =====

export const stateSchema = z.object({
  id: z.number(),
  code: z.string().max(2),
  name: z.string(),
  fips_code: z.string().nullable(),
  region: z.string().nullable(),
});
export type State = z.infer<typeof stateSchema>;

export const countySchema = z.object({
  id: z.number(),
  state_id: z.number(),
  name: z.string(),
  normalized_name: z.string().nullable(),
  fips_code: z.string().nullable(),
  population: z.number().nullable(),
  state_code: z.string().nullable(),
});
export type County = z.infer<typeof countySchema>;

export const systemTypeSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
});
export type SystemType = z.infer<typeof systemTypeSchema>;

export const sourcePortalSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  state_id: z.number().nullable(),
  platform: z.string().nullable(),
  base_url: z.string().nullable(),
  is_active: z.boolean(),
  last_scraped_at: z.string().nullable(),
  total_records_scraped: z.number(),
});
export type SourcePortal = z.infer<typeof sourcePortalSchema>;

// ===== PERMIT SCHEMAS =====

export const permitSummarySchema = z.object({
  id: z.string().uuid(),
  permit_number: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state_code: z.string().nullable(),
  county_name: z.string().nullable(),
  owner_name: z.string().nullable(),
  permit_date: z.string().nullable(),
  system_type: z.string().nullable(),
  has_property: z.boolean().default(false),
});
export type PermitSummary = z.infer<typeof permitSummarySchema>;

export const permitResponseSchema = z.object({
  id: z.string().uuid(),
  permit_number: z.string().nullable(),
  // Location
  state_id: z.number(),
  state_code: z.string().nullable(),
  state_name: z.string().nullable(),
  county_id: z.number().nullable(),
  county_name: z.string().nullable(),
  // Address
  address: z.string().nullable(),
  address_normalized: z.string().nullable(),
  city: z.string().nullable(),
  zip_code: z.string().nullable(),
  // Parcel/Geo
  parcel_number: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  // Owner/Applicant
  owner_name: z.string().nullable(),
  applicant_name: z.string().nullable(),
  contractor_name: z.string().nullable(),
  // Dates
  install_date: z.string().nullable(),
  permit_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  // System specs
  system_type_id: z.number().nullable(),
  system_type_raw: z.string().nullable(),
  system_type_name: z.string().nullable(),
  tank_size_gallons: z.number().nullable(),
  drainfield_size_sqft: z.number().nullable(),
  bedrooms: z.number().nullable(),
  daily_flow_gpd: z.number().nullable(),
  // Documents
  pdf_url: z.string().nullable(),
  permit_url: z.string().nullable(),
  // Source tracking
  source_portal_id: z.number().nullable(),
  source_portal_code: z.string().nullable(),
  source_portal_name: z.string().nullable(),
  scraped_at: z.string().nullable(),
  // Metadata
  is_active: z.boolean(),
  data_quality_score: z.number().nullable(),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PermitResponse = z.infer<typeof permitResponseSchema>;

// ===== SEARCH SCHEMAS =====

export interface PermitSearchFilters {
  query?: string;
  state_codes?: string[];
  county_ids?: number[];
  city?: string;
  zip_code?: string;
  system_type_ids?: number[];
  permit_date_from?: string;
  permit_date_to?: string;
  install_date_from?: string;
  install_date_to?: string;
  latitude?: number;
  longitude?: number;
  radius_miles?: number;
  page?: number;
  page_size?: number;
  sort_by?: "relevance" | "permit_date" | "address" | "owner_name";
  sort_order?: "asc" | "desc";
  include_inactive?: boolean;
}

export const searchHighlightSchema = z.object({
  field: z.string(),
  fragments: z.array(z.string()),
});
export type SearchHighlight = z.infer<typeof searchHighlightSchema>;

export const permitSearchResultSchema = z.object({
  permit: permitSummarySchema,
  score: z.number(),
  keyword_score: z.number().nullable(),
  semantic_score: z.number().nullable(),
  highlights: z.array(searchHighlightSchema),
});
export type PermitSearchResult = z.infer<typeof permitSearchResultSchema>;

export const facetItemSchema = z.object({
  code: z.string().optional(),
  id: z.number().optional(),
  name: z.string(),
  count: z.number(),
});
export type FacetItem = z.infer<typeof facetItemSchema>;

export const permitSearchResponseSchema = z.object({
  results: z.array(permitSearchResultSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
  query: z.string().nullable(),
  execution_time_ms: z.number(),
  state_facets: z.array(facetItemSchema).nullable(),
  county_facets: z.array(facetItemSchema).nullable(),
  system_type_facets: z.array(facetItemSchema).nullable(),
});
export type PermitSearchResponse = z.infer<typeof permitSearchResponseSchema>;

// ===== BATCH INGESTION SCHEMAS =====

export const batchIngestionStatsSchema = z.object({
  batch_id: z.string().uuid(),
  source_portal_code: z.string(),
  total_records: z.number(),
  inserted: z.number(),
  updated: z.number(),
  skipped: z.number(),
  errors: z.number(),
  duplicate_candidates: z.number(),
  processing_time_seconds: z.number(),
  error_details: z.array(z.any()).nullable(),
});
export type BatchIngestionStats = z.infer<typeof batchIngestionStatsSchema>;

export const batchIngestionResponseSchema = z.object({
  status: importBatchStatusSchema,
  stats: batchIngestionStatsSchema,
  message: z.string(),
});
export type BatchIngestionResponse = z.infer<typeof batchIngestionResponseSchema>;

// ===== DUPLICATE SCHEMAS =====

export const duplicatePairSchema = z.object({
  id: z.string().uuid(),
  permit_1: permitSummarySchema,
  permit_2: permitSummarySchema,
  detection_method: duplicateDetectionMethodSchema,
  confidence_score: z.number(),
  matching_fields: z.array(z.string()),
  status: duplicateStatusSchema,
  created_at: z.string(),
});
export type DuplicatePair = z.infer<typeof duplicatePairSchema>;

export interface DuplicateResolution {
  action: "merge" | "reject" | "review";
  canonical_id?: string;
  notes?: string;
}

export const duplicateResponseSchema = z.object({
  id: z.string().uuid(),
  status: duplicateStatusSchema,
  canonical_id: z.string().uuid().nullable(),
  resolved_at: z.string(),
  message: z.string(),
});
export type DuplicateResponse = z.infer<typeof duplicateResponseSchema>;

// ===== STATISTICS SCHEMAS =====

export const permitStatsByStateSchema = z.object({
  state_code: z.string(),
  state_name: z.string(),
  total_permits: z.number(),
  active_permits: z.number(),
  permits_this_year: z.number(),
  avg_data_quality: z.number().nullable(),
});
export type PermitStatsByState = z.infer<typeof permitStatsByStateSchema>;

export const permitStatsByYearSchema = z.object({
  year: z.number(),
  total_permits: z.number(),
  by_state: z.record(z.string(), z.number()).nullable(),
});
export type PermitStatsByYear = z.infer<typeof permitStatsByYearSchema>;

export const permitStatsOverviewSchema = z.object({
  total_permits: z.number(),
  total_states: z.number(),
  total_counties: z.number(),
  total_source_portals: z.number(),
  permits_this_month: z.number(),
  permits_this_year: z.number(),
  avg_data_quality_score: z.number(),
  duplicate_pending_count: z.number(),
  top_states: z.array(permitStatsByStateSchema),
  permits_by_year: z.array(permitStatsByYearSchema),
  last_updated: z.string(),
});
export type PermitStatsOverview = z.infer<typeof permitStatsOverviewSchema>;

// ===== VERSION HISTORY SCHEMAS =====

export const permitVersionSchema = z.object({
  id: z.string().uuid(),
  permit_id: z.string().uuid(),
  version: z.number(),
  changed_fields: z.array(z.string()).nullable(),
  change_source: changeSourceSchema,
  change_reason: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  permit_data: z.record(z.string(), z.any()).nullable(),
});
export type PermitVersion = z.infer<typeof permitVersionSchema>;

export const permitHistorySchema = z.object({
  permit_id: z.string().uuid(),
  current_version: z.number(),
  versions: z.array(permitVersionSchema),
});
export type PermitHistory = z.infer<typeof permitHistorySchema>;
