import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Smart Search Result
 */
export interface SmartSearchResult {
  query_interpretation: string;
  intent: SearchIntent;
  results: SearchResultItem[];
  suggestions: string[];
  filters_applied: AppliedFilter[];
  total_count: number;
  search_time_ms: number;
}

export type SearchIntent =
  | "find_customer"
  | "find_work_order"
  | "find_invoice"
  | "find_technician"
  | "check_status"
  | "find_overdue"
  | "search_general";

export interface SearchResultItem {
  type:
    | "customer"
    | "work_order"
    | "invoice"
    | "technician"
    | "prospect"
    | "ticket";
  id: string;
  title: string;
  subtitle: string;
  relevance_score: number;
  highlights: string[];
  url: string;
  metadata: Record<string, string | number>;
}

export interface AppliedFilter {
  field: string;
  value: string;
  source: "inferred" | "explicit";
}

/**
 * Smart search with natural language processing
 */
export function useSmartSearch() {
  return useMutation({
    mutationFn: async (query: string): Promise<SmartSearchResult> => {
      try {
        const response = await apiClient.post("/ai/search", { query });
        return response.data;
      } catch {
        return processNaturalLanguageQuery(query);
      }
    },
  });
}

/**
 * Get search suggestions as user types
 */
export function useSearchSuggestions() {
  return useMutation({
    mutationFn: async (partialQuery: string): Promise<string[]> => {
      try {
        const response = await apiClient.get("/ai/search/suggestions", {
          params: { q: partialQuery },
        });
        return response.data.suggestions || [];
      } catch {
        return generateDemoSuggestions(partialQuery);
      }
    },
  });
}

/**
 * Process natural language query (demo)
 */
