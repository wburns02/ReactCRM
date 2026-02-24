/**
 * Page view & session duration tracking hook.
 *
 * Fires a lightweight POST to the activity tracker on every route change.
 * Tracks session duration via beforeunload + periodic heartbeat.
 * All calls are fire-and-forget — never blocks the UI.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "@/api/client";

const SESSION_KEY = "msp_session_id";
const SESSION_START_KEY = "msp_session_start";
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
  }
  return id;
}

function getSessionDurationSec(): number {
  const start = sessionStorage.getItem(SESSION_START_KEY);
  if (!start) return 0;
  return Math.round((Date.now() - parseInt(start, 10)) / 1000);
}

/** Fire-and-forget POST — swallows all errors */
function track(payload: Record<string, unknown>) {
  apiClient.post("/admin/user-activity/track", payload).catch(() => {});
}

export function usePageTracker() {
  const location = useLocation();
  const prevPath = useRef<string>("");

  // Track page views on route change
  useEffect(() => {
    const path = location.pathname;
    if (path === prevPath.current) return;
    prevPath.current = path;

    track({
      category: "navigation",
      action: "page_view",
      description: path,
      session_id: getSessionId(),
    });
  }, [location.pathname]);

  // Session heartbeat + duration on unload
  useEffect(() => {
    const sessionId = getSessionId();

    const heartbeat = setInterval(() => {
      track({
        category: "session",
        action: "heartbeat",
        description: `duration=${getSessionDurationSec()}s`,
        session_id: sessionId,
      });
    }, HEARTBEAT_INTERVAL_MS);

    const handleUnload = () => {
      const duration = getSessionDurationSec();
      // Use sendBeacon for reliability during page unload
      const url = `${apiClient.defaults.baseURL}/admin/user-activity/track`;
      const blob = new Blob(
        [JSON.stringify({
          category: "session",
          action: "session_end",
          description: `duration=${duration}s`,
          session_id: sessionId,
        })],
        { type: "application/json" }
      );
      navigator.sendBeacon(url, blob);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);
}
