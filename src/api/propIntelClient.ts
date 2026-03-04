import axios, { type AxiosInstance } from "axios";

/**
 * Property Intelligence API client
 * Routes through /propintel/ reverse proxy on the frontend server
 * to avoid Chrome Private Network Access blocking of Tailscale IPs.
 * The server.mjs proxy forwards to T430 via Tailscale Funnel.
 */

const PROPINTEL_API_URL =
  import.meta.env.VITE_PROPINTEL_API_URL || "/propintel";

const PROPINTEL_API_KEY = import.meta.env.VITE_PROPINTEL_API_KEY || "";

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
 * Returns true — proxy is always available via /propintel
 */
export function isPropIntelConfigured(): boolean {
  return true;
}
