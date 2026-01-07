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

// ============================================
// Survey Hooks
// ============================================

export interface SurveyFilters {
  page?: number;
  page_size?: number;
  survey_type?: string;
  status?: string;
  search?: string;
}

export interface SurveyFormData {
  name: string;
  description?: string;
  survey_type?: string;
  trigger_type?: string;
  scheduled_at?: string;
  target_segment_id?: number;
  is_anonymous?: boolean;
  allow_multiple_responses?: boolean;
  send_reminder?: boolean;
  reminder_days?: number;
  questions?: SurveyQuestionFormData[];
}

export interface SurveyQuestionFormData {
  text: string;
  description?: string;
  question_type: string;
  order?: number;
  is_required?: boolean;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  options?: string[];
}

export const surveyKeys = {
  surveys: ['cs', 'surveys'] as const,
  surveysList: (filters: SurveyFilters) => [...surveyKeys.surveys, 'list', filters] as const,
  surveyDetail: (id: number) => [...surveyKeys.surveys, 'detail', id] as const,
  surveyResponses: (id: number) => [...surveyKeys.surveys, 'responses', id] as const,
  surveyAnalytics: (id: number) => [...surveyKeys.surveys, 'analytics', id] as const,
};

export function useSurveys(filters: SurveyFilters = {}) {
  return useQuery({
    queryKey: surveyKeys.surveysList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.survey_type) params.set('survey_type', filters.survey_type);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/surveys/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSurvey(id: number | undefined) {
  return useQuery({
    queryKey: surveyKeys.surveyDetail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/surveys/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SurveyFormData) => {
      const response = await apiClient.post('/cs/surveys/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveys });
    },
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SurveyFormData> }) => {
      const response = await apiClient.patch(`/cs/surveys/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveyDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveys });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cs/surveys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveys });
    },
  });
}

export function useActivateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/cs/surveys/${id}/activate`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveyDetail(id) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveys });
    },
  });
}

export function usePauseSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/cs/surveys/${id}/pause`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveyDetail(id) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.surveys });
    },
  });
}

export function useSurveyAnalytics(id: number | undefined) {
  return useQuery({
    queryKey: surveyKeys.surveyAnalytics(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/surveys/${id}/analytics`);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useSurveyResponses(surveyId: number | undefined, filters: { page?: number; sentiment?: string } = {}) {
  return useQuery({
    queryKey: surveyKeys.surveyResponses(surveyId!),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.sentiment) params.set('sentiment', filters.sentiment);

      const { data } = await apiClient.get(`/cs/surveys/${surveyId}/responses?${params}`);
      return data;
    },
    enabled: !!surveyId,
  });
}

// ============================================
// Campaign Hooks
// ============================================

export interface CampaignFilters {
  page?: number;
  page_size?: number;
  campaign_type?: string;
  status?: string;
  search?: string;
}

export interface CampaignFormData {
  name: string;
  description?: string;
  campaign_type?: string;
  primary_channel?: string;
  target_segment_id?: number;
  start_date?: string;
  end_date?: string;
  is_recurring?: boolean;
  allow_re_enrollment?: boolean;
  goal_type?: string;
  goal_metric?: string;
  goal_target?: number;
  steps?: CampaignStepFormData[];
}

export interface CampaignStepFormData {
  name: string;
  description?: string;
  step_type: string;
  order?: number;
  delay_days?: number;
  delay_hours?: number;
  subject?: string;
  content?: string;
  content_html?: string;
  cta_text?: string;
  cta_url?: string;
}

export const campaignKeys = {
  campaigns: ['cs', 'campaigns'] as const,
  campaignsList: (filters: CampaignFilters) => [...campaignKeys.campaigns, 'list', filters] as const,
  campaignDetail: (id: number) => [...campaignKeys.campaigns, 'detail', id] as const,
  campaignEnrollments: (id: number) => [...campaignKeys.campaigns, 'enrollments', id] as const,
  campaignAnalytics: (id: number) => [...campaignKeys.campaigns, 'analytics', id] as const,
};

