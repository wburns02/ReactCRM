/**
 * WeeklyOutcomes Component
 *
 * Dashboard showing weekly outcome metrics for the CSM - focuses on outcomes, not activities.
 */

import type { CSMWeeklyOutcomes } from "../../../../api/types/customerSuccess";

interface WeeklyOutcomesProps {
  outcomes?: CSMWeeklyOutcomes;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  actual: number;
  goal?: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "orange" | "yellow";
}

function MetricCard({
  title,
  actual,
  goal,
  prefix = "",
  suffix = "",
  icon,
  color,
}: MetricCardProps) {
  const progress = goal ? Math.min((actual / goal) * 100, 100) : 100;
  const isOnTrack = goal ? actual >= goal * 0.7 : true;

  const colorClasses = {
    green: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      progressBg: "bg-green-500",
    },
    blue: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      progressBg: "bg-blue-500",
    },
    purple: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      progressBg: "bg-purple-500",
    },
    orange: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      progressBg: "bg-orange-500",
    },
    yellow: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      progressBg: "bg-yellow-500",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${classes.bg}`}>
          <div className={classes.text}>{icon}</div>
        </div>
        {goal && (
          <span
            className={`text-xs px-2 py-1 rounded ${isOnTrack ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
          >
            {isOnTrack ? "On Track" : "Behind"}
          </span>
        )}
      </div>
      <h3 className="text-sm text-text-muted mb-1">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-text-primary">
          {prefix}
          {actual.toLocaleString()}
          {suffix}
        </span>
        {goal && <span className="text-sm text-text-muted">/ {goal}</span>}
      </div>
      {goal && (
        <div className="mt-3">
          <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
            <div
              className={`h-full ${classes.progressBg} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-text-muted mt-1 block">
            {progress.toFixed(0)}% of goal
          </span>
        </div>
      )}
    </div>
  );
}

export function WeeklyOutcomes({ outcomes, isLoading }: WeeklyOutcomesProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-bg-secondary rounded-lg border border-border p-4 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-bg-primary rounded-lg" />
                <div className="w-16 h-5 bg-bg-primary rounded" />
              </div>
              <div className="h-4 w-24 bg-bg-primary rounded mb-2" />
              <div className="h-8 w-20 bg-bg-primary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!outcomes) {
    return (
      <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
        <svg
          className="w-16 h-16 mx-auto text-text-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No Outcome Data
        </h3>
        <p className="text-text-muted">
          Complete tasks to see your weekly outcomes.
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Weekly Outcomes
          </h2>
          <p className="text-sm text-text-muted">
            {new Date(outcomes.period_start).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -
            {new Date(outcomes.period_end).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div
          className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          ${outcomes.trend_vs_last_week >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
        `}
        >
          <svg
            className={`w-5 h-5 ${outcomes.trend_vs_last_week >= 0 ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span className="font-medium">
            {outcomes.trend_vs_last_week >= 0 ? "+" : ""}
            {outcomes.trend_vs_last_week}% vs last week
          </span>
        </div>
      </div>

      {/* Outcome Metrics (Primary) */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Outcome Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Onboarding Completions"
            actual={outcomes.outcomes.onboarding_completions.actual}
            goal={outcomes.outcomes.onboarding_completions.goal}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="green"
          />
          <MetricCard
            title="At-Risk Saves"
            actual={outcomes.outcomes.at_risk_saves.actual}
            goal={outcomes.outcomes.at_risk_saves.goal}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
            color="orange"
          />
          <MetricCard
            title="Health Improvements"
            actual={outcomes.outcomes.health_improvements}
            suffix=" customers"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            color="blue"
          />
          <MetricCard
            title="Renewals Secured"
            actual={outcomes.outcomes.renewals_secured.amount}
            prefix={formatCurrency(
              outcomes.outcomes.renewals_secured.amount,
            ).replace(/[0-9,.]+/, "")}
            suffix={` (${outcomes.outcomes.renewals_secured.count})`}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="purple"
          />
          <MetricCard
            title="Expansion Pipeline"
            actual={outcomes.outcomes.expansion_pipeline.amount}
            prefix={formatCurrency(
              outcomes.outcomes.expansion_pipeline.amount,
            ).replace(/[0-9,.]+/, "")}
            suffix={` (${outcomes.outcomes.expansion_pipeline.count})`}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            }
            color="yellow"
          />
        </div>
      </div>

      {/* Activity Metrics (Secondary) */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Activity Context
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {outcomes.activity.calls_made}
            </div>
            <div className="text-sm text-text-muted">Calls Made</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {outcomes.activity.emails_sent}
            </div>
            <div className="text-sm text-text-muted">Emails Sent</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {outcomes.activity.tasks_completed}
            </div>
            <div className="text-sm text-text-muted">Tasks Completed</div>
          </div>
        </div>
      </div>

      {/* Team Comparison */}
      <div className="bg-bg-secondary rounded-lg border border-border p-6">
        <h3 className="font-semibold text-text-primary mb-4">
          Team Comparison
        </h3>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Your Score</span>
              <span className="font-bold text-primary">
                {outcomes.comparison.your_score}
              </span>
            </div>
            <div className="h-3 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${outcomes.comparison.your_score}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Team Average</span>
              <span className="font-bold text-text-secondary">
                {outcomes.comparison.team_average}
              </span>
            </div>
            <div className="h-3 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-500 rounded-full"
                style={{ width: `${outcomes.comparison.team_average}%` }}
              />
            </div>
          </div>
          <div className="text-center px-6 py-3 bg-bg-primary rounded-lg">
            <div className="text-3xl font-bold text-primary">
              {outcomes.comparison.percentile}th
            </div>
            <div className="text-sm text-text-muted">Percentile</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyOutcomes;
