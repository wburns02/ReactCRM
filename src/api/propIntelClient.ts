import axios, { type AxiosInstance } from "axios";

/**
 * Property Intelligence API client
 * Connects to T430 on-premise server via Tailscale Funnel
 * Uses API key auth (not cookies) since it's a separate service
 */

const PROPINTEL_API_URL =
  import.meta.env.VITE_PROPINTEL_API_URL ||
  "https://poweredge-t430.tailad2d5f.ts.net:8100";

const PROPINTEL_API_KEY =
  import.meta.env.VITE_PROPINTEL_API_KEY || "msp-propintel-2026-r730";

export const propIntelClient: AxiosInstance = axios.create({
  baseURL: PROPINTEL_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": PROPINTEL_API_KEY,
  },
  timeout: 30_000,
});

/**
 * Check if Property Intelligence API is configured
 * Returns false if no API URL or key is set
 */
export function isPropIntelConfigured(): boolean {
  return !!(PROPINTEL_API_URL && PROPINTEL_API_KEY);
}
