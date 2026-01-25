import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Review analysis result
 */
export interface ReviewAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  sentiment_score: number;
  key_topics: string[];
  emotions_detected: string[];
  requires_response: boolean;
  response_priority: "high" | "medium" | "low";
  suggested_tone: "apologetic" | "grateful" | "professional" | "empathetic";
}

/**
 * Generated response
 */
export interface GeneratedResponse {
  response: string;
  tone: string;
  key_points_addressed: string[];
  personalization_elements: string[];
  alternative_responses: string[];
}

/**
 * Review response template
 */
export interface ResponseTemplate {
  id: string;
  name: string;
  sentiment_target: "positive" | "neutral" | "negative";
  template: string;
  variables: string[];
  usage_count: number;
}

/**
 * Analyze a customer review
 */
export function useAnalyzeReview() {
  return useMutation({
    mutationFn: async (params: {
      review_text: string;
      rating?: number;
      platform?: "google" | "yelp" | "facebook" | "other";
    }): Promise<ReviewAnalysis> => {
      try {
        const response = await apiClient.post("/ai/reviews/analyze", params);
        return response.data;
      } catch {
        return generateDemoAnalysis(params.review_text, params.rating);
      }
    },
  });
}

/**
 * Generate a response to a review
 */
export function useGenerateReviewResponse() {
  return useMutation({
    mutationFn: async (params: {
      review_text: string;
      rating?: number;
      customer_name?: string;
      service_details?: string;
      tone?: "apologetic" | "grateful" | "professional" | "empathetic";
    }): Promise<GeneratedResponse> => {
      try {
        const response = await apiClient.post(
          "/ai/reviews/generate-response",
          params,
        );
        return response.data;
      } catch {
        return generateDemoResponse(params);
      }
    },
  });
}

/**
 * Get response templates
 */
