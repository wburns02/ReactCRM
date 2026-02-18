import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useIntegrationSettings } from "@/api/hooks/useMarketingHub.ts";

/**
 * Google Search Console integration settings
 */
export function GoogleSearchConsoleSettings() {
  const { data: settings } = useIntegrationSettings();
  const isConfigured = settings?.integrations?.search_console?.configured;
  const siteUrl = settings?.integrations?.search_console?.site_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          Google Search Console
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {isConfigured ? (
                <p className="text-sm text-text-secondary">
                  Connected — Site: {siteUrl}
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
              Google Search Console is connected. Keyword data feeds into the SEO Dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Setup Instructions</h3>
              <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
                <li>Go to <strong>Google Search Console</strong> and verify your site ownership</li>
                <li>Copy your site URL (e.g., <code>https://macseptic.com</code>)</li>
                <li>Create a service account with Search Console API access</li>
                <li>Add the service account email as a user in Search Console</li>
                <li>Set these environment variables on Railway:</li>
              </ol>
              <div className="bg-bg-body p-3 rounded font-mono text-xs space-y-1 mt-3">
                <p>GOOGLE_SEARCH_CONSOLE_SITE_URL=https://macseptic.com</p>
                <p>GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON=&lt;base64-encoded JSON&gt;</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-1">What you get</h4>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>Real keyword rankings and search positions in the SEO Dashboard</li>
                <li>Click-through rates and impression data for your pages</li>
                <li>Index coverage and crawl error alerts</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
