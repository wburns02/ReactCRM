/**
 * Search AI Adapter
 *
 * Integrates intelligent search capabilities with the unified assistant
 */

import {
  BaseAIAdapterImpl,
  type UnifiedAIResponse,
  type AdapterSchema,
  type AdapterExample,
  type ActionableInsight
} from './BaseAIAdapter';
import type {
  AIDomain,
  AICapability,
  AIContext,
  HealthStatus
} from '@/api/types/aiAssistant';

// ===== SEARCH QUERY TYPES =====

export interface SearchQuery {
  operation: 'semantic_search' | 'entity_lookup' | 'suggestion' | 'recent_items' | 'advanced_filter';
  parameters: SearchParameters;
}

export interface SearchParameters {
  query: string;
  entity_types?: EntityType[];
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  include_archived?: boolean;
  sort_by?: 'relevance' | 'date' | 'name' | 'activity';
}

export type EntityType = 'customer' | 'work_order' | 'ticket' | 'technician' | 'invoice' | 'equipment' | 'document';

export interface SearchFilters {
  date_range?: { start: string; end: string };
  status?: string[];
  assigned_to?: string;
  customer_id?: string;
  tags?: string[];
}

export interface SearchResult {
  results: SearchHit[];
  total_count: number;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  query_understanding: QueryUnderstanding;
}

export interface SearchHit {
  id: string;
  entity_type: EntityType;
  title: string;
  subtitle?: string;
  description?: string;
  highlight?: string;
  relevance_score: number;
  metadata: Record<string, unknown>;
  actions: QuickAction[];
}

export interface SearchFacets {
  by_type: Record<EntityType, number>;
  by_status: Record<string, number>;
  by_date: { recent: number; this_week: number; this_month: number; older: number };
}

export interface SearchSuggestion {
  type: 'query' | 'filter' | 'entity';
  text: string;
  description?: string;
  action?: { type: string; payload: Record<string, unknown> };
}

export interface QueryUnderstanding {
  detected_intent: string;
  extracted_entities: { type: string; value: string; confidence: number }[];
  query_expansion: string[];
  confidence: number;
}

export interface QuickAction {
  label: string;
  icon?: string;
  action: { type: string; payload: Record<string, unknown> };
}

// ===== SEARCH AI ADAPTER =====

export class SearchAIAdapter extends BaseAIAdapterImpl<SearchQuery, SearchResult> {
  readonly domain: AIDomain = 'search';
  readonly version = '1.0.0';
  readonly capabilities: AICapability[] = [
    'query',
    'recommendation',
    'classification'
  ];

  async query(request: SearchQuery, context: AIContext): Promise<UnifiedAIResponse<SearchResult>> {
    const startTime = Date.now();

    try {
      // Execute search operation
      const result = await this.executeSearchOperation(request, context);

      // Transform to unified response
      const response = this.transformToUnified(result, context);

      // Add search-specific insights
      response.actionable_insights = this.generateSearchInsights(result, request);
      response.follow_up_questions = this.generateFollowUpQuestions(result, request);

      // Add processing time
      response.processing.duration_ms = Date.now() - startTime;

      return response;
    } catch (error) {
      return this.createErrorResponse(error, startTime);
    }
  }

  protected getSourceHookName(): string {
    return 'useSmartSearch';
  }

