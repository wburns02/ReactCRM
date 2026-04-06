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

  return (
    <>
      {children}
      <CallMapFloater />
    </>
  );
}
