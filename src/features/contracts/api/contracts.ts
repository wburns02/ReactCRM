import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
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
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useContractsDashboard(expiringWithinDays: number = 30) {
  return useQuery({
    queryKey: ["contracts-dashboard", expiringWithinDays],
    queryFn: () => fetchContractsDashboard(expiringWithinDays),
  });
}
