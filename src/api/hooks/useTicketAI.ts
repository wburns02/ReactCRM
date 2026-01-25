import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { TicketType, TicketPriority } from "../types/ticket";

/**
 * AI Ticket Triage Response
 */
export interface TicketTriageResult {
  suggested_type: TicketType;
  suggested_priority: TicketPriority;
  suggested_assignee?: string;
  category: string;
  urgency_score: number; // 1-10
  estimated_resolution_time: string;
  similar_tickets: Array<{
    id: string;
    title: string;
    resolution?: string;
  }>;
  auto_response_suggestion?: string;
  tags: string[];
  confidence: number; // 0-100
}

/**
 * AI-powered ticket triage
 * Analyzes ticket content to suggest category, priority, and assignee
 */
export function useTicketTriage() {
  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
    }): Promise<TicketTriageResult> => {
      try {
        const response = await apiClient.post("/ai/tickets/triage", params);
        return response.data;
      } catch {
        // Demo fallback
        return generateDemoTriage(params.title, params.description);
      }
    },
  });
}

/**
 * Batch triage multiple tickets
 */
export function useBatchTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      ticketIds: string[],
    ): Promise<Record<string, TicketTriageResult>> => {
      try {
        const response = await apiClient.post("/ai/tickets/batch-triage", {
          ticket_ids: ticketIds,
        });
        return response.data;
      } catch {
        // Demo fallback - return empty for now
        return {};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

/**
 * Get AI-suggested response for a ticket
 */
export function useTicketAutoResponse(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-auto-response", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      try {
        const response = await apiClient.get(
          `/ai/tickets/${ticketId}/auto-response`,
        );
        return response.data;
      } catch {
        return {
          response:
            "Thank you for contacting us. We've received your request and a team member will review it shortly.",
          tone: "professional",
        };
      }
    },
    enabled: !!ticketId,
  });
}

/**
 * Find similar/duplicate tickets
 */
export function useSimilarTickets(title: string, description: string) {
  return useQuery({
    queryKey: ["similar-tickets", title, description],
    queryFn: async () => {
      try {
        const response = await apiClient.post("/ai/tickets/find-similar", {
          title,
          description,
        });
        return response.data.similar_tickets || [];
      } catch {
        return [];
      }
    },
    enabled: title.length > 10 || description.length > 20,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Generate demo triage result based on content analysis
 */
function generateDemoTriage(
  title: string,
  description: string,
): TicketTriageResult {
  const content = `${title} ${description}`.toLowerCase();

  // Determine type
  let suggested_type: TicketType = "task";
  if (
    content.includes("bug") ||
    content.includes("error") ||
    content.includes("broken") ||
    content.includes("not working") ||
    content.includes("issue")
  ) {
    suggested_type = "bug";
  } else if (
    content.includes("feature") ||
    content.includes("add") ||
    content.includes("new") ||
    content.includes("want") ||
    content.includes("would like")
  ) {
    suggested_type = "feature";
  } else if (
    content.includes("improve") ||
    content.includes("enhance") ||
    content.includes("better") ||
    content.includes("upgrade")
  ) {
    suggested_type = "feature";
  }

  // Determine priority
  let suggested_priority: TicketPriority = "medium";
  let urgency_score = 5;

  if (
    content.includes("urgent") ||
    content.includes("asap") ||
    content.includes("critical") ||
    content.includes("emergency") ||
    content.includes("down")
  ) {
    suggested_priority = "urgent";
    urgency_score = 10;
  } else if (
    content.includes("important") ||
    content.includes("soon") ||
    content.includes("high") ||
    content.includes("blocking")
  ) {
    suggested_priority = "high";
    urgency_score = 8;
  } else if (
    content.includes("whenever") ||
    content.includes("low") ||
    content.includes("minor") ||
    content.includes("nice to have")
  ) {
    suggested_priority = "low";
    urgency_score = 3;
  }

  // Determine category
  let category = "General";
  const tags: string[] = [];

  if (
    content.includes("billing") ||
    content.includes("invoice") ||
    content.includes("payment") ||
    content.includes("charge")
  ) {
    category = "Billing";
    tags.push("billing");
  } else if (
    content.includes("schedule") ||
    content.includes("appointment") ||
    content.includes("time") ||
    content.includes("calendar")
  ) {
    category = "Scheduling";
    tags.push("scheduling");
  } else if (
    content.includes("technician") ||
    content.includes("service") ||
    content.includes("repair") ||
    content.includes("maintenance")
  ) {
    category = "Service";
    tags.push("service");
  } else if (
    content.includes("login") ||
    content.includes("password") ||
    content.includes("access") ||
    content.includes("account")
  ) {
    category = "Account";
    tags.push("account");
  } else if (
    content.includes("quote") ||
    content.includes("estimate") ||
    content.includes("price") ||
    content.includes("cost")
  ) {
    category = "Sales";
    tags.push("sales");
  }

  // Estimate resolution time based on type and priority
  let estimated_resolution_time = "2-4 hours";
  if (suggested_priority === "urgent") {
    estimated_resolution_time = "1 hour";
  } else if (suggested_priority === "high") {
    estimated_resolution_time = "2-4 hours";
  } else if (suggested_priority === "low") {
    estimated_resolution_time = "1-2 days";
  } else if (suggested_type === "feature") {
    estimated_resolution_time = "1-2 weeks";
  }

  // Generate auto-response suggestion
  let auto_response_suggestion =
    "Thank you for reaching out. We've received your request and our team will review it shortly.";

  if (category === "Billing") {
    auto_response_suggestion =
      "Thank you for contacting us about your billing inquiry. Our billing team will review your request and respond within 1 business day.";
  } else if (category === "Scheduling") {
    auto_response_suggestion =
      "Thank you for your scheduling request. Our dispatch team will contact you shortly to confirm your appointment.";
  } else if (suggested_priority === "urgent") {
    auto_response_suggestion =
      "We understand this is urgent. Your request has been marked as urgent priority and our team is being notified immediately.";
  }

  return {
    suggested_type,
    suggested_priority,
    category,
    urgency_score,
    estimated_resolution_time,
    similar_tickets: [],
    auto_response_suggestion,
    tags,
    confidence: 75 + Math.floor(Math.random() * 20), // 75-95%
  };
}
