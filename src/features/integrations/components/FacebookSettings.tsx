import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  useSocialIntegrationsStatus,
  useFacebookAuthUrl,
  useDisconnectFacebook,
} from "@/api/hooks/useSocialIntegrations.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

/**
 * Facebook integration settings component
 */
export function FacebookSettings() {
  const { data: status, isLoading: statusLoading } =
    useSocialIntegrationsStatus();
  const authUrlMutation = useFacebookAuthUrl();
  const disconnectMutation = useDisconnectFacebook();

  const fbStatus = status?.facebook;

  const handleConnect = async () => {
    try {
      const result = await authUrlMutation.mutateAsync();
      // Redirect to Facebook OAuth
      window.location.href = result.auth_url;
    } catch {
      toastError("Failed to start Facebook authorization");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Facebook?")) return;

    try {
      await disconnectMutation.mutateAsync();
      toastSuccess("Facebook disconnected");
    } catch {
      toastError("Failed to disconnect Facebook");
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-bg-muted w-48 rounded" />
            <div className="h-10 bg-bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl text-blue-600">f</span>
          Facebook Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {fbStatus?.connected ? (
                <p className="text-sm text-text-secondary">
                  Connected to: {fbStatus.page_name}
                </p>
              ) : (
                <p className="text-sm text-text-secondary">Not connected</p>
              )}
              {fbStatus?.last_sync && (
                <p className="text-xs text-text-muted mt-1">
                  Last synced: {new Date(fbStatus.last_sync).toLocaleString()}
                </p>
              )}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                fbStatus?.connected ? "bg-success" : "bg-text-muted"
              }`}
            />
          </div>
        </div>

        {fbStatus?.connected ? (
          <>
            {/* Connected State */}
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">
                Connected Page
              </h3>
              <p className="text-text-secondary">{fbStatus.page_name}</p>
              <p className="text-sm text-text-muted">
                Page ID: {fbStatus.page_id}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h3 className="font-medium text-text-primary">
                Available Features
              </h3>
              <ul className="text-sm text-text-secondary space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-success">*</span>
                  View page recommendations and reviews
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">*</span>
                  Reply to recommendations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">*</span>
                  View page engagement insights
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleConnect}
                disabled={authUrlMutation.isPending}
              >
                {authUrlMutation.isPending ? "Loading..." : "Reconnect"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending
                  ? "Disconnecting..."
                  : "Disconnect"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="space-y-4">
              <p className="text-text-secondary">
                Connect your Facebook Business Page to manage reviews and view
                insights.
              </p>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-medium text-text-primary mb-2">
                  What you'll get:
                </h3>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>- View and respond to page recommendations</li>
                  <li>- See page engagement insights</li>
                  <li>- Manage your online presence from one place</li>
                </ul>
              </div>

              {!fbStatus?.configured && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning-foreground">
                    <strong>Setup Required:</strong> Facebook App credentials
                    need to be configured in the server environment. Contact
                    your administrator.
                  </p>
                </div>
              )}

              <Button
                onClick={handleConnect}
                disabled={authUrlMutation.isPending || !fbStatus?.configured}
              >
                {authUrlMutation.isPending
                  ? "Loading..."
                  : "Connect Facebook Page"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
