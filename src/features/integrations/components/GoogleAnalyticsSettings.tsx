import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useIntegrationSettings } from "@/api/hooks/useMarketingHub.ts";

/**
 * Google Analytics 4 integration settings
 */
export function GoogleAnalyticsSettings() {
  const { data: settings } = useIntegrationSettings();
  const isConfigured = settings?.integrations?.ga4?.configured;
  const propertyId = settings?.integrations?.ga4?.property_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          Google Analytics 4
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {isConfigured ? (
                <p className="text-sm text-text-secondary">
                  Connected — Property ID: {propertyId}
                </p>
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
              Google Analytics 4 is connected and tracking website traffic.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Setup Instructions</h3>
              <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
                <li>Go to <strong>Google Analytics</strong> &rarr; Admin &rarr; Property Settings</li>
                <li>Copy your <strong>GA4 Property ID</strong> (format: 123456789)</li>
                <li>Create a service account in Google Cloud Console with Analytics Viewer role</li>
                <li>Download the JSON key file</li>
                <li>Set these environment variables on Railway:</li>
              </ol>
              <div className="bg-bg-body p-3 rounded font-mono text-xs space-y-1 mt-3">
                <p>GA4_PROPERTY_ID=123456789</p>
                <p>GA4_CREDENTIALS_JSON=&lt;base64-encoded service account JSON&gt;</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-1">What you get</h4>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>Website traffic and user behavior data in the Marketing Analytics dashboard</li>
                <li>Attribution tracking — see which marketing channels drive conversions</li>
                <li>Real-time visitor counts on your service pages</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
