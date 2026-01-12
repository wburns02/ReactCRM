/**
 * Mock Data for Customer Segments
 *
 * Comprehensive mock data for development and demo purposes.
 * Used when API is unavailable or for initial UI development.
 */

import type { Segment, SegmentRuleSet } from "@/api/types/customerSuccess.ts";

// ============================================================
// SEGMENT RULES - Realistic rule examples
// ============================================================

export const sampleSegmentRules: Record<string, SegmentRuleSet> = {
  highValue: {
    logic: "and",
    rules: [
      { field: "estimated_value", operator: "gte", value: 5000 },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  atRisk: {
    logic: "and",
    rules: [
      { field: "health_score", operator: "lt", value: 50 },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  growthCandidates: {
    logic: "and",
    rules: [
      { field: "health_score", operator: "gte", value: 70 },
      { field: "tank_count", operator: "lt", value: 3 },
    ],
  },
  newCustomers: {
    logic: "and",
    rules: [
      { field: "days_since_signup", operator: "lt", value: 90 },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  champions: {
    logic: "and",
    rules: [
      { field: "health_score", operator: "gte", value: 85 },
      { field: "engagement_score", operator: "gte", value: 75 },
    ],
  },
  vipAtRisk: {
    logic: "and",
    rules: [
      { field: "estimated_value", operator: "gte", value: 3000 },
      { field: "health_score", operator: "lt", value: 60 },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  aerobicSanMarcos: {
    logic: "and",
    rules: [
      { field: "system_type", operator: "eq", value: "Aerobic" },
      { field: "city", operator: "eq", value: "San Marcos" },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  contractRenewals: {
    logic: "and",
    rules: [
      { field: "days_to_renewal", operator: "lte", value: 60 },
      { field: "days_to_renewal", operator: "gte", value: 0 },
      { field: "is_active", operator: "eq", value: true },
    ],
  },
  recentComplainers: {
    logic: "and",
    rules: [
      { field: "recent_negative_touchpoints", operator: "gte", value: 1 },
      { field: "days_since_last_negative", operator: "lte", value: 30 },
    ],
  },
  digitalLeads: {
    logic: "or",
    rules: [
      { field: "lead_source", operator: "eq", value: "Google" },
      { field: "lead_source", operator: "eq", value: "Facebook" },
      { field: "lead_source", operator: "eq", value: "Website" },
    ],
  },
};

// ============================================================
// SAMPLE SEGMENTS - System segments (smart/dynamic)
// ============================================================

export const systemSegments: Segment[] = [
  {
    id: 1,
    name: "High Value Accounts",
    description:
      "Strategic customers with high contract value and engagement. Priority for QBRs and executive touchpoints.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.highValue,
    priority: 100,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 1,
    customer_count: 23,
    total_arr: 287500,
    avg_health_score: 78.4,
    churn_risk_count: 2,
    color: "#10B981",
    icon: "trophy",
    tags: ["priority", "strategic", "high-touch"],
    last_evaluated_at: new Date(Date.now() - 3600000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 3600000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: null,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 2,
    name: "At Risk - Low Engagement",
    description:
      "Customers showing signs of disengagement with declining health scores. Requires immediate intervention.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.atRisk,
    priority: 95,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 1,
    customer_count: 12,
    total_arr: 48000,
    avg_health_score: 38.2,
    churn_risk_count: 12,
    color: "#EF4444",
    icon: "alert-triangle",
    tags: ["at-risk", "urgent", "churn-prevention"],
    last_evaluated_at: new Date(Date.now() - 1800000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 1800000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: 2,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 3,
    name: "Growth Candidates",
    description:
      "Healthy accounts with expansion potential - good health scores with room to grow.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.growthCandidates,
    priority: 80,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 34,
    total_arr: 102000,
    avg_health_score: 76.8,
    churn_risk_count: 0,
    color: "#3B82F6",
    icon: "trending-up",
    tags: ["expansion", "upsell", "growth"],
    last_evaluated_at: new Date(Date.now() - 86400000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: null,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 4,
    name: "New Customers (< 90 days)",
    description:
      "Recently onboarded customers in their first 90 days. Critical period for adoption and success.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.newCustomers,
    priority: 90,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 18,
    total_arr: 54000,
    avg_health_score: 65.3,
    churn_risk_count: 3,
    color: "#8B5CF6",
    icon: "user-plus",
    tags: ["onboarding", "new-customer", "adoption"],
    last_evaluated_at: new Date(Date.now() - 43200000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: 1,
    on_entry_journey_id: 1,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 5,
    name: "Champions",
    description:
      "Highly engaged advocates with excellent health scores. Great candidates for referrals and case studies.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.champions,
    priority: 85,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 15,
    total_arr: 187500,
    avg_health_score: 91.2,
    churn_risk_count: 0,
    color: "#F59E0B",
    icon: "star",
    tags: ["champion", "advocate", "referral"],
    last_evaluated_at: new Date(Date.now() - 86400000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: null,
    on_entry_journey_id: 3,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 6,
    name: "Commercial Accounts",
    description:
      "Business and commercial customers with different service needs than residential.",
    segment_type: "dynamic",
    rules: {
      logic: "and",
      rules: [
        { field: "customer_type", operator: "eq", value: "Commercial" },
        { field: "is_active", operator: "eq", value: true },
      ],
    },
    priority: 70,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 28,
    total_arr: 168000,
    avg_health_score: 72.1,
    churn_risk_count: 4,
    color: "#6366F1",
    icon: "building",
    tags: ["commercial", "b2b", "enterprise"],
    last_evaluated_at: new Date(Date.now() - 86400000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: null,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
];

// ============================================================
// SAMPLE SEGMENTS - User segments (demo/saved segments)
// ============================================================

export const userSegments: Segment[] = [
  {
    id: 101,
    name: "Aerobic System Owners - San Marcos",
    description:
      "Geographic + equipment type segment: Aerobic system owners in San Marcos area for targeted maintenance campaign.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.aerobicSanMarcos,
    priority: 50,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 8,
    total_arr: 32000,
    avg_health_score: 74.5,
    churn_risk_count: 1,
    color: "#059669",
    icon: "map-pin",
    tags: ["geographic", "aerobic", "san-marcos", "campaign"],
    last_evaluated_at: new Date(Date.now() - 86400000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-06-01T14:30:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: null,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 102,
    name: "VIP At-Risk",
    description:
      "High value customers showing concerning health signals. Priority intervention needed to prevent churn.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.vipAtRisk,
    priority: 98,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 1,
    customer_count: 5,
    total_arr: 62500,
    avg_health_score: 42.8,
    churn_risk_count: 5,
    color: "#DC2626",
    icon: "shield-alert",
    tags: ["vip", "at-risk", "high-priority", "urgent"],
    last_evaluated_at: new Date(Date.now() - 1800000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 1800000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-05-15T09:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: 2,
    on_entry_journey_id: 2,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 103,
    name: "Summer Campaign 2024",
    description:
      "Saved segment for Summer 2024 maintenance campaign - residential customers in high-usage areas.",
    segment_type: "static",
    rules: null,
    priority: 40,
    is_active: true,
    auto_update: false,
    update_frequency_hours: 24,
    customer_count: 45,
    total_arr: 112500,
    avg_health_score: 68.7,
    churn_risk_count: 6,
    color: "#F97316",
    icon: "sun",
    tags: ["campaign", "seasonal", "summer-2024", "marketing"],
    last_evaluated_at: "2024-06-01T00:00:00Z",
    next_evaluation_at: null,
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-05-20T11:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    on_entry_playbook_id: null,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 104,
    name: "Contract Renewals Due",
    description:
      "Service contracts expiring in the next 60 days - proactive renewal outreach needed.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.contractRenewals,
    priority: 88,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 24,
    customer_count: 14,
    total_arr: 84000,
    avg_health_score: 71.3,
    churn_risk_count: 3,
    color: "#7C3AED",
    icon: "calendar-clock",
    tags: ["renewal", "contract", "retention", "proactive"],
    last_evaluated_at: new Date(Date.now() - 43200000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 43200000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-04-10T08:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: 3,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
  {
    id: 105,
    name: "Recent Complainers",
    description:
      "Customers with negative touchpoints or low satisfaction in the past 30 days. Service recovery candidates.",
    segment_type: "dynamic",
    rules: sampleSegmentRules.recentComplainers,
    priority: 92,
    is_active: true,
    auto_update: true,
    update_frequency_hours: 6,
    customer_count: 7,
    total_arr: 28000,
    avg_health_score: 35.4,
    churn_risk_count: 7,
    color: "#E11D48",
    icon: "message-circle-warning",
    tags: ["service-recovery", "complaint", "urgent", "support"],
    last_evaluated_at: new Date(Date.now() - 21600000).toISOString(),
    next_evaluation_at: new Date(Date.now() + 21600000).toISOString(),
    created_by_user_id: 1,
    owned_by_user_id: 1,
    created_at: "2024-03-22T16:00:00Z",
    updated_at: new Date().toISOString(),
    on_entry_playbook_id: 6,
    on_entry_journey_id: null,
    on_exit_playbook_id: null,
    on_exit_journey_id: null,
  },
];

// ============================================================
// COMBINED SEGMENTS
// ============================================================

export const mockSegments: Segment[] = [...systemSegments, ...userSegments];

// ============================================================
// SAMPLE SEGMENT MEMBERS
// ============================================================

export interface SegmentMember {
  id: number;
  customer_id: number;
  segment_id: number;
  customer_name: string;
  email: string;
  company?: string;
  health_score: number;
  health_status: "healthy" | "at_risk" | "critical";
  arr: number;
  entered_at: string;
  entry_reason: string;
  last_contact?: string;
  tags: string[];
}

export const mockSegmentMembers: Record<number, SegmentMember[]> = {
  // High Value Accounts members
  1: [
    {
      id: 1,
      customer_id: 101,
      segment_id: 1,
      customer_name: "Sarah Johnson",
      email: "sarah.johnson@techcorp.com",
      company: "TechCorp Inc.",
      health_score: 88,
      health_status: "healthy",
      arr: 12500,
      entered_at: "2024-01-20T10:00:00Z",
      entry_reason: "Matched rule: estimated_value >= 5000",
      last_contact: "2 days ago",
      tags: ["VIP", "Enterprise", "Multi-Site"],
    },
    {
      id: 2,
      customer_id: 102,
      segment_id: 1,
      customer_name: "Robert Chen",
      email: "robert@industrialco.com",
      company: "Industrial Co",
      health_score: 82,
      health_status: "healthy",
      arr: 18750,
      entered_at: "2024-02-15T14:30:00Z",
      entry_reason: "Matched rule: estimated_value >= 5000",
      last_contact: "1 week ago",
      tags: ["Commercial", "Large Tank"],
    },
    {
      id: 3,
      customer_id: 103,
      segment_id: 1,
      customer_name: "Emily Davis",
      email: "emily@hoameadows.org",
      company: "Meadows HOA",
      health_score: 75,
      health_status: "healthy",
      arr: 25000,
      entered_at: "2024-03-01T09:00:00Z",
      entry_reason: "Matched rule: estimated_value >= 5000",
      last_contact: "3 days ago",
      tags: ["HOA", "Multi-Tank", "Contract"],
    },
  ],
  // At Risk members
  2: [
    {
      id: 4,
      customer_id: 201,
      segment_id: 2,
      customer_name: "Mike Thompson",
      email: "mike.t@startup.io",
      company: "Startup.io",
      health_score: 42,
      health_status: "at_risk",
      arr: 4000,
      entered_at: "2024-06-15T08:00:00Z",
      entry_reason: "Health score dropped below 50",
      last_contact: "3 weeks ago",
      tags: ["At Risk", "Residential"],
    },
    {
      id: 5,
      customer_id: 202,
      segment_id: 2,
      customer_name: "Lisa Wilson",
      email: "lisa@wilsonhome.com",
      health_score: 28,
      health_status: "critical",
      arr: 3500,
      entered_at: "2024-06-20T11:00:00Z",
      entry_reason: "Health score dropped below 50",
      last_contact: "1 month ago",
      tags: ["Critical", "Service Issue"],
    },
  ],
  // VIP At-Risk members
  102: [
    {
      id: 6,
      customer_id: 301,
      segment_id: 102,
      customer_name: "James Morrison",
      email: "james@morrisongroup.com",
      company: "Morrison Group",
      health_score: 45,
      health_status: "at_risk",
      arr: 15000,
      entered_at: "2024-06-25T10:00:00Z",
      entry_reason: "High value + declining health score",
      last_contact: "2 weeks ago",
      tags: ["VIP", "Urgent", "Escalated"],
    },
    {
      id: 7,
      customer_id: 302,
      segment_id: 102,
      customer_name: "Patricia Hayes",
      email: "patricia@hayesproperties.com",
      company: "Hayes Properties",
      health_score: 38,
      health_status: "at_risk",
      arr: 22500,
      entered_at: "2024-06-28T14:00:00Z",
      entry_reason: "High value + declining health score",
      last_contact: "10 days ago",
      tags: ["VIP", "Multi-Property", "Contract Renewal"],
    },
  ],
};

// ============================================================
// AI INSIGHTS FOR SEGMENTS
// ============================================================

export interface SegmentAIInsight {
  segment_id: number;
  generated_at: string;
  confidence: number;
  insights: {
    key_finding: string;
    risk_assessment?: string;
    opportunity?: string;
    recommended_action: string;
    action_priority: "low" | "medium" | "high" | "critical";
  };
  trends: {
    size_trend: "growing" | "stable" | "shrinking";
    size_change_30d: number;
    health_trend: "improving" | "stable" | "declining";
    health_change_30d: number;
  };
  predicted_churn: number;
  expansion_potential: number;
}

export const mockSegmentAIInsights: Record<number, SegmentAIInsight> = {
  1: {
    segment_id: 1,
    generated_at: new Date().toISOString(),
    confidence: 0.92,
    insights: {
      key_finding:
        "High Value Accounts show 15% higher engagement than average. Three accounts are approaching renewal with strong expansion signals.",
      opportunity:
        "Cross-sell aerobic system upgrades to 5 accounts that would benefit from advanced monitoring.",
      recommended_action:
        "Schedule QBRs with top 5 accounts to discuss expansion opportunities before Q3.",
      action_priority: "high",
    },
    trends: {
      size_trend: "growing",
      size_change_30d: 3,
      health_trend: "stable",
      health_change_30d: 0.5,
    },
    predicted_churn: 2.1,
    expansion_potential: 45000,
  },
  2: {
    segment_id: 2,
    generated_at: new Date().toISOString(),
    confidence: 0.88,
    insights: {
      key_finding:
        "At-Risk segment has grown by 4 customers in the last 30 days. Common pattern: delayed service responses.",
      risk_assessment:
        "3 customers show signs of evaluating competitors based on recent touchpoint analysis.",
      recommended_action:
        "Immediately reach out to the 3 highest-risk accounts. Deploy service recovery playbook.",
      action_priority: "critical",
    },
    trends: {
      size_trend: "growing",
      size_change_30d: 4,
      health_trend: "declining",
      health_change_30d: -8.2,
    },
    predicted_churn: 35.5,
    expansion_potential: 0,
  },
  102: {
    segment_id: 102,
    generated_at: new Date().toISOString(),
    confidence: 0.95,
    insights: {
      key_finding:
        "VIP At-Risk customers represent $62,500 in ARR at immediate risk. Average time in segment: 18 days.",
      risk_assessment:
        "Without intervention, models predict 60% likelihood of churn within 90 days for this segment.",
      recommended_action:
        "Executive sponsor outreach within 48 hours. Consider service credits or enhanced support.",
      action_priority: "critical",
    },
    trends: {
      size_trend: "growing",
      size_change_30d: 2,
      health_trend: "declining",
      health_change_30d: -12.5,
    },
    predicted_churn: 58.3,
    expansion_potential: 0,
  },
  104: {
    segment_id: 104,
    generated_at: new Date().toISOString(),
    confidence: 0.91,
    insights: {
      key_finding:
        "Contract renewals due segment shows 85% historical renewal rate. 3 accounts have not responded to initial outreach.",
      opportunity:
        "Multi-year contract conversion opportunity for 6 accounts with strong health scores.",
      recommended_action:
        "Prioritize personal outreach to non-responsive accounts. Prepare renewal incentive packages.",
      action_priority: "high",
    },
    trends: {
      size_trend: "stable",
      size_change_30d: 1,
      health_trend: "stable",
      health_change_30d: 1.2,
    },
    predicted_churn: 15.0,
    expansion_potential: 25000,
  },
  105: {
    segment_id: 105,
    generated_at: new Date().toISOString(),
    confidence: 0.87,
    insights: {
      key_finding:
        "Recent complainers primarily cite response time (57%) and service quality (43%) as concerns.",
      risk_assessment:
        "Complaint resolution within 72 hours reduces churn probability by 65%.",
      recommended_action:
        "Deploy service recovery playbook. Assign dedicated CSM for high-touch follow-up.",
      action_priority: "critical",
    },
    trends: {
      size_trend: "stable",
      size_change_30d: -1,
      health_trend: "stable",
      health_change_30d: 2.1,
    },
    predicted_churn: 42.0,
    expansion_potential: 0,
  },
};

// ============================================================
// SEGMENT STATISTICS
// ============================================================

export interface SegmentStats {
  total_segments: number;
  dynamic_segments: number;
  static_segments: number;
  ai_generated_segments: number;
  total_customers_in_segments: number;
  customers_in_multiple_segments: number;
  avg_segment_size: number;
  largest_segment: { name: string; count: number };
  smallest_segment: { name: string; count: number };
  segments_needing_attention: number;
}

export const mockSegmentStats: SegmentStats = {
  total_segments: 11,
  dynamic_segments: 10,
  static_segments: 1,
  ai_generated_segments: 0,
  total_customers_in_segments: 189,
  customers_in_multiple_segments: 34,
  avg_segment_size: 17.2,
  largest_segment: { name: "Summer Campaign 2024", count: 45 },
  smallest_segment: { name: "VIP At-Risk", count: 5 },
  segments_needing_attention: 3,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get a segment by ID from mock data
 */
export function getMockSegmentById(id: number): Segment | undefined {
  return mockSegments.find((s) => s.id === id);
}

/**
 * Get members of a segment from mock data
 */
export function getMockSegmentMembers(segmentId: number): SegmentMember[] {
  return mockSegmentMembers[segmentId] || [];
}

/**
 * Get AI insights for a segment from mock data
 */
export function getMockSegmentInsights(
  segmentId: number,
): SegmentAIInsight | undefined {
  return mockSegmentAIInsights[segmentId];
}

/**
 * Filter segments by type
 */
export function filterMockSegmentsByType(
  type: "static" | "dynamic" | "ai_generated" | "all",
): Segment[] {
  if (type === "all") return mockSegments;
  return mockSegments.filter((s) => s.segment_type === type);
}

/**
 * Search segments by name or description
 */
export function searchMockSegments(query: string): Segment[] {
  const lowerQuery = query.toLowerCase();
  return mockSegments.filter(
    (s) =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get high priority segments (priority >= 90)
 */
export function getHighPriorityMockSegments(): Segment[] {
  return mockSegments
    .filter((s) => s.priority >= 90)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get segments with at-risk customers
 */
export function getAtRiskMockSegments(): Segment[] {
  return mockSegments.filter((s) => (s.churn_risk_count ?? 0) > 0);
}
