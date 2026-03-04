/**
 * SOC API Client — connects to the Security Operations Center backend on R730.
 * In production, routes through /soc-api/ proxy on the frontend server to avoid
 * Chrome Private Network Access blocking of Tailscale CGNAT IPs.
 * In dev, connects directly to the SOC API via Tailscale.
 */
import axios from "axios";

const DIRECT_SOC_URL = import.meta.env.VITE_SOC_API_URL || "https://soc-api.tailad2d5f.ts.net";
const SOC_API_KEY = import.meta.env.VITE_SOC_API_KEY || "";

// In production (react.ecbtx.com), use the same-origin proxy to avoid PNA issues.
// In dev (localhost:5173), use the direct URL.
const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
const SOC_API_URL = isProduction ? "/soc-api" : DIRECT_SOC_URL;

export const socClient = axios.create({
  baseURL: SOC_API_URL,
  headers: {
    "Content-Type": "application/json",
    ...(SOC_API_KEY ? { Authorization: `Bearer ${SOC_API_KEY}` } : {}),
  },
  timeout: 30000,
});

/**
 * Stream chat from the SOC AI — returns an async generator of tokens.
 */
export async function* streamSocChat(query: string, mode = "auto") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SOC_API_KEY) headers["Authorization"] = `Bearer ${SOC_API_KEY}`;

  const resp = await fetch(`${SOC_API_URL}/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, mode, stream: true }),
  });
  if (!resp.ok) throw new Error(`SOC Chat ${resp.status}`);
  const reader = resp.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data);
        } catch {
          yield { token: data };
        }
      }
    }
  }
}