function processNaturalLanguageQuery(query: string): SmartSearchResult {
  const lowerQuery = query.toLowerCase();
  const startTime = Date.now();

  // Detect intent
  let intent: SearchIntent = "search_general";
  let queryInterpretation = `Searching for "${query}"`;
  const filters: AppliedFilter[] = [];
  const results: SearchResultItem[] = [];

  // Customer search patterns
  if (
    lowerQuery.includes("customer") ||
    lowerQuery.includes("client") ||
    lowerQuery.match(/find\s+\w+\s+\w+/)
  ) {
    intent = "find_customer";
    queryInterpretation = "Looking for customer records";

    // Extract name patterns
    const nameMatch = lowerQuery.match(
      /(?:find|search|show|get)\s+(?:customer\s+)?(\w+(?:\s+\w+)?)/,
    );
    if (nameMatch) {
      filters.push({ field: "name", value: nameMatch[1], source: "inferred" });
    }

    results.push(
      {
        type: "customer",
        id: "c1",
        title: "John Smith",
        subtitle: "john.smith@email.com | (555) 123-4567",
        relevance_score: 95,
        highlights: ["Regular customer since 2022"],
        url: "/customers/c1",
        metadata: { status: "active", total_orders: 12 },
      },
      {
        type: "customer",
        id: "c2",
        title: "Smith Family Properties",
        subtitle: "commercial@sfp.com | (555) 987-6543",
        relevance_score: 82,
        highlights: ["Commercial account"],
        url: "/customers/c2",
        metadata: { status: "active", total_orders: 5 },
      },
    );
  }

  // Work order patterns
  else if (
    lowerQuery.includes("work order") ||
    lowerQuery.includes("job") ||
    lowerQuery.includes("service")
  ) {
    intent = "find_work_order";
    queryInterpretation = "Searching for work orders";

    if (lowerQuery.includes("today")) {
      filters.push({ field: "date", value: "today", source: "inferred" });
      queryInterpretation = "Work orders scheduled for today";
    }
    if (lowerQuery.includes("overdue") || lowerQuery.includes("late")) {
      filters.push({ field: "status", value: "overdue", source: "inferred" });
      queryInterpretation = "Overdue work orders";
    }
    if (lowerQuery.includes("pending")) {
      filters.push({ field: "status", value: "pending", source: "inferred" });
    }

    results.push(
      {
        type: "work_order",
        id: "wo123",
        title: "WO-2024-0123 - Septic Pumping",
        subtitle: "123 Main St | John Smith",
        relevance_score: 92,
        highlights: ["Scheduled for today at 2:00 PM"],
        url: "/work-orders/wo123",
        metadata: { status: "scheduled", priority: "normal" },
      },
      {
        type: "work_order",
        id: "wo124",
        title: "WO-2024-0124 - System Inspection",
        subtitle: "456 Oak Ave | Jane Doe",
        relevance_score: 78,
        highlights: ["Due for completion"],
        url: "/work-orders/wo124",
        metadata: { status: "in_progress", priority: "high" },
      },
    );
  }

  // Invoice patterns
  else if (
    lowerQuery.includes("invoice") ||
    lowerQuery.includes("payment") ||
    lowerQuery.includes("unpaid") ||
    lowerQuery.includes("overdue")
  ) {
    intent = "find_invoice";
    queryInterpretation = "Searching for invoices";

    if (lowerQuery.includes("unpaid") || lowerQuery.includes("overdue")) {
      filters.push({ field: "status", value: "unpaid", source: "inferred" });
      queryInterpretation = "Unpaid/overdue invoices";
    }

    results.push(
      {
        type: "invoice",
        id: "inv456",
        title: "INV-2024-0456 - $750.00",
        subtitle: "John Smith | Due: Dec 15, 2024",
        relevance_score: 88,
        highlights: ["30 days overdue"],
        url: "/invoices/inv456",
        metadata: { status: "overdue", amount: 750 },
      },
      {
        type: "invoice",
        id: "inv457",
        title: "INV-2024-0457 - $1,200.00",
        subtitle: "ABC Company | Due: Dec 20, 2024",
        relevance_score: 75,
        highlights: ["Payment pending"],
        url: "/invoices/inv457",
        metadata: { status: "pending", amount: 1200 },
      },
    );
  }

  // Technician patterns
  else if (
    lowerQuery.includes("technician") ||
    lowerQuery.includes("tech") ||
    lowerQuery.includes("available")
  ) {
    intent = "find_technician";
    queryInterpretation = "Looking for technician information";

    if (lowerQuery.includes("available")) {
      filters.push({
        field: "availability",
        value: "available",
        source: "inferred",
      });
      queryInterpretation = "Available technicians";
    }

    results.push(
      {
        type: "technician",
        id: "t1",
        title: "Mike Johnson",
        subtitle: "Senior Technician | 5 jobs today",
        relevance_score: 90,
        highlights: ["Currently available", "Septic specialist"],
        url: "/technicians/t1",
        metadata: { status: "available", jobs_today: 5 },
      },
      {
        type: "technician",
        id: "t2",
        title: "Sarah Williams",
        subtitle: "Technician | 3 jobs today",
        relevance_score: 85,
        highlights: ["On a job until 3 PM"],
        url: "/technicians/t2",
        metadata: { status: "busy", jobs_today: 3 },
      },
    );
  }

  // General search - search across entities
  else {
    results.push({
      type: "customer",
      id: "c3",
      title: "Best match for query",
      subtitle: "Matching record found",
      relevance_score: 70,
      highlights: [`Matches: "${query}"`],
      url: "/customers/c3",
      metadata: {},
    });
  }

  const endTime = Date.now();

  return {
    query_interpretation: queryInterpretation,
    intent,
    results,
    suggestions: generateDemoSuggestions(query),
    filters_applied: filters,
    total_count: results.length,
    search_time_ms: endTime - startTime,
  };
}

/**
 * Generate demo search suggestions
 */
function generateDemoSuggestions(partialQuery: string): string[] {
  const lower = partialQuery.toLowerCase();
  const suggestions: string[] = [];

  if (lower.startsWith("find")) {
    suggestions.push(
      "find customer John Smith",
      "find overdue invoices",
      "find work orders for today",
      "find available technicians",
    );
  } else if (lower.includes("invoice")) {
    suggestions.push(
      "show unpaid invoices",
      "invoices due this week",
      "overdue invoices over $500",
    );
  } else if (lower.includes("customer")) {
    suggestions.push(
      "customers with pending work orders",
      "new customers this month",
      "customers needing follow-up",
    );
  } else if (lower.includes("work")) {
    suggestions.push(
      "work orders scheduled today",
      "incomplete work orders",
      "work orders by priority",
    );
  } else {
    suggestions.push(
      "find customer...",
      "show overdue invoices",
      "today's work orders",
      "available technicians",
    );
  }

  return suggestions.slice(0, 5);
}
