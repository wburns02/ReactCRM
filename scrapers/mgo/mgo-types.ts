/**
 * MGO Connect Scraper Type Definitions
 */

export interface MGOCountyConfig {
  state: string;
  stateCode: string;
  jurisdiction: string;
  projectTypes: string[];
  searchDateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface MGOApiEndpoint {
  url: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  timestamp: string;
}

export interface MGONetworkLog {
  sessionId: string;
  startTime: string;
  endpoints: MGOApiEndpoint[];
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
  }>;
}

export interface MGOPermitRecord {
  permit_number: string;
  project_number?: string;
  address: string;
  city?: string;
  county: string;
  state: string;
  owner_name?: string;
  applicant_name?: string;
  contractor_name?: string;
  install_date?: string;
  permit_date?: string;
  expiration_date?: string;
  system_type?: string;
  project_type?: string;
  status?: string;
  source: string;
  scraped_at: string;
  raw_data?: Record<string, unknown>;
}

export interface MGOSearchResult {
  county: string;
  state: string;
  project_type: string;
  total_records: number;
  records: MGOPermitRecord[];
  extracted_at: string;
  api_calls: string[];
}

export interface MGODiscoveryResult {
  session_start: string;
  session_end: string;
  login_successful: boolean;
  discovered_endpoints: {
    states?: MGOApiEndpoint;
    jurisdictions?: MGOApiEndpoint;
    project_types?: MGOApiEndpoint;
    search?: MGOApiEndpoint;
    results?: MGOApiEndpoint;
    pagination?: MGOApiEndpoint;
  };
  all_api_calls: MGOApiEndpoint[];
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
  }>;
}
