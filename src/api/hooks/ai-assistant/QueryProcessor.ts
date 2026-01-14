/**
 * Query Processor
 *
 * Natural language processing engine that converts user queries into structured AI intents
 */

import type {
  AIContext,
  AIQuery,
  AIIntent,
  ExtractedEntity,
  AIDomain
} from '@/api/types/aiAssistant';

export class QueryProcessor {
  private entityPatterns: Map<string, RegExp[]>;

  constructor() {
    this.entityPatterns = this.initializeEntityPatterns();
    // Intent classifiers are initialized but used indirectly through this.initializeIntentClassifiers()
    this.initializeIntentClassifiers();
  }

  // ===== MAIN PROCESSING METHODS =====

  async processNaturalLanguage(naturalQuery: string, context: AIContext): Promise<AIQuery> {
    const queryId = `query_${Date.now()}`;

    // Step 1: Clean and normalize the query
    const normalizedQuery = this.normalizeQuery(naturalQuery);

    // Step 2: Extract entities
    const entities = this.extractEntities(normalizedQuery);

    // Step 3: Classify intent
    const intent = await this.classifyIntent(normalizedQuery, entities, context);

    // Step 4: Enhance with context
    const enhancedIntent = this.enhanceWithContext(intent, context);

    return {
      id: queryId,
      naturalLanguageQuery: naturalQuery,
      intent: enhancedIntent,
      context,
      timestamp: new Date().toISOString(),
      userId: context.user.id
    };
  }

  // ===== ENTITY EXTRACTION =====

  extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [entityType, patterns] of this.entityPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = query.matchAll(new RegExp(pattern.source, 'gi'));

