/**
 * AI Assistant API Types and Utilities
 */
import { apiClient } from "./client";

/**
 * Chat message type
 */
export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    suggestions?: AISuggestion[];
    actions?: AIAction[];
    context?: Record<string, unknown>;
  };
}

/**
 * AI suggestion for user actions
 */
export interface AISuggestion {
  id: string;
  type: "customer" | "work_order" | "schedule" | "invoice" | "general";
  title: string;
  description: string;
  confidence: number;
  action?: AIAction;
}

/**
 * Executable AI action
 */
export interface AIAction {
  id: string;
  type: "navigate" | "create" | "update" | "call" | "email" | "schedule";
  label: string;
  payload: Record<string, unknown>;
}

/**
 * Chat session
 */
export interface AIChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
  context?: {
    customer_id?: number;
    work_order_id?: string;
    page?: string;
  };
}

/**
 * AI Assistant context for enhanced responses
 */
export interface AIContext {
  current_page?: string;
  selected_customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  selected_work_order?: {
    id: string;
    status: string;
    customer_name: string;
  };
  user_role?: string;
}

/**
 * Chat request payload (frontend format)
 */
export interface AIChatRequest {
  message: string;
  session_id?: string;
  context?: AIContext;
  stream?: boolean;
}

/**
 * Chat response (frontend format)
 */
export interface AIChatResponse {
  message: AIMessage;
  session_id: string;
  suggestions?: AISuggestion[];
}

/**
 * Backend chat message format
 */
interface BackendChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Backend chat request format
 */
interface BackendChatRequest {
  messages: BackendChatMessage[];
  conversation_id?: string;
  max_tokens?: number;
  temperature?: number;
  system_prompt?: string;
}

/**
 * Backend chat response format
 */
interface BackendChatResponse {
  content: string;
  conversation_id?: string;
  usage?: Record<string, unknown>;
  model?: string;
  error?: string;
}

/**
 * AI API Functions
 */
export const aiApi = {
  /**
   * Send a chat message to the AI assistant
   * Transforms frontend format to backend format and back
   */
  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    // Transform frontend request to backend format
    const backendRequest: BackendChatRequest = {
      messages: [
        {
          role: "user",
          content: request.message,
        },
      ],
      conversation_id: request.session_id,
    };

    // Add context as system prompt if provided
    if (request.context) {
      backendRequest.system_prompt = `You are a helpful CRM assistant. Current context: ${JSON.stringify(request.context)}`;
    }

    const { data } = await apiClient.post<BackendChatResponse>(
      "/ai/chat",
      backendRequest,
    );

    // Transform backend response to frontend format
    // Note: If the backend returned an error, the content will contain the error message
    // We still return it as a valid response so the user sees the message
    const response: AIChatResponse = {
      message: {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
      },
      session_id:
        data.conversation_id || request.session_id || `session-${Date.now()}`,
    };

    return response;
  },

  /**
   * Get chat history
   */
  async getChatHistory(): Promise<AIChatSession[]> {
    // Use conversations endpoint
    const { data } = await apiClient.get("/ai/conversations");
    // Transform to frontend format
    if (Array.isArray(data)) {
      return data.map(
        (conv: {
          id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: conv.id,
          title: conv.title || "Conversation",
          messages: [],
          created_at: conv.created_at || new Date().toISOString(),
          updated_at: conv.updated_at || new Date().toISOString(),
        }),
      );
    }
    return [];
  },

  /**
   * Get customer insights from AI
   */
  async getCustomerInsights(customerId: number): Promise<{
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    recommendations: string[];
    risk_score: number;
    lifetime_value_prediction: number;
  }> {
    const { data } = await apiClient.get(
      `/ai/customers/${customerId}/insights`,
    );
    return data;
  },

  /**
   * Get work order recommendations
   */
  async getWorkOrderRecommendations(workOrderId: string): Promise<{
    estimated_duration: number;
    recommended_parts: string[];
    similar_jobs: { id: string; solution: string }[];
    technician_match: { id: number; name: string; score: number } | null;
  }> {
    const { data } = await apiClient.get(
      `/ai/work-orders/${workOrderId}/recommendations`,
    );
    return data;
  },

  /**
   * Generate content with AI
   */
  async generateContent(params: {
    type: "email" | "sms" | "note" | "description";
    context: Record<string, unknown>;
    tone?: "professional" | "friendly" | "formal";
  }): Promise<{ content: string; alternatives: string[] }> {
    const { data } = await apiClient.post("/ai/generate", params);
    return data;
  },

  /**
   * Analyze data with AI
   */
  async analyze(params: {
    type: "revenue" | "performance" | "trends" | "anomalies" | "billing" | "payment_prediction" | "equipment" | "maintenance";
    data?: Record<string, unknown>;
    question?: string;
    date_range?: { start: string; end: string };
    filters?: Record<string, unknown>;
  }): Promise<{
    summary: string;
    insights: string[];
    charts_data: Record<string, unknown>;
    analysis?: string;
    prediction?: {
      likelihood: number;
      daysToPayment: number;
      riskLevel: "low" | "medium" | "high";
      recommendation: string;
    };
  }> {
    const { data } = await apiClient.post("/ai/analyze", params);
    return data;
  },
};
