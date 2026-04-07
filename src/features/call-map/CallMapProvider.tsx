import { useEffect, useRef, type ReactNode } from "react";
import { useCallMapStore } from "./callMapStore";
import { CallMapFloater } from "./CallMapFloater";
import { apiClient } from "@/api/client";
import type { DetectedLocation, NearbyJob } from "./types";

interface CallMapProviderProps {
  children: ReactNode;
}

export function CallMapProvider({ children }: CallMapProviderProps) {
  const { setLocation, setNearbyJobs, setActiveCallSid, activeCallSid } =
    useCallMapStore();
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch nearby jobs when location is detected
  const location = useCallMapStore((s) => s.location);
  useEffect(() => {
    if (!location) return;
    const fetchNearbyJobs = async () => {
      try {
        const { data } = await apiClient.get<NearbyJob[]>("/work-orders/nearby", {
          params: { lat: location.lat, lng: location.lng, radius_miles: 30 },
        });
        setNearbyJobs(data);
      } catch {
        // Silent failure - nearby jobs are nice-to-have
      }
    };
    fetchNearbyJobs();
  }, [location?.lat, location?.lng, setNearbyJobs]);

  // Connect to call transcript WS when a call is active
  useEffect(() => {
    if (!activeCallSid) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "";
    const wsBase = apiBase
      .replace(/\/api\/v2$/, "")
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
    const wsUrl = `${wsBase}/ws/call-transcript/${activeCallSid}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "location_detected" && msg.data) {
          const loc: DetectedLocation = msg.data;
          setLocation(loc);
        }
      } catch {
        // Not JSON or malformed
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeCallSid, setLocation]);

  // Fallback: look up caller location from CRM customer database
  const callerNumber = useCallMapStore((s) => s.callerNumber);
  useEffect(() => {
    if (!activeCallSid || !callerNumber) return;
    // Don't overwrite if WS already delivered a location
    const currentLoc = useCallMapStore.getState().location;
    if (currentLoc && currentLoc.confidence >= 0.9) return;

    const lookupCaller = async () => {
      try {
        const { data } = await apiClient.get("/customers", {
          params: { search: callerNumber, page_size: 1 },
        });
        const customer = data?.items?.[0];
        if (customer?.latitude && customer?.longitude) {
          let zone: "core" | "extended" | "outside" = "outside";
          let driveMinutes = 0;
          try {
            const { data: zoneData } = await apiClient.get(
              "/service-markets/nashville/zone-check",
              { params: { lat: customer.latitude, lng: customer.longitude } },
            );
            zone = zoneData.zone;
            driveMinutes = zoneData.drive_minutes;
          } catch {}

          const addr = [customer.address_line1, customer.city, customer.state]
            .filter(Boolean)
            .join(", ");

          setLocation({
            lat: Number(customer.latitude),
            lng: Number(customer.longitude),
            source: "customer_record",
            address_text: addr || "Customer location",
            zone,
            drive_minutes: driveMinutes,
            customer_id: customer.id,
            confidence: 0.95,
            transcript_excerpt: "",
          });
        }
      } catch {
        // Silent — best-effort fallback
      }
    };

    const timer = setTimeout(lookupCaller, 2000);
    return () => clearTimeout(timer);
  }, [activeCallSid, callerNumber, setLocation]);

  return (
    <>
      {children}
      <CallMapFloater />
    </>
  );
}