export function useResponseTemplates() {
  return useQuery({
    queryKey: ["review-response-templates"],
    queryFn: async (): Promise<ResponseTemplate[]> => {
      try {
        const response = await apiClient.get("/ai/reviews/templates");
        return response.data;
      } catch {
        return generateDemoTemplates();
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Bulk generate responses for pending reviews
 */
export function useBulkGenerateResponses() {
  return useMutation({
    mutationFn: async (params: {
      review_ids: string[];
    }): Promise<{
      generated: number;
      responses: Record<string, GeneratedResponse>;
    }> => {
      try {
        const response = await apiClient.post(
          "/ai/reviews/bulk-generate",
          params,
        );
        return response.data;
      } catch {
        const responses: Record<string, GeneratedResponse> = {};
        params.review_ids.forEach((id) => {
          responses[id] = generateDemoResponse({
            review_text: "Thank you for your feedback!",
          });
        });
        return { generated: params.review_ids.length, responses };
      }
    },
  });
}

function generateDemoAnalysis(text: string, rating?: number): ReviewAnalysis {
  const lowerText = text.toLowerCase();
  const isPositive = rating
    ? rating >= 4
    : lowerText.includes("great") ||
      lowerText.includes("excellent") ||
      lowerText.includes("amazing") ||
      lowerText.includes("thank");
  const isNegative = rating
    ? rating <= 2
    : lowerText.includes("terrible") ||
      lowerText.includes("awful") ||
      lowerText.includes("worst") ||
      lowerText.includes("never");

  return {
    sentiment: isPositive ? "positive" : isNegative ? "negative" : "neutral",
    sentiment_score: isPositive ? 0.85 : isNegative ? 0.25 : 0.55,
    key_topics: extractTopics(text),
    emotions_detected: isPositive
      ? ["satisfaction", "gratitude"]
      : isNegative
        ? ["frustration", "disappointment"]
        : ["neutral"],
    requires_response: true,
    response_priority: isNegative ? "high" : isPositive ? "low" : "medium",
    suggested_tone: isNegative
      ? "apologetic"
      : isPositive
        ? "grateful"
        : "professional",
  };
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes("service") || lowerText.includes("work"))
    topics.push("service quality");
  if (
    lowerText.includes("price") ||
    lowerText.includes("cost") ||
    lowerText.includes("expensive")
  )
    topics.push("pricing");
  if (
    lowerText.includes("time") ||
    lowerText.includes("quick") ||
    lowerText.includes("late")
  )
    topics.push("timeliness");
  if (
    lowerText.includes("professional") ||
    lowerText.includes("technician") ||
    lowerText.includes("staff")
  )
    topics.push("staff");
  if (lowerText.includes("clean") || lowerText.includes("mess"))
    topics.push("cleanliness");

  return topics.length > 0 ? topics : ["general feedback"];
}

function generateDemoResponse(params: {
  review_text: string;
  rating?: number;
  customer_name?: string;
  tone?: string;
}): GeneratedResponse {
  const isPositive = params.rating ? params.rating >= 4 : true;
  const customerName = params.customer_name || "valued customer";

  if (isPositive) {
    return {
      response: `Thank you so much for your wonderful review, ${customerName}! We're thrilled to hear about your positive experience with our team. Your satisfaction is our top priority, and feedback like yours motivates us to continue delivering excellent service. We look forward to serving you again!`,
      tone: "grateful",
      key_points_addressed: [
        "Expressed gratitude",
        "Acknowledged positive experience",
        "Invited future business",
      ],
      personalization_elements: ["Customer name", "Reference to team"],
      alternative_responses: [
        `We're so grateful for your kind words, ${customerName}! Thank you for choosing us for your septic needs.`,
        `Your review made our day, ${customerName}! We appreciate you taking the time to share your experience.`,
      ],
    };
  } else {
    return {
      response: `Thank you for taking the time to share your feedback, ${customerName}. We sincerely apologize that your experience didn't meet your expectations. This is not the standard we strive for, and we'd like the opportunity to make things right. Please contact us at your earliest convenience so we can address your concerns directly. Your satisfaction is important to us.`,
      tone: "apologetic",
      key_points_addressed: [
        "Acknowledged feedback",
        "Apologized",
        "Offered resolution",
        "Requested follow-up",
      ],
      personalization_elements: ["Customer name", "Specific apology"],
      alternative_responses: [
        `We're sorry to hear about your experience, ${customerName}. We take all feedback seriously and would appreciate the chance to discuss this further.`,
        `Thank you for bringing this to our attention. We're committed to resolving your concerns and would like to speak with you directly.`,
      ],
    };
  }
}

function generateDemoTemplates(): ResponseTemplate[] {
  return [
    {
      id: "tpl-1",
      name: "5-Star Thank You",
      sentiment_target: "positive",
      template:
        "Thank you so much for your amazing {rating}-star review, {customer_name}! We're thrilled that {technician_name} and our team could provide excellent service. Your recommendation means the world to us!",
      variables: ["rating", "customer_name", "technician_name"],
      usage_count: 156,
    },
    {
      id: "tpl-2",
      name: "Service Appreciation",
      sentiment_target: "positive",
      template:
        "We truly appreciate your kind feedback, {customer_name}! It's customers like you who make our work rewarding. Thank you for trusting us with your {service_type} needs. We look forward to serving you again!",
      variables: ["customer_name", "service_type"],
      usage_count: 98,
    },
    {
      id: "tpl-3",
      name: "Issue Resolution",
      sentiment_target: "negative",
      template:
        "We sincerely apologize for falling short of your expectations, {customer_name}. Your feedback about {issue} is taken very seriously. We'd like to make this right - please contact our customer service team at {phone} so we can address your concerns directly.",
      variables: ["customer_name", "issue", "phone"],
      usage_count: 45,
    },
    {
      id: "tpl-4",
      name: "Follow-Up Request",
      sentiment_target: "neutral",
      template:
        "Thank you for your review, {customer_name}. We value your feedback and always strive to improve. If there's anything specific we can do better, please don't hesitate to reach out. We appreciate your business!",
      variables: ["customer_name"],
      usage_count: 72,
    },
  ];
}
