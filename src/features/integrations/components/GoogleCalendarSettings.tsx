import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useIntegrationSettings } from "@/api/hooks/useMarketingHub.ts";

/**
 * Google Calendar integration settings
 */
export function GoogleCalendarSettings() {
  const { data: settings } = useIntegrationSettings();
  const isConfigured = settings?.integrations?.google_calendar?.configured;
  const calendarId = settings?.integrations?.google_calendar?.calendar_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {isConfigured ? (
                <p className="text-sm text-text-secondary">
                  Connected — Calendar: {calendarId}
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
              Google Calendar is connected. Work orders and bookings sync to your calendar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Setup Instructions</h3>
              <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
                <li>Go to <strong>Google Calendar</strong> &rarr; Settings &rarr; select your calendar</li>
                <li>Scroll to <strong>Integrate calendar</strong> and copy the Calendar ID</li>
                <li>Create a service account in Google Cloud Console with Calendar API access</li>
                <li>Share your calendar with the service account email</li>
                <li>Set these environment variables on Railway:</li>
              </ol>
              <div className="bg-bg-body p-3 rounded font-mono text-xs space-y-1 mt-3">
                <p>GOOGLE_CALENDAR_ID=your-calendar@group.calendar.google.com</p>
                <p>GOOGLE_CALENDAR_CREDENTIALS_JSON=&lt;base64-encoded JSON&gt;</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-1">What you get</h4>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>Two-way sync between CRM schedule and Google Calendar</li>
                <li>Work orders and bookings auto-create calendar events</li>
                <li>Technicians see jobs on their personal Google Calendar</li>
                <li>Schedule conflicts detected automatically</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
