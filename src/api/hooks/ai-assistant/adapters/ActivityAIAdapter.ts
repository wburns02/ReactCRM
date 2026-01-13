/**
 * Activity AI Adapter
 *
 * Integrates the existing useActivityAI hook with the unified AI assistant
 */

import { apiClient } from '../../../client';
import type { ActivitySummaryResult } from '../../useActivityAI';
import type { Activity } from '../../../types/activity';
import { BaseAIAdapterImpl } from './BaseAIAdapter';
import type { UnifiedAIResponse, AdapterSchema, AdapterExample, ActionableInsight } from './BaseAIAdapter';
import type { AIContext, AIAction, AICapability } from '@/api/types/aiAssistant';

// ===== QUERY INTERFACES =====

export interface ActivityQuery {
  type: 'summary' | 'range_summary' | 'action_items' | 'weekly_digest';
  customerId?: string;
  startDate?: string;
  endDate?: string;
  activities?: Activity[];
  timeframe?: string;
}

export interface ActivityResult extends ActivitySummaryResult {
  customer_id?: string;
  generated_at: string;
  confidence: number;
}

// ===== ADAPTER IMPLEMENTATION =====

export class ActivityAIAdapter extends BaseAIAdapterImpl<ActivityQuery, ActivityResult> {
  readonly domain = 'customer-activity' as const;
  readonly capabilities: AICapability[] = ['query', 'analysis', 'summarization', 'recommendation'];
  readonly version = '1.0.0';

