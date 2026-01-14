/**
 * Survey Actions API Hooks
 *
 * React Query hooks for survey actions, detractor queue, and response management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { surveyKeys } from "./useCustomerSuccess.ts";

// ============================================
// Types
// ============================================

export type SurveyActionType =
  | "schedule_callback"
  | "create_ticket"
  | "generate_offer"
  | "book_appointment"
  | "send_email"
  | "create_task"
  | "trigger_playbook"
  | "assign_csm"
  | "escalate";

export type ActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

export type ActionPriority = "low" | "medium" | "high" | "critical";

export interface SurveyAction {
  id: number;
  survey_response_id: number;
  customer_id: number;
  customer_name?: string;
  action_type: SurveyActionType;
  status: ActionStatus;
  priority: ActionPriority;
  title: string;
  description?: string;
  notes?: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  reason?: string;
  created_by_user_id?: number;
  created_by_name?: string;
  completed_at?: string;
  outcome?: string;
  outcome_notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface SurveyActionFormData {
  action_type: SurveyActionType;
  title: string;
  description?: string;
  notes?: string;
  priority?: ActionPriority;
  assigned_to_user_id?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface DetractorAlert {
  id: number;
  response_id: number;
  survey_id: number;
  survey_name: string;
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  score: number;
  feedback?: string;
  sentiment?:
    | "very_negative"
    | "negative"
    | "neutral"
    | "positive"
    | "very_positive";
  key_issues?: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  ai_summary?: string;
  suggested_actions?: SurveyActionType[];
  actions_taken?: SurveyAction[];
  is_dismissed: boolean;
  dismissed_at?: string;
  dismissed_by_user_id?: number;
  dismissed_reason?: string;
  created_at: string;
  response_submitted_at: string;
}

export interface DetractorQueueFilters {
  page?: number;
  page_size?: number;
  risk_level?: string;
  score_max?: number;
  survey_id?: number;
  is_dismissed?: boolean;
  has_actions?: boolean;
}

export interface DetractorQueueResponse {
  items: DetractorAlert[];
  total: number;
  page: number;
  page_size: number;
}

export interface ActionHistoryEntry {
  id: number;
  action: SurveyAction;
  actor_name: string;
  action_type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Query Keys
// ============================================

export const surveyActionKeys = {
  actions: ["cs", "surveys", "actions"] as const,
  actionsList: (surveyId: number) =>
    [...surveyActionKeys.actions, "list", surveyId] as const,
  actionDetail: (actionId: number) =>
    [...surveyActionKeys.actions, "detail", actionId] as const,
  responseActions: (responseId: number) =>
    [...surveyActionKeys.actions, "response", responseId] as const,
  detractors: ["cs", "surveys", "detractors"] as const,
  detractorQueue: (filters: DetractorQueueFilters) =>
    [...surveyActionKeys.detractors, "queue", filters] as const,
  detractorDetail: (alertId: number) =>
    [...surveyActionKeys.detractors, "detail", alertId] as const,
  actionHistory: (responseId: number) =>
    [...surveyActionKeys.actions, "history", responseId] as const,
};

// ============================================
// Survey Action Hooks
// ============================================

/**
 * Create a survey action for a response
 * POST /api/v2/cs/surveys/{surveyId}/actions
 */
export function useCreateSurveyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surveyId,
      responseId,
      data,
    }: {
      surveyId: number;
      responseId: number;
      data: SurveyActionFormData;
    }): Promise<SurveyAction> => {
      const response = await apiClient.post(`/cs/surveys/${surveyId}/actions`, {
        response_id: responseId,
        ...data,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.actionsList(variables.surveyId),
      });
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
      queryClient.invalidateQueries({
        queryKey: surveyKeys.surveyResponses(variables.surveyId),
      });
    },
  });
}

/**
 * Get actions for a specific survey response
 * GET /api/v2/cs/surveys/responses/{responseId}/actions
 */
export function useResponseActions(responseId: number | undefined) {
  return useQuery({
    queryKey: surveyActionKeys.responseActions(responseId!),
    queryFn: async (): Promise<SurveyAction[]> => {
      const { data } = await apiClient.get(
        `/cs/surveys/responses/${responseId}/actions`,
      );
      return data;
    },
    enabled: !!responseId,
  });
}

