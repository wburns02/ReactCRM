import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * QuickBooks Integration Types
 */
export interface QBConnectionStatus {
  connected: boolean;
  company_name?: string;
  realm_id?: string;
  last_sync?: string;
  sync_errors?: string[];
  access_token_expires?: string;
}

export interface QBSyncSettings {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_customers: boolean;
  sync_invoices: boolean;
  sync_payments: boolean;
  sync_items: boolean;
  default_income_account_id?: string;
  default_expense_account_id?: string;
  tax_code_id?: string;
}

export interface QBCustomerMapping {
  crm_customer_id: number;
  qb_customer_id: string;
  crm_customer_name: string;
  qb_customer_name: string;
  sync_status: 'synced' | 'pending' | 'error';
  last_sync?: string;
  error_message?: string;
}

export interface QBInvoiceMapping {
  crm_invoice_id: string;
  qb_invoice_id: string;
  invoice_number: string;
  amount: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_sync?: string;
}

export interface QBAccount {
  id: string;
  name: string;
  account_type: string;
  classification: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface QBSyncResult {
  success: boolean;
  synced: {
    customers: number;
    invoices: number;
    payments: number;
  };
  errors: {
    customers: string[];
    invoices: string[];
    payments: string[];
  };
  started_at: string;
  completed_at: string;
}

export interface QBSyncLog {
  id: string;
  sync_type: 'full' | 'incremental' | 'manual';
  status: 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  records_synced: number;
  errors: string[];
}

/**
 * Query keys for QuickBooks
 */
export const qbKeys = {
  all: ['quickbooks'] as const,
  status: () => [...qbKeys.all, 'status'] as const,
  settings: () => [...qbKeys.all, 'settings'] as const,
  accounts: () => [...qbKeys.all, 'accounts'] as const,
  customerMappings: () => [...qbKeys.all, 'customer-mappings'] as const,
  invoiceMappings: () => [...qbKeys.all, 'invoice-mappings'] as const,
  syncLogs: () => [...qbKeys.all, 'sync-logs'] as const,
};

/**
 * Get QuickBooks connection status
 */
export function useQBConnectionStatus() {
  return useQuery({
    queryKey: qbKeys.status(),
    queryFn: async (): Promise<QBConnectionStatus> => {
      const { data } = await apiClient.get('/integrations/quickbooks/status');
      return data;
    },
    refetchInterval: 60000, // Check every minute
  });
}

/**
 * Get QuickBooks sync settings
 */
export function useQBSyncSettings() {
  return useQuery({
    queryKey: qbKeys.settings(),
    queryFn: async (): Promise<QBSyncSettings> => {
      const { data } = await apiClient.get('/integrations/quickbooks/settings');
      return data;
    },
  });
}

/**
 * Update QuickBooks sync settings
 */
export function useUpdateQBSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<QBSyncSettings>): Promise<QBSyncSettings> => {
      const { data } = await apiClient.put('/integrations/quickbooks/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.settings() });
    },
  });
}

/**
 * Initialize QuickBooks OAuth connection
 */
export function useQBConnect() {
  return useMutation({
    mutationFn: async (): Promise<{ auth_url: string }> => {
      const { data } = await apiClient.post('/integrations/quickbooks/connect');
      return data;
    },
  });
}

/**
 * Disconnect from QuickBooks
 */
export function useQBDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/integrations/quickbooks/disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.all });
    },
  });
}

/**
 * Get QuickBooks accounts for mapping
 */
export function useQBAccounts() {
  return useQuery({
    queryKey: qbKeys.accounts(),
    queryFn: async (): Promise<QBAccount[]> => {
      const { data } = await apiClient.get('/integrations/quickbooks/accounts');
      return data.accounts || [];
    },
  });
}

/**
 * Get customer mappings
 */
export function useQBCustomerMappings() {
  return useQuery({
    queryKey: qbKeys.customerMappings(),
    queryFn: async (): Promise<QBCustomerMapping[]> => {
      const { data } = await apiClient.get('/integrations/quickbooks/customer-mappings');
      return data.mappings || [];
    },
  });
}

/**
 * Get invoice mappings
 */
export function useQBInvoiceMappings() {
  return useQuery({
    queryKey: qbKeys.invoiceMappings(),
    queryFn: async (): Promise<QBInvoiceMapping[]> => {
      const { data } = await apiClient.get('/integrations/quickbooks/invoice-mappings');
      return data.mappings || [];
    },
  });
}

/**
 * Trigger full sync
 */
export function useQBFullSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<QBSyncResult> => {
      const { data } = await apiClient.post('/integrations/quickbooks/sync/full');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.all });
    },
  });
}

/**
 * Trigger incremental sync
 */
export function useQBIncrementalSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<QBSyncResult> => {
      const { data } = await apiClient.post('/integrations/quickbooks/sync/incremental');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.all });
    },
  });
}

/**
 * Sync specific customer to QuickBooks
 */
export function useQBSyncCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: number): Promise<QBCustomerMapping> => {
      const { data } = await apiClient.post(`/integrations/quickbooks/sync/customer/${customerId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.customerMappings() });
    },
  });
}

/**
 * Sync specific invoice to QuickBooks
 */
export function useQBSyncInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<QBInvoiceMapping> => {
      const { data } = await apiClient.post(`/integrations/quickbooks/sync/invoice/${invoiceId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.invoiceMappings() });
    },
  });
}

/**
 * Get sync logs
 */
export function useQBSyncLogs(limit?: number) {
  return useQuery({
    queryKey: qbKeys.syncLogs(),
    queryFn: async (): Promise<QBSyncLog[]> => {
      const params = limit ? `?limit=${limit}` : '';
      const { data } = await apiClient.get(`/integrations/quickbooks/sync-logs${params}`);
      return data.logs || [];
    },
  });
}

/**
 * Map CRM customer to existing QB customer
 */
export function useMapCustomerToQB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      crm_customer_id: number;
      qb_customer_id: string;
    }): Promise<QBCustomerMapping> => {
      const { data } = await apiClient.post('/integrations/quickbooks/map-customer', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.customerMappings() });
    },
  });
}

/**
 * Search QuickBooks customers for mapping
 */
export function useSearchQBCustomers() {
  return useMutation({
    mutationFn: async (query: string): Promise<{ id: string; name: string }[]> => {
      const { data } = await apiClient.get(`/integrations/quickbooks/search-customers?q=${encodeURIComponent(query)}`);
      return data.customers || [];
    },
  });
}
