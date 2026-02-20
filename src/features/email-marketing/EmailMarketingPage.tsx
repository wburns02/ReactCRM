import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useEmailMarketingStatus,
  useUpdateSubscription,
} from "@/api/hooks/useEmailMarketing.ts";
import {
  TIER_LABELS,
  TIER_PRICES,
  type SubscriptionTier,
} from "@/api/types/emailMarketing.ts";
import { CampaignsTab } from "./components/CampaignsTab.tsx";
import { TemplatesTab } from "./components/TemplatesTab.tsx";
import { SegmentsTab } from "./components/SegmentsTab.tsx";
import { AISuggestionsTab } from "./components/AISuggestionsTab.tsx";
import { AnalyticsTab } from "./components/AnalyticsTab.tsx";
import { formatCurrency } from "@/lib/utils.ts";

type Tab = "campaigns" | "templates" | "segments" | "suggestions" | "analytics";

/**
 * Email Marketing Hub - Main page with tier-based features
 */
export function EmailMarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: status, isLoading, error } = useEmailMarketingStatus();
  const updateSubscription = useUpdateSubscription();

  const tier = (status?.subscription?.tier || "none") as SubscriptionTier;
  const canAccessManual = tier !== "none";
  const canAccessAI = tier === "ai_suggested" || tier === "autonomous";

  // Quick stats from analytics — status endpoint returns analytics as a flat object
  // (total_sent, total_opened, open_rate, etc.) NOT nested under a 'totals' key.
  const analytics = status?.analytics as
    | {
        total_sent?: number;
        total_opened?: number;
        total_clicked?: number;
        open_rate?: number;
        click_rate?: number;
        totals?: {
          total_sent: number;
          total_opened: number;
          total_clicked: number;
          open_rate: number;
          click_rate: number;
        };
      }
    | undefined;
  // Support both flat (from /status) and nested (from /analytics) shapes.
  const totals = analytics?.totals || {
    total_sent: analytics?.total_sent ?? 0,
    total_opened: analytics?.total_opened ?? 0,
    total_clicked: analytics?.total_clicked ?? 0,
    open_rate: analytics?.open_rate ?? 0,
    click_rate: analytics?.click_rate ?? 0,
  };

  const tabs: {
    id: Tab;
    label: string;
    icon: string;
    requiresTier?: SubscriptionTier;
  }[] = [
    { id: "campaigns", label: "Campaigns", icon: "📧" },
    { id: "templates", label: "Templates", icon: "📝" },
    { id: "segments", label: "Segments", icon: "👥" },
    {
      id: "suggestions",
      label: "AI Suggestions",
      icon: "🤖",
      requiresTier: "ai_suggested",
    },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  const handleUpgrade = async (newTier: SubscriptionTier) => {
    try {
      await updateSubscription.mutateAsync(newTier);
      setShowUpgradeModal(false);
    } catch (err) {
      console.error("Failed to upgrade:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted w-64 mb-6 rounded" />
          <div className="h-24 bg-bg-muted mb-6 rounded" />
          <div className="h-96 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Email Marketing Unavailable
            </h2>
            <p className="text-text-secondary mb-4">
              Unable to load email marketing status. Please try again later.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Email Marketing
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Create campaigns, manage templates, and track performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={tier === "none" ? "default" : "success"}>
            {TIER_LABELS[tier]}
          </Badge>
          {tier !== "autonomous" && (
            <Button onClick={() => setShowUpgradeModal(true)}>Upgrade</Button>
          )}
        </div>
      </div>

      {/* Quick Stats - Only show if not on 'none' tier */}
      {canAccessManual && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {totals.total_sent || 0}
                </p>
                <p className="text-xs text-text-muted">Emails Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {totals.total_opened || 0}
                </p>
                <p className="text-xs text-text-muted">Opened</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {totals.total_clicked || 0}
                </p>
                <p className="text-xs text-text-muted">Clicked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {(totals.open_rate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-text-muted">Open Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {(totals.click_rate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-text-muted">Click Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Tier Banner */}
      {tier === "none" && (
        <Card className="mb-6 border-primary">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">
                  Enable Email Marketing
                </h2>
                <p className="text-text-secondary">
                  Start sending professional email campaigns to your customers.
                  Choose a plan that fits your needs.
                </p>
              </div>
              <Button size="lg" onClick={() => setShowUpgradeModal(true)}>
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isDisabled = tab.requiresTier && !canAccessAI;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                  }
                  ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {isDisabled && (
                  <Badge variant="default" className="ml-2 text-xs">
                    Tier 3+
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "campaigns" && <CampaignsTab tier={tier} />}
        {activeTab === "templates" && <TemplatesTab tier={tier} />}
        {activeTab === "segments" && <SegmentsTab tier={tier} />}
        {activeTab === "suggestions" && canAccessAI && (
          <AISuggestionsTab tier={tier} />
        )}
        {activeTab === "analytics" && <AnalyticsTab tier={tier} />}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Choose Your Plan
                </h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Manual Plan */}
                <div
                  className={`border rounded-lg p-4 ${tier === "manual" ? "border-primary bg-primary-light" : "border-border"}`}
                >
                  <h3 className="font-semibold text-text-primary mb-1">
                    Manual Marketing
                  </h3>
                  <p className="text-2xl font-bold text-text-primary mb-2">
                    {formatCurrency(TIER_PRICES.manual)}
                    <span className="text-sm font-normal text-text-muted">
                      /mo
                    </span>
                  </p>
                  <ul className="text-sm text-text-secondary space-y-1 mb-4">
                    <li>• Email templates</li>
                    <li>• Campaign creation</li>
                    <li>• Segment browser</li>
                    <li>• Basic analytics</li>
                  </ul>
                  <Button
                    variant={tier === "manual" ? "secondary" : "primary"}
                    className="w-full"
                    onClick={() => handleUpgrade("manual")}
                    disabled={tier === "manual" || updateSubscription.isPending}
                  >
                    {tier === "manual" ? "Current Plan" : "Select"}
                  </Button>
                </div>

                {/* AI Suggested Plan */}
                <div
                  className={`border rounded-lg p-4 ${tier === "ai_suggested" ? "border-primary bg-primary-light" : "border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary">
                      AI-Suggested
                    </h3>
                    <Badge variant="success">Popular</Badge>
                  </div>
                  <p className="text-2xl font-bold text-text-primary mb-2">
                    {formatCurrency(TIER_PRICES.ai_suggested)}
                    <span className="text-sm font-normal text-text-muted">
                      /mo
                    </span>
                  </p>
                  <ul className="text-sm text-text-secondary space-y-1 mb-4">
                    <li>• Everything in Manual</li>
                    <li>• AI campaign suggestions</li>
                    <li>• Content generation</li>
                    <li>• Subject line optimization</li>
                    <li>• A/B testing</li>
                  </ul>
                  <Button
                    variant={tier === "ai_suggested" ? "secondary" : "primary"}
                    className="w-full"
                    onClick={() => handleUpgrade("ai_suggested")}
                    disabled={
                      tier === "ai_suggested" || updateSubscription.isPending
                    }
                  >
                    {tier === "ai_suggested" ? "Current Plan" : "Select"}
                  </Button>
                </div>

                {/* Autonomous Plan */}
                <div
                  className={`border rounded-lg p-4 ${tier === "autonomous" ? "border-primary bg-primary-light" : "border-border"}`}
                >
                  <h3 className="font-semibold text-text-primary mb-1">
                    Fully Autonomous
                  </h3>
                  <p className="text-2xl font-bold text-text-primary mb-2">
                    {formatCurrency(TIER_PRICES.autonomous)}
                    <span className="text-sm font-normal text-text-muted">
                      /mo
                    </span>
                  </p>
                  <ul className="text-sm text-text-secondary space-y-1 mb-4">
                    <li>• Everything in AI-Suggested</li>
                    <li>• Onboarding brain storm</li>
                    <li>• Automated campaigns</li>
                    <li>• Prospect generation</li>
                    <li>• Monthly AI reports</li>
                  </ul>
                  <Button
                    variant={tier === "autonomous" ? "secondary" : "primary"}
                    className="w-full"
                    onClick={() => handleUpgrade("autonomous")}
                    disabled={
                      tier === "autonomous" || updateSubscription.isPending
                    }
                  >
                    {tier === "autonomous" ? "Current Plan" : "Select"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-text-muted text-center mt-4">
                Plans can be changed at any time. Billing is monthly.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
