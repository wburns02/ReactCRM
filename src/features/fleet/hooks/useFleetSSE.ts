import { useEffect, useRef } from "react";
import { getSessionToken } from "@/lib/security.ts";
import { useFleetStore } from "../stores/fleetStore.ts";
import type { Vehicle } from "../types.ts";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

const MAX_SSE_RETRIES = 5;

/**
 * Hook that connects to the SSE endpoint for real-time vehicle updates.
 * Falls back gracefully to polling if SSE connection fails (e.g. auth issues).
 *
 * EventSource cannot send Authorization headers, so the token is passed as
 * a query parameter. The backend SSE endpoint must accept this.
 * After MAX_SSE_RETRIES failures, SSE is disabled and polling takes over.
 */
export function useFleetSSE() {
  const updateVehicles = useFleetStore((s) => s.updateVehicles);
  const setSseConnected = useFleetStore((s) => s.setSseConnected);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const gaveUpRef = useRef(false);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    function connect() {
      // Don't reconnect if we've given up
      if (gaveUpRef.current) return;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const url = `${API_BASE}/samsara/stream?token=${encodeURIComponent(token!)}`;

      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.addEventListener("vehicles", (event) => {
          try {
            const vehicles: Vehicle[] = JSON.parse(event.data);
            updateVehicles(vehicles);
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

          if (retryCountRef.current >= MAX_SSE_RETRIES) {
            console.warn(
              "[Fleet SSE] Max retries reached, falling back to polling only",
            );
            gaveUpRef.current = true;
            return;
          }

          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const delay = Math.min(
            2000 * Math.pow(2, retryCountRef.current),
            32000,
          );
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch {
        // EventSource constructor failed
        setSseConnected(false);
        gaveUpRef.current = true;
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
  }, [updateVehicles, setSseConnected]);
}
