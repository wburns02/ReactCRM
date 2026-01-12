/**
 * Security Module
 * HTTP-only cookie auth, CSRF protection, session management
 *
 * SECURITY ARCHITECTURE:
 * - Auth tokens stored in HTTP-only, Secure, SameSite=Strict cookies (set by backend)
 * - CSRF token stored in regular cookie, read by JS and sent in header
 * - No sensitive data in localStorage (XSS-safe)
 * - Session validation via /auth/me endpoint
 */

// ============================================
// CSRF Protection
// ============================================

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Get CSRF token from cookie
 * The backend sets this as a regular (non-HTTP-only) cookie
 * We read it and send it in the header for state-changing requests
 */
export function getCSRFToken(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCSRF(method: string): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS", "TRACE"];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Get CSRF header object for axios requests
 */
export function getCSRFHeader(): Record<string, string> {
  const token = getCSRFToken();
  if (token) {
    return { [CSRF_HEADER_NAME]: token };
  }
  return {};
}

// ============================================
// Session Management
// ============================================

// Session state (not the token itself, just metadata)
interface SessionState {
  isAuthenticated: boolean;
  lastValidated: number;
  userId?: string;
}

const SESSION_KEY = "session_state";
const SESSION_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Get session state from sessionStorage (not the token!)
 * This is safe to store client-side as it's just metadata
 */
export function getSessionState(): SessionState | null {
  try {
    const state = sessionStorage.getItem(SESSION_KEY);
    if (state) {
      return JSON.parse(state);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Update session state
 */
export function setSessionState(state: SessionState): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

/**
 * Clear session state
 */
export function clearSessionState(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Check if we need to revalidate the session
 */
export function needsRevalidation(): boolean {
  const state = getSessionState();
  if (!state) return true;
  if (!state.isAuthenticated) return true;

  const now = Date.now();
  return now - state.lastValidated > SESSION_VALIDATION_INTERVAL;
}

/**
 * Mark session as validated
 */
export function markSessionValidated(userId?: string): void {
  setSessionState({
    isAuthenticated: true,
    lastValidated: Date.now(),
    userId,
  });
}

/**
 * Mark session as invalid
 */
export function markSessionInvalid(): void {
  setSessionState({
    isAuthenticated: false,
    lastValidated: Date.now(),
  });
}

// ============================================
// Cookie Utilities
// ============================================

/**
 * Check if a specific cookie exists (not HTTP-only cookies)
 */
export function hasCookie(name: string): boolean {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(name + "="));
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ============================================
// Security Event Handling
// ============================================

export type SecurityEventType =
  | "session:expired"
  | "session:invalid"
  | "csrf:missing"
  | "auth:logout";

/**
 * Dispatch a security event
 */
export function dispatchSecurityEvent(
  type: SecurityEventType,
  detail?: Record<string, unknown>,
): void {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

/**
 * Subscribe to security events
 */
export function onSecurityEvent(
  type: SecurityEventType,
  handler: (event: CustomEvent) => void,
): () => void {
  const listener = (e: Event) => handler(e as CustomEvent);
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

// ============================================
// Migration Helpers
// ============================================

// Legacy token key (to be removed after migration)
const LEGACY_TOKEN_KEY = "auth_token";

/**
 * Check if legacy token exists (for migration)
 */
export function hasLegacyToken(): boolean {
  return !!localStorage.getItem(LEGACY_TOKEN_KEY);
}

/**
 * Get legacy token (for migration)
 */
export function getLegacyToken(): string | null {
  return localStorage.getItem(LEGACY_TOKEN_KEY);
}

/**
 * Clear legacy token (after successful cookie auth)
 */
export function clearLegacyToken(): void {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/**
 * Full migration cleanup - removes all legacy auth data
 */
export function cleanupLegacyAuth(): void {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  // Also clear any other legacy keys
  localStorage.removeItem("token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("access_token");
}

// ============================================
// Security Headers
// ============================================

/**
 * Get all security headers for API requests
 */
export function getSecurityHeaders(method: string): Record<string, string> {
  const headers: Record<string, string> = {};

  // Add CSRF token for state-changing requests
  if (requiresCSRF(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return headers;
}

// ============================================
// Content Security
// ============================================

/**
 * Sanitize user input to prevent XSS
 * Uses built-in browser APIs for basic sanitization
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Check if URL is safe (same origin or allowed external)
 */
export function isSafeUrl(url: string, allowedOrigins: string[] = []): boolean {
  try {
    const parsed = new URL(url, window.location.origin);

    // Same origin is always safe
    if (parsed.origin === window.location.origin) {
      return true;
    }

    // Check against allowed external origins
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

/**
 * Sanitize redirect URL to prevent open redirect attacks
 */
export function sanitizeRedirectUrl(
  url: string,
  fallback = "/dashboard",
): string {
  // Must start with / for relative URLs
  if (!url.startsWith("/")) {
    return fallback;
  }

  // Prevent protocol-relative URLs
  if (url.startsWith("//")) {
    return fallback;
  }

  // Remove any javascript: or data: schemes that might be encoded
  const decoded = decodeURIComponent(url);
  if (
    decoded.toLowerCase().includes("javascript:") ||
    decoded.toLowerCase().includes("data:")
  ) {
    return fallback;
  }

  return url;
}
