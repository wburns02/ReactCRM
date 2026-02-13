import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";
import {
  useQBOStatus,
  useQBOSettings,
  useQBOConnect,
  useQBODisconnect,
  useQBOSyncCustomers,
  useQBOSyncInvoices,
  useQBOSyncPayments,
} from "@/api/hooks/useQuickBooks.ts";

/**
 * QuickBooks Online Integration Settings
 *
 * Manages OAuth 2.0 connection to QuickBooks Online.
 * Shows connection status, sync controls, and setup instructions.
 */
export function QuickBooksSettings() {
  const { data: status, isLoading: statusLoading } = useQBOStatus();
  const { data: settings } = useQBOSettings();
  const connectMutation = useQBOConnect();
  const disconnectMutation = useQBODisconnect();
  const syncCustomers = useQBOSyncCustomers();
  const syncInvoices = useQBOSyncInvoices();
  const syncPayments = useQBOSyncPayments();
  const [syncResults, setSyncResults] = useState<string[]>([]);

  const handleConnect = async () => {
    try {
      const result = await connectMutation.mutateAsync();
      if (result.auth_url) {
        toastInfo("Redirecting to QuickBooks...", "Complete the authorization in the Intuit window.");
        window.location.href = result.auth_url;
      }
    } catch (err: any) {
      toastError(
        "OAuth Error",
        err?.response?.data?.detail || "Could not start QuickBooks OAuth flow",
      );
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect QuickBooks? You'll need to re-authorize to sync data again.")) {
      return;
    }
    try {
      await disconnectMutation.mutateAsync();
      toastSuccess("QuickBooks Disconnected", "OAuth tokens removed");
    } catch {
      toastError("Error", "Failed to disconnect QuickBooks");
    }
  };

  const handleSyncAll = async () => {
    const results: string[] = [];
    toastInfo("Starting sync...", "Syncing customers, invoices, and payments to QuickBooks");

    try {
      const custResult = await syncCustomers.mutateAsync();
      results.push(`Customers: ${custResult.synced} synced, ${custResult.errors} errors`);
    } catch (err: any) {
      results.push(`Customers: ${err?.response?.data?.detail || "failed"}`);
    }

    try {
      const invResult = await syncInvoices.mutateAsync();
      results.push(`Invoices: ${invResult.synced} synced, ${invResult.errors} errors`);
    } catch (err: any) {
      results.push(`Invoices: ${err?.response?.data?.detail || "failed"}`);
    }

    try {
      const payResult = await syncPayments.mutateAsync();
      results.push(`Payments: ${payResult.synced} synced, ${payResult.errors} errors`);
    } catch (err: any) {
      results.push(`Payments: ${err?.response?.data?.detail || "failed"}`);
    }

    setSyncResults(results);
    toastSuccess("Sync Complete", results.join(" | "));
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-text-secondary">Loading QuickBooks settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected || false;
  const isSyncing = syncCustomers.isPending || syncInvoices.isPending || syncPayments.isPending;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Online Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💰</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    isConnected
                      ? status?.token_expired ? "bg-amber-500" : "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="font-semibold text-text-primary">
                  {isConnected
                    ? status?.token_expired ? "Token Expired" : "Connected"
                    : "Not Connected"}
                </span>
                {isConnected && (
                  <span className="text-xs text-text-muted">(OAuth 2.0)</span>
                )}
              </div>

              {isConnected && (
                <div className="text-sm text-text-secondary space-y-1">
                  {status?.company_name && <p>Company: {status.company_name}</p>}
                  {status?.realm_id && <p>Realm ID: {status.realm_id}</p>}
                  {status?.connected_by && <p>Connected by: {status.connected_by}</p>}
                  {status?.connected_at && (
                    <p>
                      Connected: {new Date(status.connected_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {status?.last_sync && (
                    <p>
                      Last sync: {new Date(status.last_sync).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              )}

              {!isConnected && status?.message && (
                <p className="text-sm text-text-secondary">{status.message}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {!isConnected && settings?.client_id_configured && (
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? "Redirecting..." : "Connect to QuickBooks"}
              </Button>
            )}

            {isConnected && status?.token_expired && (
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? "Redirecting..." : "Re-authorize"}
              </Button>
            )}

            {isConnected && !status?.token_expired && (
              <Button
                variant="danger"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      {isConnected && !status?.token_expired && (
        <Card>
          <CardHeader>
            <CardTitle>Data Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">
              Sync CRM data to QuickBooks Online. This will create or update customers, invoices,
              and payments in your QuickBooks account.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-bg-muted">
                <p className="font-medium text-text-primary text-sm">Customers</p>
                <p className="text-xs text-text-muted mt-1">
                  Sync customer records to QBO
                </p>
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => syncCustomers.mutateAsync().then(r => {
                    toastSuccess("Customers Synced", `${r.synced} synced, ${r.errors} errors`);
                  }).catch(() => toastError("Sync Failed", "Could not sync customers"))}
                  disabled={isSyncing}
                >
                  {syncCustomers.isPending ? "Syncing..." : "Sync Customers"}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-bg-muted">
                <p className="font-medium text-text-primary text-sm">Invoices</p>
                <p className="text-xs text-text-muted mt-1">
                  Sync invoices to QBO
                </p>
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => syncInvoices.mutateAsync().then(r => {
                    toastSuccess("Invoices Synced", `${r.synced} synced, ${r.errors} errors`);
                  }).catch(() => toastError("Sync Failed", "Could not sync invoices"))}
                  disabled={isSyncing}
                >
                  {syncInvoices.isPending ? "Syncing..." : "Sync Invoices"}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-bg-muted">
                <p className="font-medium text-text-primary text-sm">Payments</p>
                <p className="text-xs text-text-muted mt-1">
                  Sync payment records to QBO
                </p>
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => syncPayments.mutateAsync().then(r => {
                    toastSuccess("Payments Synced", `${r.synced} synced, ${r.errors} errors`);
                  }).catch(() => toastError("Sync Failed", "Could not sync payments"))}
                  disabled={isSyncing}
                >
                  {syncPayments.isPending ? "Syncing..." : "Sync Payments"}
                </Button>
              </div>
            </div>

            <Button onClick={handleSyncAll} disabled={isSyncing}>
              {isSyncing ? "Syncing..." : "Sync All to QuickBooks"}
            </Button>

            {syncResults.length > 0 && (
              <div className="p-3 rounded-lg bg-bg-muted text-sm space-y-1">
                <p className="font-medium text-text-primary">Last Sync Results:</p>
                {syncResults.map((r, i) => (
                  <p key={i} className="text-text-secondary">{r}</p>
                ))}
              </div>
            )}
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
              <p className="font-medium text-text-primary">Connect QuickBooks Online</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  Create an Intuit Developer app at{" "}
                  <a
                    href="https://developer.intuit.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    developer.intuit.com
                  </a>
                </li>
                <li>
                  Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">QBO_CLIENT_ID</code> and{" "}
                  <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">QBO_CLIENT_SECRET</code> on Railway
                </li>
                <li>
                  Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">QBO_REDIRECT_URI</code> to{" "}
                  <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">
                    {settings?.redirect_uri || "https://react.ecbtx.com/integrations/quickbooks/callback"}
                  </code>
                </li>
                <li>
                  Set <code className="bg-bg-muted px-1.5 py-0.5 rounded text-xs">QBO_REALM_ID</code> to your QuickBooks company ID
                </li>
                <li>Click "Connect to QuickBooks" above to authorize</li>
              </ol>

              {!settings?.client_id_configured && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    QBO_CLIENT_ID not configured
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    Set the environment variable on Railway to enable the Connect button.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