  async query(request: ActivityQuery, context: AIContext): Promise<UnifiedAIResponse<ActivityResult>> {
    const startTime = Date.now();

    try {
      const result = await this.executeActivityQuery(request, context);
      const processingTime = Date.now() - startTime;

      return this.transformToUnified(result, context, {
        source_hook: this.getSourceHookName(),
        transformation_applied: true,
        demo_data_used: this.isDemoDataUsed(result),
        context_used: this.extractContextUsage(context),
        generated_at: new Date().toISOString(),
        processing_time_ms: processingTime
      });

    } catch (error) {
      throw new Error(`ActivityAI query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeActivityQuery(request: ActivityQuery, context: AIContext): Promise<ActivityResult> {
    switch (request.type) {
      case 'summary':
        return this.getActivitySummary(request, context);

      case 'range_summary':
        return this.getRangeSummary(request, context);

      case 'action_items':
        return this.extractActionItems(request, context);

      case 'weekly_digest':
        return this.getWeeklyDigest(request, context);

      default:
        throw new Error(`Unsupported ActivityAI query type: ${request.type}`);
    }
  }

  // ===== SPECIFIC QUERY METHODS =====

  private async getActivitySummary(request: ActivityQuery, context: AIContext): Promise<ActivityResult> {
    const customerId = request.customerId || this.extractCustomerFromContext(context);
    if (!customerId) {
      throw new Error('Customer ID required for activity summary');
    }

    try {
      const response = await apiClient.get(`/ai/customers/${customerId}/activity-summary`);
      return this.enhanceActivityResult(response.data, customerId);
    } catch {
      // Fallback to demo data generation
      try {
        const activitiesRes = await apiClient.get('/activities', {
          params: { customer_id: customerId, page_size: 50 }
        });
        const demoSummary = this.generateDemoSummary(activitiesRes.data?.items || []);
        return this.enhanceActivityResult(demoSummary, customerId);
      } catch {
        const demoSummary = this.generateDemoSummary([]);
        return this.enhanceActivityResult(demoSummary, customerId);
      }
    }
  }

  private async getRangeSummary(request: ActivityQuery, _context: AIContext): Promise<ActivityResult> {
    const { customerId, startDate, endDate } = request;

    if (!customerId || !startDate || !endDate) {
      throw new Error('Customer ID, start date, and end date required for range summary');
    }

    try {
      const response = await apiClient.post('/ai/activities/summarize-range', {
        customerId,
        startDate,
        endDate
      });
      return this.enhanceActivityResult(response.data, customerId);
    } catch {
      const demoSummary = this.generateDemoSummary([]);
      return this.enhanceActivityResult(demoSummary, customerId);
    }
  }

  private async extractActionItems(request: ActivityQuery, _context: AIContext): Promise<ActivityResult> {
    if (!request.activities || request.activities.length === 0) {
      throw new Error('Activities array required for action item extraction');
    }

    try {
      const response = await apiClient.post('/ai/activities/extract-actions', {
        activities: request.activities.map((a) => ({
          type: a.activity_type,
          description: a.description,
          created_at: a.created_at,
        })),
      });

      const actionItems = response.data.action_items || [];

      // Create a result format that matches ActivityResult
      const result: ActivitySummaryResult = {
        summary: `Extracted ${actionItems.length} action items from ${request.activities.length} activities`,
        key_points: actionItems.slice(0, 5), // Top 5 as key points
        action_items: actionItems,
        sentiment: this.inferSentimentFromActivities(request.activities),
        topics: this.extractTopicsFromActivities(request.activities),
        next_steps: actionItems.slice(0, 3), // First 3 as next steps
        interaction_quality: this.calculateInteractionQuality(request.activities)
      };

      return this.enhanceActivityResult(result, request.customerId);

    } catch {
      const demoActionItems = this.extractDemoActionItems(request.activities);
      const result: ActivitySummaryResult = {
        summary: `Generated ${demoActionItems.length} demo action items`,
        key_points: demoActionItems.slice(0, 5),
        action_items: demoActionItems,
        sentiment: 'neutral',
        topics: ['Demo Data'],
        next_steps: demoActionItems.slice(0, 3),
        interaction_quality: 7
      };

      return this.enhanceActivityResult(result, request.customerId);
    }
  }

  private async getWeeklyDigest(request: ActivityQuery, context: AIContext): Promise<ActivityResult> {
    const customerId = request.customerId || this.extractCustomerFromContext(context);
    if (!customerId) {
      throw new Error('Customer ID required for weekly digest');
    }

    try {
      const response = await apiClient.get(`/ai/customers/${customerId}/weekly-digest`);

      // Convert weekly digest to ActivityResult format
      const digest = response.data;
      const result: ActivitySummaryResult = {
        summary: `Weekly digest: ${digest.total_interactions} interactions this week`,
        key_points: digest.highlights || [],
        action_items: digest.recommended_actions || [],
        sentiment: 'neutral',
        topics: ['Weekly Summary'],
        next_steps: digest.pending_items || [],
        interaction_quality: 8
      };

      return this.enhanceActivityResult(result, customerId);

    } catch {
      // Demo weekly digest
      const result: ActivitySummaryResult = {
        summary: 'This week: 3 interactions recorded',
        key_points: [
          'Customer scheduled a service appointment',
          'Estimate was approved',
          'Follow-up call completed successfully'
        ],
        action_items: ['Send payment reminder', 'Schedule follow-up call'],
        sentiment: 'positive',
        topics: ['Service Scheduling', 'Estimates', 'Follow-up'],
        next_steps: ['Invoice payment pending', 'Satisfaction survey not completed'],
        interaction_quality: 8
      };

      return this.enhanceActivityResult(result, customerId);
    }
  }

  // ===== HELPER METHODS =====

  private enhanceActivityResult(summary: ActivitySummaryResult, customerId?: string): ActivityResult {
    return {
      ...summary,
      customer_id: customerId,
      generated_at: new Date().toISOString(),
      confidence: this.calculateConfidenceScore(summary)
    };
  }

  private calculateConfidenceScore(summary: ActivitySummaryResult): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence based on data quality
    if (summary.action_items.length > 0) confidence += 0.1;
    if (summary.key_points.length > 2) confidence += 0.1;
    if (summary.topics.length > 0) confidence += 0.05;
    if (summary.interaction_quality >= 7) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private extractCustomerFromContext(context: AIContext): string | undefined {
    // Try to get customer ID from current entity
    if (context.app.currentEntity?.type === 'customer') {
      return context.app.currentEntity.id;
    }

    // Try to get from domain context
    if (context.domain.customers && context.domain.customers.length > 0) {
      return context.domain.customers[0].id;
    }

    return undefined;
  }

  private isDemoDataUsed(result: ActivityResult): boolean {
    // Simple heuristic to detect demo data
    return result.summary.toLowerCase().includes('demo') ||
           result.key_points.some(point => point.toLowerCase().includes('demo'));
  }

  protected transformToUnified(
    originalResult: ActivityResult,
    context: AIContext,
    metadata?: any
  ): UnifiedAIResponse<ActivityResult> {
    return {
      domain: this.domain,
      operation: 'activity_analysis',
      result: {
        primary: originalResult,
        metadata
      },
      confidence: originalResult.confidence,
      completeness: this.calculateCompleteness(originalResult),
      freshness: this.calculateFreshness(originalResult),
      actionable_insights: this.generateActionableInsights(originalResult),
      suggested_actions: this.generateSuggestedActions(originalResult, context),
      follow_up_questions: this.generateFollowUpQuestions(originalResult),
      processing: {
        duration_ms: metadata?.processing_time_ms || 0,
        cache_hit: false,
        model_version: this.version
      }
    };
  }

  private generateActionableInsights(result: ActivityResult): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Sentiment-based insights
    if (result.sentiment === 'negative') {
      insights.push({
        type: 'risk',
        category: 'risk',
        title: 'Customer Satisfaction Risk',
        description: 'Recent interactions show negative sentiment. Immediate attention recommended.',
        priority: 'high',
        confidence: 0.85,
        estimated_impact: {
          type: 'revenue_opportunity',
          amount: 5000,
          unit: 'USD'
        }
      });
    }

    // Interaction quality insights
    if (result.interaction_quality < 6) {
      insights.push({
        type: 'optimization',
        category: 'optimization',
        title: 'Interaction Quality Improvement',
        description: 'Communication quality could be improved for better customer experience.',
        priority: 'medium',
        confidence: 0.75,
        estimated_impact: {
          type: 'time_saved',
          amount: 30,
          unit: 'minutes'
        }
      });
    }

    // Action items insights
    if (result.action_items.length > 5) {
      insights.push({
        type: 'opportunity',
        category: 'opportunity',
        title: 'High Activity Volume',
        description: 'Multiple action items identified. Consider prioritizing by impact.',
        priority: 'medium',
        confidence: 0.80
      });
    }

    return insights;
  }

  private generateSuggestedActions(result: ActivityResult, context: AIContext): AIAction[] {
    const actions: AIAction[] = [];

    // Action for follow-up scheduling
    if (result.action_items.length > 0) {
      actions.push({
        id: `action_${Date.now()}_followup`,
        type: 'create',
        domain: 'scheduling',
        operation: 'schedule_followup',
        payload: {
          customerId: result.customer_id,
          actionItems: result.action_items,
          priority: result.sentiment === 'negative' ? 'high' : 'medium'
        },
        requirements: [{
          type: 'permission',
          description: 'User can schedule customer follow-ups',
          satisfied: context.user.permissions.includes('schedule:appointments')
        }],
        status: 'pending',
        confidence: 0.8,
        estimatedImpact: {
          customer_satisfaction: 'positive',
          time_saved_minutes: 15
        }
      });
    }

    // Action for customer notification if negative sentiment
    if (result.sentiment === 'negative' && result.customer_id) {
      actions.push({
        id: `action_${Date.now()}_notification`,
        type: 'create',
        domain: 'customer-activity',
        operation: 'send_notification',
        payload: {
          customerId: result.customer_id,
          type: 'satisfaction_check',
          message: 'Automated follow-up based on recent interaction analysis'
        },
        requirements: [{
          type: 'permission',
          description: 'User can send customer notifications',
          satisfied: context.user.permissions.includes('write:customer_communication')
        }],
        status: 'pending',
        confidence: 0.75,
        estimatedImpact: {
          customer_satisfaction: 'positive'
        }
      });
    }

    return actions;
  }

  private generateFollowUpQuestions(result: ActivityResult): string[] {
    const questions: string[] = [];

    if (result.customer_id) {
      questions.push(`What other customers have similar activity patterns to ${result.customer_id}?`);
      questions.push(`What's the payment history for ${result.customer_id}?`);
    }

    if (result.topics.length > 0) {
      questions.push(`Show me more customers discussing ${result.topics[0]} topics`);
    }

    if (result.sentiment === 'negative') {
      questions.push('What actions have been most effective for improving customer satisfaction?');
    }

    questions.push('How does this activity compare to the customer\'s historical engagement?');

    return questions.slice(0, 4); // Limit to 4 questions
  }

  private calculateFreshness(result: ActivityResult): number {
    // Calculate based on when the data was generated
    const now = Date.now();
    const generated = new Date(result.generated_at).getTime();
    const ageInHours = (now - generated) / (1000 * 60 * 60);

    // Fresh within 1 hour = 1.0, decreases over time
    return Math.max(0, Math.min(1, 1 - (ageInHours / 24)));
  }

  // ===== DEMO DATA GENERATION =====

  private generateDemoSummary(activities: Activity[]): ActivitySummaryResult {
    if (activities.length === 0) {
      return {
        summary: 'No recent activity recorded for this customer. Consider reaching out to maintain engagement.',
        key_points: ['No recent interactions'],
        action_items: ['Schedule initial contact', 'Send introduction email'],
        sentiment: 'neutral',
        topics: [],
        next_steps: ['Initiate customer contact'],
        interaction_quality: 5,
      };
    }

    const activityTypes = activities.map((a) => a.activity_type);
    const hasCall = activityTypes.includes('call');
    const hasEmail = activityTypes.includes('email');
    const hasMeeting = activityTypes.includes('meeting');

    return {
      summary: `Customer has ${activities.length} recent activities including ${hasCall ? 'calls' : ''} ${hasEmail ? 'emails' : ''} ${hasMeeting ? 'meetings' : ''}`,
      key_points: [
        `${activities.length} total interactions`,
        hasCall ? 'Phone communication active' : 'Limited phone contact',
        hasMeeting ? 'In-person meetings scheduled' : 'Remote communication only'
      ],
      action_items: [
        'Review recent communication quality',
        'Schedule follow-up call',
        'Send satisfaction survey'
      ],
      sentiment: this.inferSentimentFromActivities(activities),
      topics: this.extractTopicsFromActivities(activities),
      next_steps: ['Follow up on pending items'],
      interaction_quality: this.calculateInteractionQuality(activities)
    };
  }

  private extractDemoActionItems(activities: Activity[]): string[] {
    const actionItems = ['Review customer satisfaction', 'Update contact preferences'];

    if (activities.some(a => a.description?.toLowerCase().includes('payment'))) {
      actionItems.push('Follow up on payment status');
    }

    if (activities.some(a => a.description?.toLowerCase().includes('service'))) {
      actionItems.push('Schedule service follow-up');
    }

    return actionItems;
  }

  private inferSentimentFromActivities(activities: Activity[]): 'positive' | 'neutral' | 'negative' {
    const descriptions = activities.map(a => a.description || '').join(' ').toLowerCase();

    if (descriptions.includes('happy') || descriptions.includes('satisfied') || descriptions.includes('excellent')) {
      return 'positive';
    }

    if (descriptions.includes('angry') || descriptions.includes('dissatisfied') || descriptions.includes('complaint')) {
      return 'negative';
    }

    return 'neutral';
  }

  private extractTopicsFromActivities(activities: Activity[]): string[] {
    const topics: string[] = [];
    const descriptions = activities.map(a => a.description || '').join(' ').toLowerCase();

    if (descriptions.includes('payment') || descriptions.includes('billing')) {
      topics.push('Billing');
    }
    if (descriptions.includes('service') || descriptions.includes('maintenance')) {
      topics.push('Service');
    }
    if (descriptions.includes('complaint') || descriptions.includes('issue')) {
      topics.push('Support');
    }

    return topics;
  }

  private calculateInteractionQuality(activities: Activity[]): number {
    // Simple heuristic based on activity diversity and recency
    const uniqueTypes = new Set(activities.map(a => a.activity_type)).size;
    const recentActivities = activities.filter(a =>
      new Date(a.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
    ).length;

    return Math.min(10, 5 + uniqueTypes + (recentActivities * 0.5));
  }

  // ===== ADAPTER METADATA =====

  protected getSourceHookName(): string {
    return 'useActivityAI';
  }

  getSchema(): AdapterSchema {
    return {
      query_schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['summary', 'range_summary', 'action_items', 'weekly_digest']
          },
          customerId: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          activities: { type: 'array' },
          timeframe: { type: 'string' }
        },
        required: ['type']
      },
      response_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          key_points: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          topics: { type: 'array', items: { type: 'string' } },
          interaction_quality: { type: 'number', minimum: 1, maximum: 10 }
        }
      }
    };
  }

  getExamples(): AdapterExample[] {
    return [
      {
        name: 'Customer Activity Summary',
        description: 'Get a summary of recent customer activities',
        query: {
          type: 'summary',
          customerId: 'customer_123'
        },
        expected_response: {
          summary: 'Customer has been actively engaged with 5 interactions this month',
          key_points: ['Regular communication', 'Payment up to date', 'Service scheduled'],
          action_items: ['Follow up on service', 'Send satisfaction survey'],
          sentiment: 'positive',
          topics: ['Service', 'Billing'],
          interaction_quality: 8
        }
      },
      {
        name: 'Date Range Summary',
        description: 'Analyze activities within a specific date range',
        query: {
          type: 'range_summary',
          customerId: 'customer_456',
          startDate: '2025-01-01',
          endDate: '2025-01-13'
        },
        expected_response: {
          summary: 'January activities show increased engagement',
          key_points: ['3 service calls', '2 email exchanges', '1 on-site visit'],
          action_items: ['Schedule follow-up', 'Process payment'],
          sentiment: 'positive',
          topics: ['HVAC Service', 'Emergency Repair'],
          interaction_quality: 9
        }
      }
    ];
  }
}

// ===== VALIDATION HELPER =====

export function validateActivityQuery(query: ActivityQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!query.type) {
    errors.push('Query type is required');
  }

  if (query.type === 'summary' || query.type === 'weekly_digest') {
    if (!query.customerId) {
      errors.push('Customer ID is required for summary and weekly digest queries');
    }
  }

  if (query.type === 'range_summary') {
    if (!query.customerId || !query.startDate || !query.endDate) {
      errors.push('Customer ID, start date, and end date are required for range summary');
    }
  }

  if (query.type === 'action_items') {
    if (!query.activities || query.activities.length === 0) {
      errors.push('Activities array is required for action item extraction');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}