export function useCampaigns(filters: CampaignFilters = {}) {
  return useQuery({
    queryKey: campaignKeys.campaignsList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.campaign_type) params.set('campaign_type', filters.campaign_type);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/campaigns/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCampaign(id: number | undefined) {
  return useQuery({
    queryKey: campaignKeys.campaignDetail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/campaigns/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await apiClient.post('/cs/campaigns/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CampaignFormData> }) => {
      const response = await apiClient.patch(`/cs/campaigns/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaignDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cs/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/cs/campaigns/${id}/launch`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaignDetail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/cs/campaigns/${id}/pause`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaignDetail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function useEnrollInCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, customerId }: { campaignId: number; customerId: number }) => {
      const response = await apiClient.post(`/cs/campaigns/${campaignId}/enroll`, { customer_id: customerId });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaignEnrollments(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.campaigns });
    },
  });
}

export function useCampaignAnalytics(id: number | undefined) {
  return useQuery({
    queryKey: campaignKeys.campaignAnalytics(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/campaigns/${id}/analytics`);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ============================================
// Escalation Hooks
// ============================================

export interface EscalationFilters {
  page?: number;
  page_size?: number;
  escalation_type?: string;
  severity?: string;
  status?: string;
  customer_id?: number;
  assigned_to_user_id?: number;
  search?: string;
}

export interface EscalationFormData {
  customer_id: number;
  title: string;
  description: string;
  escalation_type?: string;
  severity?: string;
  priority?: number;
  assigned_to_user_id?: number;
  escalated_to_user_id?: number;
  sla_hours?: number;
  revenue_at_risk?: number;
  churn_probability?: number;
  impact_description?: string;
  tags?: string[];
}

export interface EscalationNoteFormData {
  content: string;
  note_type?: string;
  is_internal?: boolean;
}

export const escalationKeys = {
  escalations: ['cs', 'escalations'] as const,
  escalationsList: (filters: EscalationFilters) => [...escalationKeys.escalations, 'list', filters] as const,
  escalationDetail: (id: number) => [...escalationKeys.escalations, 'detail', id] as const,
  escalationAnalytics: () => [...escalationKeys.escalations, 'analytics'] as const,
};

export function useEscalations(filters: EscalationFilters = {}) {
  return useQuery({
    queryKey: escalationKeys.escalationsList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.escalation_type) params.set('escalation_type', filters.escalation_type);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.status) params.set('status', filters.status);
      if (filters.customer_id) params.set('customer_id', String(filters.customer_id));
      if (filters.assigned_to_user_id) params.set('assigned_to_user_id', String(filters.assigned_to_user_id));
      if (filters.search) params.set('search', filters.search);

      const { data } = await apiClient.get(`/cs/escalations/?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useEscalation(id: number | undefined) {
  return useQuery({
    queryKey: escalationKeys.escalationDetail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/escalations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EscalationFormData) => {
      const response = await apiClient.post('/cs/escalations/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalations });
    },
  });
}

export function useUpdateEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EscalationFormData> }) => {
      const response = await apiClient.patch(`/cs/escalations/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalationDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalations });
    },
  });
}

export function useDeleteEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cs/escalations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalations });
    },
  });
}

export function useAddEscalationNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ escalationId, data }: { escalationId: number; data: EscalationNoteFormData }) => {
      const response = await apiClient.post(`/cs/escalations/${escalationId}/notes`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalationDetail(variables.escalationId) });
    },
  });
}

export function useResolveEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolution_summary, resolution_category }: { id: number; resolution_summary: string; resolution_category: string }) => {
      const response = await apiClient.post(`/cs/escalations/${id}/resolve`, null, {
        params: { resolution_summary, resolution_category },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalationDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalations });
    },
  });
}

