/**
 * Customer Success Platform API Hooks
 *
 * React Query hooks for the Enterprise Customer Success Platform.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.ts';
import {
  type HealthScore,
  type HealthScoreListResponse,
  type HealthScoreFilters,
  type HealthScoreFormData,
  type Segment,
  type SegmentListResponse,
  type SegmentFilters,
  type SegmentFormData,
  type Journey,
  type JourneyListResponse,
  type JourneyFilters,
  type JourneyFormData,
  type JourneyEnrollment,
  type Playbook,
  type PlaybookListResponse,
  type PlaybookFilters,
  type PlaybookFormData,
  type PlaybookExecution,
  type CSTask,
  type CSTaskListResponse,
  type CSTaskFilters,
  type CSTaskFormData,
  type Touchpoint,
  type TouchpointListResponse,
  type TouchpointFilters,
  type TouchpointFormData,
  type CSOverview,
  type TaskSummary,
} from '../types/customerSuccess.ts';

// ============================================
// Query Keys
// ============================================

export const csKeys = {
  // Health Scores
  healthScores: ['cs', 'health-scores'] as const,
  healthScoresList: (filters: HealthScoreFilters) => [...csKeys.healthScores, 'list', filters] as const,
  healthScoreByCustomer: (customerId: number) => [...csKeys.healthScores, 'customer', customerId] as const,
  healthScoreTrend: (customerId: number, days: number) => [...csKeys.healthScores, 'trend', customerId, days] as const,
  healthScoreSummary: () => [...csKeys.healthScores, 'summary'] as const,

  // Segments
  segments: ['cs', 'segments'] as const,
  segmentsList: (filters: SegmentFilters) => [...csKeys.segments, 'list', filters] as const,
  segmentDetail: (id: number) => [...csKeys.segments, 'detail', id] as const,
  segmentCustomers: (id: number) => [...csKeys.segments, 'customers', id] as const,

  // Journeys
  journeys: ['cs', 'journeys'] as const,
  journeysList: (filters: JourneyFilters) => [...csKeys.journeys, 'list', filters] as const,
  journeyDetail: (id: number) => [...csKeys.journeys, 'detail', id] as const,
  journeyEnrollments: (id: number) => [...csKeys.journeys, 'enrollments', id] as const,
  customerEnrollments: (customerId: number) => [...csKeys.journeys, 'customer-enrollments', customerId] as const,

  // Playbooks
  playbooks: ['cs', 'playbooks'] as const,
  playbooksList: (filters: PlaybookFilters) => [...csKeys.playbooks, 'list', filters] as const,
  playbookDetail: (id: number) => [...csKeys.playbooks, 'detail', id] as const,
  playbookExecutions: (id: number) => [...csKeys.playbooks, 'executions', id] as const,
  customerExecutions: (customerId: number) => [...csKeys.playbooks, 'customer-executions', customerId] as const,

  // Tasks
  tasks: ['cs', 'tasks'] as const,
  tasksList: (filters: CSTaskFilters) => [...csKeys.tasks, 'list', filters] as const,
  taskDetail: (id: number) => [...csKeys.tasks, 'detail', id] as const,
  taskSummary: (userId?: number) => [...csKeys.tasks, 'summary', userId] as const,
  customerTasks: (customerId: number) => [...csKeys.tasks, 'customer', customerId] as const,
  overdueTasks: () => [...csKeys.tasks, 'overdue'] as const,
  dueTodayTasks: () => [...csKeys.tasks, 'due-today'] as const,

  // Touchpoints
  touchpoints: ['cs', 'touchpoints'] as const,
  touchpointsList: (filters: TouchpointFilters) => [...csKeys.touchpoints, 'list', filters] as const,
  touchpointDetail: (id: number) => [...csKeys.touchpoints, 'detail', id] as const,
  customerTimeline: (customerId: number, days: number) => [...csKeys.touchpoints, 'timeline', customerId, days] as const,
  touchpointSummary: (customerId?: number, days?: number) => [...csKeys.touchpoints, 'summary', customerId, days] as const,

  // Dashboard
  dashboard: ['cs', 'dashboard'] as const,
  overview: () => [...csKeys.dashboard, 'overview'] as const,
  atRiskCustomers: () => [...csKeys.dashboard, 'at-risk'] as const,
  myTasks: () => [...csKeys.dashboard, 'my-tasks'] as const,
  journeyPerformance: (days: number) => [...csKeys.dashboard, 'journey-performance', days] as const,
  playbookPerformance: (days: number) => [...csKeys.dashboard, 'playbook-performance', days] as const,
  segmentInsights: () => [...csKeys.dashboard, 'segment-insights'] as const,
  activityFeed: () => [...csKeys.dashboard, 'activity-feed'] as const,
};

// ============================================
// Health Score Hooks
// ============================================

export function useHealthScores(filters: HealthScoreFilters = {}) {
  return useQuery({
    queryKey: csKeys.healthScoresList(filters),
    queryFn: async (): Promise<HealthScoreListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.health_status) params.set('health_status', filters.health_status);
      if (filters.min_score) params.set('min_score', String(filters.min_score));
      if (filters.max_score) params.set('max_score', String(filters.max_score));
      if (filters.trend) params.set('trend', filters.trend);

      const { data } = await apiClient.get(`/cs/health-scores/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCustomerHealthScore(customerId: number | undefined) {
  return useQuery({
    queryKey: csKeys.healthScoreByCustomer(customerId!),
    queryFn: async (): Promise<HealthScore> => {
      const { data } = await apiClient.get(`/cs/health-scores/customer/${customerId}`);
      return data;
    },
    enabled: !!customerId,
  });
}

export function useHealthScoreSummary() {
  return useQuery({
    queryKey: csKeys.healthScoreSummary(),
    queryFn: async () => {
      const { data } = await apiClient.get('/cs/health-scores/summary');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: number; data: Partial<HealthScoreFormData> }): Promise<HealthScore> => {
      const response = await apiClient.patch(`/cs/health-scores/customer/${customerId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.healthScoreByCustomer(variables.customerId) });
      queryClient.invalidateQueries({ queryKey: csKeys.healthScores });
    },
  });
}

// ============================================
// Segment Hooks
// ============================================

export function useSegments(filters: SegmentFilters = {}) {
  return useQuery({
    queryKey: csKeys.segmentsList(filters),
    queryFn: async (): Promise<SegmentListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.segment_type) params.set('segment_type', filters.segment_type);
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/segments/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSegment(id: number | undefined) {
  return useQuery({
    queryKey: csKeys.segmentDetail(id!),
    queryFn: async (): Promise<Segment> => {
      const { data } = await apiClient.get(`/cs/segments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SegmentFormData): Promise<Segment> => {
      const response = await apiClient.post('/cs/segments/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SegmentFormData> }): Promise<Segment> => {
      const response = await apiClient.patch(`/cs/segments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.segmentDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

// ============================================
// Journey Hooks
// ============================================

export function useJourneys(filters: JourneyFilters = {}) {
  return useQuery({
    queryKey: csKeys.journeysList(filters),
    queryFn: async (): Promise<JourneyListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.status) params.set('status', filters.status);
      if (filters.journey_type) params.set('journey_type', filters.journey_type);
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/journeys/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useJourney(id: number | undefined) {
  return useQuery({
    queryKey: csKeys.journeyDetail(id!),
    queryFn: async (): Promise<Journey> => {
      const { data } = await apiClient.get(`/cs/journeys/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JourneyFormData): Promise<Journey> => {
      const response = await apiClient.post('/cs/journeys/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useUpdateJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JourneyFormData> }): Promise<Journey> => {
      const response = await apiClient.patch(`/cs/journeys/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeyDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useDeleteJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/journeys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useEnrollCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { customer_id: number; journey_id: number; reason?: string }): Promise<JourneyEnrollment> => {
      const response = await apiClient.post('/cs/journeys/enroll', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeyEnrollments(variables.journey_id) });
      queryClient.invalidateQueries({ queryKey: csKeys.customerEnrollments(variables.customer_id) });
    },
  });
}

export function usePauseEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: number): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/journeys/enrollments/${enrollmentId}/pause`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useResumeEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: number): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/journeys/enrollments/${enrollmentId}/resume`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useExitEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: number; reason?: string }): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/journeys/enrollments/${enrollmentId}/exit`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useJourneyEnrollments(journeyId: number | undefined) {
  return useQuery({
    queryKey: csKeys.journeyEnrollments(journeyId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/journeys/${journeyId}/enrollments`);
      return data;
    },
    enabled: !!journeyId,
  });
}

export interface JourneyStepFormData {
  name: string;
  description?: string;
  step_type: string;
  step_order: number;
  wait_duration_hours?: number;
  condition_rules?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
  is_required?: boolean;
  is_active?: boolean;
}

export function useCreateJourneyStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ journeyId, data }: { journeyId: number; data: JourneyStepFormData }) => {
      const response = await apiClient.post(`/cs/journeys/${journeyId}/steps`, {
        journey_id: journeyId,
        ...data,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeyDetail(variables.journeyId) });
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useUpdateJourneyStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ journeyId, stepId, data }: { journeyId: number; stepId: number; data: Partial<JourneyStepFormData> }) => {
      const response = await apiClient.patch(`/cs/journeys/${journeyId}/steps/${stepId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeyDetail(variables.journeyId) });
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export function useDeleteJourneyStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ journeyId, stepId }: { journeyId: number; stepId: number }) => {
      await apiClient.delete(`/cs/journeys/${journeyId}/steps/${stepId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.journeyDetail(variables.journeyId) });
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

export interface SeedJourneyStepsResponse {
  status: string;
  message: string;
  journeys: Array<{
    journey_id: number;
    journey_name: string;
    steps_added: number;
  }>;
}

export function useSeedJourneySteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SeedJourneyStepsResponse> => {
      const response = await apiClient.post('/cs/journeys/seed-steps');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all journey queries to refresh the data
      queryClient.invalidateQueries({ queryKey: csKeys.journeys });
    },
  });
}

// ============================================
// Playbook Hooks
// ============================================

export function usePlaybooks(filters: PlaybookFilters = {}) {
  return useQuery({
    queryKey: csKeys.playbooksList(filters),
    queryFn: async (): Promise<PlaybookListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.category) params.set('category', filters.category);
      if (filters.trigger_type) params.set('trigger_type', filters.trigger_type);
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/playbooks/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function usePlaybook(id: number | undefined) {
  return useQuery({
    queryKey: csKeys.playbookDetail(id!),
    queryFn: async (): Promise<Playbook> => {
      const { data } = await apiClient.get(`/cs/playbooks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PlaybookFormData): Promise<Playbook> => {
      const response = await apiClient.post('/cs/playbooks/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function useUpdatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PlaybookFormData> }): Promise<Playbook> => {
      const response = await apiClient.patch(`/cs/playbooks/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbookDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function useDeletePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/playbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function useTriggerPlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { playbook_id: number; customer_id: number; reason?: string }): Promise<PlaybookExecution> => {
      const response = await apiClient.post('/cs/playbooks/trigger', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbookExecutions(variables.playbook_id) });
      queryClient.invalidateQueries({ queryKey: csKeys.customerExecutions(variables.customer_id) });
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function usePausePlaybookExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: number): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/playbooks/executions/${executionId}/pause`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function useResumePlaybookExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: number): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/playbooks/executions/${executionId}/resume`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function useCancelPlaybookExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ executionId, reason }: { executionId: number; reason?: string }): Promise<{ status: string; message: string }> => {
      const response = await apiClient.post(`/cs/playbooks/executions/${executionId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.playbooks });
    },
  });
}

export function usePlaybookExecutions(playbookId: number | undefined) {
  return useQuery({
    queryKey: csKeys.playbookExecutions(playbookId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/playbooks/${playbookId}/executions`);
      return data;
    },
    enabled: !!playbookId,
  });
}

// ============================================
// Task Hooks
// ============================================

export function useCSTasks(filters: CSTaskFilters = {}) {
  return useQuery({
    queryKey: csKeys.tasksList(filters),
    queryFn: async (): Promise<CSTaskListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.task_type) params.set('task_type', filters.task_type);
      if (filters.category) params.set('category', filters.category);
      if (filters.assigned_to_user_id) params.set('assigned_to_user_id', String(filters.assigned_to_user_id));
      if (filters.customer_id) params.set('customer_id', String(filters.customer_id));
      if (filters.due_before) params.set('due_before', filters.due_before);
      if (filters.due_after) params.set('due_after', filters.due_after);
      if (filters.search) params.set('search', filters.search);
      if (filters.my_tasks) params.set('my_tasks', 'true');

      const { data } = await apiClient.get(`/cs/tasks/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCSTask(id: number | undefined) {
  return useQuery({
    queryKey: csKeys.taskDetail(id!),
    queryFn: async (): Promise<CSTask> => {
      const { data } = await apiClient.get(`/cs/tasks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCSTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CSTaskFormData): Promise<CSTask> => {
      const response = await apiClient.post('/cs/tasks/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function useUpdateCSTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CSTaskFormData> }): Promise<CSTask> => {
      const response = await apiClient.patch(`/cs/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.taskDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function useCompleteCSTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, outcome, notes }: { id: number; outcome: string; notes?: string }): Promise<CSTask> => {
      const response = await apiClient.post(`/cs/tasks/${id}/complete`, {
        outcome,
        outcome_notes: notes,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.taskDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function useDeleteCSTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function useSnoozeCSTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, snoozedUntil }: { id: number; snoozedUntil: string }): Promise<CSTask> => {
      const response = await apiClient.post(`/cs/tasks/${id}/snooze`, { snoozed_until: snoozedUntil });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.taskDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

export function useTaskSummary(userId?: number) {
  return useQuery({
    queryKey: csKeys.taskSummary(userId),
    queryFn: async () => {
      const params = userId ? `?assigned_to_user_id=${userId}` : '';
      const { data } = await apiClient.get(`/cs/tasks/summary${params}`);
      return data;
    },
    staleTime: 60_000,
  });
}

// ============================================
// Touchpoint Hooks
// ============================================

export function useTouchpoints(filters: TouchpointFilters = {}) {
  return useQuery({
    queryKey: csKeys.touchpointsList(filters),
    queryFn: async (): Promise<TouchpointListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.customer_id) params.set('customer_id', String(filters.customer_id));
      if (filters.touchpoint_type) params.set('touchpoint_type', filters.touchpoint_type);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.direction) params.set('direction', filters.direction);
      if (filters.sentiment_label) params.set('sentiment_label', filters.sentiment_label);
      if (filters.user_id) params.set('user_id', String(filters.user_id));
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);

      const { data } = await apiClient.get(`/cs/touchpoints/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCustomerTimeline(customerId: number | undefined, days: number = 90) {
  return useQuery({
    queryKey: csKeys.customerTimeline(customerId!, days),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/touchpoints/customer/${customerId}/timeline?days=${days}`);
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCreateTouchpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TouchpointFormData): Promise<Touchpoint> => {
      const response = await apiClient.post('/cs/touchpoints/', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.touchpoints });
      queryClient.invalidateQueries({ queryKey: csKeys.customerTimeline(variables.customer_id, 90) });
    },
  });
}

export function useUpdateTouchpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TouchpointFormData> }): Promise<Touchpoint> => {
      const response = await apiClient.patch(`/cs/touchpoints/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.touchpointDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: csKeys.touchpoints });
    },
  });
}

export function useDeleteTouchpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/touchpoints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.touchpoints });
    },
  });
}

// ============================================
// Dashboard Hooks
// ============================================

export function useCSOverview() {
  return useQuery({
    queryKey: csKeys.overview(),
    queryFn: async (): Promise<CSOverview> => {
      const { data } = await apiClient.get('/cs/dashboard/overview');
      return data;
    },
    staleTime: 60_000,
  });
}

// Alias for dashboard overview
export const useCSDashboardOverview = useCSOverview;

export function useAtRiskCustomers(options: { limit?: number } = {}) {
  const limit = options.limit ?? 10;
  return useQuery({
    queryKey: csKeys.atRiskCustomers(),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/dashboard/at-risk-customers?limit=${limit}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useMyTasks(limit: number = 10) {
  return useQuery({
    queryKey: csKeys.myTasks(),
    queryFn: async (): Promise<TaskSummary> => {
      const { data } = await apiClient.get(`/cs/dashboard/my-tasks?limit=${limit}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useJourneyPerformance(days: number = 30) {
  return useQuery({
    queryKey: csKeys.journeyPerformance(days),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/dashboard/journey-performance?days=${days}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function usePlaybookPerformance(days: number = 30) {
  return useQuery({
    queryKey: csKeys.playbookPerformance(days),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/dashboard/playbook-performance?days=${days}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSegmentInsights() {
  return useQuery({
    queryKey: csKeys.segmentInsights(),
    queryFn: async () => {
      const { data } = await apiClient.get('/cs/dashboard/segment-insights');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useActivityFeed(limit: number = 20) {
  return useQuery({
    queryKey: csKeys.activityFeed(),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/dashboard/activity-feed?limit=${limit}`);
      return data;
    },
    staleTime: 30_000,
  });
}
