import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAIAnalyze } from "@/hooks/useAI";
import { Button } from "@/components/ui/Button";

/**
 * AI Billing Insights Panel
 */
function AIBillingInsights({ stats }: { stats: BillingStats | undefined }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const analyzeAI = useAIAnalyze();

  const generateInsights = async () => {
    try {
      const result = await analyzeAI.mutateAsync({
        type: "billing",
        data: stats ? { ...stats } : {},
        question: "Analyze this billing data and provide actionable insights about revenue trends, collection efficiency, and payment patterns.",
      });
      // Combine summary and insights into a formatted string
      const formattedInsights = result.analysis ||
        (result.summary + "\n\n" + (result.insights || []).join("\n"));
      setInsights(formattedInsights || "Analysis complete.");
    } catch {
      // Demo fallback
      const demoInsights = generateDemoBillingInsights(stats);
      setInsights(demoInsights);
    }
  };

  function generateDemoBillingInsights(data: BillingStats | undefined): string {
    if (!data) {
      return `**AI Billing Analysis (Demo Mode)**

No billing data available yet. Once you have invoices and payments:

- **Collection Rate Analysis** - Track payment timing patterns
- **Revenue Forecasting** - Predict monthly revenue trends
- **Risk Assessment** - Identify slow-paying customers
- **Optimization Tips** - Improve billing efficiency`;
    }

    const outstanding = data.outstanding_invoices || 0;
    const revenue = data.total_revenue || 0;
    const collectionRate = revenue > 0 ? ((revenue - outstanding) / revenue * 100).toFixed(1) : 0;

    return `**AI Billing Analysis (Demo Mode)**

**Key Metrics:**
- Collection Rate: ${collectionRate}%
- Outstanding: $${outstanding.toLocaleString()}
- Revenue MTD: $${revenue.toLocaleString()}

**Insights:**
${outstanding > 5000 ? "- **Warning:** Outstanding invoices exceed $5,000. Consider sending payment reminders." : "- Outstanding balance is within healthy range."}
${data.pending_estimates && data.pending_estimates > 5 ? "- **Opportunity:** " + data.pending_estimates + " pending estimates. Follow up to convert to jobs." : ""}
${data.active_payment_plans && data.active_payment_plans > 0 ? "- " + data.active_payment_plans + " active payment plans helping customer affordability." : ""}

**Recommendations:**
1. ${outstanding > 0 ? "Send reminder emails for invoices over 30 days" : "Maintain current billing cadence"}
2. Review pricing on high-margin services
3. Consider offering early payment discounts`;
  }

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors mb-4"
      >
        <span>✨</span>
        <span>Get AI Billing Insights</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-medium text-text-primary">AI Billing Insights</h3>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {!insights ? (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Let AI analyze your billing data and provide actionable insights.
          </p>
          <Button
            onClick={generateInsights}
            disabled={analyzeAI.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {analyzeAI.isPending ? "Analyzing..." : "Analyze Billing Data"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-sm text-text-secondary whitespace-pre-wrap">
              {insights}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={generateInsights}
              disabled={analyzeAI.isPending}
            >
              {analyzeAI.isPending ? "..." : "Refresh"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BillingStats {
  total_revenue: number;
  outstanding_invoices: number;
  pending_estimates: number;
  active_payment_plans: number;
}

/**
 * Billing Overview Dashboard
 */
export function BillingOverview() {
  const { data: stats } = useQuery({
    queryKey: ["billing-stats"],
    queryFn: async (): Promise<BillingStats> => {
      try {
        const response = await apiClient.get("/billing/stats");
        return response.data;
      } catch {
        return {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        };
      }
    },
  });

  const kpis = [
    {
      label: "Total Revenue (MTD)",
      value: `$${(stats?.total_revenue || 0).toLocaleString()}`,
      icon: "💰",
      color: "text-success",
    },
    {
      label: "Outstanding Invoices",
      value: `$${(stats?.outstanding_invoices || 0).toLocaleString()}`,
      icon: "🧾",
      color: "text-warning",
    },
    {
      label: "Pending Estimates",
      value: stats?.pending_estimates || 0,
      icon: "📊",
      color: "text-info",
    },
    {
      label: "Active Payment Plans",
      value: stats?.active_payment_plans || 0,
      icon: "📈",
      color: "text-primary",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Billing Overview
        </h1>
        <p className="text-text-muted">
          Financial metrics and billing management
        </p>
      </div>

      {/* AI Insights */}
      <AIBillingInsights stats={stats} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-sm text-text-muted">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Link
          to="/invoices"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <span className="text-xl">🧾</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Invoices</h3>
              <p className="text-sm text-text-muted">View all invoices</p>
            </div>
          </div>
        </Link>

        <Link
          to="/estimates"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Estimates</h3>
              <p className="text-sm text-text-muted">
                Create & manage estimates
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/billing/payment-plans"
          className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Payment Plans</h3>
              <p className="text-sm text-text-muted">Financing options</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Recent Activity</h2>
        </div>
        <div className="p-8 text-center text-text-muted">
          <span className="text-4xl block mb-2">📋</span>
          <p>No recent billing activity</p>
        </div>
      </div>
    </div>
  );
}
