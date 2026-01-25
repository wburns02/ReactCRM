import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useRevenueMetrics,
  useCustomerMetrics,
  usePipelineMetrics,
} from "../api.ts";
import { MetricCard } from "../components/MetricCard.tsx";
import { DateRangePicker } from "../components/DateRangePicker.tsx";
import { RevenueChart } from "../components/RevenueChart.tsx";
import { ServiceTypeBreakdown } from "../components/ServiceTypeBreakdown.tsx";
import { useAIChat } from "@/hooks/useAI";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DateRange } from "../types.ts";

/**
 * AI Natural Language Query Panel for Reports
 */
interface AIReportQueryProps {
  revenueData: ReturnType<typeof useRevenueMetrics>["data"];
  pipelineData: ReturnType<typeof usePipelineMetrics>["data"];
}

function AIReportQuery({ revenueData, pipelineData }: AIReportQueryProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const { sendMessage, isLoading, messages } = useAIChat({
    current_page: "reports",
  });

  const handleQuery = async () => {
    if (!query.trim()) return;

    // Build context from available data
    const context = buildReportContext(revenueData, pipelineData);

    // For demo mode, generate response locally if AI fails
    try {
      sendMessage(`${query}\n\nContext: ${JSON.stringify(context)}`);
      // Get the latest assistant response
      const latestResponse = messages
        .filter((m) => m.role === "assistant")
        .pop();
      if (latestResponse) {
        setResponse(latestResponse.content);
      }
    } catch {
      // Demo fallback
      setResponse(generateDemoResponse(query, context));
    }
  };

  const buildReportContext = (
    revenue: typeof revenueData,
    pipeline: typeof pipelineData,
  ) => {
    return {
      total_revenue: revenue?.metrics?.total_revenue || 0,
      revenue_change: revenue?.metrics?.total_revenue_change_percent || 0,
      work_orders_completed: revenue?.metrics?.work_orders_completed || 0,
      average_job_value: revenue?.metrics?.average_job_value || 0,
      new_customers: revenue?.metrics?.new_customers || 0,
      repeat_rate: revenue?.metrics?.repeat_customer_rate || 0,
      satisfaction: revenue?.metrics?.customer_satisfaction_score || 0,
      pipeline_value: pipeline?.total_pipeline_value || 0,
      total_prospects: pipeline?.total_prospects || 0,
      conversion_rate: pipeline?.conversion_rate || 0,
    };
  };

  const generateDemoResponse = (
    q: string,
    ctx: ReturnType<typeof buildReportContext>,
  ): string => {
    const lowerQ = q.toLowerCase();

    if (
      lowerQ.includes("revenue") ||
      lowerQ.includes("money") ||
      lowerQ.includes("earning")
    ) {
      const change = ctx.revenue_change;
      const trend = change >= 0 ? "increased" : "decreased";
      return `**Revenue Analysis:**

Your total revenue is **$${ctx.total_revenue.toLocaleString()}**.

- Revenue has ${trend} by ${Math.abs(change).toFixed(1)}% compared to the previous period
- Average job value: $${ctx.average_job_value.toLocaleString()}
- Work orders completed: ${ctx.work_orders_completed}

${change >= 0 ? "Great work! Your revenue is trending upward." : "Consider reviewing pricing or increasing marketing efforts to boost revenue."}`;
    }

    if (lowerQ.includes("customer") || lowerQ.includes("client")) {
      return `**Customer Analysis:**

- New customers this period: **${ctx.new_customers}**
- Repeat customer rate: **${ctx.repeat_rate}%**
- Customer satisfaction score: **${ctx.satisfaction}/5**

${ctx.repeat_rate > 50 ? "Excellent retention! Your customers are coming back." : "There's opportunity to improve customer retention through follow-up campaigns."}`;
    }

    if (
      lowerQ.includes("pipeline") ||
      lowerQ.includes("prospect") ||
      lowerQ.includes("lead")
    ) {
      return `**Sales Pipeline Analysis:**

- Total pipeline value: **$${ctx.pipeline_value.toLocaleString()}**
- Active prospects: **${ctx.total_prospects}**
- Conversion rate: **${ctx.conversion_rate}%**

${ctx.conversion_rate > 20 ? "Strong conversion rate! Keep up the follow-up cadence." : "Consider nurturing leads with targeted email campaigns to improve conversions."}`;
    }

    if (
      lowerQ.includes("best") ||
      lowerQ.includes("top") ||
      lowerQ.includes("perform")
    ) {
      return `**Performance Summary:**

Your top metrics this period:
1. **Revenue:** $${ctx.total_revenue.toLocaleString()} (${ctx.revenue_change >= 0 ? "+" : ""}${ctx.revenue_change.toFixed(1)}%)
2. **Jobs Completed:** ${ctx.work_orders_completed}
3. **Customer Satisfaction:** ${ctx.satisfaction}/5

Focus areas for improvement:
- ${ctx.repeat_rate < 60 ? "Increase repeat customer rate with loyalty programs" : "Maintain excellent customer retention"}
- ${ctx.conversion_rate < 25 ? "Improve lead conversion with faster follow-ups" : "Pipeline conversion is healthy"}`;
    }

    // Default response
    return `**Report Insights:**

Based on your current data:
- Total Revenue: $${ctx.total_revenue.toLocaleString()}
- Work Orders: ${ctx.work_orders_completed}
- New Customers: ${ctx.new_customers}
- Pipeline Value: $${ctx.pipeline_value.toLocaleString()}

Try asking more specific questions like:
- "How is my revenue trending?"
- "Show me customer retention metrics"
- "What's my sales pipeline status?"
- "Who are my top performers?"`;
  };

  // Update response when messages change
  const latestAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>Ask AI about your reports</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-medium text-text-primary">AI Report Assistant</h3>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      <p className="text-sm text-text-secondary mb-3">
        Ask questions about your business data in plain English.
      </p>

      <div className="flex gap-2 mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., How is my revenue this month?"
          onKeyDown={(e) => e.key === "Enter" && handleQuery()}
          className="flex-1"
        />
        <Button
          onClick={handleQuery}
          disabled={!query.trim() || isLoading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isLoading ? "..." : "Ask"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setQuery("How is my revenue trending?")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Revenue trends
        </button>
        <button
          onClick={() => setQuery("Show customer retention metrics")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Customer retention
        </button>
        <button
          onClick={() => setQuery("What's my pipeline status?")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Pipeline status
        </button>
        <button
          onClick={() => setQuery("Who are my top performers?")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Top performers
        </button>
      </div>

      {(response || latestAssistantMessage?.content) && (
        <div className="bg-bg-card border border-border rounded-lg p-3">
          <div className="text-sm text-text-secondary whitespace-pre-wrap">
            {response || latestAssistantMessage?.content}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ReportsPage - Main reports dashboard with overview metrics
 */

export function ReportsPage() {
  // Default to last 30 days
  const getDefaultDateRange = (): DateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // Fetch report data
  const { data: revenueData, isLoading: revenueLoading } =
    useRevenueMetrics(dateRange);
  const { isLoading: customerLoading } = useCustomerMetrics(dateRange);
  const { data: pipelineData, isLoading: pipelineLoading } =
    usePipelineMetrics();

  const isLoading = revenueLoading || customerLoading || pipelineLoading;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Reports Dashboard
            </h1>
            <p className="text-text-secondary mt-1">
              Overview of business performance and key metrics
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* AI Report Query */}
      <AIReportQuery revenueData={revenueData} pipelineData={pipelineData} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading reports...</div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Revenue"
              value={revenueData?.metrics.total_revenue || 0}
              changePercent={revenueData?.metrics.total_revenue_change_percent}
              icon="💰"
              format="currency"
            />
            <MetricCard
              title="Work Orders Completed"
              value={revenueData?.metrics.work_orders_completed || 0}
              changePercent={
                revenueData?.metrics.work_orders_completed_change_percent
              }
              icon="✅"
              format="number"
            />
            <MetricCard
              title="Average Job Value"
              value={revenueData?.metrics.average_job_value || 0}
              changePercent={
                revenueData?.metrics.average_job_value_change_percent
              }
              icon="📊"
              format="currency"
            />
            <MetricCard
              title="New Customers"
              value={revenueData?.metrics.new_customers || 0}
              changePercent={revenueData?.metrics.new_customers_change_percent}
              icon="👥"
              format="number"
            />
            <MetricCard
              title="Repeat Customer Rate"
              value={revenueData?.metrics.repeat_customer_rate || 0}
              changePercent={
                revenueData?.metrics.repeat_customer_rate_change_percent
              }
              icon="🔁"
              format="percent"
            />
            <MetricCard
              title="Customer Satisfaction"
              value={revenueData?.metrics.customer_satisfaction_score || 0}
              changePercent={
                revenueData?.metrics.customer_satisfaction_score_change_percent
              }
              icon="⭐"
              format="number"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RevenueChart
              data={revenueData?.revenue_over_time || []}
              chartType="line"
              showWorkOrders={true}
            />
            <ServiceTypeBreakdown data={revenueData?.service_breakdown || []} />
          </div>

          {/* Pipeline Metrics */}
          {pipelineData && (
            <div className="bg-bg-card border border-border rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Sales Pipeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="Pipeline Value"
                  value={pipelineData.total_pipeline_value}
                  icon="💼"
                  format="currency"
                />
                <MetricCard
                  title="Total Prospects"
                  value={pipelineData.total_prospects}
                  icon="🎯"
                  format="number"
                />
                <MetricCard
                  title="Conversion Rate"
                  value={pipelineData.conversion_rate || 0}
                  icon="📈"
                  format="percent"
                />
                <MetricCard
                  title="Average Deal Size"
                  value={pipelineData.average_deal_size || 0}
                  icon="💵"
                  format="currency"
                />
              </div>
            </div>
          )}

          {/* Quick Links to Detailed Reports */}
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Detailed Reports
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/reports/revenue"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Revenue Report
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Detailed revenue analysis and trends
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/technicians"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">👷</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Technician Performance
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Individual technician metrics
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/clv"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">💎</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Customer Lifetime Value
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Customer value and retention analysis
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/service"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">🔧</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Revenue by Service
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Revenue breakdown by service type
                  </p>
                </div>
              </Link>
              <Link
                to="/reports/location"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">📍</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Revenue by Location
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Geographic revenue analysis
                  </p>
                </div>
              </Link>
              <Link
                to="/customers"
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Customer Analytics
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Customer growth and retention
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
