/**
 * Admin-related types for settings and user management
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'technician' | 'office';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface CreateUserInput {
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'technician' | 'office';
  password: string;
}

export interface UpdateUserInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'manager' | 'technician' | 'office';
  is_active?: boolean;
  password?: string;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  company_logo_url?: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_from_address: string;
  email_from_name: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_use_tls: boolean;
  sms_provider?: 'twilio' | 'none';
  sms_from_number?: string;
  updated_at: string;
}

export interface IntegrationSettings {
  id: string;
  quickbooks_enabled: boolean;
  quickbooks_client_id?: string;
  quickbooks_connected: boolean;
  quickbooks_last_sync?: string;
  stripe_enabled: boolean;
  stripe_publishable_key?: string;
  stripe_connected: boolean;
  mailchimp_enabled: boolean;
  mailchimp_api_key?: string;
  mailchimp_connected: boolean;
  updated_at: string;
}

export interface SecuritySettings {
  id: string;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
  session_timeout_minutes: number;
  two_factor_enabled: boolean;
  updated_at: string;
}

/**
 * OAuth Client for API access
 */
export interface OAuthClient {
  id: string;
  name: string;
  client_id: string;
  client_secret?: string; // Only returned on creation
  description?: string;
  scopes: string[];
  redirect_uris: string[];
  is_active: boolean;
  rate_limit: number; // requests per minute
  created_at: string;
  last_used_at?: string;
}

export interface CreateOAuthClientInput {
  name: string;
  description?: string;
  scopes: string[];
  redirect_uris?: string[];
  rate_limit?: number;
}

export interface UpdateOAuthClientInput {
  name?: string;
  description?: string;
  scopes?: string[];
  redirect_uris?: string[];
  is_active?: boolean;
  rate_limit?: number;
}

/**
 * API Access Token (for personal access tokens)
 */
export interface ApiAccessToken {
  id: string;
  name: string;
  token_prefix: string; // First 8 chars of token for identification
  scopes: string[];
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export interface CreateApiTokenInput {
  name: string;
  scopes: string[];
  expires_in_days?: number; // null = never expires
}

export interface CreateApiTokenResponse {
  token: ApiAccessToken;
  access_token: string; // Full token, only shown once
}

/**
 * Available OAuth scopes
 */
export const OAUTH_SCOPES = [
  { id: 'customers:read', label: 'Read Customers', description: 'View customer information' },
  { id: 'customers:write', label: 'Write Customers', description: 'Create and update customers' },
  { id: 'work_orders:read', label: 'Read Work Orders', description: 'View work order information' },
  { id: 'work_orders:write', label: 'Write Work Orders', description: 'Create and update work orders' },
  { id: 'invoices:read', label: 'Read Invoices', description: 'View invoice information' },
  { id: 'invoices:write', label: 'Write Invoices', description: 'Create and update invoices' },
  { id: 'technicians:read', label: 'Read Technicians', description: 'View technician information' },
  { id: 'schedule:read', label: 'Read Schedule', description: 'View schedule information' },
  { id: 'schedule:write', label: 'Write Schedule', description: 'Modify schedule' },
  { id: 'analytics:read', label: 'Read Analytics', description: 'View analytics and reports' },
  { id: 'webhooks:manage', label: 'Manage Webhooks', description: 'Create and manage webhooks' },
] as const;
