import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";
import {
  useCloverOAuthStatus,
  useCloverOAuthAuthorize,
  useCloverOAuthCallback,
  useCloverOAuthDisconnect,
  useCloverConfig,
} from "@/api/hooks/useClover.ts";

/**
 * Clover Integration Settings
 *
 * Manages OAuth 2.0 connection to Clover merchant account.
 * Shows connection status, capabilities, and connect/disconnect actions.
 */
export function CloverSettings() {
  const [searchParams] = useSearchParams();
  const { data: oauthStatus, isLoading: statusLoading } = useCloverOAuthStatus();
  const { data: config } = useCloverConfig();
  const authorizeMutation = useCloverOAuthAuthorize();
  const callbackMutation = useCloverOAuthCallback();
  const disconnectMutation = useCloverOAuthDisconnect();

  // Handle OAuth callback (code in URL params)
  useEffect(() => {
    const code = searchParams.get("code");
    const merchantId = searchParams.get("merchant_id");
    const state = searchParams.get("state");

    if (code && searchParams.get("clover") === "callback") {
      callbackMutation.mutate(
        { code, merchant_id: merchantId || undefined, state: state || undefined },
        {
          onSuccess: (result) => {
            toastSuccess(
              "Clover Connected!",
              `Merchant: ${result.merchant_name || result.merchant_id}`,
            );
            // Clean up URL
            window.history.replaceState({}, "", "/integrations?selected=clover");
          },
          onError: (err: unknown) => {
            const apiErr = err as Error & { response?: { data?: { detail?: string } } };
            toastError(
              "Connection Failed",
              apiErr?.response?.data?.detail || "Could not connect to Clover",
            );
            window.history.replaceState({}, "", "/integrations?selected=clover");
          },
        },
      );
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      const result = await authorizeMutation.mutateAsync();
      if (result.authorization_url) {
        toastInfo("Redirecting to Clover...", "Complete the authorization in the Clover window.");
        window.location.href = result.authorization_url;
      }
    } catch (err: unknown) {
      const apiErr = err as Error & { response?: { data?: { detail?: string } } };
      toastError(
        "OAuth Error",
        apiErr?.response?.data?.detail || "Could not start OAuth flow",
      );
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Clover? The CRM will fall back to the API key from environment variables.")) {
      return;
    }
    try {
      await disconnectMutation.mutateAsync();
      toastSuccess("Clover Disconnected", "OAuth token removed");
    } catch {
      toastError("Error", "Failed to disconnect Clover");
    }
  };

  const handleTestConnection = async () => {
    toastInfo("Testing connection...");
    // The config query will re-fetch and show results
    window.location.reload();
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-text-secondary">Loading Clover settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = oauthStatus?.oauth_connected || (config?.is_configured && !oauthStatus?.oauth_configured);
  const connectionMethod = oauthStatus?.oauth_connected
    ? "OAuth 2.0"
    : config?.is_configured
      ? "API Key (env var)"
      : "Not connected";

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Clover Payment Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl">☘️</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <span className="font-semibold text-text-primary">
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
                <span className="text-xs text-text-muted">({connectionMethod})</span>
              </div>

              {oauthStatus?.oauth_connected && (
                <div className="text-sm text-text-secondary space-y-1">
                  <p>Merchant: {oauthStatus.merchant_name || oauthStatus.merchant_id}</p>
                  <p>Connected by: {oauthStatus.connected_by}</p>
                  {oauthStatus.connected_at && (
                    <p>
                      Connected: {new Date(oauthStatus.connected_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}

              {config?.is_configured && !oauthStatus?.oauth_connected && (
                <div className="text-sm text-text-secondary">
                  <p>Merchant: {config.merchant_name || config.merchant_id}</p>
                  <p>Environment: {config.environment}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {oauthStatus?.oauth_configured && !oauthStatus?.oauth_connected && (
              <Button
                onClick={handleConnect}
                disabled={authorizeMutation.isPending || callbackMutation.isPending}
              >
                {authorizeMutation.isPending ? "Redirecting..." : "Connect via OAuth"}
              </Button>
            )}

            {oauthStatus?.oauth_connected && (
              <Button
                variant="danger"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect OAuth"}
              </Button>
            )}

            {isConnected && (
              <Button variant="secondary" onClick={handleTestConnection}>
                Test Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      {config?.is_configured && (
        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-muted">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    config.rest_api_available ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-text-primary text-sm">REST API</p>
                  <p className="text-xs text-text-muted">
                    {config.rest_api_available ? "Read payments, orders, items" : "Unavailable"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-muted">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    config.ecommerce_available ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-text-primary text-sm">Online Payments</p>
                  <p className="text-xs text-text-muted">
                    {config.ecommerce_available ? "Card charges & refunds" : "Needs ecommerce key"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-muted">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    config.oauth_connected ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium text-text-primary text-sm">OAuth 2.0</p>
                  <p className="text-xs text-text-muted">
                    {config.oauth_connected
                      ? "Secure token-based auth"
                      : config.oauth_configured
                        ? "Available — click Connect"
                        : "Set CLOVER_CLIENT_ID/SECRET"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p className="font-medium text-text-primary">Option 1: OAuth 2.0 (Recommended)</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Create a Clover Developer app at developer.clover.com</li>
                <li>Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_CLIENT_ID</code> and <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_CLIENT_SECRET</code> on Railway</li>
                <li>Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_REDIRECT_URI</code> to your callback URL</li>
                <li>Click "Connect via OAuth" above to authorize</li>
              </ol>

              <p className="font-medium text-text-primary pt-2">Option 2: API Key</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Get your API key from the Clover merchant dashboard</li>
                <li>Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_MERCHANT_ID</code> and <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_API_KEY</code> on Railway</li>
                <li>Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">CLOVER_ENVIRONMENT</code> to "production" or "sandbox"</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
