import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Maximize2 } from "lucide-react";
import { useCallMapStore } from "./callMapStore";
import { MiniMap } from "./components/MiniMap";
import { ZoneIndicator } from "./components/ZoneIndicator";
import { DriveTimeChip } from "./components/DriveTimeChip";
import { LocationSource } from "./components/LocationSource";
import { CustomerInfoCard } from "./components/CustomerInfoCard";

export function CallMapFloater() {
  const navigate = useNavigate();
  const { location, nearbyJobs, isVisible, isExpanded, activeCallSid, setVisible, setExpanded } =
    useCallMapStore();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeCallSid && isVisible && location) {
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [activeCallSid, isVisible, location, setVisible]);

  if (!location || !isVisible || isExpanded) return null;

  const handleOpenFullView = () => {
    setExpanded(true);
    setVisible(false);
    navigate("/phone");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
      <div className="flex items-center gap-2 bg-[#1a1a2e] px-3 py-2 text-white">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-semibold">📍 Location Detected</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleOpenFullView}
            className="rounded p-1 hover:bg-white/10"
            title="Open full view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="rounded p-1 hover:bg-white/10"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <MiniMap lat={location.lat} lng={location.lng} nearbyJobs={nearbyJobs} />

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <ZoneIndicator zone={location.zone} />
          <DriveTimeChip minutes={location.drive_minutes} />
        </div>

        <div className="text-sm font-medium text-foreground">
          📍 {location.address_text}
        </div>

        {location.customer_id && (
          <CustomerInfoCard
            customerId={location.customer_id}
            addressText={location.address_text}
          />
        )}

        <LocationSource
          source={location.source}
          excerpt={location.transcript_excerpt}
        />

        {nearbyJobs.length > 0 && (
          <div className="text-xs font-medium text-amber-600">
            {nearbyJobs.length} active job{nearbyJobs.length !== 1 ? "s" : ""} nearby this week
          </div>
        )}

        <button
          onClick={handleOpenFullView}
          className="w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Open Full View →
        </button>
      </div>
    </div>
  );
}
