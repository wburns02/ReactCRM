import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// ========================
// Types
// ========================

export interface Contract {
  id: string;
  contract_number: string;
  name: string;
  contract_type: string;
  customer_id: string;
  customer_name: string | null;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  total_value: number | null;
  billing_frequency: string;
  status: string;
  is_active: boolean;
  days_until_expiry: number | null;
  customer_signed: boolean;
  company_signed: boolean;
  document_url: string | null;
  created_at: string | null;
  // Commercial & Tier
  tier: string | null;
  system_size: string | null;
  daily_flow_gallons: number | null;
  // Neighborhood bundle
  bundle_id: string | null;
  neighborhood_group_name: string | null;
  discount_percent: number | null;
  // Add-ons & Upsells
  add_ons: { name: string; price: number }[] | null;
  referral_code: string | null;
  referral_credit: number | null;
  annual_increase_percent: number | null;
}

export interface ContractTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  contract_type: string;
  default_duration_months: number;
  default_billing_frequency: string;
  default_auto_renew?: boolean;
  default_payment_terms?: string | null;
  default_services?: { service_code: string; description: string; frequency: string; quantity: number }[];
  variables?: string[];
  base_price: number | null;
  is_active: boolean;
  version: number;
  has_content?: boolean;
  terms_and_conditions?: string | null;
  created_at: string | null;
}

export interface ContractDocument {
  template_id?: string;
  contract_id?: string;
  template_name?: string;
  template_code?: string;
  contract_number?: string;
  customer_name?: string;
  document: string | null;
  terms_and_conditions: string | null;
  variables?: string[];
  message?: string;
}

export interface ContractFilters {
  page?: number;
  page_size?: number;
  customer_id?: string;
  status?: string;
  contract_type?: string;
  tier?: string;
  bundle_id?: string;
  expiring_within_days?: number;
}

export interface ContractCreate {
  name: string;
  contract_type: string;
  customer_id: string;
  customer_name?: string;
  template_id?: string;
  start_date: string;
  end_date: string;
  auto_renew?: boolean;
  total_value?: number;
  billing_frequency?: string;
  payment_terms?: string;
  services_included?: {
    service_code: string;
    description?: string;
    frequency: string;
    quantity: number;
  }[];
  covered_properties?: string[];
  coverage_details?: string;
  requires_signature?: boolean;
  terms_and_conditions?: string;
  special_terms?: string;
  notes?: string;
}

export interface ContractUpdate {
  name?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  total_value?: number;
  billing_frequency?: string;
  payment_terms?: string;
  services_included?: {
    service_code: string;
    frequency: string;
    quantity: number;
  }[];
  covered_properties?: string[];
  coverage_details?: string;
  status?: string;
  notes?: string;
  internal_notes?: string;
}

export interface GenerateContractRequest {
  template_id: string;
  customer_id: string;
  customer_name?: string;
  start_date: string;
  total_value?: number;
  services_included?: {
    service_code: string;
    frequency: string;
    quantity: number;
  }[];
  covered_properties?: string[];
  special_terms?: string;
  // Commercial & extras
  tier?: string;
  system_size?: string;
  daily_flow_gallons?: number;
  add_ons?: { name: string; price: number }[];
  bundle_id?: string;
  neighborhood_group_name?: string;
  discount_percent?: number;
  referral_code?: string;
  referral_credit?: number;
}

export interface NeighborhoodBundle {
  id: string;
  name: string;
  discount_percent: number;
  min_contracts: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  contract_count: number;
  total_value: number;
  contracts?: Contract[];
}

export interface ContractsDashboard {
  summary: {
    total_contracts: number;
    active_contracts: number;
    pending_signature: number;
    total_active_value: number;
    expiring_count: number;
  };
  expiring_contracts: {
    id: string;
    contract_number: string;
    customer_name: string | null;
    end_date: string;
    days_until_expiry: number | null;
    auto_renew: boolean;
  }[];
}

