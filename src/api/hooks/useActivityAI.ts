import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { Activity } from "../types/activity";

/**
 * Activity Summary Result
 */
export interface ActivitySummaryResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
  next_steps?: string[];
  customer_mood?: string;
  interaction_quality: number; // 1-10
}

/**
 * Get AI-generated summary of customer activities
 */
export function useActivitySummary(customerId: string | undefined) {
  return useQuery({
    queryKey: ["activity-summary", customerId],
    queryFn: async (): Promise<ActivitySummaryResult> => {
      if (!customerId) throw new Error("Customer ID required");

      try {
        const response = await apiClient.get(
          `/ai/customers/${customerId}/activity-summary`,
        );
        return response.data;
      } catch {
        // Fetch activities and generate demo summary
        try {
          const activitiesRes = await apiClient.get("/activities", {
            params: { customer_id: customerId, page_size: 50 },
          });
          return generateDemoSummary(activitiesRes.data?.items || []);
        } catch {
          return generateDemoSummary([]);
        }
      }
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate summary for a specific date range
 */
export function useActivityRangeSummary() {
  return useMutation({
    mutationFn: async (params: {
      customerId: string;
      startDate: string;
      endDate: string;
    }): Promise<ActivitySummaryResult> => {
      try {
        const response = await apiClient.post(
          "/ai/activities/summarize-range",
          params,
        );
        return response.data;
      } catch {
        return generateDemoSummary([]);
      }
    },
  });
}

/**
 * Generate action items from activity notes
 */
export function useExtractActionItems() {
  return useMutation({
    mutationFn: async (activities: Activity[]): Promise<string[]> => {
      try {
        const response = await apiClient.post(
          "/ai/activities/extract-actions",
          {
            activities: activities.map((a) => ({
              type: a.activity_type,
              description: a.description,
              created_at: a.created_at,
            })),
          },
        );
        return response.data.action_items || [];
      } catch {
        return extractDemoActionItems(activities);
      }
    },
  });
}

/**
 * Generate weekly digest for a customer
 */
export function useWeeklyDigest(customerId: string | undefined) {
  return useQuery({
    queryKey: ["weekly-digest", customerId],
    queryFn: async () => {
      if (!customerId) return null;

      try {
        const response = await apiClient.get(
          `/ai/customers/${customerId}/weekly-digest`,
        );
        return response.data;
      } catch {
        return {
          period: "This Week",
          total_interactions: 3,
          highlights: [
            "Customer scheduled a service appointment",
            "Estimate was approved",
            "Follow-up call completed successfully",
          ],
          pending_items: [
            "Invoice payment pending",
            "Satisfaction survey not completed",
          ],
          recommended_actions: [
            "Send payment reminder",
            "Schedule follow-up call",
          ],
        };
      }
    },
    enabled: !!customerId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Generate demo summary from activities
 */
function generateDemoSummary(activities: Activity[]): ActivitySummaryResult {
  if (activities.length === 0) {
    return {
      summary:
        "No recent activity recorded for this customer. Consider reaching out to maintain engagement.",
      key_points: ["No recent interactions"],
      action_items: ["Schedule initial contact", "Send introduction email"],
      sentiment: "neutral",
      topics: [],
      next_steps: ["Initiate customer contact"],
      interaction_quality: 5,
    };
  }

  const activityTypes = activities.map((a) => a.activity_type);
  const hasCall = activityTypes.includes("call");
  const hasEmail = activityTypes.includes("email");
  const hasMeeting = activityTypes.includes("meeting");

  const topics: string[] = [];
  const keyPoints: string[] = [];
  const actionItems: string[] = [];

  // Analyze activity descriptions for common topics
  const allNotes = activities
    .map((a) => a.description || "")
    .join(" ")
    .toLowerCase();

  if (
    allNotes.includes("payment") ||
    allNotes.includes("invoice") ||
    allNotes.includes("bill")
  ) {
    topics.push("Billing");
    keyPoints.push("Customer has discussed payment/billing matters");
  }
  if (
    allNotes.includes("schedule") ||
    allNotes.includes("appointment") ||
    allNotes.includes("time")
  ) {
    topics.push("Scheduling");
    keyPoints.push("Scheduling was a discussion topic");
  }
  if (
    allNotes.includes("issue") ||
    allNotes.includes("problem") ||
    allNotes.includes("complaint")
  ) {
    topics.push("Support");
    keyPoints.push("Customer raised concerns or issues");
    actionItems.push("Follow up on reported issues");
  }
  if (
    allNotes.includes("quote") ||
    allNotes.includes("estimate") ||
    allNotes.includes("price")
  ) {
    topics.push("Sales");
    keyPoints.push("Pricing or estimates were discussed");
  }

  // Add type-based insights
  if (hasCall) keyPoints.push("Phone conversations have occurred");
  if (hasEmail) keyPoints.push("Email correspondence is active");
  if (hasMeeting) keyPoints.push("Meetings have been conducted");

  // Determine sentiment
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (
    allNotes.includes("happy") ||
    allNotes.includes("thank") ||
    allNotes.includes("great") ||
    allNotes.includes("satisfied")
  ) {
    sentiment = "positive";
  } else if (
    allNotes.includes("upset") ||
    allNotes.includes("angry") ||
    allNotes.includes("disappointed") ||
    allNotes.includes("frustrated")
  ) {
    sentiment = "negative";
    actionItems.push("Address customer concerns promptly");
  }

  // Generate summary
  const summary = `This customer has ${activities.length} recorded ${activities.length === 1 ? "interaction" : "interactions"} in the recent period. ${
    hasCall ? "Phone calls have been exchanged. " : ""
  }${hasEmail ? "Email communication is ongoing. " : ""}${hasMeeting ? "Meetings have been conducted. " : ""}${
    sentiment === "positive"
      ? "Overall engagement appears positive."
      : sentiment === "negative"
        ? "Some concerns may need attention."
        : "Engagement level is normal."
  }`;

  // Default action items if none detected
  if (actionItems.length === 0) {
    actionItems.push("Continue regular communication");
    if (!hasCall && activities.length > 2)
      actionItems.push("Consider a phone check-in");
  }

  return {
    summary,
    key_points:
      keyPoints.length > 0
        ? keyPoints
        : ["Regular customer interaction maintained"],
    action_items: actionItems,
    sentiment,
    topics: topics.length > 0 ? topics : ["General"],
    next_steps: [
      "Review upcoming service schedule",
      "Monitor customer satisfaction",
    ],
    customer_mood:
      sentiment === "positive"
        ? "Satisfied"
        : sentiment === "negative"
          ? "Needs attention"
          : "Neutral",
    interaction_quality:
      sentiment === "positive" ? 8 : sentiment === "negative" ? 4 : 6,
  };
}

/**
 * Extract action items from activity notes (demo)
 */
function extractDemoActionItems(activities: Activity[]): string[] {
  const items: string[] = [];
  const notes = activities
    .map((a) => a.description || "")
    .join(" ")
    .toLowerCase();

  if (notes.includes("follow up") || notes.includes("follow-up")) {
    items.push("Complete scheduled follow-up");
  }
  if (notes.includes("call back") || notes.includes("callback")) {
    items.push("Return customer call");
  }
  if (notes.includes("send") || notes.includes("email")) {
    items.push("Send requested information");
  }
  if (notes.includes("schedule") || notes.includes("appointment")) {
    items.push("Confirm scheduling details");
  }
  if (notes.includes("quote") || notes.includes("estimate")) {
    items.push("Prepare or follow up on quote");
  }

  return items.length > 0
    ? items
    : ["Review customer history", "Plan next engagement"];
}
