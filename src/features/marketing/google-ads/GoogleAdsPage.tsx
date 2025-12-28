import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  useAdsPerformance,
  useIntegrationSettings,
} from '@/api/hooks/useMarketingHub.ts';

export function GoogleAdsPage() {
  const [periodDays, setPeriodDays] = useState(30);

  const { data: adsData, isLoading } = useAdsPerformance(periodDays);
  const { data: settings } = useIntegrationSettings();

  const isConfigured = settings?.integrations?.google_ads?.configured;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">&larr; Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Google Ads Dashboard</h1>
            <p className="text-sm text-text-secondary mt-1">
              Campaign performance and optimization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-3 py-2 bg-surface border border-border rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {isConfigured ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="warning">Not Connected</Badge>
          )}
        </div>
      </div>

      {!isConfigured && (
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Google Ads Not Connected</h3>
                <p className="text-sm text-text-secondary">
                  Connect your Google Ads account to see real performance data and manage campaigns.
                </p>
              </div>
              <Link to="/integrations">
                <Button variant="primary">Connect Google Ads</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Spend</div>
            <div className="text-2xl font-bold text-text-primary">
              {isLoading ? '...' : formatCurrency(adsData?.metrics?.cost || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Clicks</div>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? '...' : formatNumber(adsData?.metrics?.clicks || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Impressions</div>
            <div className="text-2xl font-bold text-text-primary">
              {isLoading ? '...' : formatNumber(adsData?.metrics?.impressions || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Conversions</div>
            <div className="text-2xl font-bold text-success">
              {isLoading ? '...' : formatNumber(adsData?.metrics?.conversions || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Cost/Conversion</div>
            <div className="text-2xl font-bold text-warning">
              {isLoading ? '...' : formatCurrency(adsData?.metrics?.cpa || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-surface-hover rounded w-3/4"></div>
                <div className="h-4 bg-surface-hover rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-text-secondary">CTR (Click-Through Rate)</span>
                    <span className="text-sm font-medium">
                      {((adsData?.metrics?.ctr || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${Math.min((adsData?.metrics?.ctr || 0) * 100 * 10, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Industry average: 3-5%
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-text-secondary">Conversion Rate</span>
                    <span className="text-sm font-medium">
                      {(((adsData?.metrics?.conversions || 0) / Math.max(1, adsData?.metrics?.clicks || 1)) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full"
                      style={{
                        width: `${Math.min(((adsData?.metrics?.conversions || 0) / Math.max(1, adsData?.metrics?.clicks || 1)) * 100 * 5, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Industry average: 5-10%
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-secondary">Avg. CPC</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency((adsData?.metrics?.cost || 0) / Math.max(1, adsData?.metrics?.clicks || 1))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">ROAS</p>
                      <p className="text-lg font-semibold">
                        {(((adsData?.metrics?.conversions || 0) * 250) / Math.max(1, adsData?.metrics?.cost || 1)).toFixed(2)}x
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Campaigns</CardTitle>
              <Button variant="secondary" size="sm" disabled={!isConfigured}>
                Create Campaign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-surface-hover rounded"></div>
                <div className="h-12 bg-surface-hover rounded"></div>
              </div>
            ) : adsData?.campaigns?.length ? (
              <div className="space-y-3">
                {adsData.campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 bg-surface-hover rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-text-primary">{campaign.name}</p>
                      <p className="text-sm text-text-secondary">
                        {formatNumber(campaign.clicks)} clicks | {formatNumber(campaign.conversions)} conversions
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={campaign.status === 'active' ? 'success' : 'default'}>
                        {campaign.status}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        {formatCurrency(campaign.cost)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p>No campaigns found</p>
                <p className="text-sm mt-1">
                  {isConfigured
                    ? 'Create your first campaign to start advertising'
                    : 'Connect Google Ads to view campaigns'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💡</span> Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-surface-hover rounded"></div>
              <div className="h-16 bg-surface-hover rounded"></div>
            </div>
          ) : adsData?.recommendations?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adsData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant={
                        rec.priority === 'high' ? 'danger' :
                        rec.priority === 'medium' ? 'warning' : 'info'
                      }
                    >
                      {rec.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{rec.type}</p>
                      <p className="text-sm text-text-secondary mt-1">{rec.message}</p>
                      {rec.impact && (
                        <p className="text-xs text-success mt-2">
                          Potential impact: {rec.impact}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <p>No recommendations available</p>
              <p className="text-sm mt-1">
                Recommendations will appear as your campaigns run
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🔑</span>
              <div>
                <h3 className="font-semibold text-text-primary">Keyword Ideas</h3>
                <p className="text-sm text-text-secondary">
                  Get AI-powered keyword suggestions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">📝</span>
              <div>
                <h3 className="font-semibold text-text-primary">Ad Copy Generator</h3>
                <p className="text-sm text-text-secondary">
                  Generate headlines and descriptions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🎯</span>
              <div>
                <h3 className="font-semibold text-text-primary">Competitor Analysis</h3>
                <p className="text-sm text-text-secondary">
                  See what competitors are bidding on
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
