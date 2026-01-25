/**
 * AI Assistant Core Types
 *
 * Unified types for the AI Assistant that orchestrates all domain-specific AI modules
 */

// ===== CORE TYPES =====

export type AIDomain =
  | "customer-activity"
  | "dispatch"
  | "tickets"
  | "scheduling"
  | "pricing"
  | "search"
  | "calls"
  | "leads"
  | "documents"
  | "contracts"
  | "payments"
  | "compliance"
  | "technicians"
  | "reports"
  | "inventory"
  | "insights";

export type AICapability =
  | "query"
  | "action"
  | "analysis"
  | "prediction"
  | "optimization"
  | "summarization"
  | "classification"
  | "recommendation";

export type UserRole =
  | "administrator"
  | "manager"
  | "technician"
  | "phone_agent"
  | "dispatcher"
  | "billing";

// ===== CONVERSATION TYPES =====

export interface AIConversation {
  id: string;
  userId: string;
  sessionId: string;
  messages: AIMessage[];
  context: AIContext;
  settings: ConversationSettings;
  createdAt: string;
  lastActiveAt: string;
  status: "active" | "paused" | "completed" | "archived";
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  intent?: AIIntent;
  actions?: AIAction[];
  confidence?: number;
  metadata?: MessageMetadata;
  processing?: ProcessingMetadata;
}

export interface MessageMetadata {
  suggestions?: AISuggestion[];
  actions?: AIAction[];
  context?: Record<string, unknown>;
  sources?: string[];
  reasoning?: string;
}

export interface ProcessingMetadata {
  duration_ms: number;
  tokens_used?: number;
  cache_hit: boolean;
  model_version: string;
  domains_queried: AIDomain[];
}

// ===== CONTEXT TYPES =====

export interface AIContext {
  // User Context
  user: {
    id: string;
    role: UserRole;
    permissions: string[];
    preferences: AIPreferences;
    department?: string;
  };

  // Application Context
  app: {
    currentPage: string;
    currentEntity?: EntityContext;
    recentActivity: ActivityContext[];
    navigationHistory: NavigationContext[];
    viewport: ViewportContext;
  };

  // Domain Context
  domain: {
    customers?: CustomerContext[];
    workOrders?: WorkOrderContext[];
    tickets?: TicketContext[];
    schedule?: ScheduleContext;
    technicians?: TechnicianContext[];
  };

  // Session Context
  session: {
    conversationHistory: AIMessage[];
    activeIntents: AIIntent[];
    pendingActions: AIAction[];
    executedActions: ActionResult[];
  };
}

export interface EntityContext {
  type:
    | "customer"
    | "work_order"
    | "ticket"
    | "technician"
    | "invoice"
    | "schedule";
  id: string;
  data?: Record<string, unknown>;
}

export interface ActivityContext {
  type: string;
  timestamp: string;
  entity: EntityContext;
  details?: Record<string, unknown>;
}

export interface NavigationContext {
  path: string;
  timestamp: string;
  duration?: number;
}

export interface ViewportContext {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  orientation?: "portrait" | "landscape";
}

// ===== INTENT & QUERY TYPES =====

