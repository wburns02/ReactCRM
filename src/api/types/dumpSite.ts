/**
 * Dump Site types for waste disposal location management
 */

export interface DumpSite {
  id: string;
  name: string;
  address_line1?: string;
  address_city?: string;
  address_state: string;
  address_postal_code?: string;
  latitude?: number;
  longitude?: number;
  fee_per_gallon: number;
  is_active: boolean;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  hours_of_operation?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDumpSiteInput {
  name: string;
  address_state: string;
  fee_per_gallon: number;
  address_line1?: string;
  address_city?: string;
  address_postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  hours_of_operation?: string;
}

export interface UpdateDumpSiteInput {
  name?: string;
  address_state?: string;
  fee_per_gallon?: number;
  address_line1?: string;
  address_city?: string;
  address_postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  hours_of_operation?: string;
}

export interface DumpSiteListResponse {
  sites: DumpSite[];
  total: number;
}

export interface DumpSiteFilters {
  state?: string;
  is_active?: boolean;
}
