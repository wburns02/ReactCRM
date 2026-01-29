import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

// ========================
// Types
// ========================

export interface JobCost {
  id: string;
  work_order_id: string;
  cost_type: string;
  category: string | null;
  description: string;
  notes: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  markup_percent: number;
  billable_amount: number | null;
  technician_id: string | null;
  technician_name: string | null;
  cost_date: string;
  is_billable: boolean;
  is_billed: boolean;
  invoice_id: string | null;
  vendor_name: string | null;
  vendor_invoice: string | null;
  created_at: string | null;
}

export interface JobCostCreate {
  work_order_id: string;
  cost_type: string;
  category?: string;
  description: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  unit_cost: number;
  markup_percent?: number;
  technician_id?: string;
  technician_name?: string;
  cost_date: string;
  is_billable?: boolean;
  vendor_name?: string;
  vendor_invoice?: string;
}

export interface JobCostUpdate {
  cost_type?: string;
  category?: string;
  description?: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  markup_percent?: number;
  is_billable?: boolean;
  is_billed?: boolean;
  invoice_id?: string;
  vendor_name?: string;
  vendor_invoice?: string;
}

export interface JobCostFilters {
  page?: number;
  page_size?: number;
  work_order_id?: string;
  cost_type?: string;
  technician_id?: string;
  date_from?: string;
  date_to?: string;
  is_billable?: boolean;
  is_billed?: boolean;
}

export interface WorkOrderCostSummary {
  work_order_id: string;
  total_costs: number;
  total_billable: number;
  cost_breakdown: Record<string, number>;
  labor_costs: number;
  material_costs: number;
  other_costs: number;
  cost_count: number;
}

export interface ProfitabilityReport {
  work_order_id: string;
  revenue: number;
  total_costs: number;
  gross_profit: number;
  profit_margin_percent: number;
  cost_breakdown: Record<string, number>;
}

export interface CostReportsSummary {
  period: {
    from: string;
    to: string;
  };
  summary: {
    total_costs: number;
    total_billable: number;
    billed_amount: number;
    unbilled_amount: number;
    cost_count: number;
  };
  by_type: Record<string, { count: number; total: number }>;
  by_technician: Record<string, { count: number; total: number }>;
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

async function fetchJobCosts(
  filters?: JobCostFilters,
): Promise<ListResponse<JobCost>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.page_size) params.append("page_size", String(filters.page_size));
  if (filters?.work_order_id)
    params.append("work_order_id", filters.work_order_id);
  if (filters?.cost_type) params.append("cost_type", filters.cost_type);
  if (filters?.technician_id)
    params.append("technician_id", filters.technician_id);
  if (filters?.date_from) params.append("date_from", filters.date_from);
  if (filters?.date_to) params.append("date_to", filters.date_to);
  if (filters?.is_billable !== undefined)
    params.append("is_billable", String(filters.is_billable));
  if (filters?.is_billed !== undefined)
    params.append("is_billed", String(filters.is_billed));

  const query = params.toString();
  const { data } = await apiClient.get<ListResponse<JobCost>>(
    `/job-costing${query ? `?${query}` : ""}`,
  );
  return data;
}

async function fetchJobCost(id: string): Promise<JobCost> {
  const { data } = await apiClient.get<JobCost>(`/job-costing/${id}`);
  return data;
}

async function createJobCost(costData: JobCostCreate): Promise<JobCost> {
  const { data } = await apiClient.post<JobCost>("/job-costing", costData);
  return data;
}

async function updateJobCost(
  id: string,
  updateData: JobCostUpdate,
): Promise<JobCost> {
  const { data } = await apiClient.patch<JobCost>(
    `/job-costing/${id}`,
    updateData,
  );
  return data;
}

async function deleteJobCost(id: string): Promise<void> {
  await apiClient.delete(`/job-costing/${id}`);
}

async function fetchWorkOrderCostSummary(
  workOrderId: string,
): Promise<WorkOrderCostSummary> {
  const { data } = await apiClient.get<WorkOrderCostSummary>(
    `/job-costing/work-order/${workOrderId}/summary`,
  );
  return data;
}

