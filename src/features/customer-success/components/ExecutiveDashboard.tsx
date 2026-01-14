/**
 * Executive Dashboard Component
 *
 * High-level view for Customer Success executives featuring:
 * - KPI Cards (NPS, Churn, Adoption, TTV, Engagement, Expansion)
 * - NPS Trend Chart
 * - Churn Risk Summary
 * - Top At-Risk Accounts
 * - Success Metrics Overview
 */

import { useState } from "react";
import { ExecutiveKPICards } from "./ExecutiveKPICards.tsx";
import { NPSTrendChart } from "./NPSTrendChart.tsx";
import { ChurnRiskIndicator } from "./ChurnRiskIndicator.tsx";
import { cn } from "@/lib/utils.ts";
import {
  useAtRiskCustomers,
  useCSDashboardOverview,
} from "@/api/hooks/useCustomerSuccess.ts";

interface ExecutiveDashboardProps {
  isLoading?: boolean;
}

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
  good?: "up" | "down";
}

function MetricsRow({ metrics }: { metrics: MetricCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const isPositive = metric.trend === metric.good;
        return (
          <div
            key={index}
            className="bg-bg-card rounded-lg border border-border p-4"
          >
            <p className="text-sm text-text-muted mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-text-primary">
              {metric.value}
            </p>
            {metric.change !== undefined && (
              <p
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  isPositive ? "text-success" : "text-danger",
                )}
              >
                {metric.trend === "up" ? "↑" : "↓"} {Math.abs(metric.change)}%
                <span className="text-text-muted">vs last period</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopAccountsTable({
  accounts,
}: {
  accounts: Array<{
    id: number;
    name: string;
    health_score: number;
    risk_factors: string[];
    arr: number;
    days_until_renewal?: number;
  }>;
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">
          Top At-Risk Accounts
        </h3>
        <p className="text-sm text-text-muted">
          Accounts requiring immediate attention
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-hover">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                Account
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                Health
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                ARR
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                Risk Factors
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                Renewal
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="hover:bg-bg-hover transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-text-primary">
                    {account.name}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        account.health_score >= 70
                          ? "bg-success/10 text-success"
                          : account.health_score >= 40
                            ? "bg-warning/10 text-warning"
                            : "bg-danger/10 text-danger",
                      )}
                    >
                      {account.health_score}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-primary font-medium">
                  ${(account.arr / 1000).toFixed(0)}K
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {account.risk_factors.slice(0, 2).map((factor, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-danger/10 text-danger rounded"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {account.days_until_renewal
                    ? `${account.days_until_renewal}d`
                    : "-"}
                </td>
                <td className="px-6 py-4">
                  <button className="text-primary hover:text-primary-dark text-sm font-medium">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecutiveDashboard({
  isLoading: propsLoading,
}: ExecutiveDashboardProps) {
  const [npsPeriod, setNpsPeriod] = useState<"7d" | "30d" | "90d" | "12m">(
    "30d",
  );
  const { data: dashboardData, isLoading: dashboardLoading } =
    useCSDashboardOverview();
  const { data: atRiskData, isLoading: atRiskLoading } = useAtRiskCustomers({
    limit: 5,
  });

  const isLoading = propsLoading || dashboardLoading;

  // Map at-risk customers from API - use real data where available
  const topAccounts =
    atRiskData?.items?.slice(0, 5).map(
      (
        item: {
          customer_id: number;
          customer_name?: string;
          overall_score: number;
          churn_probability?: number;
          score_trend?: string;
        },
        _index: number,
      ) => ({
        id: item.customer_id,
        name: item.customer_name || `Customer #${item.customer_id}`,
        health_score: item.overall_score,
        risk_factors:
          item.score_trend === "declining"
            ? ["Declining health score", "Engagement concerns"]
            : item.churn_probability && item.churn_probability > 0.5
              ? ["High churn probability", "Needs attention"]
              : ["At risk status"],
        arr: 75000, // Would come from customer data
        days_until_renewal: undefined, // Would come from customer data
      }),
    ) || [];

  // Calculate total customers from health distribution
  const totalCustomers = dashboardData?.health_distribution
    ? Object.values(dashboardData.health_distribution).reduce(
        (sum, val) => sum + val,
        0,
      )
    : 100;

  // Aggregate metrics - using real data from API where available
  const aggregateMetrics: MetricCard[] = [
    {
      label: "Total Customers",
      value: totalCustomers,
      // Trend data would come from historical comparisons
    },
    {
      label: "Active Playbooks",
      value: dashboardData?.active_playbook_executions || 0,
    },
    {
      label: "Active Journeys",
      value: dashboardData?.active_journey_enrollments || 0,
    },
    {
      label: "Recent Touchpoints",
      value: dashboardData?.recent_touchpoints_7d || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Executive Overview
          </h2>
          <p className="text-sm text-text-muted">
            Key metrics and insights for leadership
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors">
            Schedule Review
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ExecutiveKPICards isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <NPSTrendChart
          period={npsPeriod}
          onPeriodChange={setNpsPeriod}
          isLoading={isLoading}
        />
        <ChurnRiskIndicator isLoading={isLoading} />
      </div>

      {/* Aggregate Metrics */}
      <MetricsRow metrics={aggregateMetrics} />

      {/* At-Risk Accounts Table */}
      {!atRiskLoading && topAccounts.length > 0 && (
        <TopAccountsTable accounts={topAccounts} />
      )}

      {/* Bottom Section - Quick Insights */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Health Distribution */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">
            Health Distribution
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Healthy",
                count: dashboardData?.health_distribution?.healthy || 43,
                color: "bg-success",
              },
              {
                label: "At Risk",
                count: dashboardData?.health_distribution?.at_risk || 46,
                color: "bg-warning",
              },
              {
                label: "Critical",
                count: dashboardData?.health_distribution?.critical || 11,
                color: "bg-danger",
              },
            ].map((item) => {
              const total =
                (dashboardData?.health_distribution?.healthy || 43) +
                (dashboardData?.health_distribution?.at_risk || 46) +
                (dashboardData?.health_distribution?.critical || 11);
              const percent = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-medium text-text-primary">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", item.color)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Summary */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Task Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Open Tasks
                </p>
                <p className="text-xs text-text-muted">
                  Pending and in-progress
                </p>
              </div>
              <span className="text-lg font-bold text-primary">
                {dashboardData?.open_tasks || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Overdue</p>
                <p className="text-xs text-text-muted">Past due date</p>
              </div>
              <span
                className={cn(
                  "text-lg font-bold",
                  (dashboardData?.overdue_tasks || 0) > 0
                    ? "text-danger"
                    : "text-success",
                )}
              >
                {dashboardData?.overdue_tasks || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Active Segments
                </p>
                <p className="text-xs text-text-muted">Customer segments</p>
              </div>
              <span className="text-lg font-bold text-success">
                {dashboardData?.active_segments || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Avg Health Score</span>
                <span className="font-medium text-text-primary">
                  {Math.round(dashboardData?.avg_health_score || 0)}
                </span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    (dashboardData?.avg_health_score || 0) >= 70
                      ? "bg-success"
                      : (dashboardData?.avg_health_score || 0) >= 40
                        ? "bg-warning"
                        : "bg-danger",
                  )}
                  style={{ width: `${dashboardData?.avg_health_score || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">At-Risk Customers</span>
                <span className="font-medium text-text-primary">
                  {dashboardData?.total_at_risk || 0}
                </span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full"
                  style={{
                    width: `${totalCustomers > 0 ? ((dashboardData?.total_at_risk || 0) / totalCustomers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Journey Enrollments</span>
                <span className="font-medium text-text-primary">
                  {dashboardData?.active_journey_enrollments || 0}
                </span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(100, (dashboardData?.active_journey_enrollments || 0) * 5)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text-primary">
                {dashboardData?.open_tasks || 0}
              </span>{" "}
              open tasks ·
              <span
                className={cn(
                  "font-medium ml-1",
                  (dashboardData?.overdue_tasks || 0) > 0
                    ? "text-danger"
                    : "text-success",
                )}
              >
                {dashboardData?.overdue_tasks || 0}
              </span>{" "}
              overdue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
