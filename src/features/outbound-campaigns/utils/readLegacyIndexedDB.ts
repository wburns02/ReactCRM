import { get as idbGet } from "idb-keyval";

/**
 * Read a Zustand-persisted blob from IndexedDB by key, returning the parsed
 * state object. Returns null if missing or corrupt — migration must never throw.
 */
export async function readLegacyZustandBlob(
  keyName: string,
): Promise<unknown | null> {
  try {
    const raw = await idbGet(keyName);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  } catch (err) {
    console.warn("[outbound] failed to read legacy IndexedDB", err);
    return null;
  }
}