export interface ContractReportsStats {
  total_recurring_revenue: number;
  churn_rate: number;
  renewal_rate: number;
  status_counts: Record<string, number>;
  avg_by_type: {
    contract_type: string;
    avg_value: number;
    count: number;
    total_value: number;
  }[];
  monthly_data: {
    month: string | null;
    count: number;
    total_value: number;
  }[];
  expiring_30: number;
  expiring_60: number;
  expiring_90: number;
  overdue_count: number;
  // Enhanced analytics
  revenue_by_tier?: {
    tier: string;
    count: number;
    total_value: number;
    avg_value: number;
  }[];
  churn_by_tier?: Record<string, number>;
  upsell_conversions?: number;
  referral_stats?: {
    total_referrals: number;
    referral_revenue: number;
  };
  neighborhood_stats?: {
    total_bundle_contracts: number;
    bundle_revenue: number;
  };
  add_on_stats?: {
    contracts_with_add_ons: number;
  };
}

export interface RenewalsDashboard {
  expiring_30: RenewalContract[];
  expiring_60: RenewalContract[];
  expiring_90: RenewalContract[];
  overdue: OverdueContract[];
  auto_renew_queue: {
    id: string;
    contract_number: string;
    name: string;
    customer_name: string | null;
    end_date: string;
    days_until_expiry: number | null;
    total_value: number | null;
  }[];
  counts: {
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    overdue: number;
    auto_renew: number;
  };
}

export interface RenewalContract {
  id: string;
  contract_number: string;
  name: string;
  customer_name: string | null;
  customer_id: string;
  contract_type: string;
  end_date: string;
  days_until_expiry: number | null;
  auto_renew: boolean;
  total_value: number | null;
}

export interface OverdueContract {
  id: string;
  contract_number: string;
  name: string;
  customer_name: string | null;
  customer_id: string;
  contract_type: string;
  end_date: string;
  days_overdue: number;
  auto_renew: boolean;
  total_value: number | null;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ========================
// API Functions
// ========================

async function fetchContracts(
  filters?: ContractFilters,
): Promise<ListResponse<Contract>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.page_size) params.append("page_size", String(filters.page_size));
  if (filters?.customer_id)
    params.append("customer_id", String(filters.customer_id));
  if (filters?.status) params.append("status", filters.status);
  if (filters?.contract_type)
    params.append("contract_type", filters.contract_type);
  if (filters?.tier) params.append("tier", filters.tier);
  if (filters?.bundle_id) params.append("bundle_id", filters.bundle_id);
  if (filters?.expiring_within_days)
    params.append("expiring_within_days", String(filters.expiring_within_days));

  const query = params.toString();
  const { data } = await apiClient.get<ListResponse<Contract>>(
    `/contracts${query ? `?${query}` : ""}`,
  );
  return data;
}

async function fetchContract(id: string): Promise<Contract> {
  const { data } = await apiClient.get<Contract>(`/contracts/${id}`);
  return data;
}

async function createContract(contractData: ContractCreate): Promise<Contract> {
  const { data } = await apiClient.post<Contract>("/contracts", contractData);
  return data;
}

async function updateContract(
  id: string,
  updateData: ContractUpdate,
): Promise<Contract> {
  const { data } = await apiClient.patch<Contract>(
    `/contracts/${id}`,
    updateData,
  );
  return data;
}

async function deleteContract(id: string): Promise<void> {
  await apiClient.delete(`/contracts/${id}`);
}

async function activateContract(
  id: string,
): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post<{ status: string; message: string }>(
    `/contracts/${id}/activate`,
  );
  return data;
}

async function renewContract(
  id: string,
  renewData: { new_end_date?: string; new_total_value?: number; notes?: string },
): Promise<Contract> {
  const { data } = await apiClient.post<Contract>(
    `/contracts/${id}/renew`,
    renewData,
  );
  return data;
}

