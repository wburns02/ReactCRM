import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  useAdsStatus,
  useIntegrationSettings,
} from "@/api/hooks/useMarketingHub.ts";

/**
 * Google Ads integration settings
 * Shows connection status + links to the full Google Ads dashboard
 */
export function GoogleAdsSettings() {
  const { data: adsStatus, isLoading: adsLoading } = useAdsStatus();
  const { data: settings } = useIntegrationSettings();

  const isConfigured = settings?.integrations?.google_ads?.configured;
  const customerId = settings?.integrations?.google_ads?.customer_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">📈</span>
          Google Ads Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {isConfigured ? (
                <>
                  <p className="text-sm text-text-secondary">
                    Connected — Customer ID: {customerId}
                  </p>
                  {adsStatus?.account_name && (
                    <p className="text-sm text-text-secondary">
                      Account: {adsStatus.account_name}
                    </p>
                  )}
                  {adsStatus?.daily_operations !== undefined && (
                    <p className="text-xs text-text-muted mt-1">
                      API usage: {adsStatus.daily_operations?.toLocaleString()}/{adsStatus.daily_limit?.toLocaleString()} ops today
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-secondary">Not connected</p>
              )}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                isConfigured ? "bg-success" : "bg-text-muted"
              }`}
            />
          </div>
        </div>

        {isConfigured ? (
          <div className="space-y-4">
            <div className="p-4 border border-success/30 bg-success/5 rounded-lg">
              <p className="text-sm text-success font-medium">
                Google Ads is connected and pulling live campaign data.
              </p>
            </div>
            <Link to="/marketing/ads">
              <Button variant="primary">Open Google Ads Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Setup Instructions</h3>
              <p className="text-sm text-text-secondary mb-3">
                Connect your Google Ads account by setting these environment variables on Railway:
              </p>
              <div className="bg-bg-body p-3 rounded font-mono text-xs space-y-1">
                <p>GOOGLE_ADS_DEVELOPER_TOKEN</p>
                <p>GOOGLE_ADS_CLIENT_ID</p>
                <p>GOOGLE_ADS_CLIENT_SECRET</p>
                <p>GOOGLE_ADS_REFRESH_TOKEN</p>
                <p>GOOGLE_ADS_CUSTOMER_ID</p>
                <p>GOOGLE_ADS_LOGIN_CUSTOMER_ID</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-text-secondary">
                <strong>Manager Account:</strong> 118-304-1664 (Basic Access, 15K ops/day).
                Use the Google Ads API OAuth2 playground to generate a refresh token.
              </p>
            </div>
          </div>
        )}

        {adsLoading && (
          <p className="text-sm text-text-muted">Checking connection...</p>
        )}
      </CardContent>
    </Card>
  );
}
