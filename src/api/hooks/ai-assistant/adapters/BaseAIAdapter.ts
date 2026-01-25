/**
 * Base AI Adapter Interface
 *
 * Standard interface for integrating existing AI modules with the unified assistant
 */

import type {
  AIDomain,
  AICapability,
  AIContext,
  HealthStatus,
  AIError,
  AIAction,
  ActionResult,
} from "@/api/types/aiAssistant";

// ===== BASE ADAPTER INTERFACE =====

export interface BaseAIAdapter<TQuery = unknown, TResult = unknown> {
  readonly domain: AIDomain;
  readonly capabilities: AICapability[];
  readonly version: string;
  readonly isAvailable: boolean;

  // Core operations
  query(
    request: TQuery,
    context: AIContext,
  ): Promise<UnifiedAIResponse<TResult>>;
  stream?(
    request: TQuery,
    context: AIContext,
  ): AsyncIterator<StreamChunk<TResult>>;
  validate(request: TQuery): ValidationResult;

  // Action execution (optional)
  execute?(action: AIAction, context: AIContext): Promise<ActionResult>;

  // Metadata and health
  getSchema(): AdapterSchema;
  getExamples(): AdapterExample[];
  healthCheck(): Promise<HealthStatus>;
}

// ===== UNIFIED RESPONSE FORMAT =====

export interface UnifiedAIResponse<T = unknown> {
  // Core response data
  domain: AIDomain;
  operation: string;
  result: {
    primary: T;
    supporting?: unknown[];
    metadata?: ResponseMetadata;
  };

  // Quality indicators
  confidence: number;
  completeness: number;
  freshness: number;

  // Actionability
  actionable_insights?: ActionableInsight[];
  suggested_actions?: AIAction[];
  follow_up_questions?: string[];

  // Integration metadata
  processing: {
    duration_ms: number;
    tokens_used?: number;
    cache_hit: boolean;
    model_version: string;
  };

  // Error handling
  errors?: AIError[];
  warnings?: AIWarning[];
  limitations?: string[];
}

export interface ResponseMetadata {
  source_hook: string;
  transformation_applied: boolean;
  demo_data_used: boolean;
  context_used: string[];
  generated_at: string;
}

export interface ActionableInsight {
  type: "opportunity" | "risk" | "optimization" | "information";
  category: "opportunity" | "risk" | "optimization" | "information";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  estimated_impact?: {
    type: "time_saved" | "cost_saved" | "revenue_opportunity";
    amount: number;
    unit: string;
  };
  estimatedValue?: {
    type: "time_saved" | "cost_saved" | "revenue_opportunity";
    amount: number;
    unit: string;
  };
  suggested_action?: AIAction;
  suggestedAction?: AIAction;
}

export interface AIWarning {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
}

// ===== STREAMING SUPPORT =====

export interface StreamChunk<T> {
  chunk_id: string;
  chunk_type: "partial" | "complete" | "error";
  data: Partial<T>;
  is_final: boolean;
}

// ===== VALIDATION =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggested_corrections?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== ADAPTER METADATA =====

export interface AdapterSchema {
  query_schema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  response_schema: {
    type: string;
    properties: Record<string, unknown>;
  };
  action_schemas?: Record<string, unknown>;
}

export interface AdapterExample {
  name: string;
  description: string;
  query: unknown;
  expected_response: unknown;
  context?: Partial<AIContext>;
}

// ===== CONFIDENCE NORMALIZATION =====

export interface ConfidenceNormalizer {
  normalizeConfidence(source: AIDomain, originalConfidence: unknown): number;
  gradeToConfidence(grade: string): number;
  scoreToConfidence(score: number, maxScore: number): number;
  percentageToConfidence(percentage: number): number;
}

// ===== BASE ADAPTER IMPLEMENTATION =====

export abstract class BaseAIAdapterImpl<
  TQuery,
  TResult,