async function bulkContractAction(
  contract_ids: string[],
  action: "activate" | "cancel" | "renew",
): Promise<{
  action: string;
  total: number;
  success_count: number;
  failed_count: number;
  results: { success: string[]; failed: { id: string; error: string }[] };
}> {
  const { data } = await apiClient.post("/contracts/bulk-action", {
    contract_ids,
    action,
  });
  return data;
}

async function fetchTemplates(filters?: {
  contract_type?: string;
  active_only?: boolean;
}): Promise<ListResponse<ContractTemplate>> {
  const params = new URLSearchParams();
  if (filters?.contract_type)
    params.append("contract_type", filters.contract_type);
  if (filters?.active_only !== undefined)
    params.append("active_only", String(filters.active_only));

  const query = params.toString();
  const { data } = await apiClient.get<ListResponse<ContractTemplate>>(
    `/contracts/templates/list${query ? `?${query}` : ""}`,
  );
  return data;
}

async function fetchTemplate(id: string): Promise<ContractTemplate> {
  const { data } = await apiClient.get<ContractTemplate>(
    `/contracts/templates/${id}`,
  );
  return data;
}

async function generateFromTemplate(
  requestData: GenerateContractRequest,
): Promise<Contract> {
  const { data } = await apiClient.post<Contract>(
    "/contracts/generate-from-template",
    requestData,
  );
  return data;
}

async function fetchContractsDashboard(
  expiringWithinDays: number = 30,
): Promise<ContractsDashboard> {
  const { data } = await apiClient.get<ContractsDashboard>(
    `/contracts/dashboard/summary?expiring_within_days=${expiringWithinDays}`,
  );
  return data;
}

async function fetchContractReports(): Promise<ContractReportsStats> {
  const { data } = await apiClient.get<ContractReportsStats>(
    "/contracts/reports/stats",
  );
  return data;
}

async function fetchRenewalsDashboard(): Promise<RenewalsDashboard> {
  const { data } = await apiClient.get<RenewalsDashboard>(
    "/contracts/renewals/dashboard",
  );
  return data;
}

async function fetchTemplateDocument(
  templateId: string,
  variables?: Record<string, string>,
): Promise<ContractDocument> {
  const params = new URLSearchParams();
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      if (value) params.append(key, value);
    }
  }
  const query = params.toString();
  const { data } = await apiClient.get<ContractDocument>(
    `/contracts/templates/${templateId}/document${query ? `?${query}` : ""}`,
  );
  return data;
}

async function fetchContractDocument(contractId: string): Promise<ContractDocument> {
  const { data } = await apiClient.get<ContractDocument>(
    `/contracts/${contractId}/document`,
  );
  return data;
}

async function seedTemplates(forceUpdate: boolean = false): Promise<{
  created: string[];
  updated: string[];
  skipped: string[];
  total_created: number;
  total_updated: number;
  total_skipped: number;
}> {
  const { data } = await apiClient.post(
    `/contracts/seed-templates?force_update=${forceUpdate}`,
  );
  return data;
}

// ========================
// React Query Hooks
// ========================

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ["contracts", filters],
    queryFn: () => fetchContracts(filters),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: () => fetchContract(id),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toastSuccess("Contract Created", `${contract.contract_number} created successfully`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to create contract";
      toastError("Creation Failed", message);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContractUpdate }) =>
      updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toastSuccess("Contract Updated", "Contract updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to update contract";
      toastError("Update Failed", message);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toastSuccess("Contract Deleted", "Contract deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to delete contract";
      toastError("Deletion Failed", message);
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toastSuccess("Contract Activated", "Contract is now active");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to activate contract";
      toastError("Activation Failed", message);
    },
  });
}

export function useRenewContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { new_end_date?: string; new_total_value?: number; notes?: string } }) =>
      renewContract(id, data),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-renewals"] });
      toastSuccess("Contract Renewed", `New contract ${contract.contract_number} created`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to renew contract";
      toastError("Renewal Failed", message);
    },
  });
}

