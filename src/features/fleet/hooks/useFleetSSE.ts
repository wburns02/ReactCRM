import { useEffect, useRef } from "react";
import { useFleetStore } from "../stores/fleetStore.ts";
import type { Vehicle } from "../types.ts";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * Hook that connects to the SSE endpoint for real-time vehicle updates.
 * Falls back to polling if SSE connection fails.
 */
export function useFleetSSE() {
  const setVehicles = useFleetStore((s) => s.setVehicles);
  const setSseConnected = useFleetStore((s) => s.setSseConnected);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    function connect() {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // SSE doesn't support custom headers natively.
      // Pass token as query parameter (backend needs to accept this)
      // For now, use the REST endpoint with polling as primary,
      // and SSE as enhancement when CORS + auth works.
      const url = `${API_BASE}/samsara/stream?token=${encodeURIComponent(token!)}`;

      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.addEventListener("vehicles", (event) => {
          try {
            const vehicles: Vehicle[] = JSON.parse(event.data);
            setVehicles(vehicles);
            setSseConnected(true);
            retryCountRef.current = 0;
          } catch (e) {
            console.warn("[Fleet SSE] Failed to parse vehicle data:", e);
          }
        });

        es.addEventListener("connected", () => {
          setSseConnected(true);
          retryCountRef.current = 0;
        });

        es.addEventListener("heartbeat", () => {
          // Connection alive, no action needed
        });

        es.onerror = () => {
          setSseConnected(false);
          es.close();
          eventSourceRef.current = null;

          // Exponential backoff retry: 1s, 2s, 4s, 8s, max 30s
          const delay = Math.min(
            1000 * Math.pow(2, retryCountRef.current),
            30000,
          );
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch {
        // EventSource constructor failed — SSE not supported or URL invalid
        setSseConnected(false);
      }
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      setSseConnected(false);
    };
  }, [setVehicles, setSseConnected]);
}
