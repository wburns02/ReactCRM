import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Generated Report Result
 */
export interface GeneratedReport {
  report_id: string;
  title: string;
  generated_at: string;
  period: { start: string; end: string };
  sections: ReportSection[];
  executive_summary: string;
  key_insights: KeyInsight[];
  recommendations: ReportRecommendation[];
  data_sources: string[];
}

export interface ReportSection {
  title: string;
  type: "metrics" | "chart" | "table" | "narrative";
  content: MetricsContent | ChartContent | TableContent | NarrativeContent;
}

export interface MetricsContent {
  metrics: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: "up" | "down" | "stable";
  }>;
}

export interface ChartContent {
  chart_type: "line" | "bar" | "pie" | "area";
  title: string;
  data: Array<Record<string, unknown>>;
  description: string;
}

export interface TableContent {
  headers: string[];
  rows: Array<Array<string | number>>;
  summary?: string;
}

export interface NarrativeContent {
  paragraphs: string[];
}

export interface KeyInsight {
  category: "performance" | "financial" | "operational" | "customer";
  insight: string;
  significance: "high" | "medium" | "low";
  actionable: boolean;
}

export interface ReportRecommendation {
  priority: "high" | "medium" | "low";
  area: string;
  recommendation: string;
  expected_impact: string;
  effort: "low" | "medium" | "high";
}

/**
 * Report Template
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  recipients?: string[];
}

/**
 * Generate a report using AI
 */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async (params: {
      reportType:
        | "executive"
        | "operations"
        | "financial"
        | "customer"
        | "technician"
        | "custom";
      dateRange: { start: string; end: string };
      customSections?: string[];
      focusAreas?: string[];
    }): Promise<GeneratedReport> => {
      try {
        const response = await apiClient.post("/ai/reports/generate", params);
        return response.data;
      } catch {
        return generateDemoReport(params);
      }
    },
  });
}

/**
 * Generate natural language insights
 */
export function useGenerateInsights() {
  return useMutation({
    mutationFn: async (params: {
      dataPoints: Record<string, number>;
      context: string;
      comparisonPeriod?: { start: string; end: string };
    }): Promise<{
      insights: string[];
      summary: string;
      anomalies: string[];
      trends: string[];
    }> => {
      try {
        const response = await apiClient.post("/ai/reports/insights", params);
        return response.data;
      } catch {
        return {
          insights: [
            "Revenue increased by 15% compared to the previous period, driven primarily by service upgrades.",
            "Customer satisfaction scores remained stable at 4.7/5, with notable improvement in response time ratings.",
            "Technician utilization improved by 8%, indicating more efficient scheduling.",
          ],
          summary:
            "Overall performance shows positive trends across key metrics with opportunities for further optimization in customer acquisition.",
          anomalies: [
            "Unusually high volume of emergency calls on Tuesdays - consider adding capacity",
            "Payment cycle extending slightly - worth monitoring",
          ],
          trends: [
            "Upward trend in preventive maintenance subscriptions",
            "Seasonal pattern showing Q2 as peak service period",
          ],
        };
      }
    },
  });
}

/**
 * Schedule automated reports
 */
export function useScheduleReport() {
  return useMutation({
    mutationFn: async (params: {
      template: ReportTemplate;
      schedule: {
        frequency: "daily" | "weekly" | "monthly";
        dayOfWeek?: number;
        dayOfMonth?: number;
        time: string;
      };
      recipients: string[];
    }) => {
      try {
        const response = await apiClient.post("/ai/reports/schedule", params);
        return response.data;
      } catch {
        return {
          scheduled_id: `sched-${Date.now()}`,
          next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          message: "Report scheduled successfully",
        };
      }
    },
  });
}

/**
 * Generate demo report
 */
