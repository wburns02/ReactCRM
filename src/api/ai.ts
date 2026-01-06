/**
 * AI Assistant API Types and Utilities
 */
import { apiClient } from './client';

/**
 * Chat message type
 */
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
  type: 'customer' | 'work_order' | 'schedule' | 'invoice' | 'general';
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
  type: 'navigate' | 'create' | 'update' | 'call' | 'email' | 'schedule';
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
 * Chat request payload
 */
export interface AIChatRequest {
  message: string;
  session_id?: string;
  context?: AIContext;
  stream?: boolean;
}

/**
 * Chat response
 */
export interface AIChatResponse {
  message: AIMessage;
  session_id: string;
  suggestions?: AISuggestion[];
}

/**
 * AI API Functions
 */
export const aiApi = {
  /**
   * Send a chat message to the AI assistant
   */
  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const { data } = await apiClient.post('/ai/chat', request);
    return data;
  },

  /**
   * Get chat history
   */
  async getChatHistory(sessionId?: string): Promise<AIChatSession[]> {
    const params = sessionId ? `?session_id=${sessionId}` : '';
    const { data } = await apiClient.get(`/ai/chat/history${params}`);
    return data.sessions || [];
  },

  /**
   * Get customer insights from AI
   */
  async getCustomerInsights(customerId: number): Promise<{
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    recommendations: string[];
    risk_score: number;
    lifetime_value_prediction: number;
  }> {
    const { data } = await apiClient.get(`/ai/customers/${customerId}/insights`);
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
    const { data } = await apiClient.get(`/ai/work-orders/${workOrderId}/recommendations`);
    return data;
  },

  /**
   * Generate content with AI
   */
  async generateContent(params: {
    type: 'email' | 'sms' | 'note' | 'description';
    context: Record<string, unknown>;
    tone?: 'professional' | 'friendly' | 'formal';
  }): Promise<{ content: string; alternatives: string[] }> {
    const { data } = await apiClient.post('/ai/generate', params);
    return data;
  },

  /**
   * Analyze data with AI
   */
  async analyze(params: {
    type: 'revenue' | 'performance' | 'trends' | 'anomalies';
    date_range?: { start: string; end: string };
    filters?: Record<string, unknown>;
  }): Promise<{
    summary: string;
    insights: string[];
    charts_data: Record<string, unknown>;
  }> {
    const { data } = await apiClient.post('/ai/analyze', params);
    return data;
  },
};
