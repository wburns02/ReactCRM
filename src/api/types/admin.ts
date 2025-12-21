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
