import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { IntegrationCard } from "./components/IntegrationCard.tsx";
import { RingCentralSettings } from "./components/RingCentralSettings.tsx";
import { SamsaraSettings } from "./components/SamsaraSettings.tsx";
import { YelpSettings } from "./components/YelpSettings.tsx";
import { FacebookSettings } from "./components/FacebookSettings.tsx";
import { CloverSettings } from "./components/CloverSettings.tsx";
import { QuickBooksSettings } from "./components/QuickBooksSettings.tsx";
import { GoogleAdsSettings } from "./components/GoogleAdsSettings.tsx";
import { GoogleAnalyticsSettings } from "./components/GoogleAnalyticsSettings.tsx";
import { GoogleSearchConsoleSettings } from "./components/GoogleSearchConsoleSettings.tsx";
import { GoogleBusinessProfileSettings } from "./components/GoogleBusinessProfileSettings.tsx";
import { GoogleCalendarSettings } from "./components/GoogleCalendarSettings.tsx";
import { ClaudeSettings } from "./components/ClaudeSettings.tsx";
import { Microsoft365Settings } from "./components/Microsoft365Settings.tsx";
import { useRCStatus } from "@/features/phone/api.ts";
import { useFleetLocations } from "@/features/fleet/api.ts";
import { useSocialIntegrationsStatus } from "@/api/hooks/useSocialIntegrations.ts";
import { useCloverConfig } from "@/api/hooks/useClover.ts";
import { useQBOStatus } from "@/api/hooks/useQuickBooks.ts";
import { useIntegrationSettings } from "@/api/hooks/useMarketingHub.ts";
import { useAnthropicStatus } from "@/api/hooks/useAnthropic.ts";
import { useIntegrationStatus } from "@/api/hooks/useIntegrationStatus.ts";
import { useMicrosoft365Status } from "@/api/hooks/useMicrosoft365.ts";
import { toastInfo, toastSuccess } from "@/components/ui/Toast";

/**
 * Integrations management page
 * Shows all available integrations and their configuration
 */