  getSchema(): AdapterSchema {
    return {
      query_schema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['semantic_search', 'entity_lookup', 'suggestion', 'recent_items', 'advanced_filter']
          },
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              entity_types: { type: 'array', items: { type: 'string' } },
              filters: { type: 'object' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              include_archived: { type: 'boolean' },
              sort_by: { type: 'string', enum: ['relevance', 'date', 'name', 'activity'] }
            },
            required: ['query']
          }
        },
        required: ['operation', 'parameters']
      },
      response_schema: {
        type: 'object',
        properties: {
          results: { type: 'array' },
          total_count: { type: 'number' },
          facets: { type: 'object' },
          suggestions: { type: 'array' },
          query_understanding: { type: 'object' }
        }
      }
    };
  }

  getExamples(): AdapterExample[] {
    return [
      {
        name: 'Semantic customer search',
        description: 'Search for customers using natural language',
        query: {
          operation: 'semantic_search',
          parameters: {
            query: 'customers with HVAC issues this week',
            entity_types: ['customer', 'work_order']
          }
        },
        expected_response: {
          results: [{ title: 'Acme Corp', relevance_score: 0.95 }],
          total_count: 15
        }
      },
      {
        name: 'Quick entity lookup',
        description: 'Look up a specific entity by ID or name',
        query: {
          operation: 'entity_lookup',
          parameters: {
            query: 'WO-12345',
            entity_types: ['work_order']
          }
        },
        expected_response: {
          results: [{ id: 'WO-12345', title: 'HVAC Repair' }],
          total_count: 1
        }
      }
    ];
  }

  // ===== PRIVATE METHODS =====

  private async executeSearchOperation(
    request: SearchQuery,
    context: AIContext
  ): Promise<SearchResult> {
    switch (request.operation) {
      case 'semantic_search':
        return this.performSemanticSearch(request.parameters, context);
      case 'entity_lookup':
        return this.performEntityLookup(request.parameters, context);
      case 'suggestion':
        return this.generateSuggestions(request.parameters, context);
      case 'recent_items':
        return this.getRecentItems(request.parameters, context);
      case 'advanced_filter':
        return this.performAdvancedFilter(request.parameters, context);
      default:
        return this.getDefaultResult();
    }
  }

  private performSemanticSearch(
    params: SearchParameters,
    context: AIContext
  ): SearchResult {
    const query = params.query.toLowerCase();

    // Generate contextual search results
    const results: SearchHit[] = [];

    // Search customers
    if (!params.entity_types || params.entity_types.includes('customer')) {
      const customers = context.domain.customers || [];
      customers.forEach((c, i) => {
        if (c.name.toLowerCase().includes(query) || query.includes('customer')) {
          results.push({
            id: c.id,
            entity_type: 'customer',
            title: c.name,
            subtitle: `${c.tier} customer`,
            description: `Risk: ${c.risk_level} | Interactions: ${c.recent_interactions}`,
            relevance_score: 0.95 - i * 0.05,
            metadata: { tier: c.tier, risk: c.risk_level },
            actions: [
              { label: 'View', action: { type: 'navigate', payload: { path: `/customers/${c.id}` } } },
              { label: 'Call', action: { type: 'call', payload: { customer_id: c.id } } }
            ]
          });
        }
      });
    }

    // Search work orders
    if (!params.entity_types || params.entity_types.includes('work_order')) {
      const workOrders = context.domain.workOrders || [];
      workOrders.forEach((wo, i) => {
        if (
          wo.service_type.toLowerCase().includes(query) ||
          wo.status.toLowerCase().includes(query) ||
          query.includes('work order') ||
          query.includes('job')
        ) {
          results.push({
            id: wo.id,
            entity_type: 'work_order',
            title: `${wo.service_type} - ${wo.id}`,
            subtitle: `Status: ${wo.status}`,
            description: `Priority: ${wo.priority} | Scheduled: ${wo.scheduled_date || 'Unscheduled'}`,
            relevance_score: 0.90 - i * 0.05,
            metadata: { status: wo.status, priority: wo.priority },
            actions: [
              { label: 'View', action: { type: 'navigate', payload: { path: `/work-orders/${wo.id}` } } },
              { label: 'Schedule', action: { type: 'schedule', payload: { work_order_id: wo.id } } }
            ]
          });
        }
      });
    }

    // Search technicians
    if (!params.entity_types || params.entity_types.includes('technician')) {
      const technicians = context.domain.technicians || [];
      technicians.forEach((t, i) => {
        if (
          t.name.toLowerCase().includes(query) ||
          t.skills.some(s => s.toLowerCase().includes(query)) ||
          query.includes('technician') ||
          query.includes('tech')
        ) {
          results.push({
            id: t.id,
            entity_type: 'technician',
            title: t.name,
            subtitle: `Status: ${t.status}`,
            description: `Skills: ${t.skills.join(', ')}`,
            relevance_score: 0.88 - i * 0.05,
            metadata: { status: t.status, skills: t.skills },
            actions: [
              { label: 'View', action: { type: 'navigate', payload: { path: `/technicians/${t.id}` } } },
              { label: 'Assign Job', action: { type: 'assign', payload: { technician_id: t.id } } }
            ]
          });
        }
      });
    }

    // Add demo results if no context data
    if (results.length === 0) {
      results.push(
        {
          id: 'demo-1',
          entity_type: 'customer',
          title: 'Acme Corporation',
          subtitle: 'VIP Customer',
          description: 'Last service: 2 days ago | 5 active work orders',
          highlight: `Match for "${query}"`,
          relevance_score: 0.95,
          metadata: { tier: 'vip', active_orders: 5 },
          actions: [
            { label: 'View', action: { type: 'navigate', payload: { path: '/customers/1' } } }
          ]
        },
        {
          id: 'demo-2',
          entity_type: 'work_order',
          title: 'HVAC Installation - WO-5678',
          subtitle: 'Scheduled for tomorrow',
          description: 'Customer: Acme Corp | Tech: Mike Johnson',
          relevance_score: 0.88,
          metadata: { status: 'scheduled', priority: 'high' },
          actions: [
            { label: 'View', action: { type: 'navigate', payload: { path: '/work-orders/5678' } } }
          ]
        }
      );
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    // Apply limit
    const limit = params.limit || 20;
    const limitedResults = results.slice(0, limit);

    return {
      results: limitedResults,
      total_count: results.length,
      facets: this.calculateFacets(results),
      suggestions: this.generateQuerySuggestions(query, results),
      query_understanding: this.analyzeQuery(query)
    };
  }

  private performEntityLookup(
    params: SearchParameters,
    _context: AIContext
  ): SearchResult {
    const query = params.query.toUpperCase();

    // Detect entity type from query pattern
    let entityType: EntityType = 'work_order';
    if (query.startsWith('WO-') || query.startsWith('WO')) {
      entityType = 'work_order';
    } else if (query.startsWith('TKT-') || query.startsWith('TICKET')) {
      entityType = 'ticket';
    } else if (query.startsWith('INV-')) {
      entityType = 'invoice';
    }

    return {
      results: [
        {
          id: query,
          entity_type: entityType,
          title: `${entityType === 'work_order' ? 'Work Order' : entityType} ${query}`,
          subtitle: 'Direct lookup result',
          relevance_score: 1.0,
          metadata: { exact_match: true },
          actions: [
            { label: 'View', action: { type: 'navigate', payload: { path: `/${entityType}s/${query}` } } }
          ]
        }
      ],
      total_count: 1,
      facets: { by_type: { [entityType]: 1 } as Record<EntityType, number>, by_status: {}, by_date: { recent: 1, this_week: 0, this_month: 0, older: 0 } },
      suggestions: [],
      query_understanding: {
        detected_intent: 'entity_lookup',
        extracted_entities: [{ type: entityType, value: query, confidence: 1.0 }],
        query_expansion: [],
        confidence: 1.0
      }
    };
  }

  private generateSuggestions(
    params: SearchParameters,
    _context: AIContext
  ): SearchResult {
    const query = params.query.toLowerCase();

    const suggestions: SearchSuggestion[] = [
      {
        type: 'query',
        text: `${query} this week`,
        description: 'Narrow to recent items'
      },
      {
        type: 'filter',
        text: `${query} status:open`,
        description: 'Show only open items'
      },
      {
        type: 'entity',
        text: `${query} customer`,
        description: 'Search customers only'
      },
      {
        type: 'query',
        text: `${query} urgent`,
        description: 'Show urgent items only'
      }
    ];

    return {
      results: [],
      total_count: 0,
      facets: { by_type: {} as Record<EntityType, number>, by_status: {}, by_date: { recent: 0, this_week: 0, this_month: 0, older: 0 } },
      suggestions,
      query_understanding: this.analyzeQuery(query)
    };
  }

  private getRecentItems(
    params: SearchParameters,
    context: AIContext
  ): SearchResult {
    const recentActivity = context.app.recentActivity || [];

    const results: SearchHit[] = recentActivity.slice(0, params.limit || 10).map((activity, i) => ({
      id: activity.entity.id,
      entity_type: activity.entity.type as EntityType,
      title: `${activity.entity.type} ${activity.entity.id}`,
      subtitle: `${activity.type} - ${new Date(activity.timestamp).toLocaleString()}`,
      relevance_score: 1 - i * 0.05,
      metadata: activity.details || {},
      actions: [
        { label: 'View', action: { type: 'navigate', payload: { path: `/${activity.entity.type}s/${activity.entity.id}` } } }
      ]
    }));

    return {
      results,
      total_count: results.length,
      facets: this.calculateFacets(results),
      suggestions: [],
      query_understanding: {
        detected_intent: 'recent_items',
        extracted_entities: [],
        query_expansion: [],
        confidence: 1.0
      }
    };
  }

  private performAdvancedFilter(
    params: SearchParameters,
    context: AIContext
  ): SearchResult {
    // This would apply complex filters in a real implementation
    return this.performSemanticSearch(params, context);
  }

  private getDefaultResult(): SearchResult {
    return {
      results: [],
      total_count: 0,
      facets: {
        by_type: {} as Record<EntityType, number>,
        by_status: {},
        by_date: { recent: 0, this_week: 0, this_month: 0, older: 0 }
      },
      suggestions: [],
      query_understanding: {
        detected_intent: 'unknown',
        extracted_entities: [],
        query_expansion: [],
        confidence: 0.5
      }
    };
  }

  private calculateFacets(results: SearchHit[]): SearchFacets {
    const byType: Record<EntityType, number> = {} as Record<EntityType, number>;
    const byStatus: Record<string, number> = {};

    results.forEach(r => {
      byType[r.entity_type] = (byType[r.entity_type] || 0) + 1;
      const status = r.metadata.status as string;
      if (status) {
        byStatus[status] = (byStatus[status] || 0) + 1;
      }
    });

    return {
      by_type: byType,
      by_status: byStatus,
      by_date: {
        recent: Math.floor(results.length * 0.3),
        this_week: Math.floor(results.length * 0.4),
        this_month: Math.floor(results.length * 0.2),
        older: Math.floor(results.length * 0.1)
      }
    };
  }

  private generateQuerySuggestions(query: string, results: SearchHit[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    if (results.length > 10) {
      suggestions.push({
        type: 'filter',
        text: 'Add date filter to narrow results',
        description: `${results.length} results found`
      });
    }

    if (results.some(r => r.entity_type === 'customer')) {
      suggestions.push({
        type: 'query',
        text: `${query} with open tickets`,
        description: 'See customers with pending issues'
      });
    }

    return suggestions;
  }

  private analyzeQuery(query: string): QueryUnderstanding {
    const entities: { type: string; value: string; confidence: number }[] = [];
    let intent = 'search';

    // Detect date references
    if (/today|yesterday|this week|last week|this month/i.test(query)) {
      entities.push({ type: 'date', value: query.match(/today|yesterday|this week|last week|this month/i)?.[0] || '', confidence: 0.95 });
    }

    // Detect entity type references
    if (/customer|client/i.test(query)) {
      entities.push({ type: 'entity_type', value: 'customer', confidence: 0.9 });
    }
    if (/work order|job|wo-/i.test(query)) {
      entities.push({ type: 'entity_type', value: 'work_order', confidence: 0.9 });
    }
    if (/ticket|issue|tkt-/i.test(query)) {
      entities.push({ type: 'entity_type', value: 'ticket', confidence: 0.9 });
    }
    if (/technician|tech/i.test(query)) {
      entities.push({ type: 'entity_type', value: 'technician', confidence: 0.9 });
    }

    // Detect status references
    if (/open|pending|closed|completed|scheduled/i.test(query)) {
      entities.push({ type: 'status', value: query.match(/open|pending|closed|completed|scheduled/i)?.[0] || '', confidence: 0.85 });
    }

    // Detect intent
    if (/show|find|search|look/i.test(query)) {
      intent = 'search';
    } else if (/urgent|priority|important/i.test(query)) {
      intent = 'priority_filter';
    }

    return {
      detected_intent: intent,
      extracted_entities: entities,
      query_expansion: this.expandQuery(query),
      confidence: 0.85
    };
  }

  private expandQuery(query: string): string[] {
    const expansions: string[] = [];

    // Add synonyms
    if (/customer/i.test(query)) {
      expansions.push(query.replace(/customer/i, 'client'));
    }
    if (/work order/i.test(query)) {
      expansions.push(query.replace(/work order/i, 'job'));
    }
    if (/tech/i.test(query)) {
      expansions.push(query.replace(/tech/i, 'technician'));
    }

    return expansions;
  }

  private generateSearchInsights(
    result: SearchResult,
    request: SearchQuery
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    if (result.total_count === 0) {
      insights.push({
        type: 'information',
        category: 'information',
        title: 'No Results Found',
        description: `Try broadening your search or checking for typos in "${request.parameters.query}"`,
        priority: 'low',
        confidence: 1.0
      });
    } else if (result.total_count > 50) {
      insights.push({
        type: 'optimization',
        category: 'optimization',
        title: 'Many Results Available',
        description: 'Consider adding filters to narrow down results',
        priority: 'low',
        confidence: 0.9
      });
    }

    // High relevance match insight
    const topResult = result.results[0];
    if (topResult && topResult.relevance_score > 0.95) {
      insights.push({
        type: 'information',
        category: 'information',
        title: 'High Confidence Match',
        description: `"${topResult.title}" appears to be an exact match`,
        priority: 'medium',
        confidence: topResult.relevance_score
      });
    }

    return insights;
  }

  private generateFollowUpQuestions(
    result: SearchResult,
    request: SearchQuery
  ): string[] {
    const questions: string[] = [];

    if (result.total_count > 0) {
      questions.push(`Would you like more details about "${result.results[0]?.title}"?`);
    }

    if (result.suggestions.length > 0) {
      questions.push('Would you like to try one of the suggested searches?');
    }

    if (request.parameters.entity_types && request.parameters.entity_types.length === 1) {
      questions.push('Should I expand the search to include other entity types?');
    }

    return questions;
  }

  private createErrorResponse(error: unknown, startTime: number): UnifiedAIResponse<SearchResult> {
    return {
      domain: this.domain,
      operation: 'error',
      result: {
        primary: this.getDefaultResult(),
        metadata: {
          source_hook: this.getSourceHookName(),
          transformation_applied: false,
          demo_data_used: false,
          context_used: [],
          generated_at: new Date().toISOString()
        }
      },
      confidence: 0,
      completeness: 0,
      freshness: 0,
      processing: {
        duration_ms: Date.now() - startTime,
        cache_hit: false,
        model_version: this.version
      },
      errors: [{
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown search error',
        domain: this.domain,
        recoverable: true,
        suggestedFix: 'Please try a different search query'
      }]
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    return {
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      error_rate: 0,
      last_check: new Date().toISOString(),
      issues: []
    };
  }
}

// ===== VALIDATION =====

export function validateSearchQuery(query: unknown): query is SearchQuery {
  if (!query || typeof query !== 'object') return false;

  const q = query as Record<string, unknown>;

  const validOperations = ['semantic_search', 'entity_lookup', 'suggestion', 'recent_items', 'advanced_filter'];

  return (
    typeof q.operation === 'string' &&
    validOperations.includes(q.operation) &&
    typeof q.parameters === 'object'
  );
}
