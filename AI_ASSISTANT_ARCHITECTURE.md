# AI Assistant Architecture

## Executive Summary

The Unified AI Assistant serves as the central intelligence layer for the ReactCRM platform, orchestrating 16+ existing specialized AI modules through natural language conversation, proactive insights, and autonomous action execution.

## System Architecture Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  AssistantTrigger  │  AssistantSidebar  │  AssistantChat  │  AssistantOrb   │
│  (Ctrl+K hotkey)   │  (collapsible)     │  (modal dialog) │  (floating)     │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                    UNIFIED AI ORCHESTRATION LAYER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ CONVERSATION    │  │ CONTEXT         │  │ ACTION          │             │
│  │ MANAGER         │  │ AGGREGATOR      │  │ ORCHESTRATOR    │             │
│  │                 │  │                 │  │                 │             │
│  │ • Session Mgmt  │  │ • Domain Data   │  │ • Multi-step    │             │
│  │ • Memory/History│  │ • User Context  │  │ • Rollback      │             │
│  │ • Intent Router │  │ • App State     │  │ • Validation    │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┤
│  │                    NATURAL LANGUAGE PROCESSOR                           │
│  │                                                                         │
│  │ • Intent Classification • Entity Extraction • Context Resolution        │
│  │ • Query Planning       • Response Generation • Confidence Scoring       │
│  └─────────────────────────────────────────────────────────────────────────┤
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                      DOMAIN INTELLIGENCE LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │Activity │ │Dispatch │ │Tickets  │ │Schedule │ │Pricing  │ │Search   │     │
│ │AI       │ │AI       │ │AI       │ │AI       │ │AI       │ │AI       │     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│                                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │Calls    │ │Leads    │ │Docs     │ │Contract │ │Payment  │ │Compliance│     │
│ │AI       │ │AI       │ │AI       │ │AI       │ │AI       │ │AI       │     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│                                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                             │
│ │Tech     │ │Reports  │ │Inventory│ │Insights │                             │
│ │AI       │ │AI       │ │AI       │ │AI       │                             │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                             │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────────┐
│                         DATA & SERVICES LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│ │ TanStack Query  │  │ API Client      │  │ WebSocket       │               │
│ │ • Cache Mgmt    │  │ • Auth/CSRF     │  │ • Real-time     │               │
│ │ • Invalidation  │  │ • Error Handling│  │ • Notifications │               │
│ │ • Optimistic UI │  │ • Retry Logic   │  │ • Live Updates  │               │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┤ │
│ │ BACKEND API LAYER (/api/v2/ai/*)                                        │ │
│ │                                                                         │ │
│ │ • /assistant/chat      • /assistant/context    • /assistant/actions    │ │
│ │ • /assistant/sessions  • /assistant/memory      • /assistant/settings  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Conversation Manager (`useAIConversation.ts`)

**Responsibilities:**
- Session lifecycle management (create, persist, restore)
- Message threading with context awareness
- Intent routing to appropriate domain AI modules
- Response streaming and aggregation
- Conversation history and memory

**Data Structures:**
```typescript
interface AIConversation {
  id: string;
  userId: string;
  sessionId: string;
  messages: AIMessage[];
  context: AIContext;
  settings: ConversationSettings;
  createdAt: string;
  lastActiveAt: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: AIIntent;
  actions?: AIAction[];
  confidence?: number;
  metadata?: MessageMetadata;
}
```

### 2. Context Aggregator (`useAIContext.ts`)

**Responsibilities:**
- Aggregates user context from all application layers
- Maintains current page/view state
- Tracks user permissions and role
- Manages domain-specific context (customer, work order, etc.)
- Provides context to domain AI modules

**Context Hierarchy:**
```typescript
interface AIContext {
  // User Context
  user: {
    id: string;
    role: UserRole;
    permissions: string[];
    preferences: AIPreferences;
  };

  // Application Context
  app: {
    currentPage: string;
    currentEntity?: EntityContext;
    recentActivity: ActivityContext[];
    navigationHistory: NavigationContext[];
  };

  // Domain Context
  domain: {
    customers?: CustomerContext[];
    workOrders?: WorkOrderContext[];
    tickets?: TicketContext[];
    schedule?: ScheduleContext;
    // ... other domain contexts
  };

  // Session Context
  session: {
    conversationHistory: AIMessage[];
    activeIntents: AIIntent[];
    pendingActions: AIAction[];
    executedActions: ActionResult[];
  };
}
```

### 3. Action Orchestrator (`useAIActions.ts`)

**Responsibilities:**
- Validates and executes AI-suggested actions
- Manages multi-step workflows
- Provides rollback capabilities
- Tracks execution history and audit trail
- Handles permissions and authorization

**Action Framework:**
```typescript
interface AIAction {
  id: string;
  type: AIActionType;
  domain: AIDomain;
  operation: string;
  payload: Record<string, unknown>;
  requirements: ActionRequirement[];
  rollbackData?: Record<string, unknown>;
  executedAt?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
}

interface ActionResult {
  actionId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  affectedEntities: EntityReference[];
}
```

### 4. Natural Language Processor (`useAINLP.ts`)

**Responsibilities:**
- Intent classification using domain-trained models
- Entity extraction (customers, work orders, dates, etc.)
- Context resolution and disambiguation
- Query planning for complex multi-domain requests
- Response generation with domain expertise

**Processing Pipeline:**
```typescript
interface NLPPipeline {
  // Step 1: Intent Classification
  classifyIntent(query: string, context: AIContext): AIIntent;

  // Step 2: Entity Extraction
  extractEntities(query: string): ExtractedEntity[];

  // Step 3: Context Resolution
  resolveContext(entities: ExtractedEntity[], context: AIContext): ResolvedContext;

  // Step 4: Query Planning
  planQuery(intent: AIIntent, context: ResolvedContext): QueryPlan;

  // Step 5: Execution
  executeQuery(plan: QueryPlan): Promise<QueryResult>;

  // Step 6: Response Generation
  generateResponse(result: QueryResult, context: AIContext): AIResponse;
}
```

## Data Flow Architecture

### 1. Conversation Flow
```
User Input → Intent Classification → Context Resolution → Domain Routing →
Action Planning → Execution → Response Generation → UI Update →
Context Update → Memory Storage
```

### 2. Context Propagation
```
App State → Context Aggregator → Domain AI Modules →
Unified Response → Context Update → App State Sync
```

### 3. Action Execution
```
Natural Language → Action Planning → Permission Check →
Execution → Result Validation → Rollback Capability →
Audit Trail → User Notification
```

## Integration Patterns

### 1. Domain AI Hook Integration

Each existing AI hook integrates through standardized adapters:

```typescript
interface DomainAIAdapter {
  domain: AIDomain;
  capabilities: AICapability[];

  // Query interface
  query(intent: AIIntent, context: AIContext): Promise<AIResult>;

  // Action interface
  execute(action: AIAction, context: AIContext): Promise<ActionResult>;

  // Streaming interface
  stream(query: AIQuery): AsyncIterator<AIStreamChunk>;
}
```

### 2. Cache Strategy

Leverages existing TanStack Query patterns with AI-specific optimizations:

```typescript
// AI-specific cache configuration
const aiCacheConfig = {
  conversations: {
    staleTime: 0, // Always fresh
    cacheTime: 1000 * 60 * 60, // 1 hour
  },
  context: {
    staleTime: 1000 * 30, // 30 seconds
    cacheTime: 1000 * 60 * 5, // 5 minutes
  },
  domainResults: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  }
};
```

### 3. Real-time Updates

WebSocket integration for live AI features:

```typescript
interface AIWebSocketEvents {
  // Conversation updates
  'conversation:message': AIMessage;
  'conversation:typing': TypingIndicator;

  // Action updates
  'action:started': ActionUpdate;
  'action:progress': ActionProgress;
  'action:completed': ActionResult;

  // Context updates
  'context:changed': ContextDelta;
  'proactive:suggestion': ProactiveSuggestion;
}
```

## Scalability Considerations

### 1. Horizontal Scaling
- Stateless conversation components
- Context caching with Redis
- Load balancing for AI endpoints
- WebSocket connection pooling

### 2. Performance Optimization
- Lazy loading of domain AI modules
- Streaming responses for long operations
- Optimistic UI updates
- Background context preloading

### 3. Memory Management
- Conversation pruning after inactivity
- Context compression for long sessions
- Garbage collection of cached AI results
- Efficient message serialization

## Error Handling & Resilience

### 1. Graceful Degradation
- Fallback to demo responses when AI unavailable
- Progressive enhancement based on available AI modules
- Cached response serving during outages

### 2. Error Recovery
- Automatic retry with exponential backoff
- Conversation state restoration
- Action rollback on failures
- User notification of limitations

### 3. Circuit Breaker Pattern
- Domain AI module health monitoring
- Automatic failover to backup strategies
- Performance degradation alerts

## Monitoring & Observability

### 1. Metrics Collection
- Conversation engagement metrics
- Domain AI module usage statistics
- Action execution success rates
- Response time and performance metrics

### 2. Logging Strategy
- Structured conversation logs
- AI decision audit trails
- Performance bottleneck identification
- Error pattern analysis

### 3. User Feedback Loop
- Response quality rating
- Feature usage analytics
- Conversation completion tracking
- User satisfaction measurement

---

This architecture provides a robust foundation for the Unified AI Assistant while leveraging all existing AI infrastructure investments and maintaining consistency with established patterns.