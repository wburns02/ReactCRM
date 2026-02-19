import { z } from "zod";

// ===== Property =====

export const propertySchema = z.object({
  id: z.number(),
  address_hash: z.string().nullable(),
  address: z.string().nullable(),
  address_normalized: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  county: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  parcel_id: z.string().nullable(),
  owner_name: z.string().nullable(),
  building_area: z.number().nullable(),
  assessed_value: z.number().nullable(),
  land_use: z.string().nullable(),
  has_septic: z.boolean().nullable(),
  permit_count: z.number().nullable(),
  year_built: z.number().nullable(),
  bedrooms: z.number().nullable(),
  lot_size_sqft: z.number().nullable(),
  property_type: z.string().nullable(),
  market_value: z.number().nullable(),
  last_sale_date: z.string().nullable(),
  last_sale_price: z.number().nullable(),
  septic_system_type: z.string().nullable(),
  septic_install_date: z.string().nullable(),
  septic_tank_size_gallons: z.number().nullable(),
  flood_zone: z.string().nullable(),
  data_sources: z.array(z.string()).nullable(),
  data_quality_score: z.number().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Property = z.infer<typeof propertySchema>;

// ===== Paginated Response =====

export const paginatedPropertySchema = z.object({
  items: z.array(propertySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedProperty = z.infer<typeof paginatedPropertySchema>;

// ===== Permit =====

export const permitSchema = z.object({
  id: z.number(),
  property_id: z.number().nullable(),
  permit_number: z.string().nullable(),
  permit_type: z.string().nullable(),
  status: z.string().nullable(),
  application_date: z.string().nullable(),
  issued_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  completed_date: z.string().nullable(),
  system_type: z.string().nullable(),
  tank_size_gallons: z.number().nullable(),
  drainfield_size_sqft: z.number().nullable(),
  daily_flow_gpd: z.number().nullable(),
  bedrooms: z.number().nullable(),
  owner_name: z.string().nullable(),
  applicant_name: z.string().nullable(),
  contractor_name: z.string().nullable(),
  source_dataset: z.string().nullable(),
  pdf_path: z.string().nullable(),
  pdf_extracted: z.boolean().nullable(),
  created_at: z.string().nullable(),
});

export type Permit = z.infer<typeof permitSchema>;

// ===== Environmental Record =====

export const environmentalRecordSchema = z.object({
  id: z.number(),
  property_id: z.number().nullable(),
  record_type: z.string().nullable(),
  facility_name: z.string().nullable(),
  registry_id: z.string().nullable(),
  program: z.string().nullable(),
  violation_type: z.string().nullable(),
  violation_date: z.string().nullable(),
  compliance_status: z.string().nullable(),
  penalty_amount: z.number().nullable(),
  source_dataset: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type EnvironmentalRecord = z.infer<typeof environmentalRecordSchema>;

// ===== Flood Zone =====

export const floodZoneSchema = z.object({
  id: z.number(),
  property_id: z.number().nullable(),
  flood_zone: z.string().nullable(),
  zone_description: z.string().nullable(),
  panel_number: z.string().nullable(),
  effective_date: z.string().nullable(),
  source_dataset: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type FloodZone = z.infer<typeof floodZoneSchema>;

// ===== PDF Extraction =====

export const pdfExtractionSchema = z.object({
  id: z.number(),
  property_permit_id: z.number().nullable(),
  pdf_path: z.string().nullable(),
  pdf_size_bytes: z.number().nullable(),
  pdf_page_count: z.number().nullable(),
  extraction_model: z.string().nullable(),
  permit_number: z.string().nullable(),
  system_type: z.string().nullable(),
  tank_size_gallons: z.number().nullable(),
  drainfield_sqft: z.number().nullable(),
  soil_type: z.string().nullable(),
  confidence_score: z.number().nullable(),
  status: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type PDFExtraction = z.infer<typeof pdfExtractionSchema>;

// ===== Stats Overview =====

export const statsOverviewSchema = z.object({
  total_properties: z.number(),
  septic_properties: z.number(),
  total_permits: z.number(),
  environmental_records: z.number(),
  flood_zone_records: z.number(),
  pdf_extractions: z.number(),
  pdfs_extracted: z.number(),
  states_covered: z.number(),
  top_states: z.array(
    z.object({
      state: z.string(),
      count: z.number(),
    })
  ),
  recent_etl_jobs: z.array(
    z.object({
      id: z.number(),
      job_name: z.string(),
      status: z.string(),
      inserted: z.number(),
      errors: z.number(),
      started_at: z.string().nullable(),
      completed_at: z.string().nullable(),
    })
  ),
  geocoded_properties: z.number(),
  crm_linked_properties: z.number(),
});

export type StatsOverview = z.infer<typeof statsOverviewSchema>;

// ===== Health =====

export const healthSchema = z.object({
  status: z.string(),
  version: z.string(),
  database: z.string(),
  truenas_nfs: z.string(),
  table_counts: z.record(z.number()),
});

export type Health = z.infer<typeof healthSchema>;

// ===== Search Filters =====

export interface PropertySearchFilters {
  query?: string;
  state_code?: string;
  city?: string;
  county?: string;
  zip?: string;
  has_septic?: boolean;
  flood_zone?: string;
  page?: number;
  page_size?: number;
}
