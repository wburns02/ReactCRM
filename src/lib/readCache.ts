/**
 * Offline read cache for tech portal data.
 * Stores successful API responses in IndexedDB appState with a TTL.
 * Serves cached data when the device is offline or the API is unreachable.
 */
import { setAppState, getAppState } from "./db";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY_PREFIX = "readCache:";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Cache a successful API response.
 * Call this after a successful fetch.
 */
export async function cacheRead<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    await setAppState<CacheEntry<T>>(CACHE_KEY_PREFIX + key, entry);
  } catch {
    // Never throw — caching is best-effort
  }
}

/**
 * Get a cached response if it exists and hasn't expired.
 * Returns null if not cached or expired.
 */
export async function getCachedRead<T>(key: string): Promise<T | null> {
  try {
    const entry = await getAppState<CacheEntry<T>>(CACHE_KEY_PREFIX + key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Build a stable cache key from a URL and optional params object.
 * Params are sorted so key is order-independent.
 */
export function buildCacheKey(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return url;
  const parts = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${params[k]}`);
  return parts.length > 0 ? `${url}?${parts.join("&")}` : url;
}