async function fetchWorkOrderProfitability(
  workOrderId: string,
): Promise<ProfitabilityReport> {
  const { data } = await apiClient.get<ProfitabilityReport>(
    `/job-costing/work-order/${workOrderId}/profitability`,
  );
  return data;
}

async function fetchCostReportsSummary(
  dateFrom?: string,
  dateTo?: string,
): Promise<CostReportsSummary> {
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  const query = params.toString();
  const { data } = await apiClient.get<CostReportsSummary>(
    `/job-costing/reports/summary${query ? `?${query}` : ""}`,
  );
  return data;
}

// ========================
// React Query Hooks
// ========================

export function useJobCosts(filters?: JobCostFilters) {
  return useQuery({
    queryKey: ["job-costs", filters],
    queryFn: () => fetchJobCosts(filters),
  });
}

export function useJobCost(id: string) {
  return useQuery({
    queryKey: ["job-costs", id],
    queryFn: () => fetchJobCost(id),
    enabled: !!id,
  });
}

export function useCreateJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJobCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-costs"] });
      queryClient.invalidateQueries({ queryKey: ["work-order-costs"] });
    },
  });
}

export function useUpdateJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobCostUpdate }) =>
      updateJobCost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-costs"] });
      queryClient.invalidateQueries({ queryKey: ["work-order-costs"] });
    },
  });
}

export function useDeleteJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteJobCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-costs"] });
      queryClient.invalidateQueries({ queryKey: ["work-order-costs"] });
    },
  });
}

export function useWorkOrderCostSummary(workOrderId: string) {
  return useQuery({
    queryKey: ["work-order-costs", workOrderId, "summary"],
    queryFn: () => fetchWorkOrderCostSummary(workOrderId),
    enabled: !!workOrderId,
  });
}

export function useWorkOrderProfitability(workOrderId: string) {
  return useQuery({
    queryKey: ["work-order-costs", workOrderId, "profitability"],
    queryFn: () => fetchWorkOrderProfitability(workOrderId),
    enabled: !!workOrderId,
  });
}

export function useCostReportsSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["cost-reports", dateFrom, dateTo],
    queryFn: () => fetchCostReportsSummary(dateFrom, dateTo),
  });
}

// Helper constants
export const COST_TYPES = [
  { value: "labor", label: "Labor", icon: "👷" },
  { value: "materials", label: "Materials", icon: "📦" },
  { value: "equipment", label: "Equipment", icon: "🔧" },
  { value: "disposal", label: "Disposal", icon: "🗑️" },
  { value: "travel", label: "Travel", icon: "🚗" },
  { value: "subcontractor", label: "Subcontractor", icon: "🏢" },
  { value: "other", label: "Other", icon: "📋" },
];

export const UNITS = [
  { value: "each", label: "Each" },
  { value: "hour", label: "Hour" },
  { value: "gallon", label: "Gallon" },
  { value: "mile", label: "Mile" },
  { value: "foot", label: "Foot" },
  { value: "yard", label: "Yard" },
  { value: "load", label: "Load" },
  { value: "day", label: "Day" },
];

// ========================
// Calculation Types
// ========================

export interface LaborCalculation {
  technician_id: string;
  technician_name: string;
  hours: number;
  pay_type: "hourly" | "salary";
  hourly_rate?: number;
  annual_salary?: number;
  hourly_equivalent?: number;
  overtime_multiplier?: number;
  regular_hours: number;
  overtime_hours: number;
  regular_cost: number;
  overtime_cost: number;
  total_labor_cost: number;
  commission_rate: number;
  source: "pay_rate" | "default";
}

export interface DumpFeeCalculation {
  dump_site_id: string;
  dump_site_name: string;
  state: string;
  gallons: number;
  fee_per_gallon: number;
  total_dump_fee: number;
}

export interface CommissionCalculation {
  technician_id: string;
  technician_name: string;
  job_total: number;
  dump_fee: number;
  commissionable_amount: number;
  commission_rate_percent: number;
  commission_amount: number;
  net_to_company: number;
}

export interface TechnicianPayRate {
  technician_id: string;
  name: string;
  pay_type: "hourly" | "salary";
  hourly_rate: number | null;
  salary_amount: number | null;
  commission_rate: number;
  has_pay_rate: boolean;
}

