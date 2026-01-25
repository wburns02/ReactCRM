/**
 * Ticket AI Adapter
 *
 * Integrates ticket management AI capabilities with the unified assistant
 */

import {
  BaseAIAdapterImpl,
  type UnifiedAIResponse,
  type AdapterSchema,
  type AdapterExample,
  type ActionableInsight,
} from "./BaseAIAdapter";
import type {
  AIDomain,
  AICapability,
  AIContext,
  AIAction,
  ActionResult,
  HealthStatus,
} from "@/api/types/aiAssistant";

// ===== TICKET QUERY TYPES =====

export interface TicketQuery {
  operation:
    | "analyze_urgency"
    | "suggest_priority"
    | "find_related"
    | "summarize_backlog"
    | "predict_resolution";
  parameters: TicketParameters;
}

export interface TicketParameters {
  ticket_id?: string;
  ticket_ids?: string[];
  customer_id?: string;
  status_filter?: "open" | "in_progress" | "pending" | "resolved" | "all";
  date_range?: { start: string; end: string };
  category?: string;
  priority_filter?: "low" | "medium" | "high" | "urgent" | "all";
  assignee_id?: string;
}

export interface TicketResult {
  analysis: TicketAnalysis;
  recommendations: TicketRecommendation[];
  backlog_summary?: BacklogSummary;
  related_tickets?: RelatedTicket[];
  resolution_prediction?: ResolutionPrediction;
}

export interface TicketAnalysis {
  urgency_score: number;
  suggested_priority: "low" | "medium" | "high" | "urgent";
  category_match: string;
  sentiment: "negative" | "neutral" | "positive";
  complexity: "simple" | "moderate" | "complex";
  estimated_resolution_time: number; // minutes
  confidence: number;
}

export interface TicketRecommendation {
  id: string;
  type: "escalate" | "reassign" | "merge" | "auto_respond" | "prioritize";
  ticket_id: string;
  description: string;
  reason: string;
  confidence: number;
  impact: {
    resolution_time_reduction?: number;
    customer_satisfaction_impact?: "positive" | "neutral" | "negative";
  };
}

export interface BacklogSummary {
  total_open: number;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  average_age_hours: number;
  oldest_ticket_days: number;
  sla_at_risk: number;
  overdue: number;
}

export interface RelatedTicket {
  id: string;
  title: string;
  similarity_score: number;
  relationship: "duplicate" | "related" | "parent" | "child";
  status: string;
  resolution?: string;
}

export interface ResolutionPrediction {
  estimated_hours: number;
  confidence: number;
  factors: string[];
  similar_resolved_tickets: number;
  recommended_assignee?: string;
}

// ===== TICKET AI ADAPTER =====

export class TicketAIAdapter extends BaseAIAdapterImpl<
  TicketQuery,
  TicketResult
