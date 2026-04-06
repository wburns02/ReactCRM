import { useCallMapStore } from "./callMapStore";
import { FullMap } from "./components/FullMap";
import { ZoneIndicator } from "./components/ZoneIndicator";
import { DriveTimeChip } from "./components/DriveTimeChip";
import { LocationSource } from "./components/LocationSource";
import { CustomerInfoCard } from "./components/CustomerInfoCard";
import { TranscriptHighlight } from "./components/TranscriptHighlight";
import { X } from "lucide-react";

export function CallMapPanel() {
  const { location, nearbyJobs, isExpanded, setExpanded } = useCallMapStore();

  if (!isExpanded || !location) return null;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">Caller Location</h3>
        <button
          onClick={() => setExpanded(false)}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Map */}
      <div className="min-h-[300px] flex-1">
        <FullMap lat={location.lat} lng={location.lng} nearbyJobs={nearbyJobs} />
      </div>

      {/* Info panel */}
      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <ZoneIndicator zone={location.zone} />
          <DriveTimeChip minutes={location.drive_minutes} />
        </div>

        <div className="text-sm font-medium text-foreground">
          {location.address_text}
        </div>

        {location.customer_id && (
          <CustomerInfoCard
            customerId={location.customer_id}
            addressText={location.address_text}
          />
        )}

        {location.transcript_excerpt && (
          <TranscriptHighlight text={location.transcript_excerpt} />
        )}

        <LocationSource
          source={location.source}
          excerpt={location.source === "transcript" ? undefined : location.transcript_excerpt}
        />

        {/* Nearby jobs list */}
        {nearbyJobs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-600">
              {nearbyJobs.length} Active Job{nearbyJobs.length !== 1 ? "s" : ""} This Week
            </div>
            {nearbyJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs"
              >
                <div>
                  <span className="font-medium">{job.customer_name}</span>
                  {job.scheduled_date && (
                    <span className="ml-1 text-muted-foreground">
                      &mdash;{" "}
                      {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" },
                      )}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">{job.distance_miles} mi</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