export function useBulkContractAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contract_ids, action }: { contract_ids: string[]; action: "activate" | "cancel" | "renew" }) =>
      bulkContractAction(contract_ids, action),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-dashboard"] });
      toastSuccess("Bulk Action Complete", `${result.success_count} of ${result.total} succeeded`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Bulk action failed";
      toastError("Bulk Action Failed", message);
    },
  });
}

export function useContractTemplates(filters?: {
  contract_type?: string;
  active_only?: boolean;
}) {
  return useQuery({
    queryKey: ["contract-templates", filters],
    queryFn: () => fetchTemplates(filters),
  });
}

export function useContractTemplate(id: string) {
  return useQuery({
    queryKey: ["contract-templates", id],
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  });
}

export function useGenerateFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateFromTemplate,
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toastSuccess("Contract Generated", `${contract.contract_number} created from template`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to generate contract";
      toastError("Generation Failed", message);
    },
  });
}

export function useContractsDashboard(expiringWithinDays: number = 30) {
  return useQuery({
    queryKey: ["contracts-dashboard", expiringWithinDays],
    queryFn: () => fetchContractsDashboard(expiringWithinDays),
  });
}

export function useContractReports() {
  return useQuery({
    queryKey: ["contracts-reports"],
    queryFn: fetchContractReports,
    staleTime: 60_000,
  });
}

export function useRenewalsDashboard() {
  return useQuery({
    queryKey: ["contracts-renewals"],
    queryFn: fetchRenewalsDashboard,
  });
}

export function useTemplateDocument(templateId: string, variables?: Record<string, string>) {
  return useQuery({
    queryKey: ["template-document", templateId, variables],
    queryFn: () => fetchTemplateDocument(templateId, variables),
    enabled: !!templateId,
  });
}

export function useContractDocument(contractId: string) {
  return useQuery({
    queryKey: ["contract-document", contractId],
    queryFn: () => fetchContractDocument(contractId),
    enabled: !!contractId,
  });
}

export function useSeedTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (forceUpdate: boolean = false) => seedTemplates(forceUpdate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      const msg = result.total_updated > 0
        ? `${result.total_created} created, ${result.total_updated} updated, ${result.total_skipped} skipped`
        : `${result.total_created} templates created, ${result.total_skipped} skipped`;
      toastSuccess("Templates Seeded", msg);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to seed templates";
      toastError("Seed Failed", message);
    },
  });
}

// ========================
// Neighborhood Bundle API
// ========================

async function fetchNeighborhoodBundles(): Promise<{ items: NeighborhoodBundle[]; total: number }> {
  const { data } = await apiClient.get("/contracts/neighborhood-bundles/list");
  return data;
}

async function fetchNeighborhoodBundle(id: string): Promise<NeighborhoodBundle> {
  const { data } = await apiClient.get<NeighborhoodBundle>(`/contracts/neighborhood-bundles/${id}`);
  return data;
}

async function createNeighborhoodBundle(bundleData: {
  name: string;
  discount_percent?: number;
  min_contracts?: number;
  notes?: string;
}): Promise<NeighborhoodBundle> {
  const { data } = await apiClient.post<NeighborhoodBundle>("/contracts/neighborhood-bundles", bundleData);
  return data;
}

export function useNeighborhoodBundles() {
  return useQuery({
    queryKey: ["neighborhood-bundles"],
    queryFn: fetchNeighborhoodBundles,
  });
}

export function useNeighborhoodBundle(id: string) {
  return useQuery({
    queryKey: ["neighborhood-bundles", id],
    queryFn: () => fetchNeighborhoodBundle(id),
    enabled: !!id,
  });
}

export function useCreateNeighborhoodBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNeighborhoodBundle,
    onSuccess: (bundle) => {
      queryClient.invalidateQueries({ queryKey: ["neighborhood-bundles"] });
      toastSuccess("Bundle Created", `${bundle.name} created with ${bundle.discount_percent}% discount`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to create bundle";
      toastError("Bundle Creation Failed", message);
    },
  });
}
