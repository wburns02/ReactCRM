import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { apiClient } from "../client";
import {
  storeSessionToken,
  clearSessionToken,
  clearSessionState,
  getSessionToken,
} from "@/lib/security";

/**
 * API Client Security Tests
 *
 * Tests interceptor behavior for CSRF tokens, authorization headers,
 * correlation IDs, auth error handling, and response security.
 */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api/v2";

/** Helper to clear all auth/session state */
function clearAllState() {
  sessionStorage.clear();
  localStorage.clear();
  // Clear cookies
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

/**
 * Save and restore window.location safely.
 * Tests that need to mock location must call this before mutating it,
 * and the returned restore function must be called in afterEach.
 */
function saveLocation() {
  const original = window.location;
  return () => {
    Object.defineProperty(window, "location", {
      value: original,
      writable: true,
      configurable: true,
    });
  };
}

describe("API Client Security", () => {
  let restoreLocation: (() => void) | null = null;

  beforeEach(() => {
    clearAllState();
    restoreLocation = null;
  });

  afterEach(() => {
    if (restoreLocation) {
      restoreLocation();
      restoreLocation = null;
    }
    clearAllState();
    vi.restoreAllMocks();
  });

  // ============================================
  // CSRF Token Handling
  // ============================================
  describe("CSRF token on requests", () => {
    it("attaches X-CSRF-Token header to POST requests when cookie is set", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.post(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      document.cookie = "csrf_token=csrf-post-token; path=/";
      await apiClient.post("/test-csrf", { data: "test" });

      expect(capturedHeaders["x-csrf-token"]).toBe("csrf-post-token");
    });

    it("attaches X-CSRF-Token header to PATCH requests", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.patch(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      document.cookie = "csrf_token=csrf-patch-token; path=/";
      await apiClient.patch("/test-csrf", { data: "test" });

      expect(capturedHeaders["x-csrf-token"]).toBe("csrf-patch-token");
    });

    it("attaches X-CSRF-Token header to DELETE requests", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.delete(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      document.cookie = "csrf_token=csrf-delete-token; path=/";
      await apiClient.delete("/test-csrf");

      expect(capturedHeaders["x-csrf-token"]).toBe("csrf-delete-token");
    });

    it("attaches X-CSRF-Token header to PUT requests", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.put(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      document.cookie = "csrf_token=csrf-put-token; path=/";
      await apiClient.put("/test-csrf", { data: "test" });

      expect(capturedHeaders["x-csrf-token"]).toBe("csrf-put-token");
    });

    it("does NOT attach X-CSRF-Token header to GET requests", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      document.cookie = "csrf_token=should-not-appear; path=/";
      await apiClient.get("/test-csrf");

      expect(capturedHeaders["x-csrf-token"]).toBeUndefined();
    });

    it("handles missing CSRF cookie gracefully for POST requests", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.post(`${API_BASE}/test-csrf`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      // No CSRF cookie set
      await apiClient.post("/test-csrf", { data: "test" });

      expect(capturedHeaders["x-csrf-token"]).toBeUndefined();
    });
  });

  // ============================================
  // Authorization Header
  // ============================================
  describe("Authorization header", () => {
    it("sets Bearer token from stored session token", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-auth`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      storeSessionToken("jwt-session-token-123");
      await apiClient.get("/test-auth");

      expect(capturedHeaders["authorization"]).toBe(
        "Bearer jwt-session-token-123",
      );
    });

    it("does not set Authorization header when no session token exists", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-auth`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      // No token stored
      await apiClient.get("/test-auth");

      expect(capturedHeaders["authorization"]).toBeUndefined();
    });

    it("does not override an existing Authorization header", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-auth`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      storeSessionToken("session-token");
      await apiClient.get("/test-auth", {
        headers: { Authorization: "Bearer custom-token" },
      });

      expect(capturedHeaders["authorization"]).toBe("Bearer custom-token");
    });
  });

  // ============================================
  // Correlation and Request IDs
  // ============================================
  describe("correlation and request IDs", () => {
    it("sets X-Correlation-ID on every request", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-correlation`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get("/test-correlation");

      expect(capturedHeaders["x-correlation-id"]).toBeDefined();
      expect(capturedHeaders["x-correlation-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("sets X-Request-ID on every request", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-reqid`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get("/test-reqid");

      expect(capturedHeaders["x-request-id"]).toBeDefined();
      expect(capturedHeaders["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("generates unique X-Request-ID per request", async () => {
      const requestIds: string[] = [];

      server.use(
        http.get(`${API_BASE}/test-unique`, ({ request }) => {
          requestIds.push(
            request.headers.get("x-request-id") || "",
          );
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get("/test-unique");
      await apiClient.get("/test-unique");
      await apiClient.get("/test-unique");

      expect(requestIds).toHaveLength(3);
      // All three should be unique UUIDs
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);
    });

    it("uses same X-Correlation-ID across multiple requests (session-scoped)", async () => {
      const correlationIds: string[] = [];

      server.use(
        http.get(`${API_BASE}/test-session-corr`, ({ request }) => {
          correlationIds.push(
            request.headers.get("x-correlation-id") || "",
          );
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get("/test-session-corr");
      await apiClient.get("/test-session-corr");

      expect(correlationIds).toHaveLength(2);
      expect(correlationIds[0]).toBe(correlationIds[1]);
    });
  });

  // ============================================
  // Entity ID Header
  // ============================================
  describe("X-Entity-ID header", () => {
    it("sends selected entity ID when set in localStorage", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-entity`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      localStorage.setItem("selected_entity_id", "entity-42");
      await apiClient.get("/test-entity");

      expect(capturedHeaders["x-entity-id"]).toBe("entity-42");
    });

    it("does not send X-Entity-ID when not set", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${API_BASE}/test-no-entity`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.get("/test-no-entity");

      expect(capturedHeaders["x-entity-id"]).toBeUndefined();
    });
  });

  // ============================================
  // Credentials (withCredentials)
  // ============================================
  describe("withCredentials", () => {
    it("has withCredentials enabled for cookie-based auth", () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });
  });

  // ============================================
  // XSS in API Responses
  // ============================================
  describe("XSS in API responses", () => {
    it("returns script tags in response data as-is (caller must sanitize)", async () => {
      server.use(
        http.get(`${API_BASE}/test-xss-response`, () => {
          return HttpResponse.json({
            name: '<script>alert("XSS")</script>',
            description: '<img onerror="alert(1)" src="x">',
          });
        }),
      );

      const response = await apiClient.get("/test-xss-response");

      // API client does not sanitize responses - that's the rendering layer's job
      // But we verify the data arrives intact for the caller to sanitize
      expect(response.data.name).toBe('<script>alert("XSS")</script>');
      expect(response.data.description).toBe(
        '<img onerror="alert(1)" src="x">',
      );
    });

    it("handles response with encoded HTML entities", async () => {
      server.use(
        http.get(`${API_BASE}/test-encoded-response`, () => {
          return HttpResponse.json({
            content: "&lt;script&gt;alert(1)&lt;/script&gt;",
          });
        }),
      );

      const response = await apiClient.get("/test-encoded-response");
      expect(response.data.content).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });
  });

  // ============================================
  // 401 Response Handling
  // ============================================
  describe("401 response - auth refresh flow", () => {
    it("attempts token refresh on 401 before failing", async () => {
      let refreshCalled = false;

      server.use(
        http.get(`${API_BASE}/protected-resource`, () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
          );
        }),
        http.post(`${API_BASE}/auth/refresh`, () => {
          refreshCalled = true;
          // Refresh also fails
          return HttpResponse.json(
            { error: "Refresh failed" },
            { status: 401 },
          );
        }),
      );

      // Save and mock window.location to prevent actual navigation
      restoreLocation = saveLocation();
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: window.location.href, pathname: "/customers", search: "" },
        writable: true,
        configurable: true,
      });

      await expect(
        apiClient.get("/protected-resource"),
      ).rejects.toThrow();

      expect(refreshCalled).toBe(true);
    });

    it("retries original request after successful refresh", async () => {
      let callCount = 0;

      server.use(
        http.get(`${API_BASE}/retry-after-refresh`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { error: "Unauthorized" },
              { status: 401 },
            );
          }
          return HttpResponse.json({ data: "success" });
        }),
        http.post(`${API_BASE}/auth/refresh`, () => {
          return HttpResponse.json({ ok: true });
        }),
      );

      // The retry-after-refresh endpoint is not in the optional list,
      // but the retry logic uses apiClient.request(error.config) which
      // will have the full URL. We need to make sure window.location
      // isn't on a public page so the 401 handler tries refresh.
      // Default jsdom pathname is "/" which is not in the public paths list,
      // so this should work without location mocking.

      const response = await apiClient.get("/retry-after-refresh");

      expect(callCount).toBe(2);
      expect(response.data).toEqual({ data: "success" });
    });

    it("skips auth handling for optional endpoints (e.g., /auth/me)", async () => {
      server.use(
        http.get(`${API_BASE}/auth/me`, () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
          );
        }),
      );

      // Should reject without trying refresh or redirect
      await expect(apiClient.get("/auth/me")).rejects.toThrow();
    });

    it("skips auth handling for /roles endpoint", async () => {
      server.use(
        http.get(`${API_BASE}/roles`, () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
          );
        }),
      );

      await expect(apiClient.get("/roles")).rejects.toThrow();
    });

    it("skips auth redirect on public pages", async () => {
      server.use(
        http.get(`${API_BASE}/some-api`, () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
          );
        }),
      );

      // Simulate being on a public page
      restoreLocation = saveLocation();
      Object.defineProperty(window, "location", {
        value: { ...window.location, pathname: "/home", href: "http://localhost:3000/home", search: "" },
        writable: true,
        configurable: true,
      });

      await expect(apiClient.get("/some-api")).rejects.toThrow();
      // Should not redirect (we can verify no error about navigation)
    });

    it("clears session state on auth failure after refresh fails", async () => {
      // Set up authenticated state
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() }),
      );

      server.use(
        http.get(`${API_BASE}/auth-fail-clear`, () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
          );
        }),
        http.post(`${API_BASE}/auth/refresh`, () => {
          return HttpResponse.json(
            { error: "Refresh failed" },
            { status: 401 },
          );
        }),
      );

      restoreLocation = saveLocation();
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: "http://localhost:3000/dashboard", pathname: "/dashboard", search: "" },
        writable: true,
        configurable: true,
      });

      await expect(
        apiClient.get("/auth-fail-clear"),
      ).rejects.toThrow();

      // Session state should be cleared
      const state = sessionStorage.getItem("session_state");
      if (state) {
        const parsed = JSON.parse(state);
        expect(parsed.isAuthenticated).toBe(false);
      }
    });
  });

  // ============================================
  // 403 CSRF Response Handling
  // ============================================
  describe("403 CSRF response - page reload", () => {
    it("dispatches csrf:missing event on CSRF 403", async () => {
      const csrfHandler = vi.fn();
      const handler = (e: Event) => csrfHandler(e);
      window.addEventListener("csrf:missing", handler);

      // Save location and mock reload
      restoreLocation = saveLocation();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, reload: reloadMock, pathname: "/dashboard" },
        writable: true,
        configurable: true,
      });

      server.use(
        http.post(`${API_BASE}/test-csrf-fail`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Forbidden",
              status: 403,
              detail: "CSRF token invalid",
              code: "AUTH_004",
              timestamp: new Date().toISOString(),
              trace_id: "csrf-trace-1",
            },
            { status: 403 },
          );
        }),
      );

      document.cookie = "csrf_token=expired; path=/";

      await expect(
        apiClient.post("/test-csrf-fail", { data: "test" }),
      ).rejects.toThrow();

      expect(csrfHandler).toHaveBeenCalled();
      expect(reloadMock).toHaveBeenCalled();

      window.removeEventListener("csrf:missing", handler);
    });

    it("triggers reload on legacy CSRF error (string matching)", async () => {
      restoreLocation = saveLocation();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, reload: reloadMock, pathname: "/test" },
        writable: true,
        configurable: true,
      });

      server.use(
        http.post(`${API_BASE}/test-csrf-legacy`, () => {
          return HttpResponse.json(
            { detail: "CSRF verification failed" },
            { status: 403 },
          );
        }),
      );

      await expect(
        apiClient.post("/test-csrf-legacy", {}),
      ).rejects.toThrow();

      expect(reloadMock).toHaveBeenCalled();
    });

    it("does NOT reload for non-CSRF 403 errors", async () => {
      restoreLocation = saveLocation();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, reload: reloadMock, pathname: "/test" },
        writable: true,
        configurable: true,
      });

      server.use(
        http.post(`${API_BASE}/test-403-nocsrf`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Forbidden",
              status: 403,
              detail: "You do not have permission",
              code: "AUTH_002",
              timestamp: new Date().toISOString(),
              trace_id: "perm-trace-1",
            },
            { status: 403 },
          );
        }),
      );

      await expect(
        apiClient.post("/test-403-nocsrf", {}),
      ).rejects.toThrow();

      expect(reloadMock).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // 5xx Error Reporting to Sentry
  // ============================================
  describe("5xx error reporting", () => {
    it("rejects with error on 500 response", async () => {
      server.use(
        http.get(`${API_BASE}/test-500`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Server Error",
              status: 500,
              detail: "Internal server error",
              code: "SRV_001",
              timestamp: new Date().toISOString(),
              trace_id: "500-trace",
            },
            { status: 500 },
          );
        }),
      );

      await expect(apiClient.get("/test-500")).rejects.toThrow();
    });
  });
});
