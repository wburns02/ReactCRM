/**
 * AI Assistant React Hooks
 */
import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  aiApi,
  type AIMessage,
  type AIChatSession,
  type AIContext,
  type AISuggestion,
  type AIChatResponse,
} from "@/api/ai";

/**
 * Generate demo responses when backend is not available
 */
function generateDemoResponse(message: string): AIChatResponse {
  const lowerMessage = message.toLowerCase();
  let responseContent = "";

  // Customer-related queries
  if (
    lowerMessage.includes("customer") ||
    lowerMessage.includes("find") ||
    lowerMessage.includes("lookup") ||
    lowerMessage.includes("search")
  ) {
    responseContent = `I'd be happy to help you find customer information! In demo mode, I can show you how this works:

**To search for a customer**, you can:
1. Go to the **Customers** page from the sidebar
2. Use the search bar to find by name, email, or phone
3. Click on any customer to see their full details

Once the AI backend is connected, I'll be able to search and display customer information directly in this chat!`;
  }
  // Scheduling queries
  else if (
    lowerMessage.includes("schedule") ||
    lowerMessage.includes("time") ||
    lowerMessage.includes("slot") ||
    lowerMessage.includes("appointment")
  ) {
    responseContent = `Great question about scheduling! Here's what I can help with:

**Current scheduling features:**
- View the **Schedule** page for the calendar view
- Drag and drop work orders to reschedule
- See technician availability at a glance

**Coming soon with AI:**
- Automatic optimal time slot suggestions
- Route optimization for multiple jobs
- Conflict detection and resolution`;
  }
  // Work order queries
  else if (
    lowerMessage.includes("work order") ||
    lowerMessage.includes("job") ||
    lowerMessage.includes("service")
  ) {
    responseContent = `I can help with work orders! Here's a quick overview:

**To manage work orders:**
1. Go to **Work Orders** to see all jobs
2. Click **+ New Work Order** to create one
3. Use filters to find specific orders

**AI-powered features (coming soon):**
- Predict job duration based on history
- Recommend parts likely needed
- Match best technician for the job`;
  }
  // Analytics queries
  else if (
    lowerMessage.includes("revenue") ||
    lowerMessage.includes("report") ||
    lowerMessage.includes("analytics") ||
    lowerMessage.includes("stats")
  ) {
    responseContent = `For analytics and reporting, check out:

**Available dashboards:**
- **BI Dashboard** - Revenue, trends, KPIs
- **First-Time Fix Rate** - Service quality metrics
- **Reports** - Detailed revenue and performance reports

**AI insights (coming soon):**
- Anomaly detection
- Trend predictions
- Automated weekly summaries`;
  }
  // Hello/greeting
  else if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey")
  ) {
    responseContent = `Hello! Welcome to the AI Assistant demo mode.

I'm running in demo mode because the AI backend isn't connected yet. But I can still help you navigate the CRM!

**Try asking me about:**
- Finding customers
- Scheduling work orders
- Viewing analytics
- Creating invoices`;
  }
  // Default response
  else {
    responseContent = `Thanks for your message! I'm currently running in **demo mode** since the AI backend isn't connected yet.

Here are some things I can help you with right now:

- **"Find a customer"** - I'll show you how to search
- **"Schedule a job"** - Tips for using the calendar
- **"Show revenue"** - Navigate to analytics
- **"Create work order"** - Step-by-step guidance

Once the AI backend is live, I'll be able to:
- Search data and answer questions directly
- Execute actions like scheduling and creating records
- Provide intelligent recommendations`;
  }

  return {
    message: {
      id: `demo-${Date.now()}`,
      role: "assistant",
      content: responseContent,
      timestamp: new Date().toISOString(),
    },
    session_id: `demo-session-${Date.now()}`,
  };
}

/**
 * Query keys for AI features
 */
export const aiKeys = {
  all: ["ai"] as const,
  chat: () => [...aiKeys.all, "chat"] as const,
  history: () => [...aiKeys.all, "history"] as const,
  customerInsights: (id: number) =>
    [...aiKeys.all, "customer-insights", id] as const,
  workOrderRecs: (id: string) =>
    [...aiKeys.all, "work-order-recs", id] as const,
};

/**
 * Default welcome message
 */
const WELCOME_MESSAGE: AIMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I'm your AI assistant for the CRM. I can help you with:

- **Customer Information** - Look up customer details, history, and insights
- **Work Orders** - Check status, find recommendations, and schedule jobs
- **Scheduling** - Find available time slots and optimize routes
- **Analytics** - Get insights on revenue, performance, and trends