export function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [searchParams] = useSearchParams();
  const { data: rcStatus } = useRCStatus();
  const { data: vehicles } = useFleetLocations();
  const { data: socialStatus } = useSocialIntegrationsStatus();
  const { data: cloverConfig } = useCloverConfig();
  const { data: qboStatus } = useQBOStatus();
  const { data: integrationSettings } = useIntegrationSettings();
  const { data: claudeStatus } = useAnthropicStatus();
  const { data: integrationStatus } = useIntegrationStatus();
  const { data: ms365Status } = useMicrosoft365Status();

  // Handle OAuth callback success messages
  useEffect(() => {
    if (searchParams.get("facebook") === "connected") {
      toastSuccess("Facebook page connected successfully!");
      window.history.replaceState({}, "", "/integrations");
    }
    // Auto-select Clover settings on callback or explicit selection
    if (searchParams.get("clover") === "callback" || searchParams.get("selected") === "clover") {
      setSelectedIntegration("clover");
    }
    if (searchParams.get("selected") === "microsoft365") {
      setSelectedIntegration("microsoft365");
    }
  }, [searchParams]);

  const integrations = [
    {
      id: "claude",
      name: "Claude AI (Anthropic)",
      description:
        "AI-powered chat, summarization, sentiment analysis, and dispatch optimization",
      icon: "🧠",
      connected: claudeStatus?.connected || false,
      lastSync: claudeStatus?.last_used_at || undefined,
    },
    {
      id: "microsoft365",
      name: "Microsoft 365",
      description:
        "SSO login, Outlook calendar sync, Teams notifications, SharePoint storage",
      icon: "M",
      connected: ms365Status?.user_linked || false,
      lastSync: ms365Status?.user_linked ? new Date().toISOString() : undefined,
    },
    {
      id: "clover",
      name: "Clover Payments",
      description:
        "POS payments, card processing, and order management via Clover",
      icon: "☘️",
      connected: cloverConfig?.is_configured || false,
      lastSync: cloverConfig?.is_configured ? new Date().toISOString() : undefined,
      configDetail: integrationStatus?.clover?.configured === false ? integrationStatus.clover.detail ?? undefined : undefined,
    },
    {
      id: "ringcentral",
      name: "RingCentral",
      description:
        "Cloud-based phone system for click-to-call and call tracking",
      icon: "📞",
      connected: rcStatus?.connected || false,
      lastSync: rcStatus?.connected ? new Date().toISOString() : undefined,
    },
    {
      id: "samsara",
      name: "Samsara GPS",
      description: "Real-time fleet tracking and vehicle management",
      icon: "🚛",
      connected: (vehicles?.length || 0) > 0,
      lastSync:
        vehicles && vehicles.length > 0 ? new Date().toISOString() : undefined,
      configDetail: integrationStatus?.samsara?.configured === false ? integrationStatus.samsara.detail ?? undefined : undefined,
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Accounting and invoicing integration",
      icon: "💰",
      connected: qboStatus?.connected || false,
      lastSync: qboStatus?.last_sync || undefined,
      configDetail: integrationStatus?.quickbooks?.configured === false ? integrationStatus.quickbooks.detail ?? undefined : undefined,
    },
    {
      id: "hubspot",
      name: "HubSpot",
      description: "CRM and marketing automation",
      icon: "🎯",
      connected: false,
      lastSync: undefined,
    },
    {
      id: "yelp",
      name: "Yelp",
      description: "View and manage Yelp business reviews",
      icon: "Y",
      connected: socialStatus?.yelp?.connected || false,
      lastSync: socialStatus?.yelp?.last_sync,
    },
    {
      id: "facebook",
      name: "Facebook",
      description: "Manage Facebook page reviews and insights",
      icon: "f",
      connected: socialStatus?.facebook?.connected || false,
      lastSync: socialStatus?.facebook?.last_sync,
    },
    {
      id: "google_ads",
      name: "Google Ads",
      description: "Live campaign data, spend tracking, and AI optimization suggestions",
      icon: "📈",
      connected: integrationSettings?.integrations?.google_ads?.configured || false,
      lastSync: integrationSettings?.integrations?.google_ads?.configured ? new Date().toISOString() : undefined,
      configDetail: integrationStatus?.google_ads?.configured === false ? integrationStatus.google_ads.detail ?? undefined : undefined,
    },
    {
      id: "google_analytics",
      name: "Google Analytics 4",
      description: "Website traffic, user behavior, and attribution tracking",
      icon: "📊",
      connected: integrationSettings?.integrations?.ga4?.configured || false,
      lastSync: integrationSettings?.integrations?.ga4?.configured ? new Date().toISOString() : undefined,
    },
    {
      id: "google_search_console",
      name: "Google Search Console",
      description: "Keyword rankings, click-through rates, and index coverage",
      icon: "🔍",
      connected: integrationSettings?.integrations?.search_console?.configured || false,
      lastSync: integrationSettings?.integrations?.search_console?.configured ? new Date().toISOString() : undefined,
    },
    {
      id: "google_business_profile",
      name: "Google Business Profile",
      description: "Auto-pull Google reviews, business insights, and post updates",
      icon: "📍",
      connected: integrationSettings?.integrations?.google_business_profile?.configured || false,
      lastSync: integrationSettings?.integrations?.google_business_profile?.configured ? new Date().toISOString() : undefined,
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      description: "Two-way sync between CRM schedule and Google Calendar",
      icon: "📅",
      connected: integrationSettings?.integrations?.google_calendar?.configured || false,
      lastSync: integrationSettings?.integrations?.google_calendar?.configured ? new Date().toISOString() : undefined,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Integrations
        </h1>
        <p className="text-text-secondary">
          Connect Mac Service Platform with your favorite tools and services
        </p>
      </div>

      {/* Integration Cards Grid */}
      {!selectedIntegration && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              name={integration.name}
              description={integration.description}
              icon={integration.icon}
              connected={integration.connected}
              lastSync={integration.lastSync}
              configDetail={(integration as { configDetail?: string }).configDetail}
              onConfigure={
                ["claude", "microsoft365", "ringcentral", "samsara", "yelp", "facebook", "clover", "quickbooks", "google_ads", "google_analytics", "google_search_console", "google_business_profile", "google_calendar"].includes(integration.id)
                  ? () => setSelectedIntegration(integration.id)
                  : undefined
              }
              onTest={
                integration.connected
                  ? () => toastInfo(`Testing ${integration.name} connection...`)
                  : undefined
              }
              onDisconnect={
                integration.connected
                  ? () => {
                      if (confirm(`Disconnect ${integration.name}?`)) {
                        toastSuccess("Disconnected (demo only)");
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Detailed Settings View */}
      {selectedIntegration && (
        <div>
          <button
            onClick={() => setSelectedIntegration(null)}
            className="text-text-secondary hover:text-text-primary mb-4 text-sm"
          >
            ← Back to all integrations
          </button>

          {selectedIntegration === "claude" && <ClaudeSettings />}
          {selectedIntegration === "microsoft365" && <Microsoft365Settings />}
          {selectedIntegration === "ringcentral" && <RingCentralSettings />}
          {selectedIntegration === "samsara" && <SamsaraSettings />}
          {selectedIntegration === "yelp" && <YelpSettings />}
          {selectedIntegration === "facebook" && <FacebookSettings />}
          {selectedIntegration === "clover" && <CloverSettings />}
          {selectedIntegration === "quickbooks" && <QuickBooksSettings />}
          {selectedIntegration === "google_ads" && <GoogleAdsSettings />}
          {selectedIntegration === "google_analytics" && <GoogleAnalyticsSettings />}
          {selectedIntegration === "google_search_console" && <GoogleSearchConsoleSettings />}
          {selectedIntegration === "google_business_profile" && <GoogleBusinessProfileSettings />}
          {selectedIntegration === "google_calendar" && <GoogleCalendarSettings />}
        </div>
      )}

      {/* Coming Soon Section */}
      {!selectedIntegration && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Coming Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Mailchimp", icon: "📧", description: "Email marketing" },
              {
                name: "Zapier",
                icon: "⚡",
                description: "Workflow automation",
              },
            ].map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-lg border border-border bg-bg-hover opacity-60"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
