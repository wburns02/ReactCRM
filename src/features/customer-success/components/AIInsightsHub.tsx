/**
 * AI Insights Hub Component
 *
 * Displays AI-powered insights and recommendations for campaigns
 * Features:
 * - Portfolio health overview
 * - Strategic insights and quick wins
 * - Campaign-specific analysis
 * - Subject line optimizer
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  usePortfolioInsights,
  useCampaignAIAnalysis,
  useSubjectSuggestions,
  type PortfolioInsights,
  type CampaignAIAnalysis,
} from '@/api/hooks/useAIInsights.ts';
import { useCampaigns } from '@/api/hooks/useCustomerSuccess.ts';

// ============================================
// Helper Components
// ============================================

/**
 * Health indicator with color-coded status
 */
function HealthIndicator({
  health,
  score,
}: {
  health: string;
  score?: number;
}) {
  const config: Record<
    string,
    { color: string; text: string; label: string }
  > = {
    good: { color: 'bg-green-500', text: 'text-green-700', label: 'Healthy' },
    healthy: { color: 'bg-green-500', text: 'text-green-700', label: 'Healthy' },
    needs_attention: {
      color: 'bg-yellow-500',
      text: 'text-yellow-700',
      label: 'Needs Attention',
    },
    mixed: { color: 'bg-yellow-500', text: 'text-yellow-700', label: 'Mixed' },
    poor: { color: 'bg-red-500', text: 'text-red-700', label: 'Poor' },
    needs_work: {
      color: 'bg-red-500',
      text: 'text-red-700',
      label: 'Needs Work',
    },
  };

  const cfg = config[health] || config.mixed;

  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-3 h-3 rounded-full', cfg.color)} />
      <span className={cn('font-medium', cfg.text)}>{cfg.label}</span>
      {score !== undefined && (
        <span className="text-sm text-text-muted">({score}/100)</span>
      )}
    </div>
  );
}

/**
 * Priority badge for recommendations
 */
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 text-xs font-medium rounded border capitalize',
        colors[priority] || colors.medium
      )}
    >
      {priority}
    </span>
  );
}

/**
 * Insight card container
 */
function InsightCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h3 className="font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/**
 * Loading skeleton for cards
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-bg-hover rounded w-1/4" />
      <div className="h-4 bg-bg-hover rounded w-1/2" />
      <div className="h-4 bg-bg-hover rounded w-1/3" />
    </div>
  );
}

// ============================================
// Subject Line Optimizer Modal
// ============================================

function SubjectOptimizer({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [goal, setGoal] = useState('engagement');
  const mutation = useSubjectSuggestions();

  const handleGenerate = () => {
    if (subject.trim()) {
      mutation.mutate({ subject, campaign_goal: goal });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            AI Subject Line Optimizer
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">
              Original Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter your subject line..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-hover text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">
              Campaign Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-hover text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="engagement">Engagement</option>
              <option value="conversion">Conversion</option>
              <option value="retention">Retention</option>
              <option value="education">Education</option>
              <option value="reactivation">Reactivation</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={mutation.isPending || !subject.trim()}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {mutation.isPending ? 'Generating...' : 'Generate Variants'}
          </button>

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Failed to generate suggestions. Please try again.
              </p>
            </div>
          )}

          {mutation.data && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-text-primary">
                Suggested Variants:
              </h4>
              {mutation.data.variants.map((v, i) => (
                <div
                  key={i}
                  className="p-3 bg-bg-hover rounded-lg border border-border"
                >
                  <p className="font-medium text-text-primary">"{v.subject}"</p>
                  <p className="text-xs text-text-muted mt-1">
                    Strategy: {v.strategy}
                  </p>
                </div>
              ))}
              {mutation.data.recommended_test && (
                <p className="text-sm text-info mt-2">
                  {mutation.data.recommended_test}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Portfolio Health Section
// ============================================

function PortfolioHealthSection({
  data,
  isLoading,
}: {
  data: PortfolioInsights | undefined;
  isLoading: boolean;
}) {
  return (
    <InsightCard
      title="Portfolio Health"
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      }
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <HealthIndicator health={data.insights.portfolio_health} />
            <span className="text-sm text-text-muted">
              {data.campaign_count} active campaigns
            </span>
          </div>

          {data.insights.top_performer && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <p className="text-sm text-success font-medium">
                Top Performer: {data.insights.top_performer}
              </p>
            </div>
          )}

          {data.insights.needs_attention &&
            data.insights.needs_attention.length > 0 && (
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-sm text-warning font-medium mb-1">
                  Needs Attention:
                </p>
                <ul className="text-sm text-text-secondary space-y-1">
                  {data.insights.needs_attention.map((c, i) => (
                    <li key={i}>- {c}</li>
                  ))}
                </ul>
              </div>
            )}

          {data.insights.resource_allocation && (
            <p className="text-sm text-text-muted">
              {data.insights.resource_allocation}
            </p>
          )}
        </div>
      ) : (
        <p className="text-text-muted">No portfolio insights available</p>
      )}
    </InsightCard>
  );
}

// ============================================
// Strategic Insights Section
// ============================================

function StrategicInsightsSection({
  insights,
}: {
  insights: PortfolioInsights['insights']['strategic_insights'] | undefined;
}) {
  if (!insights || insights.length === 0) return null;

  return (
    <InsightCard
      title="Strategic Insights"
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      }
    >
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="p-4 bg-bg-hover rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded capitalize">
                {insight.category}
              </span>
            </div>
            <p className="text-sm text-text-primary font-medium">
              {insight.insight}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Action: {insight.action}
            </p>
          </div>
        ))}
      </div>
    </InsightCard>
  );
}

