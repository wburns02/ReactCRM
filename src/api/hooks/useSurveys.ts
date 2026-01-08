/**
 * Survey System API Hooks
 *
 * React Query hooks for the Enterprise Survey System.
 * Provides hooks for surveys, responses, analytics, and AI insights.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, withFallback } from '../client';

// ============================================
// Types
// ============================================

export type SurveyType = 'nps' | 'csat' | 'ces' | 'custom';
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SurveyTrigger = 'manual' | 'scheduled' | 'event' | 'milestone';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Survey {
  id: number;
  name: string;
  description?: string;
  survey_type: SurveyType;
  status: SurveyStatus;
  trigger_type: SurveyTrigger;
  scheduled_at?: string;
  schedule_recurrence?: string;
  trigger_event?: string;
  target_segment_id?: number;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  send_reminder: boolean;
  reminder_days: number;
  responses_count: number;
  avg_score?: number;
  completion_rate?: number;
  promoters_count: number;
  passives_count: number;
  detractors_count: number;
  created_at: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  questions: SurveyQuestion[];
  // Enhanced fields
  delivery_channel?: string;
  response_rate?: number;
  a_b_test_variant?: string;
}

export interface SurveyQuestion {
  id: number;
  survey_id: number;
  text: string;
  description?: string;
  question_type: 'rating' | 'scale' | 'text' | 'multiple_choice' | 'single_choice';
  order: number;
  is_required: boolean;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  options?: string[];
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  customer_id: number;
  customer_name?: string;
  overall_score?: number;
  sentiment?: Sentiment;
  sentiment_score?: number;
  feedback_text?: string;
  topics_detected?: string[];
  urgency_level?: UrgencyLevel;
  action_taken: boolean;
  action_type?: string;
  action_taken_at?: string;
  started_at: string;
  completed_at?: string;
  is_complete: boolean;
  source?: string;
  device?: string;
  created_at: string;
  answers: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: number;
  response_id: number;
  question_id: number;
  rating_value?: number;
  text_value?: string;
  choice_values?: string[];
}

export interface SurveyAnalytics {
  survey_id: number;
  total_responses: number;
  avg_score?: number;
  completion_rate?: number;
  nps_breakdown?: NPSBreakdown;
  response_trend: ResponseTrendPoint[];
  question_stats: QuestionStats[];
  sentiment_breakdown?: SentimentBreakdown;
}

export interface NPSBreakdown {
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number;
  total_responses: number;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ResponseTrendPoint {
  date: string;
  count: number;
  avg_score?: number;
}

export interface QuestionStats {
  question_id: number;
  question_text: string;
  response_count: number;
  avg_rating?: number;
}

export interface AIInsight {
  id: string;
  type: 'urgent_issue' | 'trend' | 'churn_risk' | 'competitor_mention' | 'theme';
  severity: UrgencyLevel;
  title: string;
  description: string;
  customer_id?: number;
  customer_name?: string;
  response_id?: number;
  score?: number;
  recommended_action?: string;
  created_at: string;
}

export interface SurveyAIAnalysis {
  survey_id: number;
  sentiment_breakdown: SentimentBreakdown;
  key_themes: ThemeAnalysis[];
  urgent_issues: AIInsight[];
  churn_risk_indicators: ChurnRiskIndicator[];
  competitor_mentions: CompetitorMention[];
  action_recommendations: ActionRecommendation[];
  overall_sentiment_score: number;
  analyzed_at: string;
}

export interface ThemeAnalysis {
  topic: string;
  count: number;
  sentiment: Sentiment;
  examples: string[];
}

export interface ChurnRiskIndicator {
  customer_id: number;
  customer_name: string;
  risk_score: number;
  risk_level: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface CompetitorMention {
  response_id: number;
  customer_name: string;
  text_snippet: string;
  competitor_type: 'named' | 'generic';
}

export interface ActionRecommendation {
  action_type: 'callback' | 'ticket' | 'offer' | 'appointment' | 'email';
  customer_id: number;
  customer_name: string;
  priority: UrgencyLevel;
  reason: string;
  context?: string;
}

export interface DetractorQueueItem {
  response_id: number;
  survey_id: number;
  survey_name: string;
  customer_id: number;
  customer_name: string;
  score: number;
  feedback: string;
  sentiment: Sentiment;
  urgency_level: UrgencyLevel;
  responded_at: string;
  action_taken: boolean;
  action_type?: string;
  time_since_response: string;
}

export interface SurveyListResponse {
  items: Survey[];
  total: number;
  page: number;
  page_size: number;
}

export interface SurveyResponseListResponse {
  items: SurveyResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface SurveyFilters {
  page?: number;
  page_size?: number;
  survey_type?: SurveyType;
  status?: SurveyStatus;
  search?: string;
}

export interface ResponseFilters {
  page?: number;
  page_size?: number;
  sentiment?: Sentiment;
  urgency_level?: UrgencyLevel;
  action_taken?: boolean;
}

export interface CreateSurveyData {
  name: string;
  description?: string;
  survey_type: SurveyType;
  trigger_type: SurveyTrigger;
  scheduled_at?: string;
  schedule_recurrence?: string;
  trigger_event?: string;
  target_segment_id?: number;
  is_anonymous?: boolean;
  allow_multiple_responses?: boolean;
  send_reminder?: boolean;
  reminder_days?: number;
  delivery_channel?: string;
  questions?: CreateQuestionData[];
}

export interface CreateQuestionData {
  text: string;
  description?: string;
  question_type: SurveyQuestion['question_type'];
  order?: number;
  is_required?: boolean;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  options?: string[];
}

export interface CreateActionData {
  response_id: number;
  action_type: 'callback' | 'ticket' | 'offer' | 'appointment' | 'email';
  notes?: string;
  assigned_to?: number;
  priority?: UrgencyLevel;
}

export interface TrendData {
  period: string;
  nps_score?: number;
  csat_score?: number;
  ces_score?: number;
  response_count: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
}

// ============================================
// Query Keys
// ============================================

export const surveyKeys = {
  all: ['surveys'] as const,
  lists: () => [...surveyKeys.all, 'list'] as const,
  list: (filters: SurveyFilters) => [...surveyKeys.lists(), filters] as const,
  detail: (id: number) => [...surveyKeys.all, 'detail', id] as const,
  responses: (surveyId: number, filters?: ResponseFilters) => [...surveyKeys.all, 'responses', surveyId, filters] as const,
  analytics: (id: number) => [...surveyKeys.all, 'analytics', id] as const,
  aiInsights: (id: number) => [...surveyKeys.all, 'ai-insights', id] as const,
  detractors: () => [...surveyKeys.all, 'detractors'] as const,
  trends: (days?: number) => [...surveyKeys.all, 'trends', days] as const,
  customerEligibility: (customerId: number) => [...surveyKeys.all, 'eligibility', customerId] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchSurveys(filters: SurveyFilters = {}): Promise<SurveyListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.survey_type) params.set('survey_type', filters.survey_type);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const { data } = await apiClient.get<SurveyListResponse>(`/cs/surveys?${params}`);
  return data;
}

async function fetchSurvey(id: number): Promise<Survey> {
  const { data } = await apiClient.get<Survey>(`/cs/surveys/${id}`);
  return data;
}

async function createSurvey(surveyData: CreateSurveyData): Promise<Survey> {
  const { data } = await apiClient.post<Survey>('/cs/surveys', surveyData);
  return data;
}

async function updateSurvey(id: number, surveyData: Partial<CreateSurveyData>): Promise<Survey> {
  const { data } = await apiClient.patch<Survey>(`/cs/surveys/${id}`, surveyData);
  return data;
}

async function deleteSurvey(id: number): Promise<void> {
  await apiClient.delete(`/cs/surveys/${id}`);
}

async function fetchSurveyResponses(surveyId: number, filters: ResponseFilters = {}): Promise<SurveyResponseListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.sentiment) params.set('sentiment', filters.sentiment);

  const { data } = await apiClient.get<SurveyResponseListResponse>(`/cs/surveys/${surveyId}/responses?${params}`);
  return data;
}

async function fetchSurveyAnalytics(id: number): Promise<SurveyAnalytics> {
  const { data } = await apiClient.get<SurveyAnalytics>(`/cs/surveys/${id}/analytics`);
  return data;
}

async function fetchSurveyAIInsights(id: number): Promise<SurveyAIAnalysis> {
  const { data } = await apiClient.get<SurveyAIAnalysis>(`/cs/surveys/${id}/ai-insights`);
  return data;
}

async function triggerSurveyAnalysis(id: number): Promise<SurveyAIAnalysis> {
  const { data } = await apiClient.post<SurveyAIAnalysis>(`/cs/surveys/${id}/analyze`);
  return data;
}

async function fetchDetractorQueue(): Promise<DetractorQueueItem[]> {
  const { data } = await apiClient.get<DetractorQueueItem[]>('/cs/surveys/detractors');
  return data;
}

async function fetchSurveyTrends(days: number = 90): Promise<TrendData[]> {
  const { data } = await apiClient.get<TrendData[]>(`/cs/surveys/trends?days=${days}`);
  return data;
}

async function createSurveyAction(surveyId: number, actionData: CreateActionData): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/cs/surveys/${surveyId}/actions`, actionData);
  return data;
}

async function markActionTaken(responseId: number, actionType: string): Promise<SurveyResponse> {
  const { data } = await apiClient.patch<SurveyResponse>(`/cs/surveys/responses/${responseId}/action`, {
    action_type: actionType,
  });
  return data;
}

async function activateSurvey(id: number): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post(`/cs/surveys/${id}/activate`);
  return data;
}

async function pauseSurvey(id: number): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post(`/cs/surveys/${id}/pause`);
  return data;
}

async function completeSurvey(id: number): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post(`/cs/surveys/${id}/complete`);
  return data;
}

async function checkSurveyEligibility(customerId: number): Promise<{
  eligible: boolean;
  reason?: string;
  next_eligible_date?: string;
  last_surveyed_at?: string;
}> {
  const { data } = await apiClient.get(`/cs/surveys/customers/${customerId}/eligibility`);
  return data;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch list of surveys with optional filtering
 */