How can I help you today?`,
  timestamp: new Date().toISOString(),
};

/**
 * Hook for AI chat functionality
 */
export function useAIChat(initialContext?: AIContext) {
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<AIContext>(initialContext || {});
  const [isTyping, setIsTyping] = useState(false);

  // Update context when it changes externally
  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
    }
  }, [initialContext]);

  // Send message mutation with demo mode fallback
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      try {
        return await aiApi.chat({
          message,
          session_id: sessionId || undefined,
          context,
        });
      } catch (error: unknown) {
        // Check for 404/422 errors - backend not ready, use demo mode
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { status?: number } };
          if (
            axiosError.response?.status === 404 ||
            axiosError.response?.status === 422
          ) {
            // Return demo response
            return generateDemoResponse(message);
          }
        }
        throw error;
      }
    },
    onMutate: (message) => {
      // Optimistically add user message
      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
    },
    onSuccess: (response) => {
      // Add assistant response
      setMessages((prev) => [...prev, response.message]);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setIsTyping(false);
    },
    onError: (error) => {
      // Add error message
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I apologize, but I encountered an error processing your request. ${error instanceof Error ? error.message : "Please try again."}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    },
  });

  // Send a message
  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      sendMessageMutation.mutate(message);
    },
    [sendMessageMutation],
  );

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
  }, []);

  // Update context
  const updateContext = useCallback((newContext: Partial<AIContext>) => {
    setContext((prev) => ({ ...prev, ...newContext }));
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    updateContext,
    isTyping,
    isLoading: sendMessageMutation.isPending,
    error: sendMessageMutation.error,
    sessionId,
  };
}

/**
 * Hook for chat history
 */
export function useAIChatHistory() {
  return useQuery({
    queryKey: aiKeys.history(),
    queryFn: async (): Promise<AIChatSession[]> => {
      try {
        return await aiApi.getChatHistory();
      } catch (error: unknown) {
        // Return empty array if endpoint not available
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return [];
          }
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for customer AI insights
 */
export function useCustomerInsights(customerId: number | undefined) {
  return useQuery({
    queryKey: aiKeys.customerInsights(customerId || 0),
    queryFn: async () => {
      if (!customerId) return null;
      try {
        return await aiApi.getCustomerInsights(customerId);
      } catch (error: unknown) {
        // Return null if endpoint not available
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return null;
          }
        }
        throw error;
      }
    },
    enabled: !!customerId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for work order AI recommendations
 */
export function useWorkOrderRecommendations(workOrderId: string | undefined) {
  return useQuery({
    queryKey: aiKeys.workOrderRecs(workOrderId || ""),
    queryFn: async () => {
      if (!workOrderId) return null;
      try {
        return await aiApi.getWorkOrderRecommendations(workOrderId);
      } catch (error: unknown) {
        // Return null if endpoint not available
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return null;
          }
        }
        throw error;
      }
    },
    enabled: !!workOrderId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for AI content generation
 */
export function useAIGenerate() {
  return useMutation({
    mutationFn: aiApi.generateContent,
  });
}

/**
 * Hook for AI data analysis
 */
export function useAIAnalyze() {
  return useMutation({
    mutationFn: aiApi.analyze,
  });
}

/**
 * Quick actions for common AI tasks
 */
export function useAIQuickActions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  // Generate contextual suggestions based on current page
  const generateSuggestions = useCallback((context: AIContext) => {
    const newSuggestions: AISuggestion[] = [];

    if (context.current_page?.includes("customer")) {
      newSuggestions.push({
        id: "customer-followup",
        type: "customer",
        title: "Schedule Follow-up",
        description: "Schedule a follow-up call with this customer",
        confidence: 0.85,
        action: {
          id: "schedule-followup",
          type: "schedule",
          label: "Schedule",
          payload: { customer_id: context.selected_customer?.id },
        },
      });
    }

    if (context.current_page?.includes("work-order")) {
      newSuggestions.push({
        id: "wo-optimize",
        type: "work_order",
        title: "Optimize Schedule",
        description: "AI can suggest the best technician and time slot",
        confidence: 0.9,
        action: {
          id: "optimize-schedule",
          type: "schedule",
          label: "Optimize",
          payload: { work_order_id: context.selected_work_order?.id },
        },
      });
    }

    setSuggestions(newSuggestions);
  }, []);

  return {
    suggestions,
    generateSuggestions,
  };
}
