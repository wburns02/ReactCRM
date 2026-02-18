import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useIntegrationSettings } from "@/api/hooks/useMarketingHub.ts";

/**
 * Google Business Profile integration settings
 */
export function GoogleBusinessProfileSettings() {
  const { data: settings } = useIntegrationSettings();
  const isConfigured =
    settings?.integrations?.google_business_profile?.configured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          Google Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {isConfigured ? (
                <p className="text-sm text-text-secondary">Connected</p>
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
          <div className="p-4 border border-success/30 bg-success/5 rounded-lg">
            <p className="text-sm text-success font-medium">
              Google Business Profile is connected. Reviews sync to the Reviews dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Setup Instructions</h3>
              <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
                <li>Go to <strong>Google Business Profile Manager</strong> and select your business</li>
                <li>Copy your <strong>Account ID</strong> and <strong>Location ID</strong> from the URL</li>
                <li>Enable the <strong>Google My Business API</strong> in Google Cloud Console</li>
                <li>Create OAuth credentials with the Business Profile scope</li>
                <li>Set these environment variables on Railway:</li>
              </ol>
              <div className="bg-bg-body p-3 rounded font-mono text-xs space-y-1 mt-3">
                <p>GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID=123456789</p>
                <p>GOOGLE_BUSINESS_PROFILE_LOCATION_ID=987654321</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-1">What you get</h4>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>Auto-pull Google reviews into the Reviews dashboard</li>
                <li>AI-powered review response suggestions</li>
                <li>Business insights: search queries, photo views, direction requests</li>
                <li>Post updates directly from the CRM</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
