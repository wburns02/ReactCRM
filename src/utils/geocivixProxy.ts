/**
 * Geocivix URL Proxy Utility
 *
 * Converts direct Geocivix portal URLs to proxy endpoints that authenticate
 * on behalf of the user. This solves the issue where users clicking permit
 * links are redirected to Geocivix portal without authentication.
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Check if a URL is from the Geocivix portal
 */
export function isGeocivixUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("geocivix.com") || url.includes("/secure/");
}

/**
 * Extract project ID from a Geocivix project URL
 * Example: /secure/project/?projectid=387856 -> 387856
 */
function extractProjectId(url: string): string | null {
  const match = url.match(/projectid=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Extract issuance ID from a Geocivix permit URL
 * Example: /secure/permits/?issuanceid=123456 -> 123456
 */
function extractIssuanceId(url: string): string | null {
  const match = url.match(/issuanceid=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Extract viewer ID from a Geocivix document URL
 * Example: /secure/utilities/viewer/?vid=789 -> 789
 */
function extractViewerId(url: string): string | null {
  const match = url.match(/vid=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Convert a Geocivix URL to a proxy URL
 * Returns the original URL if it's not a Geocivix URL or can't be proxied
 */
export function getProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Check if this is a Geocivix URL that needs proxying
  if (!isGeocivixUrl(url)) {
    return url;
  }

  // Try to extract IDs and create proxy URLs
  const projectId = extractProjectId(url);
  if (projectId) {
    return `${API_BASE}/geocivix/proxy/project/${projectId}`;
  }

  const issuanceId = extractIssuanceId(url);
  if (issuanceId) {
    return `${API_BASE}/geocivix/proxy/permit/${issuanceId}`;
  }

  const viewerId = extractViewerId(url);
  if (viewerId) {
    return `${API_BASE}/geocivix/proxy/document/${viewerId}`;
  }

  // Couldn't extract an ID - return original URL
  // (User will still get permission error, but this is a fallback)
  return url;
}

/**
 * Get URL for a permit document (PDF)
 * Uses proxy for Geocivix URLs, direct URL for others
 */
export function getPermitDocumentUrl(
  pdfUrl: string | null | undefined,
): string | null {
  return getProxyUrl(pdfUrl);
}

/**
 * Get URL for viewing the original permit
 * Uses proxy for Geocivix URLs, direct URL for others
 */
export function getPermitViewUrl(
  permitUrl: string | null | undefined,
): string | null {
  return getProxyUrl(permitUrl);
}