> {
  readonly domain: AIDomain = "tickets";
  readonly version = "1.0.0";
  readonly capabilities: AICapability[] = [
    "query",
    "action",
    "analysis",
    "classification",
    "prediction",
    "recommendation",
  ];

  async query(
    request: TicketQuery,
    context: AIContext,
  ): Promise<UnifiedAIResponse<TicketResult>> {
    const startTime = Date.now();

    try {
      // Execute ticket-specific operation
      const result = await this.executeTicketOperation(request, context);

      // Transform to unified response
      const response = this.transformToUnified(result, context);

      // Add ticket-specific insights
      response.actionable_insights = this.generateTicketInsights(
        result,
        context,
      );
      response.suggested_actions = this.generateSuggestedActions(
        result,
        context,
      );
      response.follow_up_questions = this.generateFollowUpQuestions(
        request.operation,
      );

      // Add processing time
      response.processing.duration_ms = Date.now() - startTime;

      return response;
    } catch (error) {
      return this.createErrorResponse(error, startTime);
    }
  }

  async execute(action: AIAction, _context: AIContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeTicketAction(action);

      return {
        actionId: action.id,
        success: true,
        result,
        duration: Date.now() - startTime,
        affectedEntities: this.extractAffectedEntities(action),
        rollbackAvailable: ["escalate", "reassign", "prioritize"].includes(
          action.operation,
        ),
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        affectedEntities: [],
        rollbackAvailable: false,
      };
    }
  }

  protected getSourceHookName(): string {
    return "useTicketAI";
  }

  getSchema(): AdapterSchema {
    return {
      query_schema: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: [
              "analyze_urgency",
              "suggest_priority",
              "find_related",
              "summarize_backlog",
              "predict_resolution",
            ],
          },
          parameters: {
            type: "object",
            properties: {
              ticket_id: { type: "string" },
              ticket_ids: { type: "array", items: { type: "string" } },
              customer_id: { type: "string" },
              status_filter: {
                type: "string",
                enum: ["open", "in_progress", "pending", "resolved", "all"],
              },
              category: { type: "string" },
              priority_filter: {
                type: "string",
                enum: ["low", "medium", "high", "urgent", "all"],
              },
              assignee_id: { type: "string" },
            },
          },
        },
        required: ["operation", "parameters"],
      },
      response_schema: {
        type: "object",
        properties: {
          analysis: { type: "object" },
          recommendations: { type: "array" },
          backlog_summary: { type: "object" },
          related_tickets: { type: "array" },
          resolution_prediction: { type: "object" },
        },
      },
    };
  }

  getExamples(): AdapterExample[] {
    return [
      {
        name: "Analyze ticket urgency",
        description: "Analyze the urgency of a specific ticket",
        query: {
          operation: "analyze_urgency",
          parameters: { ticket_id: "TKT-001" },
        },
        expected_response: {
          analysis: {
            urgency_score: 8.5,
            suggested_priority: "high",
            confidence: 0.92,
          },
        },
      },
      {
        name: "Summarize backlog",
        description: "Get a summary of the current ticket backlog",
        query: {
          operation: "summarize_backlog",
          parameters: { status_filter: "open" },
        },
        expected_response: {
          backlog_summary: {
            total_open: 45,
            sla_at_risk: 8,
            overdue: 3,
          },
        },
      },
    ];
  }

  // ===== PRIVATE METHODS =====

  private async executeTicketOperation(
    request: TicketQuery,
    context: AIContext,
  ): Promise<TicketResult> {
    switch (request.operation) {
      case "analyze_urgency":
        return this.analyzeUrgency(request.parameters, context);
      case "suggest_priority":
        return this.suggestPriority(request.parameters, context);
      case "find_related":
        return this.findRelatedTickets(request.parameters, context);
      case "summarize_backlog":
        return this.summarizeBacklog(request.parameters, context);
      case "predict_resolution":
        return this.predictResolution(request.parameters, context);
      default:
        return this.getDefaultResult();
    }
  }

  private analyzeUrgency(
    params: TicketParameters,
    _context: AIContext,
  ): TicketResult {
    return {
      analysis: {
        urgency_score: 7.5,
        suggested_priority: "high",
        category_match: "Technical Support",
        sentiment: "negative",
        complexity: "moderate",
        estimated_resolution_time: 45,
        confidence: 0.88,
      },
      recommendations: [
        {
          id: "rec_urgency_1",
          type: "escalate",
          ticket_id: params.ticket_id || "",
          description:
            "Escalate to senior support due to negative sentiment and complexity",
          reason:
            "Customer has expressed frustration and issue requires technical expertise",
          confidence: 0.85,
          impact: {
            resolution_time_reduction: 30,
            customer_satisfaction_impact: "positive",
          },
        },
        {
          id: "rec_urgency_2",
          type: "prioritize",
          ticket_id: params.ticket_id || "",
          description: "Increase priority to High",
          reason: "Urgency score of 7.5/10 suggests immediate attention needed",
          confidence: 0.88,
          impact: {
            customer_satisfaction_impact: "positive",
          },
        },
      ],
    };
  }

  private suggestPriority(
    params: TicketParameters,
    _context: AIContext,
  ): TicketResult {
    const ticketIds = params.ticket_ids || [params.ticket_id || ""];

    return {
      analysis: {
        urgency_score: 6.0,
        suggested_priority: "medium",
        category_match: "General Inquiry",
        sentiment: "neutral",
        complexity: "simple",
        estimated_resolution_time: 20,
        confidence: 0.92,
      },
      recommendations: ticketIds.map((id, index) => ({
        id: `rec_priority_${index}`,
        type: "prioritize" as const,
        ticket_id: id,
        description: `Set priority to ${index === 0 ? "High" : "Medium"}`,
        reason: "Based on content analysis and customer history",
        confidence: 0.9 - index * 0.05,
        impact: {
          customer_satisfaction_impact: "positive" as const,
        },
      })),
    };
  }

  private findRelatedTickets(
    params: TicketParameters,
    _context: AIContext,
  ): TicketResult {
    return {
      analysis: {
        urgency_score: 5.0,
        suggested_priority: "medium",
        category_match: "Technical Support",
        sentiment: "neutral",
        complexity: "moderate",
        estimated_resolution_time: 30,
        confidence: 0.85,
      },
      recommendations: [
        {
          id: "rec_related_1",
          type: "merge",
          ticket_id: params.ticket_id || "",
          description:
            "Consider merging with TKT-456 - appears to be duplicate issue",
          reason:
            "Same customer, similar issue description, 92% content similarity",
          confidence: 0.92,
          impact: {
            resolution_time_reduction: 15,
          },
        },
      ],
      related_tickets: [
        {
          id: "TKT-456",
          title: "Similar issue with AC unit not cooling",
          similarity_score: 0.92,
          relationship: "duplicate",
          status: "open",
        },
        {
          id: "TKT-321",
          title: "AC maintenance request",
          similarity_score: 0.78,
          relationship: "related",
          status: "resolved",
          resolution: "Scheduled preventive maintenance",
        },
        {
          id: "TKT-234",
          title: "HVAC system inspection needed",
          similarity_score: 0.65,
          relationship: "related",
          status: "resolved",
          resolution: "Completed inspection, replaced filter",
        },
      ],
    };
  }

  private summarizeBacklog(
    _params: TicketParameters,
    context: AIContext,
  ): TicketResult {
    const tickets = context.domain.tickets || [];

    return {
      analysis: {
        urgency_score: 6.5,
        suggested_priority: "medium",
        category_match: "Multiple",
        sentiment: "neutral",
        complexity: "moderate",
        estimated_resolution_time: 0,
        confidence: 0.95,
      },
      recommendations: [
        {
          id: "rec_backlog_1",
          type: "prioritize",
          ticket_id: "",
          description: "Address 3 overdue tickets immediately",
          reason:
            "Overdue tickets negatively impact SLA compliance and customer satisfaction",
          confidence: 1.0,
          impact: {
            customer_satisfaction_impact: "positive",
          },
        },
        {
          id: "rec_backlog_2",
          type: "reassign",
          ticket_id: "",
          description: "Redistribute tickets to balance workload",
          reason: "Some agents have 3x more tickets than others",
          confidence: 0.85,
          impact: {
            resolution_time_reduction: 60,
          },
        },
      ],
      backlog_summary: {
        total_open: tickets.length || 45,
        by_priority: {
          urgent: 3,
          high: 12,
          medium: 20,
          low: 10,
        },
        by_category: {
          "Technical Support": 18,
          Billing: 12,
          Scheduling: 8,
          "General Inquiry": 7,
        },
        average_age_hours: 28,
        oldest_ticket_days: 5,
        sla_at_risk: 8,
        overdue: 3,
      },
    };
  }

  private predictResolution(
    params: TicketParameters,
    _context: AIContext,
  ): TicketResult {
    return {
      analysis: {
        urgency_score: 6.0,
        suggested_priority: "medium",
        category_match: "Technical Support",
        sentiment: "neutral",
        complexity: "moderate",
        estimated_resolution_time: 45,
        confidence: 0.82,
      },
      recommendations: [
        {
          id: "rec_resolution_1",
          type: "reassign",
          ticket_id: params.ticket_id || "",
          description: "Assign to John Smith for fastest resolution",
          reason:
            "John has resolved 15 similar tickets with average 30 min resolution time",
          confidence: 0.88,
          impact: {
            resolution_time_reduction: 25,
            customer_satisfaction_impact: "positive",
          },
        },
      ],
      resolution_prediction: {
        estimated_hours: 0.75,
        confidence: 0.82,
        factors: [
          "Similar to 15 previously resolved tickets",
          "Moderate complexity based on description",
          "Customer has standard support tier",
        ],
        similar_resolved_tickets: 15,
        recommended_assignee: "John Smith",
      },
    };
  }

  private getDefaultResult(): TicketResult {
    return {
      analysis: {
        urgency_score: 5.0,
        suggested_priority: "medium",
        category_match: "General",
        sentiment: "neutral",
        complexity: "simple",
        estimated_resolution_time: 30,
        confidence: 0.5,
      },
      recommendations: [],
    };
  }

  private generateTicketInsights(
    result: TicketResult,
    _context: AIContext,
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Urgency insight
    if (result.analysis.urgency_score >= 7) {
      insights.push({
        type: "risk",
        category: "risk",
        title: "High Urgency Ticket Detected",
        description: `Urgency score of ${result.analysis.urgency_score}/10 - immediate attention recommended`,
        priority: "high",
        confidence: result.analysis.confidence,
      });
    }

    // Backlog insights
    if (result.backlog_summary) {
      if (result.backlog_summary.overdue > 0) {
        insights.push({
          type: "risk",
          category: "risk",
          title: "Overdue Tickets",
          description: `${result.backlog_summary.overdue} tickets are overdue and need immediate attention`,
          priority: "critical",
          confidence: 1.0,
        });
      }

      if (result.backlog_summary.sla_at_risk > 0) {
        insights.push({
          type: "risk",
          category: "risk",
          title: "SLA At Risk",
          description: `${result.backlog_summary.sla_at_risk} tickets are at risk of breaching SLA`,
          priority: "high",
          confidence: 0.95,
        });
      }
    }

    // Related tickets insight
    if (result.related_tickets?.some((t) => t.relationship === "duplicate")) {
      insights.push({
        type: "optimization",
        category: "optimization",
        title: "Potential Duplicate Tickets",
        description:
          "Found tickets that may be duplicates - merging could save time",
        priority: "medium",
        confidence: 0.9,
        estimated_impact: {
          type: "time_saved",
          amount: 15,
          unit: "minutes",
        },
        estimatedValue: {
          type: "time_saved",
          amount: 15,
          unit: "minutes",
        },
      });
    }

    // Sentiment insight
    if (result.analysis.sentiment === "negative") {
      insights.push({
        type: "risk",
        category: "risk",
        title: "Negative Customer Sentiment",
        description:
          "Customer appears frustrated - consider prioritizing for customer retention",
        priority: "high",
        confidence: result.analysis.confidence,
      });
    }

    return insights;
  }

  private generateSuggestedActions(
    result: TicketResult,
    _context: AIContext,
  ): AIAction[] {
    return result.recommendations.slice(0, 3).map((rec, index) => ({
      id: `action_ticket_${Date.now()}_${index}`,
      type: this.mapRecommendationToActionType(rec.type),
      domain: "tickets" as const,
      operation: rec.type,
      payload: {
        ticket_id: rec.ticket_id,
        recommendation_id: rec.id,
        description: rec.description,
      },
      requirements: [
        {
          type: "confirmation" as const,
          description:
            rec.type === "merge"
              ? "Confirm merge cannot be undone"
              : "Confirm action",
          satisfied: false,
        },
      ],
      status: "pending" as const,
      confidence: rec.confidence,
      estimatedImpact: {
        time_saved_minutes: rec.impact.resolution_time_reduction,
        customer_satisfaction: rec.impact.customer_satisfaction_impact,
      },
    }));
  }

  private mapRecommendationToActionType(recType: string): AIAction["type"] {
    const mapping: Record<string, AIAction["type"]> = {
      escalate: "update",
      reassign: "update",
      merge: "update",
      auto_respond: "notify",
      prioritize: "update",
    };
    return mapping[recType] || "update";
  }

  private generateFollowUpQuestions(operation: string): string[] {
    const questions: Record<string, string[]> = {
      analyze_urgency: [
        "Would you like me to escalate this ticket?",
        "Should I assign this to a specific team member?",
        "Want to see similar tickets that were resolved?",
      ],
      suggest_priority: [
        "Should I apply the suggested priority?",
        "Would you like to see the factors affecting this priority?",
        "Should I update priorities for all selected tickets?",
      ],
      find_related: [
        "Should I merge the duplicate tickets?",
        "Would you like to see the resolution from related tickets?",
        "Should I link these tickets together?",
      ],
      summarize_backlog: [
        "Would you like recommendations to reduce the backlog?",
        "Should I identify which tickets to prioritize?",
        "Want to see workload distribution across agents?",
      ],
      predict_resolution: [
        "Should I assign to the recommended agent?",
        "Would you like to see similar resolved tickets?",
        "Should I set up automated follow-up?",
      ],
    };

    return (
      questions[operation] || [
        "What else would you like to know about tickets?",
        "Should I analyze another ticket?",
      ]
    );
  }

  private async executeTicketAction(action: AIAction): Promise<unknown> {
    return {
      success: true,
      message: `Successfully executed ${action.operation} on ticket`,
      ticket_id: action.payload.ticket_id,
    };
  }

  private extractAffectedEntities(
    action: AIAction,
  ): { type: string; id: string }[] {
    const entities: { type: string; id: string }[] = [];

    if (action.payload.ticket_id) {
      entities.push({ type: "ticket", id: action.payload.ticket_id as string });
    }

    return entities;
  }

  private createErrorResponse(
    error: unknown,
    startTime: number,
  ): UnifiedAIResponse<TicketResult> {
    return {
      domain: this.domain,
      operation: "error",
      result: {
        primary: this.getDefaultResult(),
        metadata: {
          source_hook: this.getSourceHookName(),
          transformation_applied: false,
          demo_data_used: false,
          context_used: [],
          generated_at: new Date().toISOString(),
        },
      },
      confidence: 0,
      completeness: 0,
      freshness: 0,
      processing: {
        duration_ms: Date.now() - startTime,
        cache_hit: false,
        model_version: this.version,
      },
      errors: [
        {
          code: "TICKET_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown ticket error",
          domain: this.domain,
          recoverable: true,
          suggestedFix: "Please try again or check the ticket parameters",
        },
      ],
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    return {
      status: "healthy",
      response_time_ms: Date.now() - startTime,
      error_rate: 0,
      last_check: new Date().toISOString(),
      issues: [],
    };
  }
}

// ===== VALIDATION =====

export function validateTicketQuery(query: unknown): query is TicketQuery {
  if (!query || typeof query !== "object") return false;

  const q = query as Record<string, unknown>;

  const validOperations = [
    "analyze_urgency",
    "suggest_priority",
    "find_related",
    "summarize_backlog",
    "predict_resolution",
  ];

  return (
    typeof q.operation === "string" &&
    validOperations.includes(q.operation) &&
    typeof q.parameters === "object"
  );
}
