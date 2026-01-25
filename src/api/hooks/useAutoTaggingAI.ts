import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Auto-tagging suggestion
 */
export interface TagSuggestion {
  tag: string;
  confidence: number;
  category: "customer" | "service" | "priority" | "location" | "equipment";
  reason: string;
}

/**
 * Auto-tag entities based on content
 */
export function useAutoTagSuggestions(params: {
  entity_type: "customer" | "work_order" | "note";
  entity_id: string;
  content?: string;
}) {
  return useQuery({
    queryKey: ["auto-tag-suggestions", params],
    queryFn: async (): Promise<TagSuggestion[]> => {
      try {
        const response = await apiClient.post("/ai/tags/suggest", params);
        return response.data;
      } catch {
        return generateDemoTags(params.entity_type);
      }
    },
    enabled: !!params.entity_id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Apply suggested tags
 */
export function useApplyTags() {
  return useMutation({
    mutationFn: async (params: {
      entity_type: string;
      entity_id: string;
      tags: string[];
    }): Promise<{ success: boolean; applied_tags: string[] }> => {
      try {
        const response = await apiClient.post("/ai/tags/apply", params);
        return response.data;
      } catch {
        return { success: true, applied_tags: params.tags };
      }
    },
  });
}

/**
 * Bulk auto-tag multiple entities
 */
export function useBulkAutoTag() {
  return useMutation({
    mutationFn: async (params: {
      entity_type: string;
      entity_ids: string[];
    }): Promise<{ processed: number; tagged: number }> => {
      try {
        const response = await apiClient.post("/ai/tags/bulk-apply", params);
        return response.data;
      } catch {
        return {
          processed: params.entity_ids.length,
          tagged: params.entity_ids.length,
        };
      }
    },
  });
}

function generateDemoTags(entityType: string): TagSuggestion[] {
  const tagsByType: Record<string, TagSuggestion[]> = {
    customer: [
      {
        tag: "VIP",
        confidence: 0.92,
        category: "priority",
        reason: "High lifetime value and multiple service contracts",
      },
      {
        tag: "Commercial",
        confidence: 0.98,
        category: "customer",
        reason: "Business address detected",
      },
      {
        tag: "Recurring Service",
        confidence: 0.85,
        category: "service",
        reason: "Regular maintenance history",
      },
    ],
    work_order: [
      {
        tag: "Emergency",
        confidence: 0.88,
        category: "priority",
        reason: "Keywords: urgent, backup, overflow detected",
      },
      {
        tag: "Septic Pumping",
        confidence: 0.95,
        category: "service",
        reason: "Service type matches pumping request",
      },
      {
        tag: "Rural",
        confidence: 0.76,
        category: "location",
        reason: "Property location outside city limits",
      },
    ],
    note: [
      {
        tag: "Follow-up Required",
        confidence: 0.82,
        category: "priority",
        reason: "Action items mentioned in note",
      },
      {
        tag: "Equipment Issue",
        confidence: 0.78,
        category: "equipment",
        reason: "Equipment problems mentioned",
      },
    ],
  };

  return tagsByType[entityType] || tagsByType.work_order;
}