export interface DumpSiteOption {
  id: string;
  name: string;
  city: string | null;
  state: string;
  fee_per_gallon: number;
}

export interface RecentWorkOrder {
  id: string;
  customer_id: number | null;
  job_type: string | null;
  status: string | null;
  total_amount: number;
  scheduled_start: string | null;
  technician_id: string | null;
  created_at: string | null;
}

// ========================
// Calculation API Functions
// ========================

async function calculateLabor(
  technicianId: string,
  hours: number,
): Promise<LaborCalculation> {
  const params = new URLSearchParams({
    technician_id: technicianId,
    hours: String(hours),
  });
  const { data } = await apiClient.get<LaborCalculation>(
    `/job-costing/calculate/labor?${params}`,
  );
  return data;
}

async function calculateDumpFee(
  dumpSiteId: string,
  gallons: number,
): Promise<DumpFeeCalculation> {
  const params = new URLSearchParams({
    dump_site_id: dumpSiteId,
    gallons: String(gallons),
  });
  const { data } = await apiClient.get<DumpFeeCalculation>(
    `/job-costing/calculate/dump-fee?${params}`,
  );
  return data;
}

async function calculateCommission(
  technicianId: string,
  jobTotal: number,
  dumpFee: number = 0,
): Promise<CommissionCalculation> {
  const params = new URLSearchParams({
    technician_id: technicianId,
    job_total: String(jobTotal),
    dump_fee: String(dumpFee),
  });
  const { data } = await apiClient.get<CommissionCalculation>(
    `/job-costing/calculate/commission?${params}`,
  );
  return data;
}

async function fetchTechnicianPayRates(): Promise<{
  technicians: TechnicianPayRate[];
  total: number;
}> {
  const { data } = await apiClient.get<{
    technicians: TechnicianPayRate[];
    total: number;
  }>("/job-costing/technicians/pay-rates");
  return data;
}

async function fetchDumpSitesForCosting(): Promise<{
  sites: DumpSiteOption[];
  total: number;
}> {
  const { data } = await apiClient.get<{
    sites: DumpSiteOption[];
    total: number;
  }>("/job-costing/dump-sites/list");
  return data;
}

async function fetchRecentWorkOrders(
  limit: number = 20,
): Promise<{ work_orders: RecentWorkOrder[]; total: number }> {
  const { data } = await apiClient.get<{
    work_orders: RecentWorkOrder[];
    total: number;
  }>(`/job-costing/work-orders/recent?limit=${limit}`);
  return data;
}

// ========================
// Calculation Hooks
// ========================

export function useCalculateLabor(technicianId: string, hours: number) {
  return useQuery({
    queryKey: ["calculate-labor", technicianId, hours],
    queryFn: () => calculateLabor(technicianId, hours),
    enabled: !!technicianId && hours > 0,
  });
}

export function useCalculateDumpFee(dumpSiteId: string, gallons: number) {
  return useQuery({
    queryKey: ["calculate-dump-fee", dumpSiteId, gallons],
    queryFn: () => calculateDumpFee(dumpSiteId, gallons),
    enabled: !!dumpSiteId && gallons > 0,
  });
}

export function useCalculateCommission(
  technicianId: string,
  jobTotal: number,
  dumpFee: number = 0,
) {
  return useQuery({
    queryKey: ["calculate-commission", technicianId, jobTotal, dumpFee],
    queryFn: () => calculateCommission(technicianId, jobTotal, dumpFee),
    enabled: !!technicianId && jobTotal > 0,
  });
}

export function useTechnicianPayRates() {
  return useQuery({
    queryKey: ["technician-pay-rates"],
    queryFn: fetchTechnicianPayRates,
  });
}

export function useDumpSitesForCosting() {
  return useQuery({
    queryKey: ["dump-sites-costing"],
    queryFn: fetchDumpSitesForCosting,
  });
}

export function useRecentWorkOrders(limit: number = 20) {
  return useQuery({
    queryKey: ["recent-work-orders", limit],
    queryFn: () => fetchRecentWorkOrders(limit),
  });
}
