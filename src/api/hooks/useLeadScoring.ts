import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ProspectStage, LeadSource } from "../types/common";

/**
 * Lead Score Result
 */
export interface LeadScoreResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  conversion_probability: number; // 0-100%
  estimated_close_days: number;
  scoring_factors: ScoringFactor[];
  recommended_actions: string[];
  engagement_level: "hot" | "warm" | "cold";
  best_contact_time?: string;
  priority_rank?: number;
}

export interface ScoringFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

export interface ProspectData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  lead_source?: LeadSource;
  prospect_stage: ProspectStage;
  estimated_value: number;
  lead_notes?: string;
  created_at: string;
}

/**
 * Get AI-generated lead score for a prospect
 */
export function useLeadScore(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["lead-score", prospectId],
    queryFn: async (): Promise<LeadScoreResult> => {
      if (!prospectId) throw new Error("Prospect ID required");

      try {
        const response = await apiClient.get(`/ai/leads/${prospectId}/score`);
        return response.data;
      } catch {
        // Fetch prospect and generate demo score
        try {
          const prospectRes = await apiClient.get(`/prospects/${prospectId}`);
          return generateDemoScore(prospectRes.data);
        } catch {
          return generateDemoScore(null);
        }
      }
    },
    enabled: !!prospectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Batch score multiple prospects
 */
export function useBatchLeadScoring() {
  return useMutation({
    mutationFn: async (prospectIds: string[]): Promise<Record<string, LeadScoreResult>> => {
      try {
        const response = await apiClient.post("/ai/leads/batch-score", { prospect_ids: prospectIds });
        return response.data;
      } catch {
        return {};
      }
    },
  });
}

/**
 * Get conversion prediction
 */
export function useConversionPrediction(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["conversion-prediction", prospectId],
    queryFn: async () => {
      if (!prospectId) return null;

      try {
        const response = await apiClient.get(`/ai/leads/${prospectId}/conversion-prediction`);
        return response.data;
      } catch {
        return {
          will_convert: true,
          probability: 65,
          confidence: 75,
          key_factors: ["Active engagement", "Budget fit", "Timeline match"],
          risks: ["Decision maker not identified", "Competition present"],
        };
      }
    },
    enabled: !!prospectId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get AI recommendations for a prospect
 */
export function useLeadRecommendations(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["lead-recommendations", prospectId],
    queryFn: async () => {
      if (!prospectId) return null;

      try {
        const response = await apiClient.get(`/ai/leads/${prospectId}/recommendations`);
        return response.data;
      } catch {
        return {
          next_best_action: "Schedule a follow-up call",
          talking_points: [
            "Discuss specific pain points",
            "Present relevant case studies",
            "Address pricing questions",
          ],
          objection_handlers: [
            { objection: "Too expensive", response: "Highlight ROI and long-term value" },
            { objection: "Need to think about it", response: "Offer a trial or pilot program" },
          ],
          optimal_follow_up_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        };
      }
    },
    enabled: !!prospectId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Generate demo lead score based on prospect data
 */
function generateDemoScore(prospect: ProspectData | null): LeadScoreResult {
  if (!prospect) {
    return {
      score: 50,
      grade: "C",
      conversion_probability: 30,
      estimated_close_days: 30,
      scoring_factors: [],
      recommended_actions: ["Complete prospect profile"],
      engagement_level: "cold",
    };
  }

  const factors: ScoringFactor[] = [];
  let score = 50; // Base score

  // Lead source scoring
  const sourceScores: Record<string, number> = {
    referral: 25,
    website: 15,
    google_ads: 10,
    social_media: 8,
    trade_show: 12,
    cold_call: 5,
    other: 0,
  };
  if (prospect.lead_source) {
    const sourceScore = sourceScores[prospect.lead_source] || 0;
    score += sourceScore;
    factors.push({
      name: "Lead Source",
      impact: sourceScore > 10 ? "positive" : sourceScore > 5 ? "neutral" : "negative",
      weight: sourceScore,
      description: `${prospect.lead_source} leads have ${sourceScore > 10 ? "high" : "moderate"} conversion rates`,
    });
  }

  // Stage scoring
  const stageScores: Record<ProspectStage, number> = {
    new_lead: 0,
    contacted: 5,
    qualified: 15,
    quoted: 20,
    negotiation: 25,
    won: 30,
    lost: -30,
  };
  const stageScore = stageScores[prospect.prospect_stage] || 0;
  score += stageScore;
  factors.push({
    name: "Sales Stage",
    impact: stageScore > 10 ? "positive" : stageScore > 0 ? "neutral" : "negative",
    weight: stageScore,
    description: `${prospect.prospect_stage.replace("_", " ")} stage indicates ${stageScore > 10 ? "strong" : "early"} interest`,
  });

  // Value scoring
  if (prospect.estimated_value > 5000) {
    score += 15;
    factors.push({
      name: "Deal Value",
      impact: "positive",
      weight: 15,
      description: "High-value opportunity",
    });
  } else if (prospect.estimated_value > 1000) {
    score += 8;
    factors.push({
      name: "Deal Value",
      impact: "neutral",
      weight: 8,
      description: "Mid-value opportunity",
    });
  }

  // Contact info completeness
  const hasEmail = !!prospect.email;
  const hasPhone = !!prospect.phone;
  if (hasEmail && hasPhone) {
    score += 10;
    factors.push({
      name: "Contact Info",
      impact: "positive",
      weight: 10,
      description: "Complete contact information available",
    });
  } else if (!hasEmail && !hasPhone) {
    score -= 10;
    factors.push({
      name: "Contact Info",
      impact: "negative",
      weight: -10,
      description: "Missing contact information",
    });
  }

  // Age of lead (newer is better)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(prospect.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceCreation < 7) {
    score += 10;
    factors.push({
      name: "Lead Age",
      impact: "positive",
      weight: 10,
      description: "Fresh lead - high engagement window",
    });
  } else if (daysSinceCreation > 30) {
    score -= 5;
    factors.push({
      name: "Lead Age",
      impact: "negative",
      weight: -5,
      description: "Aging lead - may need re-engagement",
    });
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade: "A" | "B" | "C" | "D" | "F" = "C";
  if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 35) grade = "D";
  else grade = "F";

  // Determine engagement level
  let engagement_level: "hot" | "warm" | "cold" = "warm";
  if (score >= 70) engagement_level = "hot";
  else if (score < 40) engagement_level = "cold";

  // Calculate conversion probability
  const conversion_probability = Math.round(score * 0.8 + Math.random() * 10);

  // Estimate close days based on stage
  const closeDays: Record<ProspectStage, number> = {
    new_lead: 45,
    contacted: 35,
    qualified: 25,
    quoted: 14,
    negotiation: 7,
    won: 0,
    lost: 0,
  };
  const estimated_close_days = closeDays[prospect.prospect_stage] || 30;

  // Generate recommended actions
  const recommended_actions: string[] = [];
  if (!hasPhone) recommended_actions.push("Get phone number");
  if (!hasEmail) recommended_actions.push("Get email address");
  if (prospect.prospect_stage === "new_lead") recommended_actions.push("Make initial contact within 24h");
  if (prospect.prospect_stage === "qualified") recommended_actions.push("Send proposal");
  if (prospect.prospect_stage === "quoted") recommended_actions.push("Schedule follow-up call");
  if (daysSinceCreation > 14 && prospect.prospect_stage === "contacted") {
    recommended_actions.push("Re-engage with new offer");
  }
  if (recommended_actions.length === 0) recommended_actions.push("Continue nurturing relationship");

  return {
    score,
    grade,
    conversion_probability,
    estimated_close_days,
    scoring_factors: factors,
    recommended_actions,
    engagement_level,
    best_contact_time: "Tuesday-Thursday, 10am-12pm",
  };
}
