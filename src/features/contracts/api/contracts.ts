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
  default_services?: { service_code: string; description: string; frequency: string; quantity: number }[];
  base_price: number | null;
  is_active: boolean;
  version: number;
  created_at: string | null;
}

export interface ContractFilters {
  page?: number;
  page_size?: number;
  customer_id?: string;
  status?: string;
  contract_type?: string;
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

async function seedTemplates(): Promise<{
  created: string[];
  skipped: string[];
  total_created: number;
  total_skipped: number;
}> {
  const { data } = await apiClient.post("/contracts/seed-templates");
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

export function useSeedTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedTemplates,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toastSuccess("Templates Seeded", `${result.total_created} templates created, ${result.total_skipped} skipped`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || "Failed to seed templates";
      toastError("Seed Failed", message);
    },
  });
}