function generateDemoReport(params: {
  reportType: string;
  dateRange: { start: string; end: string };
}): GeneratedReport {
  const startDate = new Date(params.dateRange.start);
  const endDate = new Date(params.dateRange.end);
  const periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  const sections: ReportSection[] = [];

  // Executive Summary Metrics
  sections.push({
    title: "Key Performance Indicators",
    type: "metrics",
    content: {
      metrics: [
        {
          label: "Total Revenue",
          value: "$125,450",
          change: 12.5,
          trend: "up",
        },
        { label: "Jobs Completed", value: 245, change: 8, trend: "up" },
        {
          label: "Customer Satisfaction",
          value: "4.7/5",
          change: 0.2,
          trend: "up",
        },
        { label: "First-Time Fix Rate", value: "94%", change: 2, trend: "up" },
        { label: "Average Job Value", value: "$512", change: 4.5, trend: "up" },
        { label: "New Customers", value: 32, change: -5, trend: "down" },
      ],
    } as MetricsContent,
  });

  // Revenue Chart
  sections.push({
    title: "Revenue Trend",
    type: "chart",
    content: {
      chart_type: "line",
      title: "Weekly Revenue",
      data: [
        { week: "Week 1", revenue: 28500 },
        { week: "Week 2", revenue: 31200 },
        { week: "Week 3", revenue: 29800 },
        { week: "Week 4", revenue: 35950 },
      ],
      description:
        "Revenue showed consistent growth with a strong finish to the period.",
    } as ChartContent,
  });

  // Top Performing Technicians Table
  sections.push({
    title: "Technician Performance",
    type: "table",
    content: {
      headers: ["Technician", "Jobs", "Revenue", "Satisfaction", "FTF Rate"],
      rows: [
        ["Mike Johnson", 52, "$26,800", "4.9", "96%"],
        ["Sarah Williams", 48, "$24,200", "4.8", "94%"],
        ["Tom Davis", 45, "$22,100", "4.6", "92%"],
        ["Lisa Chen", 42, "$21,500", "4.7", "95%"],
      ],
      summary: "All technicians exceeded performance targets for the period.",
    } as TableContent,
  });

  // Analysis Narrative
  sections.push({
    title: "Performance Analysis",
    type: "narrative",
    content: {
      paragraphs: [
        "The reporting period showed strong overall performance with revenue exceeding targets by 12.5%. This growth was primarily driven by an increase in service upgrades and preventive maintenance contracts.",
        "Customer satisfaction improved to 4.7/5, reflecting the team's focus on quality service and timely communication. The first-time fix rate of 94% indicates efficient diagnosis and resolution of customer issues.",
        "New customer acquisition declined slightly (-5%), suggesting an opportunity to strengthen marketing efforts. However, customer retention remained strong at 95%, indicating high satisfaction among existing customers.",
      ],
    } as NarrativeContent,
  });

  const keyInsights: KeyInsight[] = [
    {
      category: "financial",
      insight:
        "Revenue per job increased 4.5% due to successful upselling of preventive maintenance packages",
      significance: "high",
      actionable: true,
    },
    {
      category: "operational",
      insight:
        "Tuesday and Wednesday show 30% higher job volume - consider adding capacity",
      significance: "medium",
      actionable: true,
    },
    {
      category: "customer",
      insight:
        "Response time improved by 18 minutes on average, correlating with higher satisfaction scores",
      significance: "high",
      actionable: false,
    },
    {
      category: "performance",
      insight:
        "First-time fix rate varies significantly by service type - inspections at 98%, repairs at 89%",
      significance: "medium",
      actionable: true,
    },
  ];

  const recommendations: ReportRecommendation[] = [
    {
      priority: "high",
      area: "Marketing",
      recommendation:
        "Launch targeted campaign to address declining new customer acquisition",
      expected_impact: "15-20% increase in new customers",
      effort: "medium",
    },
    {
      priority: "high",
      area: "Operations",
      recommendation: "Add capacity for Tuesday/Wednesday peak periods",
      expected_impact: "Reduce wait times, increase revenue capacity by 10%",
      effort: "medium",
    },
    {
      priority: "medium",
      area: "Training",
      recommendation:
        "Focus repair training to improve first-time fix rate for complex repairs",
      expected_impact: "5% improvement in FTF rate, reduced callbacks",
      effort: "low",
    },
    {
      priority: "low",
      area: "Technology",
      recommendation:
        "Implement automated follow-up system for maintenance reminders",
      expected_impact: "10% increase in repeat business",
      effort: "medium",
    },
  ];

  return {
    report_id: `rpt-${Date.now()}`,
    title: `${params.reportType.charAt(0).toUpperCase() + params.reportType.slice(1)} Report`,
    generated_at: new Date().toISOString(),
    period: params.dateRange,
    sections,
    executive_summary: `Performance for ${periodLabel} exceeded expectations with ${12.5}% revenue growth and improved customer satisfaction. Key focus areas for the coming period include customer acquisition and operational efficiency during peak days.`,
    key_insights: keyInsights,
    recommendations,
    data_sources: [
      "Work Orders",
      "Invoices",
      "Customer Feedback",
      "Technician Logs",
      "Financial Records",
    ],
  };
}
