/**
 * Executive KPI Cards Component
 *
 * Displays key performance indicators for Customer Success executives:
 * - Net Promoter Score (NPS)
 * - Churn Rate
 * - Adoption Rate
 * - Time to Value (TTV)
 * - Customer Engagement Score
 * - Expansion Revenue
 */

import { cn } from '@/lib/utils.ts';

interface KPIData {
  nps: {
    current: number;
    previous: number;
    target: number;
    promoters: number;
    passives: number;
    detractors: number;
  };
  churnRate: {
    current: number;
    previous: number;
    target: number;
    atRiskCount: number;
  };
  adoptionRate: {
    current: number;
    previous: number;
    target: number;
    activeUsers: number;
    totalUsers: number;
  };
  timeToValue: {
    averageDays: number;
    previousDays: number;
    targetDays: number;
    onboardingCount: number;
  };
  engagementScore: {
    current: number;
    previous: number;
    target: number;
  };
  expansionRevenue: {
    current: number;
    previous: number;
    target: number;
    upsells: number;
    crossSells: number;
  };
}

interface ExecutiveKPICardsProps {
  data?: Partial<KPIData>;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTrendIcon(current: number, previous: number, higherIsBetter: boolean = true) {
  const isUp = current > previous;
  const isGood = higherIsBetter ? isUp : !isUp;

  return (
    <span className={cn(
      'flex items-center gap-1 text-sm font-medium',
      isGood ? 'text-success' : 'text-danger'
    )}>
      {isUp ? '↑' : '↓'}
      {Math.abs(((current - previous) / (previous || 1)) * 100).toFixed(1)}%
    </span>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  trend,
  target,
  icon,
  color = 'primary',
  isLoading
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: React.ReactNode;
  target?: { value: number; label: string };
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  isLoading?: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-10 w-10 bg-bg-hover rounded-lg mb-4" />
        <div className="h-4 w-24 bg-bg-hover rounded mb-2" />
        <div className="h-8 w-16 bg-bg-hover rounded" />
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
        {trend}
      </div>
      <p className="text-sm text-text-muted mb-1">{title}</p>
      <p className="text-3xl font-bold text-text-primary mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-text-muted">{subtitle}</p>
      )}
      {target && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Target</span>
            <span className="font-medium text-text-secondary">{target.label}</span>
          </div>
          <div className="mt-1.5 h-2 bg-bg-hover rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', colorClasses[color].replace('/10', ''))}
              style={{ width: `${Math.min(100, (Number(String(value).replace(/[^0-9.-]/g, '')) / target.value) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ExecutiveKPICards({ data, isLoading }: ExecutiveKPICardsProps) {
  // Default data for display
  const kpiData: KPIData = {
    nps: {
      current: data?.nps?.current ?? 42,
      previous: data?.nps?.previous ?? 38,
      target: data?.nps?.target ?? 50,
      promoters: data?.nps?.promoters ?? 65,
      passives: data?.nps?.passives ?? 20,
      detractors: data?.nps?.detractors ?? 15,
    },
    churnRate: {
      current: data?.churnRate?.current ?? 2.8,
      previous: data?.churnRate?.previous ?? 3.2,
      target: data?.churnRate?.target ?? 2.0,
      atRiskCount: data?.churnRate?.atRiskCount ?? 12,
    },
    adoptionRate: {
      current: data?.adoptionRate?.current ?? 78,
      previous: data?.adoptionRate?.previous ?? 72,
      target: data?.adoptionRate?.target ?? 85,
      activeUsers: data?.adoptionRate?.activeUsers ?? 234,
      totalUsers: data?.adoptionRate?.totalUsers ?? 300,
    },
    timeToValue: {
      averageDays: data?.timeToValue?.averageDays ?? 14,
      previousDays: data?.timeToValue?.previousDays ?? 18,
      targetDays: data?.timeToValue?.targetDays ?? 10,
      onboardingCount: data?.timeToValue?.onboardingCount ?? 8,
    },
    engagementScore: {
      current: data?.engagementScore?.current ?? 7.2,
      previous: data?.engagementScore?.previous ?? 6.8,
      target: data?.engagementScore?.target ?? 8.0,
    },
    expansionRevenue: {
      current: data?.expansionRevenue?.current ?? 125000,
      previous: data?.expansionRevenue?.previous ?? 98000,
      target: data?.expansionRevenue?.target ?? 150000,
      upsells: data?.expansionRevenue?.upsells ?? 15,
      crossSells: data?.expansionRevenue?.crossSells ?? 8,
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* NPS Score */}
      <KPICard
        title="Net Promoter Score"
        value={kpiData.nps.current}
        subtitle={`${kpiData.nps.promoters}% promoters · ${kpiData.nps.detractors}% detractors`}
        trend={getTrendIcon(kpiData.nps.current, kpiData.nps.previous)}
        target={{ value: kpiData.nps.target, label: String(kpiData.nps.target) }}
        color="primary"
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Churn Rate */}
      <KPICard
        title="Churn Rate"
        value={`${kpiData.churnRate.current}%`}
        subtitle={`${kpiData.churnRate.atRiskCount} customers at risk`}
        trend={getTrendIcon(kpiData.churnRate.current, kpiData.churnRate.previous, false)}
        target={{ value: kpiData.churnRate.target, label: `${kpiData.churnRate.target}%` }}
        color={kpiData.churnRate.current > 3 ? 'danger' : kpiData.churnRate.current > 2 ? 'warning' : 'success'}
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        }
      />

      {/* Adoption Rate */}
      <KPICard
        title="Product Adoption"
        value={`${kpiData.adoptionRate.current}%`}
        subtitle={`${kpiData.adoptionRate.activeUsers}/${kpiData.adoptionRate.totalUsers} active users`}
        trend={getTrendIcon(kpiData.adoptionRate.current, kpiData.adoptionRate.previous)}
        target={{ value: kpiData.adoptionRate.target, label: `${kpiData.adoptionRate.target}%` }}
        color="success"
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Time to Value */}
      <KPICard
        title="Time to Value"
        value={`${kpiData.timeToValue.averageDays}d`}
        subtitle={`${kpiData.timeToValue.onboardingCount} customers onboarding`}
        trend={getTrendIcon(kpiData.timeToValue.previousDays, kpiData.timeToValue.averageDays)}
        target={{ value: kpiData.timeToValue.targetDays, label: `${kpiData.timeToValue.targetDays} days` }}
        color="info"
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Engagement Score */}
      <KPICard
        title="Engagement Score"
        value={kpiData.engagementScore.current.toFixed(1)}
        subtitle="Average across all customers"
        trend={getTrendIcon(kpiData.engagementScore.current, kpiData.engagementScore.previous)}
        target={{ value: kpiData.engagementScore.target, label: `${kpiData.engagementScore.target}/10` }}
        color="primary"
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />

      {/* Expansion Revenue */}
      <KPICard
        title="Expansion Revenue"
        value={formatCurrency(kpiData.expansionRevenue.current)}
        subtitle={`${kpiData.expansionRevenue.upsells} upsells · ${kpiData.expansionRevenue.crossSells} cross-sells`}
        trend={getTrendIcon(kpiData.expansionRevenue.current, kpiData.expansionRevenue.previous)}
        target={{ value: kpiData.expansionRevenue.target, label: formatCurrency(kpiData.expansionRevenue.target) }}
        color="success"
        isLoading={isLoading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  );
}
