import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useMicrosoft365Status,
  useMicrosoft365AuthUrl,
  useMicrosoft365Link,
  useMicrosoft365Unlink,
} from "@/api/hooks/useMicrosoft365";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { apiClient } from "@/api/client";

export function Microsoft365Settings() {
  const [searchParams] = useSearchParams();
  const { data: status, isLoading } = useMicrosoft365Status();
  const authUrlMutation = useMicrosoft365AuthUrl();
  const linkMutation = useMicrosoft365Link();
  const unlinkMutation = useMicrosoft365Unlink();

  // Handle OAuth callback for account linking
  useEffect(() => {
    const code = searchParams.get("ms_link_code");
    if (code) {
      linkMutation.mutate(code, {
        onSuccess: (data) => {
          toastSuccess(`Microsoft account linked: ${data.microsoft_email}`);
          window.history.replaceState({}, "", "/integrations?selected=microsoft365");
        },
        onError: () => toastError("Failed to link Microsoft account"),
      });
    }
  }, [searchParams]);

  const handleLink = async () => {
    try {
      const result = await authUrlMutation.mutateAsync();
      // Redirect to Microsoft OAuth with link state
      const url = new URL(result.authorization_url);
      url.searchParams.set("state", "link");
      window.location.href = url.toString();
    } catch {
      toastError("Failed to get Microsoft auth URL");
    }
  };

  const handleUnlink = () => {
    if (!confirm("Disconnect your Microsoft account?")) return;
    unlinkMutation.mutate(undefined, {
      onSuccess: () => toastSuccess("Microsoft account disconnected"),
      onError: () => toastError("Failed to disconnect"),
    });
  };

  if (isLoading) {
    return <div className="p-6 text-text-secondary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#0078d4]/10 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 23 23" fill="none">
              <rect width="11" height="11" fill="#f25022" />
              <rect x="12" width="11" height="11" fill="#7fba00" />
              <rect y="12" width="11" height="11" fill="#00a4ef" />
              <rect x="12" y="12" width="11" height="11" fill="#ffb900" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Microsoft 365</h2>
            <p className="text-sm text-text-secondary">
              SSO login, Outlook calendar sync, Teams notifications, SharePoint storage
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-bg-hover">
            <div>
              <p className="font-medium text-text-primary">Platform Configuration</p>
              <p className="text-sm text-text-secondary">
                {status?.configured
                  ? "Microsoft 365 is configured for this CRM instance"
                  : "Microsoft 365 credentials not set — contact admin"}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                status?.configured
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {status?.configured ? "Configured" : "Not Configured"}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-bg-hover">
            <div>
              <p className="font-medium text-text-primary">Your Account</p>
              <p className="text-sm text-text-secondary">
                {status?.user_linked
                  ? `Linked to ${status.microsoft_email}`
                  : "Not linked — link to enable SSO login"}
              </p>
            </div>
            {status?.user_linked ? (
              <button
                onClick={handleUnlink}
                disabled={unlinkMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors"
              >
                {unlinkMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={handleLink}
                disabled={!status?.configured || authUrlMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] rounded-lg hover:bg-[#106ebe] transition-colors disabled:opacity-50"
              >
                {authUrlMutation.isPending ? "Connecting..." : "Link Account"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-text-primary mb-4">Available Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "SSO Login", desc: "Sign in with Microsoft", ready: true, key: "configured" },
            { name: "Outlook Calendar", desc: "Work order → calendar event sync", ready: !!(status as any)?.calendar_sync, key: "calendar_sync" },
            { name: "Teams Notifications", desc: "Job completions, payments, quotes", ready: !!(status as any)?.teams_webhook, key: "teams_webhook" },
            { name: "SharePoint Storage", desc: "Inspection reports, contracts", ready: !!(status as any)?.sharepoint, key: "sharepoint" },
            { name: "Email Parsing", desc: "Auto-create leads from inbox", ready: !!(status as any)?.email_monitoring, key: "email_monitoring" },
          ].map((f) => (
            <div key={f.name} className="flex items-center gap-3 p-3 rounded-lg bg-bg-hover">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.ready ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-500/10 text-gray-500"
              }`}>
                {f.ready ? "Live" : "Coming"}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{f.name}</p>
                <p className="text-xs text-text-secondary">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Teams Test */}
      {(status as any)?.teams_webhook && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-text-primary mb-3">Teams Notifications</h3>
          <p className="text-sm text-text-secondary mb-4">
            CRM events (job completions, payments, quotes, bookings) are posted to your Teams channel.
          </p>
          <button
            onClick={async () => {
              try {
                await apiClient.post("/microsoft365/teams/test");
                toastSuccess("Test message sent to Teams!");
              } catch {
                toastError("Failed to send test message");
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#6264a7] rounded-lg hover:bg-[#4b4d8f] transition-colors"
          >
            Send Test Message
          </button>
        </div>
      )}
    </div>
  );
}
