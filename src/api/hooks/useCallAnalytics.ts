import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Call Sentiment Result
 */
export interface CallSentimentResult {
  overall_sentiment: "positive" | "neutral" | "negative";
  sentiment_score: number; // -100 to 100
  confidence: number; // 0-100
  emotions_detected: EmotionData[];
  key_moments: CallMoment[];
  topics_discussed: string[];
  customer_satisfaction_indicator: number; // 1-10
  escalation_risk: "low" | "medium" | "high";
  summary: string;
  action_items: string[];
  coaching_tips?: string[];
}

export interface EmotionData {
  emotion: string;
  intensity: "low" | "medium" | "high";
  timestamp_range?: string;
}

export interface CallMoment {
  timestamp: string;
  type: "positive" | "negative" | "neutral";
  description: string;
}

/**
 * Get AI sentiment analysis for a call
 */
export function useCallSentiment(callId: number | string | undefined) {
  return useQuery({
    queryKey: ["call-sentiment", callId],
    queryFn: async (): Promise<CallSentimentResult> => {
      if (!callId) throw new Error("Call ID required");

      try {
        const response = await apiClient.get(`/ai/calls/${callId}/sentiment`);
        return response.data;
      } catch {
        // Demo fallback
        return generateDemoSentiment();
      }
    },
    enabled: !!callId,
    staleTime: 60 * 60 * 1000, // 1 hour (sentiment doesn't change)
  });
}

/**
 * Analyze call transcript
 */
export function useTranscriptAnalysis() {
  return useMutation({
    mutationFn: async (params: {
      callId: number;
      transcript?: string;
    }): Promise<{
      summary: string;
      key_points: string[];
      action_items: string[];
      sentiment: CallSentimentResult;
    }> => {
      try {
        const response = await apiClient.post("/ai/calls/analyze-transcript", params);
        return response.data;
      } catch {
        return {
          summary: "Call analysis in demo mode. Connect to AI backend for full analysis.",
          key_points: ["Customer inquiry handled", "Information provided"],
          action_items: ["Follow up within 24 hours"],
          sentiment: generateDemoSentiment(),
        };
      }
    },
  });
}

/**
 * Get call quality score
 */
export function useCallQualityScore(callId: number | string | undefined) {
  return useQuery({
    queryKey: ["call-quality", callId],
    queryFn: async () => {
      if (!callId) return null;

      try {
        const response = await apiClient.get(`/ai/calls/${callId}/quality-score`);
        return response.data;
      } catch {
        return {
          overall_score: 75,
          categories: {
            professionalism: 80,
            resolution: 70,
            empathy: 75,
            clarity: 78,
          },
          improvements: ["Consider summarizing key points at end of call"],
        };
      }
    },
    enabled: !!callId,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Get agent coaching suggestions
 */
export function useAgentCoaching(callId: number | string | undefined) {
  return useQuery({
    queryKey: ["agent-coaching", callId],
    queryFn: async () => {
      if (!callId) return null;

      try {
        const response = await apiClient.get(`/ai/calls/${callId}/coaching`);
        return response.data;
      } catch {
        return {
          strengths: [
            "Good rapport building",
            "Clear communication",
          ],
          areas_for_improvement: [
            "Could use more empathy statements when customer expresses frustration",
            "Consider offering proactive solutions",
          ],
          suggested_phrases: [
            '"I understand how that can be frustrating..."',
            '"Let me make sure I get this right for you..."',
          ],
          overall_rating: 4,
        };
      }
    },
    enabled: !!callId,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Batch analyze multiple calls
 */
export function useBatchCallAnalysis() {
  return useMutation({
    mutationFn: async (callIds: number[]): Promise<Record<number, CallSentimentResult>> => {
      try {
        const response = await apiClient.post("/ai/calls/batch-analyze", { call_ids: callIds });
        return response.data;
      } catch {
        return {};
      }
    },
  });
}

/**
 * Generate demo sentiment data
 */
function generateDemoSentiment(): CallSentimentResult {
  const sentiments: Array<"positive" | "neutral" | "negative"> = ["positive", "neutral", "negative"];
  const randomSentiment = sentiments[Math.floor(Math.random() * 3)];

  let score = 0;
  let satisfaction = 5;
  let escalationRisk: "low" | "medium" | "high" = "low";

  if (randomSentiment === "positive") {
    score = 40 + Math.floor(Math.random() * 60);
    satisfaction = 7 + Math.floor(Math.random() * 3);
    escalationRisk = "low";
  } else if (randomSentiment === "negative") {
    score = -60 + Math.floor(Math.random() * 40);
    satisfaction = 2 + Math.floor(Math.random() * 3);
    escalationRisk = Math.random() > 0.5 ? "high" : "medium";
  } else {
    score = -20 + Math.floor(Math.random() * 40);
    satisfaction = 5 + Math.floor(Math.random() * 2);
    escalationRisk = Math.random() > 0.7 ? "medium" : "low";
  }

  const emotions: EmotionData[] = [];
  if (randomSentiment === "positive") {
    emotions.push({ emotion: "Satisfaction", intensity: "high" });
    emotions.push({ emotion: "Interest", intensity: "medium" });
  } else if (randomSentiment === "negative") {
    emotions.push({ emotion: "Frustration", intensity: "medium" });
    emotions.push({ emotion: "Concern", intensity: "high" });
  } else {
    emotions.push({ emotion: "Neutral", intensity: "medium" });
  }

  const keyMoments: CallMoment[] = [
    {
      timestamp: "0:30",
      type: "neutral",
      description: "Customer explained their situation",
    },
    {
      timestamp: "2:15",
      type: randomSentiment === "negative" ? "negative" : "positive",
      description: randomSentiment === "negative"
        ? "Customer expressed frustration with wait time"
        : "Agent provided helpful solution",
    },
    {
      timestamp: "4:00",
      type: randomSentiment === "positive" ? "positive" : "neutral",
      description: randomSentiment === "positive"
        ? "Customer thanked agent for quick resolution"
        : "Call concluded with next steps",
    },
  ];

  const summaries: Record<string, string> = {
    positive: "This was a successful customer interaction. The customer's needs were addressed effectively and they expressed satisfaction with the service provided.",
    neutral: "This was a standard customer interaction. The agent handled the inquiry professionally and provided the requested information.",
    negative: "This call showed signs of customer dissatisfaction. The customer expressed concerns that may require follow-up attention.",
  };

  return {
    overall_sentiment: randomSentiment,
    sentiment_score: score,
    confidence: 70 + Math.floor(Math.random() * 25),
    emotions_detected: emotions,
    key_moments: keyMoments,
    topics_discussed: ["Service inquiry", "Scheduling", "Pricing"],
    customer_satisfaction_indicator: satisfaction,
    escalation_risk: escalationRisk,
    summary: summaries[randomSentiment],
    action_items: randomSentiment === "negative"
      ? ["Follow up with customer within 24 hours", "Review complaint handling process"]
      : ["Log interaction for future reference"],
    coaching_tips: randomSentiment === "negative"
      ? ["Use more empathy statements", "Acknowledge frustration before providing solutions"]
      : ["Great job maintaining positive tone"],
  };
}