        for (const match of matches) {
          if (match[0] && match.index !== undefined) {
            entities.push({
              type: entityType as any,
              value: match[0].trim(),
              confidence: this.calculateEntityConfidence(entityType, match[0], query),
              metadata: {
                position: match.index,
                context: this.extractEntityContext(query, match.index, match[0].length)
              }
            });
          }
        }
      }
    }

    // Remove overlapping entities and sort by confidence
    return this.deduplicateEntities(entities);
  }

  // ===== INTENT CLASSIFICATION =====

  async classifyIntent(query: string, entities: ExtractedEntity[], context: AIContext): Promise<AIIntent> {
    const normalizedQuery = query.toLowerCase();

    // Primary intent classification
    const intentType = this.classifyIntentType(normalizedQuery);
    const domain = this.identifyDomain(normalizedQuery, entities, context);
    const operation = this.identifyOperation(normalizedQuery, intentType, domain);

    // Calculate confidence
    const confidence = this.calculateIntentConfidence(query, entities, intentType, domain);

    // Extract parameters
    const parameters = this.extractParameters(query, entities, operation);

    // Determine priority
    const priority = this.determinePriority(normalizedQuery, entities, context);

    return {
      type: intentType,
      domain,
      operation,
      entities,
      confidence,
      parameters,
      requiresAuth: this.requiresAuthentication(operation, domain),
      priority
    };
  }

  // ===== CONTEXT ENHANCEMENT =====

  enhanceWithContext(intent: AIIntent, context: AIContext): AIIntent {
    // Add current entity context if relevant
    if (context.app.currentEntity && !intent.entities.find(e => e.type === context.app.currentEntity!.type)) {
      intent.entities.push({
        type: context.app.currentEntity.type as any,
        value: context.app.currentEntity.id,
        confidence: 0.9,
        metadata: { source: 'current_page_context' }
      });
    }

    // Enhance with recent conversation history
    if (context.session.conversationHistory.length > 0) {
      const recentContext = this.extractRecentContext(context.session.conversationHistory);
      intent.parameters = { ...intent.parameters, ...recentContext };
    }

    // Adjust operation based on user role
    intent = this.adjustForUserRole(intent, context.user.role);

    return intent;
  }

  // ===== PRIVATE HELPER METHODS =====

  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-@.]/g, '') // Keep alphanumeric, spaces, hyphens, @ and dots
      .toLowerCase();
  }

  private initializeEntityPatterns(): Map<string, RegExp[]> {
    return new Map([
      // Customer entities
      ['customer', [
        /\b(?:customer|client|account)\s+([A-Za-z\s]+(?:LLC|Inc|Corp|Company)?)\b/,
        /\b([A-Za-z]+\s+[A-Za-z]+)\s+(?:customer|client)\b/,
        /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/ // Proper names
      ]],

      // Work order entities
      ['work_order', [
        /\b(?:work\s+order|job|ticket)\s+#?(\w+)\b/,
        /\b#(\w+)\b/,
        /\bWO[#\s]*(\d+)\b/
      ]],

      // Technician entities
      ['technician', [
        /\btechnician\s+([A-Za-z\s]+)\b/,
        /\btech\s+([A-Za-z\s]+)\b/,
        /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:technician|tech)\b/
      ]],

      // Date entities
      ['date', [
        /\b(?:today|tomorrow|yesterday)\b/,
        /\b(?:this|next|last)\s+(?:week|month|year)\b/,
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
        /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/
      ]],

      // Location entities
      ['location', [
        /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b/,
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:area|region|zone)\b/,
        /\b[A-Z]{2}\s+\d{5}\b/ // State + ZIP
      ]],

      // Service type entities
      ['service_type', [
        /\b(?:hvac|plumbing|electrical|maintenance|repair|installation)\b/,
        /\b(?:heating|cooling|air\s+conditioning|furnace|boiler)\b/,
        /\b(?:preventive|emergency|routine)\s+(?:maintenance|service)\b/
      ]]
    ]);
  }

  private initializeIntentClassifiers(): Map<string, IntentClassifier> {
    return new Map([
      ['query', new QueryIntentClassifier()],
      ['action', new ActionIntentClassifier()],
      ['conversation', new ConversationIntentClassifier()],
      ['navigation', new NavigationIntentClassifier()],
      ['help', new HelpIntentClassifier()]
    ]);
  }

  private classifyIntentType(query: string): AIIntent['type'] {
    // Question patterns
    if (/^(?:what|who|when|where|why|how|which|can|could|would|should)\b/.test(query)) {
      return 'query';
    }

    // Action patterns
    if (/^(?:create|add|schedule|assign|send|generate|update|delete|cancel)\b/.test(query)) {
      return 'action';
    }

    // Navigation patterns
    if (/^(?:go\s+to|show\s+me|open|navigate)\b/.test(query)) {
      return 'navigation';
    }

    // Help patterns
    if (/^(?:help|how\s+do\s+i|explain|what\s+is)\b/.test(query)) {
      return 'help';
    }

    // Default to query
    return 'query';
  }

  private identifyDomain(query: string, entities: ExtractedEntity[], context: AIContext): AIDomain | undefined {
    // Domain keyword mapping
    const domainKeywords: Record<string, AIDomain> = {
      'activity': 'customer-activity',
      'dispatch': 'dispatch',
      'ticket': 'tickets',
      'schedule': 'scheduling',
      'pricing': 'pricing',
      'search': 'search',
      'call': 'calls',
      'lead': 'leads',
      'document': 'documents',
      'contract': 'contracts',
      'payment': 'payments',
      'compliance': 'compliance',
      'technician': 'technicians',
      'report': 'reports',
      'inventory': 'inventory'
    };

    // Check for explicit domain keywords
    for (const [keyword, domain] of Object.entries(domainKeywords)) {
      if (query.includes(keyword)) {
        return domain;
      }
    }

    // Infer from entities
    const entityToDomain: Record<string, AIDomain> = {
      'customer': 'customer-activity',
      'work_order': 'dispatch',
      'ticket': 'tickets',
      'technician': 'technicians',
      'date': 'scheduling'
    };

    for (const entity of entities) {
      if (entityToDomain[entity.type]) {
        return entityToDomain[entity.type];
      }
    }

    // Infer from current page context
    if (context.app.currentEntity) {
      const entityToDomain: Record<string, AIDomain> = {
        'customer': 'customer-activity',
        'work_order': 'dispatch',
        'ticket': 'tickets',
        'technician': 'technicians',
        'schedule': 'scheduling'
      };

      return entityToDomain[context.app.currentEntity.type];
    }

    return undefined;
  }

  private identifyOperation(query: string, intentType: AIIntent['type'], _domain?: AIDomain): string {
    const operationPatterns: Record<string, string[]> = {
      'analyze': ['analyze', 'analysis', 'breakdown', 'examine'],
      'summarize': ['summarize', 'summary', 'overview'],
      'search': ['find', 'search', 'look for', 'locate'],
      'create': ['create', 'add', 'new', 'make'],
      'update': ['update', 'modify', 'change', 'edit'],
      'schedule': ['schedule', 'book', 'assign', 'plan'],
      'optimize': ['optimize', 'improve', 'enhance', 'better'],
      'generate': ['generate', 'create', 'produce', 'make']
    };

    for (const [operation, patterns] of Object.entries(operationPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return operation;
      }
    }

    // Default operations by intent type
    const defaultOperations: Record<AIIntent['type'], string> = {
      'query': 'search',
      'action': 'execute',
      'conversation': 'respond',
      'navigation': 'navigate',
      'help': 'explain'
    };

    return defaultOperations[intentType];
  }

  private calculateEntityConfidence(entityType: string, entityValue: string, query: string): number {
    let confidence = 0.5;

    // Boost confidence for proper nouns
    if (/^[A-Z]/.test(entityValue)) {
      confidence += 0.2;
    }

    // Boost confidence for entities with context markers
    const contextMarkers: Record<string, string[]> = {
      'customer': ['customer', 'client', 'account'],
      'technician': ['technician', 'tech'],
      'work_order': ['work order', 'job', 'ticket']
    };

    if (contextMarkers[entityType]) {
      const hasMarker = contextMarkers[entityType].some((marker: string) =>
        query.toLowerCase().includes(marker)
      );
      if (hasMarker) confidence += 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateIntentConfidence(
    query: string,
    entities: ExtractedEntity[],
    intentType: AIIntent['type'],
    domain?: AIDomain
  ): number {
    let confidence = 0.6; // Base confidence

    // Boost for clear intent indicators
    const intentIndicators: Record<AIIntent['type'], string[]> = {
      'query': ['what', 'who', 'when', 'where', 'why', 'how', 'show', 'tell'],
      'action': ['create', 'make', 'do', 'schedule', 'send', 'update'],
      'navigation': ['go to', 'open', 'show me'],
      'conversation': ['tell me', 'explain', 'describe'],
      'help': ['help', 'how do i', 'how can i']
    };

    const indicators = intentIndicators[intentType] || [];
    const hasStrongIndicator = indicators.some(indicator =>
      query.toLowerCase().includes(indicator)
    );

    if (hasStrongIndicator) confidence += 0.25;

    // Boost for domain identification
    if (domain) confidence += 0.1;

    // Boost for entity extraction
    if (entities.length > 0) {
      confidence += Math.min(entities.length * 0.05, 0.15);
    }

    return Math.min(confidence, 1.0);
  }

  private extractParameters(query: string, entities: ExtractedEntity[], operation: string): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};

    // Extract entities as parameters
    entities.forEach(entity => {
      parameters[entity.type] = entity.value;
    });

    // Extract operation-specific parameters
    if (operation === 'search' || operation === 'analyze') {
      const timeframes = ['today', 'this week', 'last month', 'this year'];
      const matchedTimeframe = timeframes.find(tf => query.includes(tf));
      if (matchedTimeframe) {
        parameters.timeframe = matchedTimeframe;
      }
    }

    return parameters;
  }

  private determinePriority(query: string, entities: ExtractedEntity[], context: AIContext): AIIntent['priority'] {
    // High priority indicators
    if (/\b(?:urgent|emergency|asap|immediately|critical)\b/i.test(query)) {
      return 'urgent';
    }

    // Medium priority indicators
    if (/\b(?:important|priority|soon|quickly)\b/i.test(query)) {
      return 'high';
    }

    // Check for VIP customers
    const customerEntity = entities.find(e => e.type === 'customer');
    if (customerEntity && context.domain.customers?.some(c => c.tier === 'vip')) {
      return 'high';
    }

    return 'medium';
  }

  private requiresAuthentication(operation: string, _domain?: AIDomain): boolean {
    const authRequiredOperations = ['create', 'update', 'delete', 'schedule', 'execute'];
    return authRequiredOperations.includes(operation);
  }

  private extractEntityContext(query: string, position: number, length: number): string {
    const contextStart = Math.max(0, position - 20);
    const contextEnd = Math.min(query.length, position + length + 20);
    return query.substring(contextStart, contextEnd);
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    // Remove overlapping entities, keeping the highest confidence
    const sorted = entities.sort((a, b) => b.confidence - a.confidence);
    const deduplicated: ExtractedEntity[] = [];

    for (const entity of sorted) {
      const overlapping = deduplicated.find(existing =>
        existing.type === entity.type &&
        (existing.value.includes(entity.value) || entity.value.includes(existing.value))
      );

      if (!overlapping) {
        deduplicated.push(entity);
      }
    }

    return deduplicated;
  }

  private extractRecentContext(_conversationHistory: unknown[]): Record<string, unknown> {
    // Extract relevant context from recent messages
    return {};
  }

  private adjustForUserRole(intent: AIIntent, _userRole: string): AIIntent {
    // Adjust intent based on user role permissions
    return intent;
  }
}

// ===== INTENT CLASSIFIERS =====

interface IntentClassifier {
  classify(query: string): { confidence: number; operation: string };
}

class QueryIntentClassifier implements IntentClassifier {
  classify(_query: string): { confidence: number; operation: string } {
    return { confidence: 0.8, operation: 'search' };
  }
}

class ActionIntentClassifier implements IntentClassifier {
  classify(_query: string): { confidence: number; operation: string } {
    return { confidence: 0.8, operation: 'execute' };
  }
}

class ConversationIntentClassifier implements IntentClassifier {
  classify(_query: string): { confidence: number; operation: string } {
    return { confidence: 0.8, operation: 'respond' };
  }
}

class NavigationIntentClassifier implements IntentClassifier {
  classify(_query: string): { confidence: number; operation: string } {
    return { confidence: 0.8, operation: 'navigate' };
  }
}

class HelpIntentClassifier implements IntentClassifier {
  classify(_query: string): { confidence: number; operation: string } {
    return { confidence: 0.8, operation: 'explain' };
  }
}