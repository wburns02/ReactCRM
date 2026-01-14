import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Compliance Form Types
 */
export type ComplianceState = "TX" | "SC" | "TN" | "other";

export interface ComplianceTemplate {
  id: string;
  name: string;
  state: ComplianceState;
  form_type: "inspection" | "permit" | "installation" | "maintenance" | "other";
  version: string;
  fields: ComplianceField[];
  is_active: boolean;
  required_signatures: string[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceField {
  id: string;
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "checkbox"
    | "signature"
    | "photo"
    | "textarea";
  required: boolean;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  section?: string;
  help_text?: string;
}

export interface ComplianceForm {
  id: string;
  template_id: string;
  template_name: string;
  work_order_id?: string;
  customer_id: number;
  customer_name: string;
  property_address: string;
  status: "draft" | "completed" | "submitted" | "approved" | "rejected";
  data: Record<string, unknown>;
  signatures: ComplianceSignature[];
  photos: CompliancePhoto[];
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceSignature {
  id: string;
  role: string;
  signer_name: string;
  signed_at: string;
  signature_data: string; // Base64 encoded
}

export interface CompliancePhoto {
  id: string;
  field_id: string;
  url: string;
  caption?: string;
  taken_at: string;
}

export interface ComplianceStats {
  total_forms: number;
  draft: number;
  completed: number;
  submitted: number;
  approved: number;
  rejected: number;
  by_state: Record<ComplianceState, number>;
}

/**
 * Query keys for Compliance
 */
export const complianceKeys = {
  all: ["compliance"] as const,
  templates: () => [...complianceKeys.all, "templates"] as const,
  templatesByState: (state: ComplianceState) =>
    [...complianceKeys.templates(), state] as const,
  template: (id: string) => [...complianceKeys.all, "template", id] as const,
  forms: () => [...complianceKeys.all, "forms"] as const,
  form: (id: string) => [...complianceKeys.all, "form", id] as const,
  customerForms: (customerId: number) =>
    [...complianceKeys.all, "customer", customerId] as const,
  workOrderForm: (workOrderId: string) =>
    [...complianceKeys.all, "work-order", workOrderId] as const,
  stats: () => [...complianceKeys.all, "stats"] as const,
};

/**
 * Get compliance templates
 */
export function useComplianceTemplates(state?: ComplianceState) {
  return useQuery({
    queryKey: state
      ? complianceKeys.templatesByState(state)
      : complianceKeys.templates(),
    queryFn: async (): Promise<ComplianceTemplate[]> => {
      const params = state ? `?state=${state}` : "";
      const { data } = await apiClient.get(`/compliance/templates${params}`);
      return data.templates || [];
    },
  });
}

/**
 * Get single compliance template
 */
export function useComplianceTemplate(id: string) {
  return useQuery({
    queryKey: complianceKeys.template(id),
    queryFn: async (): Promise<ComplianceTemplate> => {
      const { data } = await apiClient.get(`/compliance/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create compliance template
 */
export function useCreateComplianceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      template: Omit<ComplianceTemplate, "id" | "created_at" | "updated_at">,
    ): Promise<ComplianceTemplate> => {
      const { data } = await apiClient.post("/compliance/templates", template);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.templates() });
    },
  });
}

/**
 * Update compliance template
 */
export function useUpdateComplianceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...template
    }: Partial<ComplianceTemplate> & {
      id: string;
    }): Promise<ComplianceTemplate> => {
      const { data } = await apiClient.put(
        `/compliance/templates/${id}`,
        template,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.templates() });
      queryClient.invalidateQueries({
        queryKey: complianceKeys.template(variables.id),
      });
    },
  });
}

/**
 * Get compliance forms
 */
export function useComplianceForms(filters?: {
  status?: ComplianceForm["status"];
  state?: ComplianceState;
  customer_id?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: complianceKeys.forms(),
    queryFn: async (): Promise<{ forms: ComplianceForm[]; total: number }> => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.state) params.append("state", filters.state);
      if (filters?.customer_id)
        params.append("customer_id", filters.customer_id.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());

      const { data } = await apiClient.get(
        `/compliance/forms?${params.toString()}`,
      );
      return data;
    },
  });
}

/**
 * Get single compliance form
 */
export function useComplianceForm(id: string) {
  return useQuery({
    queryKey: complianceKeys.form(id),
    queryFn: async (): Promise<ComplianceForm> => {
      const { data } = await apiClient.get(`/compliance/forms/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Get compliance forms for customer
 */
export function useCustomerComplianceForms(customerId: number) {
  return useQuery({
    queryKey: complianceKeys.customerForms(customerId),
    queryFn: async (): Promise<ComplianceForm[]> => {
      const { data } = await apiClient.get(
        `/compliance/customer/${customerId}/forms`,
      );
      return data.forms || [];
    },
    enabled: !!customerId,
  });
}

/**
 * Get compliance form for work order
 */
export function useWorkOrderComplianceForm(workOrderId: string) {
  return useQuery({
    queryKey: complianceKeys.workOrderForm(workOrderId),
    queryFn: async (): Promise<ComplianceForm | null> => {
      const { data } = await apiClient.get(
        `/compliance/work-order/${workOrderId}/form`,
      );
      return data;
    },
    enabled: !!workOrderId,
  });
}

/**
 * Create compliance form
 */
export function useCreateComplianceForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      customer_id: number;
      work_order_id?: string;
      property_address: string;
    }): Promise<ComplianceForm> => {
      const { data } = await apiClient.post("/compliance/forms", params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.forms() });
    },
  });
}

/**
 * Update compliance form data
 */
export function useUpdateComplianceForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: Record<string, unknown>;
    }): Promise<ComplianceForm> => {
      const { data } = await apiClient.put(`/compliance/forms/${params.id}`, {
        data: params.data,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.form(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: complianceKeys.forms() });
    },
  });
}