export function useSurveys(filters: SurveyFilters = {}) {
  return useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: () => withFallback(
      () => fetchSurveys(filters),
      { items: [], total: 0, page: 1, page_size: 20 }
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single survey by ID
 */
export function useSurvey(id: number) {
  return useQuery({
    queryKey: surveyKeys.detail(id),
    queryFn: () => fetchSurvey(id),
    enabled: id > 0,
  });
}

/**
 * Fetch responses for a survey
 */
export function useSurveyResponses(surveyId: number, filters: ResponseFilters = {}) {
  return useQuery({
    queryKey: surveyKeys.responses(surveyId, filters),
    queryFn: () => withFallback(
      () => fetchSurveyResponses(surveyId, filters),
      { items: [], total: 0, page: 1, page_size: 20 }
    ),
    enabled: surveyId > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch analytics for a survey
 */
export function useSurveyAnalytics(id: number) {
  return useQuery({
    queryKey: surveyKeys.analytics(id),
    queryFn: () => fetchSurveyAnalytics(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch AI insights for a survey
 */
export function useSurveyAIInsights(id: number) {
  return useQuery({
    queryKey: surveyKeys.aiInsights(id),
    queryFn: () => withFallback(
      () => fetchSurveyAIInsights(id),
      {
        survey_id: id,
        sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
        key_themes: [],
        urgent_issues: [],
        churn_risk_indicators: [],
        competitor_mentions: [],
        action_recommendations: [],
        overall_sentiment_score: 0,
        analyzed_at: new Date().toISOString(),
      }
    ),
    enabled: id > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - AI analysis doesn't change often
  });
}

/**
 * Fetch detractor queue (all detractors needing action)
 */
export function useDetractorQueue() {
  return useQuery({
    queryKey: surveyKeys.detractors(),
    queryFn: () => withFallback(fetchDetractorQueue, []),
    staleTime: 1 * 60 * 1000, // 1 minute - important to keep fresh
  });
}

/**
 * Fetch cross-survey trends over time
 */
export function useSurveyTrends(days: number = 90) {
  return useQuery({
    queryKey: surveyKeys.trends(days),
    queryFn: () => withFallback(() => fetchSurveyTrends(days), []),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Check if a customer is eligible for a survey (survey fatigue prevention)
 */
export function useCustomerSurveyEligibility(customerId: number) {
  return useQuery({
    queryKey: surveyKeys.customerEligibility(customerId),
    queryFn: () => withFallback(
      () => checkSurveyEligibility(customerId),
      { eligible: true }
    ),
    enabled: customerId > 0,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new survey
 */
export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
    },
  });
}

/**
 * Update an existing survey
 */
export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSurveyData> }) =>
      updateSurvey(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a survey
 */
export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
    },
  });
}

/**
 * Activate a survey
 */
export function useActivateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateSurvey,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
    },
  });
}

/**
 * Pause a survey
 */
export function usePauseSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseSurvey,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
    },
  });
}

/**
 * Complete a survey
 */
export function useCompleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeSurvey,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
    },
  });
}

/**
 * Trigger AI analysis for a survey
 */
export function useTriggerSurveyAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerSurveyAnalysis,
    onSuccess: (data, id) => {
      queryClient.setQueryData(surveyKeys.aiInsights(id), data);
      queryClient.invalidateQueries({ queryKey: surveyKeys.analytics(id) });
    },
  });
}

/**
 * Create an action from a survey response
 */
export function useCreateSurveyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: number; data: CreateActionData }) =>
      createSurveyAction(surveyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.responses(variables.surveyId) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detractors() });
    },
  });
}

/**
 * Mark action taken on a response
 */
export function useMarkActionTaken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ responseId, actionType }: { responseId: number; actionType: string }) =>
      markActionTaken(responseId, actionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.all });
    },
  });
}
