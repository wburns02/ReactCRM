/**
 * AI Orchestrator
 *
 * Central orchestration engine that manages all AI adapters and coordinates
 * cross-domain queries, actions, and conversations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AIContext,
  AIConversation,
  AIQuery,
  AIResponse,
  AIIntent,
  AIDomain,
  DomainQuery,
  AIAction,
  ActionResult,
  HealthStatus
} from '@/api/types/aiAssistant';
import type { BaseAIAdapter, UnifiedAIResponse } from './adapters/BaseAIAdapter';
import { QueryProcessor } from './QueryProcessor';
import { ContextManager } from './ContextManager';
import { ActionOrchestrator } from './ActionOrchestrator';

// ===== ORCHESTRATOR INTERFACE =====

export interface AIOrchestrator {
  // Core operations
  processQuery(naturalQuery: string, context: AIContext): Promise<AIResponse>;
  executeAction(action: AIAction, context: AIContext): Promise<ActionResult>;
  getConversation(conversationId: string): Promise<AIConversation | null>;

  // Adapter management
  registerAdapter(adapter: BaseAIAdapter): void;
  unregisterAdapter(domain: AIDomain): void;
  getAdapterHealth(): Promise<Record<AIDomain, HealthStatus>>;

  // Streaming support
  streamQuery(naturalQuery: string, context: AIContext): AsyncGenerator<Partial<AIResponse>>;
}

// ===== QUERY EXECUTION PLAN =====

interface QueryExecutionPlan {
  id: string;
  query: AIQuery;
  phases: QueryPhase[];
  dependencies: QueryDependency[];
  estimatedDuration: number;
}

interface QueryPhase {
  id: string;
  name: string;
  domainQueries: DomainQuery[];
  parallelExecution: boolean;
  dependencies: string[];
}

interface QueryDependency {
  sourcePhase: string;
  targetPhase: string;
  dataMapping: Record<string, string>;
}

// ===== AGGREGATION STRATEGIES =====

interface AggregationStrategy {
  type: 'merge' | 'prioritize' | 'synthesize' | 'compare';
  weights?: Record<AIDomain, number>;
  conflictResolution?: 'highest_confidence' | 'newest' | 'user_preference';
}

// ===== IMPLEMENTATION =====

export class AIOrchestratorImpl implements AIOrchestrator {
  private adapters: Map<AIDomain, BaseAIAdapter> = new Map();
  private queryProcessor: QueryProcessor;
  private actionOrchestrator: ActionOrchestrator;

  constructor(
    queryProcessor: QueryProcessor,
    _contextManager: ContextManager,
    actionOrchestrator: ActionOrchestrator
  ) {
    this.queryProcessor = queryProcessor;
    this.actionOrchestrator = actionOrchestrator;
  }

  // ===== CORE OPERATIONS =====

  async processQuery(naturalQuery: string, context: AIContext): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Process natural language to structured query
      const aiQuery = await this.queryProcessor.processNaturalLanguage(naturalQuery, context);

      // Step 2: Create execution plan
      const executionPlan = await this.createExecutionPlan(aiQuery);

      // Step 3: Execute plan
      const domainResults = await this.executeQueryPlan(executionPlan);

      // Step 4: Aggregate and synthesize results
      const aggregatedResult = await this.aggregateResults(domainResults, executionPlan.query.intent);

      // Step 5: Generate unified response
      return this.generateUnifiedResponse(aiQuery, aggregatedResult, Date.now() - startTime);

    } catch (error) {
      return this.generateErrorResponse(naturalQuery, context, error as Error, Date.now() - startTime);
    }
  }

  async executeAction(action: AIAction, context: AIContext): Promise<ActionResult> {
    return this.actionOrchestrator.executeAction(action, context);
  }

  async getConversation(_conversationId: string): Promise<AIConversation | null> {
    // Implementation would integrate with conversation storage
    // For now, return null as placeholder
    return null;
  }

  // ===== ADAPTER MANAGEMENT =====

  registerAdapter(adapter: BaseAIAdapter): void {
    this.adapters.set(adapter.domain, adapter);
    console.log(`Registered AI adapter for domain: ${adapter.domain}`);
  }

  unregisterAdapter(domain: AIDomain): void {
    this.adapters.delete(domain);
    console.log(`Unregistered AI adapter for domain: ${domain}`);
  }

  async getAdapterHealth(): Promise<Record<AIDomain, HealthStatus>> {
    const healthStatuses: Record<string, HealthStatus> = {};

    const healthCheckPromises = Array.from(this.adapters.entries()).map(async ([domain, adapter]) => {
      try {
        const health = await adapter.healthCheck();
        healthStatuses[domain] = health;
      } catch (error) {
        healthStatuses[domain] = {
          status: 'unhealthy',
          response_time_ms: 0,
          error_rate: 1,
          last_check: new Date().toISOString(),
          issues: [error instanceof Error ? error.message : 'Unknown error']
        };
      }
    });

    await Promise.all(healthCheckPromises);
    return healthStatuses as Record<AIDomain, HealthStatus>;
  }

  // ===== STREAMING SUPPORT =====

  async* streamQuery(naturalQuery: string, context: AIContext): AsyncGenerator<Partial<AIResponse>> {
    // Yield initial processing state
    yield {
      processing: {
        duration_ms: 0,
        cache_hit: false,
        model_version: '1.0',
        domains_involved: []
      }
    };

    try {
      // Process query intent
      const aiQuery = await this.queryProcessor.processNaturalLanguage(naturalQuery, context);

      yield {
        primaryResult: { intent: aiQuery.intent },
        confidence: 0.5
      };

      // Create and execute plan
      const executionPlan = await this.createExecutionPlan(aiQuery);

      // Stream results from each phase
      for (const phase of executionPlan.phases) {
        const phaseResults = await this.executePhase(phase, context);

        yield {
          supportingResults: Array.from(phaseResults.values()),
          confidence: 0.7
        };
      }

      // Final aggregated result
      const finalResult = await this.processQuery(naturalQuery, context);
      yield finalResult;

    } catch (error) {
      yield {
        errors: [{
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown streaming error',
          recoverable: true
        }]
      };
    }
  }

  // ===== PRIVATE METHODS =====

  private async createExecutionPlan(query: AIQuery): Promise<QueryExecutionPlan> {
    const intent = query.intent;
    const requiredDomains = await this.identifyRequiredDomains(intent);

    // Create phases based on dependencies
    const phases: QueryPhase[] = [];

    if (intent.type === 'query') {
      // Simple query - single phase
      phases.push({
        id: 'main_query',
        name: 'Main Query Execution',
        domainQueries: requiredDomains.map(domain => ({
          id: `${domain}_query`,
          domain,
          operation: intent.operation,
          parameters: intent.parameters || {},
          priority: domain === intent.domain ? 'primary' : 'supporting'
        })),
        parallelExecution: true,
        dependencies: []
      });
    } else if (intent.type === 'action') {
      // Action execution might require pre-queries
      if (this.requiresDataGathering(intent)) {
        phases.push({
          id: 'data_gathering',
          name: 'Data Gathering',
          domainQueries: this.getDataGatheringQueries(intent),
          parallelExecution: true,
          dependencies: []
        });
      }

      phases.push({
        id: 'action_execution',
        name: 'Action Execution',
        domainQueries: [{
          id: 'main_action',
          domain: intent.domain!,
          operation: intent.operation,
          parameters: intent.parameters || {},
          priority: 'primary'
        }],
        parallelExecution: false,
        dependencies: this.requiresDataGathering(intent) ? ['data_gathering'] : []
      });
    }

    return {
      id: `plan_${query.id}`,
      query,
      phases,
      dependencies: [],
      estimatedDuration: this.estimateExecutionTime(phases)
    };
  }

  private async executeQueryPlan(plan: QueryExecutionPlan): Promise<Map<string, UnifiedAIResponse>> {
    const results = new Map<string, UnifiedAIResponse>();

    for (const phase of plan.phases) {
      // Check dependencies
      const dependenciesMet = phase.dependencies.every(dep =>
        plan.phases.find(p => p.id === dep) ? true : false
      );

      if (!dependenciesMet) {
        throw new Error(`Dependencies not met for phase: ${phase.id}`);
      }

      // Execute phase
      const phaseResults = await this.executePhase(phase, plan.query.context);

      // Store results
      phaseResults.forEach((result, queryId) => {
        results.set(queryId, result);
      });
    }

    return results;
  }

  private async executePhase(phase: QueryPhase, context: AIContext): Promise<Map<string, UnifiedAIResponse>> {
    const results = new Map<string, UnifiedAIResponse>();

    if (phase.parallelExecution) {
      // Execute all queries in parallel
      const promises = phase.domainQueries.map(async (domainQuery) => {
        const adapter = this.adapters.get(domainQuery.domain);
        if (!adapter) {
          throw new Error(`No adapter found for domain: ${domainQuery.domain}`);
        }

        const result = await adapter.query(domainQuery.parameters, context);
        results.set(domainQuery.id, result);
      });

      await Promise.all(promises);
    } else {
      // Execute queries sequentially
      for (const domainQuery of phase.domainQueries) {
        const adapter = this.adapters.get(domainQuery.domain);
        if (!adapter) {
          throw new Error(`No adapter found for domain: ${domainQuery.domain}`);
        }

        const result = await adapter.query(domainQuery.parameters, context);
        results.set(domainQuery.id, result);
      }
    }

    return results;
  }

  private async aggregateResults(
    domainResults: Map<string, UnifiedAIResponse>,
    intent: AIIntent
  ): Promise<UnifiedAIResponse> {
    const resultsArray = Array.from(domainResults.values());

    if (resultsArray.length === 0) {
      throw new Error('No results to aggregate');
    }

    if (resultsArray.length === 1) {
      return resultsArray[0];
    }

    // Multi-domain aggregation
    const strategy = this.selectAggregationStrategy(intent);

    switch (strategy.type) {
      case 'merge':
        return this.mergeResults(resultsArray);
      case 'prioritize':
        return this.prioritizeResults(resultsArray, strategy.weights);
      case 'synthesize':
        return this.synthesizeResults(resultsArray, intent);
      default:
        return resultsArray[0];
    }
  }

  private generateUnifiedResponse(
    query: AIQuery,
    aggregatedResult: UnifiedAIResponse,
    processingTimeMs: number
  ): AIResponse {
    return {
      id: `response_${Date.now()}`,
      queryId: query.id,
      conversationId: query.context.session.conversationHistory[0]?.conversationId || 'new',

      primaryResult: aggregatedResult.result.primary,
      supportingResults: aggregatedResult.result.supporting || [],

      confidence: aggregatedResult.confidence,
      completeness: aggregatedResult.completeness,
      freshness: aggregatedResult.freshness,

      actionableInsights: aggregatedResult.actionable_insights || [],
      suggestedActions: aggregatedResult.suggested_actions || [],
      followUpQuestions: aggregatedResult.follow_up_questions || [],

      processing: {
        ...aggregatedResult.processing,
        duration_ms: processingTimeMs,
        domains_involved: [aggregatedResult.domain]
      },

      errors: aggregatedResult.errors,
      warnings: aggregatedResult.warnings,
      limitations: aggregatedResult.limitations,

      timestamp: new Date().toISOString()
    };
  }

  private generateErrorResponse(
    _naturalQuery: string,
    _context: AIContext,
    error: Error,
    processingTimeMs: number
  ): AIResponse {
    return {
      id: `error_response_${Date.now()}`,
      queryId: `error_${Date.now()}`,
      conversationId: 'error',

      primaryResult: null,
      supportingResults: [],

      confidence: 0,
      completeness: 0,
      freshness: 0,

      actionableInsights: [],
      suggestedActions: [],
      followUpQuestions: ['Could you rephrase your question?', 'Would you like to try a simpler query?'],

      processing: {
        duration_ms: processingTimeMs,
        cache_hit: false,
        model_version: '1.0',
        domains_involved: []
      },

      errors: [{
        code: 'ORCHESTRATION_ERROR',
        message: error.message,
        recoverable: true,
        suggestedFix: 'Please try rephrasing your query or contact support if the issue persists.'
      }],

      timestamp: new Date().toISOString()
    };
  }

  // ===== HELPER METHODS =====

  private async identifyRequiredDomains(intent: AIIntent): Promise<AIDomain[]> {
    const domains: AIDomain[] = [];

    // Primary domain
    if (intent.domain) {
      domains.push(intent.domain);
    }

    // Additional domains based on entities and operation type
    for (const entity of intent.entities) {
      const relatedDomains = this.getRelatedDomains(entity.type);
      domains.push(...relatedDomains);
    }

    // Remove duplicates
    return [...new Set(domains)];
  }

  private getRelatedDomains(entityType: string): AIDomain[] {
    const relationshipMap: Record<string, AIDomain[]> = {
      'customer': ['customer-activity', 'leads', 'payments'],
      'work_order': ['dispatch', 'scheduling', 'technicians', 'pricing'],
      'ticket': ['tickets', 'dispatch', 'technicians'],
      'technician': ['technicians', 'scheduling', 'dispatch']
    };

    return relationshipMap[entityType] || [];
  }

  private requiresDataGathering(intent: AIIntent): boolean {
    return intent.type === 'action' && intent.operation.includes('create');
  }

  private getDataGatheringQueries(_intent: AIIntent): DomainQuery[] {
    // Generate supporting queries for action preparation
    return [];
  }

  private estimateExecutionTime(phases: QueryPhase[]): number {
    return phases.reduce((total, phase) => {
      const phaseTime = phase.parallelExecution
        ? 1000 // Parallel execution ~1 second
        : phase.domainQueries.length * 500; // Sequential ~500ms per query
      return total + phaseTime;
    }, 0);
  }

  private selectAggregationStrategy(intent: AIIntent): AggregationStrategy {
    if (intent.type === 'query' && intent.operation.includes('analyze')) {
      return { type: 'synthesize' };
    }

    if (intent.type === 'query' && intent.operation.includes('compare')) {
      return { type: 'compare' };
    }

    return { type: 'merge' };
  }

  private mergeResults(results: UnifiedAIResponse[]): UnifiedAIResponse {
    // Simple merge strategy
    const primary = results[0];
    return {
      ...primary,
      result: {
        ...primary.result,
        supporting: results.slice(1).map(r => r.result.primary)
      },
      confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    };
  }

  private prioritizeResults(results: UnifiedAIResponse[], weights?: Record<AIDomain, number>): UnifiedAIResponse {
    if (!weights) {
      return results.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
    }

    const weightedResults = results.map(result => ({
      result,
      score: result.confidence * (weights[result.domain] || 1)
    }));

    return weightedResults.reduce((best, current) =>
      current.score > best.score ? current : best
    ).result;
  }

  private synthesizeResults(results: UnifiedAIResponse[], _intent: AIIntent): UnifiedAIResponse {
    // Complex synthesis - would use AI to combine insights
    // For now, return merged results
    return this.mergeResults(results);
  }
}

// ===== REACT HOOK =====

export function useAIOrchestrator() {
  const queryClient = useQueryClient();

  // This would be initialized with proper dependencies
  const orchestrator = new AIOrchestratorImpl(
    new QueryProcessor(),
    new ContextManager(),
    new ActionOrchestrator()
  );

  const processQuery = useMutation({
    mutationFn: async ({ query, context }: { query: string; context: AIContext }) => {
      return orchestrator.processQuery(query, context);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-conversation'] });
    }
  });

  const executeAction = useMutation({
    mutationFn: async ({ action, context }: { action: AIAction; context: AIContext }) => {
      return orchestrator.executeAction(action, context);
    }
  });

  const healthCheck = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => orchestrator.getAdapterHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // Check every minute
  });

  return {
    processQuery: processQuery.mutateAsync,
    executeAction: executeAction.mutateAsync,
    healthCheck: healthCheck.data,
    isProcessing: processQuery.isPending || executeAction.isPending,
    orchestrator
  };
}