export function useCloseEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, customer_satisfaction }: { id: number; customer_satisfaction?: number }) => {
      const params = customer_satisfaction ? `?customer_satisfaction=${customer_satisfaction}` : '';
      const response = await apiClient.post(`/cs/escalations/${id}/close${params}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalationDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: escalationKeys.escalations });
    },
  });
}

export function useEscalationAnalytics(days: number = 30) {
  return useQuery({
    queryKey: escalationKeys.escalationAnalytics(),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/escalations/analytics/summary?days=${days}`);
      return data;
    },
    staleTime: 60_000,
  });
}

// ============================================
// Collaboration Hub Hooks
// ============================================

export interface ResourceFilters {
  page?: number;
  page_size?: number;
  resource_type?: string;
  category?: string;
  search?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
}

export interface ResourceFormData {
  title: string;
  description?: string;
  resource_type: string;
  category?: string;
  content?: string;
  content_html?: string;
  url?: string;
  tags?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  visibility?: string;
}

export interface TeamNoteFilters {
  page?: number;
  page_size?: number;
  customer_id?: number;
  category?: string;
  search?: string;
  is_pinned?: boolean;
}

export interface TeamNoteFormData {
  title: string;
  content: string;
  content_html?: string;
  customer_id?: number;
  category?: string;
  tags?: string[];
  is_pinned?: boolean;
  visibility?: string;
}

export const collaborationKeys = {
  resources: ['cs', 'collaboration', 'resources'] as const,
  resourcesList: (filters: ResourceFilters) => [...collaborationKeys.resources, 'list', filters] as const,
  resourceDetail: (id: number) => [...collaborationKeys.resources, 'detail', id] as const,
  notes: ['cs', 'collaboration', 'notes'] as const,
  notesList: (filters: TeamNoteFilters) => [...collaborationKeys.notes, 'list', filters] as const,
  noteDetail: (id: number) => [...collaborationKeys.notes, 'detail', id] as const,
  activity: ['cs', 'collaboration', 'activity'] as const,
};

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: collaborationKeys.resourcesList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.resource_type) params.set('resource_type', filters.resource_type);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      if (filters.is_featured !== undefined) params.set('is_featured', String(filters.is_featured));
      if (filters.is_pinned !== undefined) params.set('is_pinned', String(filters.is_pinned));

      const { data } = await apiClient.get(`/cs/collaboration/resources?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useResource(id: number | undefined) {
  return useQuery({
    queryKey: collaborationKeys.resourceDetail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/collaboration/resources/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const response = await apiClient.post('/cs/collaboration/resources', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resources });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ResourceFormData> }) => {
      const response = await apiClient.patch(`/cs/collaboration/resources/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resourceDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resources });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cs/collaboration/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resources });
    },
  });
}

export function useLikeResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/cs/collaboration/resources/${id}/like`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resourceDetail(id) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resources });
    },
  });
}

export function useUnlikeResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/cs/collaboration/resources/${id}/like`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resourceDetail(id) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.resources });
    },
  });
}

export function useTeamNotes(filters: TeamNoteFilters = {}) {
  return useQuery({
    queryKey: collaborationKeys.notesList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.customer_id) params.set('customer_id', String(filters.customer_id));
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      if (filters.is_pinned !== undefined) params.set('is_pinned', String(filters.is_pinned));

      const { data } = await apiClient.get(`/cs/collaboration/notes?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTeamNote(id: number | undefined) {
  return useQuery({
    queryKey: collaborationKeys.noteDetail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cs/collaboration/notes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTeamNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TeamNoteFormData) => {
      const response = await apiClient.post('/cs/collaboration/notes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.notes });
    },
  });
}

export function useUpdateTeamNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TeamNoteFormData> }) => {
      const response = await apiClient.patch(`/cs/collaboration/notes/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.noteDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.notes });
    },
  });
}

export function useDeleteTeamNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cs/collaboration/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.notes });
    },
  });
}

export function useCollaborationActivity(filters: { activity_type?: string; customer_id?: number } = {}) {
  return useQuery({
    queryKey: collaborationKeys.activity,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.activity_type) params.set('activity_type', filters.activity_type);
      if (filters.customer_id) params.set('customer_id', String(filters.customer_id));

      const { data } = await apiClient.get(`/cs/collaboration/activity?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}