> implements BaseAIAdapter<TQuery, TResult> {
  abstract readonly domain: AIDomain;
  abstract readonly capabilities: AICapability[];
  abstract readonly version: string;

  protected confidenceNormalizer: ConfidenceNormalizer;
  private _lastHealthCheck: Date | null = null;
  private _isHealthy: boolean = true;

  constructor() {
    this.confidenceNormalizer = new ConfidenceNormalizerImpl();
  }

  get isAvailable(): boolean {
    return this._isHealthy;
  }

  abstract query(
    request: TQuery,
    context: AIContext,
  ): Promise<UnifiedAIResponse<TResult>>;

  validate(request: TQuery): ValidationResult {
    // Basic validation - override in subclasses for specific validation
    if (!request) {
      return {
        valid: false,
        errors: [
          {
            field: "request",
            message: "Request is required",
            code: "REQUIRED",
          },
        ],
        warnings: [],
      };
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Override in subclasses for specific health checks
      await this.performHealthCheck();

      const responseTime = Date.now() - startTime;
      this._isHealthy = true;
      this._lastHealthCheck = new Date();

      return {
        status: "healthy",
        response_time_ms: responseTime,
        error_rate: 0,
        last_check: this._lastHealthCheck.toISOString(),
        issues: [],
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this._isHealthy = false;

      return {
        status: "unhealthy",
        response_time_ms: responseTime,
        error_rate: 1,
        last_check: new Date().toISOString(),
        issues: [
          error instanceof Error ? error.message : "Unknown health check error",
        ],
      };
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // Default implementation - can be overridden
    // Could ping the underlying API or check dependencies
  }

  protected transformToUnified(
    originalResult: unknown,
    context: AIContext,
    metadata?: Partial<ResponseMetadata>,
  ): UnifiedAIResponse<TResult> {
    return {
      domain: this.domain,
      operation: "query",
      result: {
        primary: originalResult as TResult,
        metadata: {
          source_hook: this.getSourceHookName(),
          transformation_applied: true,
          demo_data_used: false,
          context_used: this.extractContextUsage(context),
          generated_at: new Date().toISOString(),
          ...metadata,
        },
      },
      confidence: this.extractConfidence(originalResult),
      completeness: this.calculateCompleteness(originalResult),
      freshness: 1.0, // Assume fresh data by default
      processing: {
        duration_ms: 0, // Will be set by orchestrator
        cache_hit: false,
        model_version: this.version,
      },
    };
  }

  protected abstract getSourceHookName(): string;

  protected extractContextUsage(context: AIContext): string[] {
    const used: string[] = [];

    if (context.user) used.push("user_context");
    if (context.app.currentEntity) used.push("current_entity");
    if (context.domain) used.push("domain_context");
    if (context.session.conversationHistory.length > 0)
      used.push("conversation_history");

    return used;
  }

  protected extractConfidence(result: unknown): number {
    // Try to extract confidence from common patterns
    if (typeof result === "object" && result !== null) {
      const obj = result as Record<string, unknown>;

      if (typeof obj.confidence === "number") {
        return this.confidenceNormalizer.normalizeConfidence(
          this.domain,
          obj.confidence,
        );
      }

      if (typeof obj.grade === "string") {
        return this.confidenceNormalizer.gradeToConfidence(obj.grade);
      }

      if (typeof obj.score === "number" && typeof obj.max_score === "number") {
        return this.confidenceNormalizer.scoreToConfidence(
          obj.score,
          obj.max_score,
        );
      }
    }

    // Default confidence
    return 0.75;
  }

  protected calculateCompleteness(result: unknown): number {
    // Basic completeness calculation - can be overridden
    if (!result) return 0;

    if (typeof result === "object" && result !== null) {
      const obj = result as Record<string, unknown>;
      const totalFields = Object.keys(obj).length;
      const filledFields = Object.values(obj).filter(
        (value) => value !== null && value !== undefined && value !== "",
      ).length;

      return totalFields > 0 ? filledFields / totalFields : 0;
    }

    return 1.0; // Assume complete for non-object results
  }

  abstract getSchema(): AdapterSchema;
  abstract getExamples(): AdapterExample[];
}

// ===== CONFIDENCE NORMALIZER IMPLEMENTATION =====

class ConfidenceNormalizerImpl implements ConfidenceNormalizer {
  normalizeConfidence(domain: AIDomain, originalConfidence: unknown): number {
    switch (domain) {
      case "leads":
        // Lead scoring uses A-F grades
        if (typeof originalConfidence === "string") {
          return this.gradeToConfidence(originalConfidence);
        }
        break;

      case "tickets":
        // Ticket AI uses 1-10 urgency scores
        if (typeof originalConfidence === "number") {
          return this.scoreToConfidence(originalConfidence, 10);
        }
        break;

      case "pricing":
        // Pricing AI uses percentage effectiveness
        if (typeof originalConfidence === "number") {
          return this.percentageToConfidence(originalConfidence);
        }
        break;

      default:
        // Most modules already use 0-1 scale
        if (typeof originalConfidence === "number") {
          return Math.min(Math.max(originalConfidence, 0), 1);
        }
    }

    return 0.75; // Default confidence
  }

  gradeToConfidence(grade: string): number {
    const gradeMap: Record<string, number> = {
      A: 0.95,
      B: 0.8,
      C: 0.65,
      D: 0.45,
      F: 0.25,
    };
    return gradeMap[grade.toUpperCase()] || 0.5;
  }

  scoreToConfidence(score: number, maxScore: number): number {
    if (maxScore <= 0) return 0;
    return Math.min(Math.max(score / maxScore, 0), 1);
  }

  percentageToConfidence(percentage: number): number {
    return Math.min(Math.max(percentage / 100, 0), 1);
  }
}
