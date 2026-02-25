import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useMicrosoft365Status,
  useMicrosoft365AuthUrl,
  useMicrosoft365Link,
  useMicrosoft365Unlink,
  useBookingsStatus,
  useBookingsServices,
  useBookingsStaff,
  useBookingsSyncNow,
} from "@/api/hooks/useMicrosoft365";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { apiClient } from "@/api/client";

export function Microsoft365Settings() {
  const [searchParams] = useSearchParams();
  const { data: status, isLoading } = useMicrosoft365Status();
  const authUrlMutation = useMicrosoft365AuthUrl();
  const linkMutation = useMicrosoft365Link();
  const unlinkMutation = useMicrosoft365Unlink();
  const [showBookings, setShowBookings] = useState(false);

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
      {/* Connection Status */}
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
              SSO, Outlook calendar, SharePoint, Bookings, and more
            </p>
          </div>
        </div>

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
            { name: "SSO Login", desc: "Sign in with Microsoft", ready: true },
            { name: "Outlook Calendar", desc: "Work order → calendar event sync", ready: !!status?.calendar_sync },
            { name: "Teams Notifications", desc: "Job completions, payments, quotes", ready: !!status?.teams_webhook },
            { name: "SharePoint Storage", desc: "Inspection reports, contracts", ready: !!status?.sharepoint },
            { name: "Email Parsing", desc: "Auto-create leads from inbox", ready: !!status?.email_monitoring },
            { name: "Bookings", desc: "Self-service scheduling via Microsoft", ready: !!status?.bookings },
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

      {/* Microsoft Bookings */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary">Microsoft Bookings</h3>
          <button
            onClick={() => setShowBookings(!showBookings)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {showBookings ? "Hide Details" : "Show Details"}
          </button>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Customers can self-schedule appointments via Microsoft Bookings. Appointments auto-sync to CRM work orders every 10 minutes.
        </p>
        {status?.bookings ? (
          <BookingsDetails expanded={showBookings} />
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-sm text-amber-700">
              Not configured. Set <code className="bg-amber-500/10 px-1 rounded">MS365_BOOKING_BUSINESS_ID</code> in Railway to enable.
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Create a Booking business in Microsoft 365 Admin Center first, then add the business ID.
            </p>
          </div>
        )}
      </div>

      {/* Teams Test */}
      {status?.teams_webhook && (
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

function BookingsDetails({ expanded }: { expanded: boolean }) {
  const { data: bookingsStatus } = useBookingsStatus();
  const { data: servicesData } = useBookingsServices();
  const { data: staffData } = useBookingsStaff();
  const syncNow = useBookingsSyncNow();

  if (!expanded) {
    return (
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
          Active
        </span>
        <span className="text-sm text-text-secondary">
          {bookingsStatus?.business_name || "Connected"}
        </span>
        {bookingsStatus?.public_url && (
          <a
            href={bookingsStatus.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#0078d4] hover:underline ml-auto"
          >
            Open Booking Page
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-bg-hover">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {bookingsStatus?.business_name || "Loading..."}
          </p>
          <p className="text-xs text-text-secondary">
            Business ID: {bookingsStatus?.business_id?.slice(0, 12)}...
          </p>
        </div>
        <div className="flex gap-2">
          {bookingsStatus?.public_url && (
            <a
              href={bookingsStatus.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0078d4] rounded-lg hover:bg-[#106ebe] transition-colors"
            >
              Open Booking Page
            </a>
          )}
          <button
            onClick={() => {
              syncNow.mutate(undefined, {
                onSuccess: () => toastSuccess("Bookings sync triggered"),
                onError: () => toastError("Sync failed"),
              });
            }}
            disabled={syncNow.isPending}
            className="px-3 py-1.5 text-xs font-medium text-text-primary border border-border rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            {syncNow.isPending ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Services */}
      {servicesData?.services && servicesData.services.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase mb-2">Services</p>
          <div className="space-y-1">
            {servicesData.services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-bg-hover text-sm">
                <span className="text-text-primary">{s.name}</span>
                <span className="text-text-secondary">
                  {s.duration} {s.price ? `· $${s.price}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff */}
      {staffData?.staff && staffData.staff.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase mb-2">Staff Members</p>
          <div className="space-y-1">
            {staffData.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-bg-hover text-sm">
                <span className="text-text-primary">{s.display_name}</span>
                <span className="text-text-secondary">{s.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-secondary">
        Appointments from Microsoft Bookings are automatically synced to CRM work orders every 10 minutes.
        New customers are auto-created when matched by email.
      </p>
    </div>
  );
}