/**
 * Add signature to compliance form
 */
export function useAddComplianceSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      form_id: string;
      role: string;
      signer_name: string;
      signature_data: string;
    }): Promise<ComplianceSignature> => {
      const { data } = await apiClient.post(
        `/compliance/forms/${params.form_id}/signatures`,
        params,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.form(variables.form_id),
      });
    },
  });
}

/**
 * Add photo to compliance form
 */
export function useAddCompliancePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      form_id: string;
      field_id: string;
      photo: File;
      caption?: string;
    }): Promise<CompliancePhoto> => {
      const formData = new FormData();
      formData.append("photo", params.photo);
      formData.append("field_id", params.field_id);
      if (params.caption) formData.append("caption", params.caption);

      const { data } = await apiClient.post(
        `/compliance/forms/${params.form_id}/photos`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.form(variables.form_id),
      });
    },
  });
}

/**
 * Submit compliance form
 */
export function useSubmitComplianceForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string): Promise<ComplianceForm> => {
      const { data } = await apiClient.post(
        `/compliance/forms/${formId}/submit`,
      );
      return data;
    },
    onSuccess: (_, formId) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.form(formId) });
      queryClient.invalidateQueries({ queryKey: complianceKeys.forms() });
      queryClient.invalidateQueries({ queryKey: complianceKeys.stats() });
    },
  });
}

/**
 * Approve compliance form
 */
export function useApproveComplianceForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string): Promise<ComplianceForm> => {
      const { data } = await apiClient.post(
        `/compliance/forms/${formId}/approve`,
      );
      return data;
    },
    onSuccess: (_, formId) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.form(formId) });
      queryClient.invalidateQueries({ queryKey: complianceKeys.forms() });
      queryClient.invalidateQueries({ queryKey: complianceKeys.stats() });
    },
  });
}

/**
 * Reject compliance form
 */
export function useRejectComplianceForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      form_id: string;
      reason: string;
    }): Promise<ComplianceForm> => {
      const { data } = await apiClient.post(
        `/compliance/forms/${params.form_id}/reject`,
        {
          reason: params.reason,
        },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.form(variables.form_id),
      });
      queryClient.invalidateQueries({ queryKey: complianceKeys.forms() });
      queryClient.invalidateQueries({ queryKey: complianceKeys.stats() });
    },
  });
}

/**
 * Generate PDF for compliance form
 */
export function useGenerateCompliancePDF() {
  return useMutation({
    mutationFn: async (formId: string): Promise<{ pdf_url: string }> => {
      const { data } = await apiClient.post(`/compliance/forms/${formId}/pdf`);
      return data;
    },
  });
}

/**
 * Get compliance stats
 */
export function useComplianceStats() {
  return useQuery({
    queryKey: complianceKeys.stats(),
    queryFn: async (): Promise<ComplianceStats> => {
      const { data } = await apiClient.get("/compliance/stats");
      return data;
    },
  });
}
