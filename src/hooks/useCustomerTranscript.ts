import { useState, useEffect, useRef, useCallback } from "react";

export interface TranscriptEntry {
  speaker: "customer";
  text: string;
  isFinal: boolean;
  timestamp: string;
}

interface UseCustomerTranscriptReturn {
  transcripts: TranscriptEntry[];
  isConnected: boolean;
}

/**
 * WebSocket hook for receiving real-time customer voice transcription
 * from the backend Google STT service.
 *
 * Connects to wss://{API_HOST}/ws/call-transcript/{callSid}
 */
export function useCustomerTranscript(callSid?: string): UseCustomerTranscriptReturn {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!callSid) {
      cleanup();
      setTranscripts([]);
      return;
    }

    // Derive WebSocket URL from API URL
    const apiUrl = import.meta.env.VITE_API_URL || "";
    // API URL: https://host/api/v2 -> wss://host/ws/call-transcript/{callSid}
    const baseUrl = apiUrl.replace(/\/api\/v2\/?$/, "");
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/call-transcript/${callSid}`;

    let mounted = true;

    function connect() {
      if (!mounted) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(event.data) as TranscriptEntry | { type: string };
          if ("type" in data && data.type === "pong") return;

          const entry = data as TranscriptEntry;
          if (entry.speaker && entry.text) {
            setTranscripts((prev) => {
              // If interim (not final), replace last interim entry
              if (!entry.isFinal && prev.length > 0 && !prev[prev.length - 1].isFinal) {
                return [...prev.slice(0, -1), entry];
              }
              return [...prev, entry];
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setIsConnected(false);
        // Auto-reconnect after 2s
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted) connect();
        }, 2000);
      };

      ws.onerror = () => {
        // onclose will fire after onerror
      };
    }

    connect();

    // Ping keepalive every 30s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(pingInterval);
      cleanup();
    };
  }, [callSid, cleanup]);

  return { transcripts, isConnected };
}