export interface AIIntent {
  type: "query" | "action" | "conversation" | "navigation" | "help";
  domain?: AIDomain;
  operation: string;
  entities: ExtractedEntity[];
  confidence: number;
  parameters?: Record<string, unknown>;
  requiresAuth?: boolean;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface ExtractedEntity {
  type:
    | "customer"
    | "work_order"
    | "ticket"
    | "technician"
    | "date"
    | "location"
    | "service_type";
  value: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface AIQuery {
  id: string;
  naturalLanguageQuery: string;
  intent: AIIntent;
  context: AIContext;
  timestamp: string;
  userId: string;
}

export interface DomainQuery {
  id: string;
  domain: AIDomain;
  operation: string;
  parameters: Record<string, unknown>;
  priority: "primary" | "secondary" | "supporting";
  dependencies?: string[];
}

// ===== ACTION TYPES =====

export interface AIAction {
  id: string;
  type:
    | "create"
    | "update"
    | "delete"
    | "schedule"
    | "notify"
    | "analyze"
    | "optimize";
  domain: AIDomain;
  operation: string;
  payload: Record<string, unknown>;
  requirements: ActionRequirement[];
  rollbackData?: Record<string, unknown>;
  executedAt?: string;
  status: "pending" | "executing" | "completed" | "failed" | "rolled_back";
  confidence: number;
  estimatedImpact?: ActionImpact;
}

export interface ActionRequirement {
  type: "permission" | "confirmation" | "data_availability" | "business_rule";
  description: string;
  satisfied: boolean;
  metadata?: Record<string, unknown>;
}

export interface ActionImpact {
  time_saved_minutes?: number;
  cost_saved?: number;
  customer_satisfaction?: "positive" | "neutral" | "negative";
  risk_level?: "low" | "medium" | "high";
}

export interface ActionResult {
  actionId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  affectedEntities: EntityReference[];
  rollbackAvailable: boolean;
}

export interface EntityReference {
  type: string;
  id: string;
  name?: string;
}

// ===== RESPONSE TYPES =====

export interface AIResponse {
  id: string;
  queryId: string;
  conversationId: string;

  // Core response data
  primaryResult: unknown;
  supportingResults: unknown[];

  // Quality indicators
  confidence: number;
  completeness: number;
  freshness: number;

  // Actionability
  actionableInsights: ActionableInsight[];
  suggestedActions: AIAction[];
  followUpQuestions: string[];

  // Processing metadata
  processing: {
    duration_ms: number;
    tokens_used?: number;
    cache_hit: boolean;
    model_version: string;
    domains_involved: AIDomain[];
  };

  // Error handling
  errors?: AIError[];
  warnings?: AIWarning[];
  limitations?: string[];

  timestamp: string;
}

export interface ActionableInsight {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  category: "opportunity" | "risk" | "optimization" | "information";
  suggestedAction?: AIAction;
  confidence: number;
  estimatedValue?: {
    type: "time_saved" | "cost_saved" | "revenue_opportunity";
    amount: number;
    unit: string;
  };
}

export interface AISuggestion {
  id: string;
  type: "quick_action" | "follow_up_question" | "related_query";
  title: string;
  description?: string;
  action?: AIAction;
  query?: string;
  confidence: number;
}

export interface AIError {
  code: string;
  message: string;
  domain?: AIDomain;
  recoverable: boolean;
  suggestedFix?: string;
}

export interface AIWarning {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
}

// ===== PREFERENCES & SETTINGS =====

export interface AIPreferences {
  communicationStyle: "brief" | "detailed" | "technical" | "conversational";
  notificationFrequency: "immediate" | "hourly" | "daily" | "weekly";
  autoExecuteThreshold: number; // 0-1, confidence threshold for auto-execution
  preferredResponseFormat: "text" | "structured" | "visual";
  voiceEnabled: boolean;
  proactiveSuggestions: boolean;
  executiveMode: ExecutiveModeSettings;
}

export interface ExecutiveModeSettings {
  enabled: boolean;
  confidenceThreshold: number; // 0.8-1.0
  allowedTypes: AIAction["type"][];
  maxAutoExecutionsPerHour: number;
  showNotifications: boolean;
  requireConnection: boolean;
}

export interface ConversationSettings {
  autoSave: boolean;
  retentionDays: number;
  shareWithTeam: boolean;
  encryptSensitiveData: boolean;
  auditLevel: "minimal" | "standard" | "comprehensive";
}

// ===== DOMAIN-SPECIFIC CONTEXTS =====

export interface CustomerContext {
  id: string;
  name: string;
  tier: "vip" | "standard" | "new";
  risk_level: "low" | "medium" | "high";
  recent_interactions: number;
  satisfaction_score?: number;
}

export interface WorkOrderContext {
  id: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  technician_id?: string;
  customer_id: string;
  scheduled_date?: string;
  service_type: string;
}

export interface TicketContext {
  id: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assigned_to?: string;
  customer_id: string;
  created_at: string;
}

export interface ScheduleContext {
  current_date: string;
  view_type: "day" | "week" | "month";
  selected_technician?: string;
  filter_criteria?: Record<string, unknown>;
  conflicts: number;
  utilization_rate: number;
}

export interface TechnicianContext {
  id: string;
  name: string;
  status: "available" | "busy" | "offline";
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  skills: string[];
  current_job?: string;
  rating?: number;
}

// ===== HEALTH & MONITORING =====

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  response_time_ms: number;
  error_rate: number;
  last_check: string;
  issues?: string[];
}

export interface AIMetrics {
  conversation_count: number;
  average_response_time: number;
  success_rate: number;
  user_satisfaction: number;
  feature_usage: Record<string, number>;
  error_breakdown: Record<string, number>;
}