// ============================================
// Quick Wins Section
// ============================================

function QuickWinsSection({
  quickWins,
}: {
  quickWins: string[] | undefined;
}) {
  if (!quickWins || quickWins.length === 0) return null;

  return (
    <InsightCard
      title="Quick Wins"
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      }
    >
      <ul className="space-y-2">
        {quickWins.map((win, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-success mt-0.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            <span className="text-text-secondary">{win}</span>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

// ============================================
// Campaign Analysis Section
// ============================================

function CampaignAnalysisSection({
  selectedCampaignId,
  setSelectedCampaignId,
  campaigns,
  analysis,
  isLoading,
}: {
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  campaigns: Array<{ id: number; name: string }> | undefined;
  analysis: CampaignAIAnalysis | null | undefined;
  isLoading: boolean;
}) {
  return (
    <InsightCard
      title="Campaign Analysis"
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      }
    >
      <div className="space-y-4">
        <select
          value={selectedCampaignId || ''}
          onChange={(e) =>
            setSelectedCampaignId(
              e.target.value ? Number(e.target.value) : null
            )
          }
          className="w-full px-3 py-2 border border-border rounded-lg bg-bg-hover text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Select a campaign to analyze...</option>
          {campaigns?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {isLoading && selectedCampaignId && (
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 bg-bg-hover rounded w-1/3" />
            <div className="h-4 bg-bg-hover rounded w-2/3" />
            <div className="h-4 bg-bg-hover rounded w-1/2" />
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <span className="font-medium text-text-primary">
                {analysis.campaign_name}
              </span>
              <HealthIndicator
                health={analysis.analysis.overall_health}
                score={analysis.analysis.health_score}
              />
            </div>

            {/* Key Insights */}
            {analysis.analysis.key_insights &&
              analysis.analysis.key_insights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-text-primary">
                    Key Insights
                  </h4>
                  <ul className="space-y-1">
                    {analysis.analysis.key_insights.map((insight, i) => (
                      <li
                        key={i}
                        className="text-sm text-text-secondary flex items-start gap-2"
                      >
                        <span className="text-info">-</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Recommendations */}
            {analysis.analysis.recommendations &&
              analysis.analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-text-primary">
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {analysis.analysis.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-bg-hover rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <PriorityBadge priority={rec.priority} />
                        </div>
                        <p className="text-sm text-text-primary">{rec.action}</p>
                        <p className="text-xs text-text-muted mt-1">
                          Impact: {rec.expected_impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Bottlenecks */}
            {analysis.analysis.bottlenecks &&
              analysis.analysis.bottlenecks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-text-primary">
                    Bottlenecks
                  </h4>
                  <ul className="space-y-1">
                    {analysis.analysis.bottlenecks.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-warning flex items-start gap-2"
                      >
                        <span>!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Opportunities */}
            {analysis.analysis.opportunities &&
              analysis.analysis.opportunities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-text-primary">
                    Opportunities
                  </h4>
                  <ul className="space-y-1">
                    {analysis.analysis.opportunities.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-success flex items-start gap-2"
                      >
                        <span>+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {!isLoading && !analysis && selectedCampaignId && (
          <p className="text-sm text-text-muted text-center py-4">
            No analysis available for this campaign
          </p>
        )}
      </div>
    </InsightCard>
  );
}

// ============================================
// Main Component
// ============================================

export function AIInsightsHub() {
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null
  );

  const { data: portfolioData, isLoading: portfolioLoading } =
    usePortfolioInsights();
  const { data: campaignsData } = useCampaigns({ status: 'active' });
  const { data: campaignAnalysis, isLoading: analysisLoading } =
    useCampaignAIAnalysis(selectedCampaignId);

  // Extract campaigns list
  const campaigns = campaignsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI Insights Hub
          </h2>
          <p className="text-sm text-text-muted">
            AI-powered recommendations and analysis
          </p>
        </div>
        <button
          onClick={() => setShowOptimizer(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Optimize Subject Line
        </button>
      </div>

      {/* Portfolio Health Overview */}
      <PortfolioHealthSection
        data={portfolioData}
        isLoading={portfolioLoading}
      />

      {/* Strategic Insights */}
      <StrategicInsightsSection
        insights={portfolioData?.insights.strategic_insights}
      />

      {/* Quick Wins */}
      <QuickWinsSection quickWins={portfolioData?.insights.quick_wins} />

      {/* Campaign-specific Analysis */}
      <CampaignAnalysisSection
        selectedCampaignId={selectedCampaignId}
        setSelectedCampaignId={setSelectedCampaignId}
        campaigns={campaigns}
        analysis={campaignAnalysis}
        isLoading={analysisLoading}
      />

      {/* Subject Line Optimizer Modal */}
      {showOptimizer && (
        <SubjectOptimizer onClose={() => setShowOptimizer(false)} />
      )}
    </div>
  );
}

export default AIInsightsHub;
