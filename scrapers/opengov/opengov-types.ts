/**
 * OpenGov Permit Portal Scraper - Type Definitions
 */

// ============================================
// DISCOVERED API TYPES
// ============================================

export interface DiscoveredEndpoint {
  url: string;
  method: string;
  status: number;
  contentType: string | null;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  timestamp: string;
  portal: string;
}

export interface DiscoveredEndpointSummary {
  pattern: string;
  methods: string[];
  sampleUrl: string;
  occurrences: number;
  description?: string;
}

export interface APIDiscoveryResult {
  portal: string;
  portalUrl: string;
  discoveredAt: string;
  endpoints: DiscoveredEndpoint[];
  summary: DiscoveredEndpointSummary[];
}

// ============================================
// JURISDICTION TYPES
// ============================================

export interface OpenGovJurisdiction {
  id: string;
  name: string;
  state: string;
  county?: string;
  portalUrl: string;
  enabled: boolean;
  categoryIds?: number[];
  recordTypeIds?: number[];
  estimatedRecords?: number;
  lastScraped?: string;
}

export interface JurisdictionConfig {
  jurisdictions: OpenGovJurisdiction[];
  lastUpdated: string;
  totalJurisdictions: number;
}

// ============================================
// PERMIT RECORD TYPES
// ============================================

export interface PermitRecord {
  // Required fields
  permit_number: string;
  address: string;
  city: string;
  state: string;
  county?: string;

  // Permit details
  permit_type?: string;
  status?: string;
  issue_date?: string;
  expiration_date?: string;

  // People
  applicant?: string;
  owner_name?: string;
  contractor_name?: string;
  contractor_license?: string;

  // Location
  lat?: number;
  lng?: number;
  parcel_number?: string;

  // Financial
  valuation?: number;
  fees?: number;

  // Description
  description?: string;
  work_type?: string;

  // Metadata
  source: 'OpenGov';
  jurisdiction: string;
  scraped_at: string;
  raw_data?: unknown;
}

// ============================================
// EXTRACTION TYPES
// ============================================

export interface Checkpoint {
  jurisdictionId: string;
  lastCategoryId?: number;
  lastRecordTypeId?: number;
  lastOffset: number;
  completedJurisdictions: string[];
  totalRecordsExtracted: number;
  timestamp: string;
}

export interface ExtractionStats {
  jurisdictionId: string;
  jurisdictionName: string;
  recordsExtracted: number;
  startTime: string;
  endTime?: string;
  errors: string[];
}

// ============================================
// CONFIG TYPES
// ============================================

export interface ProxyConfig {
  host: string;
  ports: number[];
  username: string;
  password: string;
  enabled: boolean;
}

export interface ExtractionConfig {
  batchSize: number;
  delayBetweenRequests: number;
  delayBetweenJurisdictions: number;
  checkpointInterval: number;
  maxRetries: number;
}

export interface ScraperConfig {
  proxy: ProxyConfig;
  extraction: ExtractionConfig;
  output: {
    dir: string;
    checkpointFile: string;
  };
}