/**
 * Update an existing action
 * PATCH /api/v2/cs/surveys/actions/{actionId}
 */
export function useUpdateSurveyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      data,
    }: {
      actionId: number;
      data: Partial<SurveyActionFormData> & {
        status?: ActionStatus;
        outcome?: string;
        outcome_notes?: string;
      };
    }): Promise<SurveyAction> => {
      const response = await apiClient.patch(
        `/cs/surveys/actions/${actionId}`,
        data,
      );
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.actions });
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(result.survey_response_id),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Complete an action
 * POST /api/v2/cs/surveys/actions/{actionId}/complete
 */
export function useCompleteSurveyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      outcome,
      outcome_notes,
    }: {
      actionId: number;
      outcome: string;
      outcome_notes?: string;
    }): Promise<SurveyAction> => {
      const response = await apiClient.post(
        `/cs/surveys/actions/${actionId}/complete`,
        {
          outcome,
          outcome_notes,
        },
      );
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.actions });
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(result.survey_response_id),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

// ============================================
// Detractor Queue Hooks
// ============================================

/**
 * Get the detractor queue (AI-detected at-risk customers from surveys)
 * GET /api/v2/cs/surveys/detractors
 */
export function useDetractorQueue(filters: DetractorQueueFilters = {}) {
  return useQuery({
    queryKey: surveyActionKeys.detractorQueue(filters),
    queryFn: async (): Promise<DetractorQueueResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.risk_level) params.set("risk_level", filters.risk_level);
      if (filters.score_max !== undefined)
        params.set("score_max", String(filters.score_max));
      if (filters.survey_id) params.set("survey_id", String(filters.survey_id));
      if (filters.is_dismissed !== undefined)
        params.set("is_dismissed", String(filters.is_dismissed));
      if (filters.has_actions !== undefined)
        params.set("has_actions", String(filters.has_actions));

      const { data } = await apiClient.get(`/cs/surveys/detractors?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

/**
 * Mark an action as taken on a response
 * PATCH /api/v2/cs/surveys/responses/{responseId}/action
 */
export function useMarkActionTaken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      actionType,
      notes,
    }: {
      responseId: number;
      actionType: SurveyActionType;
      notes?: string;
    }): Promise<{ status: string; message: string; action_id: number }> => {
      const response = await apiClient.patch(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: actionType,
          notes,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Dismiss a detractor alert
 * POST /api/v2/cs/surveys/detractors/{alertId}/dismiss
 */
export function useDismissDetractorAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alertId,
      reason,
    }: {
      alertId: number;
      reason?: string;
    }): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(
        `/cs/surveys/detractors/${alertId}/dismiss`,
        { reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Get action history for a survey response
 * GET /api/v2/cs/surveys/responses/{responseId}/history
 */
export function useActionHistory(responseId: number | undefined) {
  return useQuery({
    queryKey: surveyActionKeys.actionHistory(responseId!),
    queryFn: async (): Promise<ActionHistoryEntry[]> => {
      const { data } = await apiClient.get(
        `/cs/surveys/responses/${responseId}/history`,
      );
      return data;
    },
    enabled: !!responseId,
  });
}

// ============================================
// Quick Action Hooks
// ============================================

/**
 * Schedule a callback for a customer
 */
export function useScheduleCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      responseId,
      scheduledTime,
      notes,
    }: {
      customerId: number;
      responseId: number;
      scheduledTime?: string;
      notes?: string;
    }) => {
      const response = await apiClient.post(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: "schedule_callback",
          customer_id: customerId,
          scheduled_time: scheduledTime,
          notes,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Create a support ticket from survey response
 */
export function useCreateTicketFromResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      responseId,
      title,
      description,
      priority,
    }: {
      customerId: number;
      responseId: number;
      title: string;
      description?: string;
      priority?: "low" | "medium" | "high" | "critical";
    }) => {
      const response = await apiClient.post(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: "create_ticket",
          customer_id: customerId,
          title,
          description,
          priority,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Generate a retention offer for a customer
 */
export function useGenerateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      responseId,
      offerType,
      notes,
    }: {
      customerId: number;
      responseId: number;
      offerType?: "discount" | "credit" | "upgrade" | "custom";
      notes?: string;
    }) => {
      const response = await apiClient.post(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: "generate_offer",
          customer_id: customerId,
          offer_type: offerType,
          notes,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Send an apology/follow-up email
 */
export function useSendFollowUpEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      responseId,
      emailType,
      customMessage,
    }: {
      customerId: number;
      responseId: number;
      emailType?: "apology" | "follow_up" | "resolution" | "thank_you";
      customMessage?: string;
    }) => {
      const response = await apiClient.post(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: "send_email",
          customer_id: customerId,
          email_type: emailType,
          custom_message: customMessage,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

/**
 * Book an appointment with a customer
 */
export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      responseId,
      appointmentType,
      preferredTime,
      notes,
    }: {
      customerId: number;
      responseId: number;
      appointmentType?: "call" | "video" | "in_person";
      preferredTime?: string;
      notes?: string;
    }) => {
      const response = await apiClient.post(
        `/cs/surveys/responses/${responseId}/action`,
        {
          action_type: "book_appointment",
          customer_id: customerId,
          appointment_type: appointmentType,
          preferred_time: preferredTime,
          notes,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyActionKeys.responseActions(variables.responseId),
      });
      queryClient.invalidateQueries({ queryKey: surveyActionKeys.detractors });
    },
  });
}

// ============================================
// Escalation Rules Hooks
// ============================================

export interface EscalationRule {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: "nps_score" | "sentiment" | "keywords" | "combined";
  conditions: EscalationCondition[];
  actions: EscalationRuleAction[];
  priority: number;
  cooldown_hours?: number;
  notify_users?: number[];
  created_at: string;
  updated_at?: string;
}

export interface EscalationCondition {
  type:
    | "score_lte"
    | "score_gte"
    | "sentiment_eq"
    | "keyword_contains"
    | "survey_type";
  value: string | number;
  operator?: "and" | "or";
}

export interface EscalationRuleAction {
  type:
    | "create_task"
    | "send_alert"
    | "trigger_playbook"
    | "assign_csm"
    | "create_escalation";
  config: Record<string, unknown>;
}

export interface EscalationRuleFormData {
  name: string;
  description?: string;
  is_active?: boolean;
  trigger_type: "nps_score" | "sentiment" | "keywords" | "combined";
  conditions: EscalationCondition[];
  actions: EscalationRuleAction[];
  priority?: number;
  cooldown_hours?: number;
  notify_users?: number[];
}

export const escalationRuleKeys = {
  rules: ["cs", "surveys", "escalation-rules"] as const,
  rulesList: () => [...escalationRuleKeys.rules, "list"] as const,
  ruleDetail: (id: number) =>
    [...escalationRuleKeys.rules, "detail", id] as const,
};

/**
 * Get all escalation rules
 */
export function useEscalationRules() {
  return useQuery({
    queryKey: escalationRuleKeys.rulesList(),
    queryFn: async (): Promise<EscalationRule[]> => {
      const { data } = await apiClient.get("/cs/surveys/escalation-rules");
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Get a specific escalation rule
 */
export function useEscalationRule(id: number | undefined) {
  return useQuery({
    queryKey: escalationRuleKeys.ruleDetail(id!),
    queryFn: async (): Promise<EscalationRule> => {
      const { data } = await apiClient.get(
        `/cs/surveys/escalation-rules/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new escalation rule
 */
export function useCreateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: EscalationRuleFormData,
    ): Promise<EscalationRule> => {
      const response = await apiClient.post(
        "/cs/surveys/escalation-rules",
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationRuleKeys.rules });
    },
  });
}

/**
 * Update an escalation rule
 */
export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<EscalationRuleFormData>;
    }): Promise<EscalationRule> => {
      const response = await apiClient.patch(
        `/cs/surveys/escalation-rules/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: escalationRuleKeys.ruleDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: escalationRuleKeys.rules });
    },
  });
}

/**
 * Delete an escalation rule
 */
export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/surveys/escalation-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationRuleKeys.rules });
    },
  });
}

/**
 * Toggle an escalation rule active/inactive
 */
export function useToggleEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: number;
      isActive: boolean;
    }): Promise<EscalationRule> => {
      const response = await apiClient.patch(
        `/cs/surveys/escalation-rules/${id}`,
        {
          is_active: isActive,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: escalationRuleKeys.ruleDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: escalationRuleKeys.rules });
    },
  });
}
