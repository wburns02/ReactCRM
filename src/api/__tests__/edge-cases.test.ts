import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { server } from "@/mocks/server";
import { apiClient } from "../client";
import {
  parseError,
  getUserMessage,
  isProblemDetail,
  ErrorCodes,
} from "../errorHandler";
import { AxiosError, AxiosHeaders } from "axios";

/**
 * Edge Case Tests
 *
 * Covers unusual but realistic scenarios: empty responses, malformed JSON,
 * timeouts, large payloads, unicode, null values, missing fields,
 * rate limiting, server errors with retry, and concurrent requests.
 */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api/v2";

/** Helper to create a fake AxiosError with given response data and status */
function makeAxiosError(status: number, data?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers } as AxiosError["config"];
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "Error",
    headers: {},
    config: config!,
    data: data ?? {},
  });
}

describe("Edge Cases", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Empty Response Body
  // ============================================
  describe("empty response body handling", () => {
    it("handles 204 No Content response", async () => {
      server.use(
        http.delete(`${API_BASE}/items/1`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const response = await apiClient.delete("/items/1");
      expect(response.status).toBe(204);
      expect(response.data).toBeFalsy();
    });

    it("handles 200 with empty string body", async () => {
      server.use(
        http.get(`${API_BASE}/empty-body`, () => {
          return new HttpResponse("", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }),
      );

      const response = await apiClient.get("/empty-body");
      expect(response.status).toBe(200);
      expect(response.data).toBe("");
    });

    it("handles 200 with null JSON body", async () => {
      server.use(
        http.get(`${API_BASE}/null-body`, () => {
          return HttpResponse.json(null);
        }),
      );

      const response = await apiClient.get("/null-body");
      expect(response.data).toBeNull();
    });

    it("parseError returns null for error with empty response data", () => {
      const err = new AxiosError("fail", "ERR_BAD_RESPONSE", {
        headers: new AxiosHeaders(),
      } as AxiosError["config"], null, {
        status: 500,
        statusText: "Error",
        headers: {},
        config: { headers: new AxiosHeaders() } as AxiosError["config"],
        data: null,
      });
      // parseError checks error.response?.data which is null
      expect(parseError(err)).toBeNull();
    });
  });

  // ============================================
  // Malformed JSON Response
  // ============================================
  describe("malformed JSON response handling", () => {
    it("returns raw string when server returns invalid JSON (axios silentJSONParsing)", async () => {
      server.use(
        http.get(`${API_BASE}/bad-json`, () => {
          return new HttpResponse("{ this is not valid json }", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      // Axios has silentJSONParsing: true by default, so invalid JSON with 2xx
      // is returned as a raw string rather than throwing
      const response = await apiClient.get("/bad-json");
      expect(typeof response.data).toBe("string");
      expect(response.data).toContain("this is not valid json");
    });

    it("returns raw string for truncated JSON response", async () => {
      server.use(
        http.get(`${API_BASE}/truncated-json`, () => {
          return new HttpResponse('{"name": "test", "items": [1, 2', {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      // Same behavior: axios silentJSONParsing returns raw string on parse failure
      const response = await apiClient.get("/truncated-json");
      expect(typeof response.data).toBe("string");
    });

    it("handles HTML error page returned instead of JSON", async () => {
      server.use(
        http.get(`${API_BASE}/html-error`, () => {
          return new HttpResponse(
            "<html><body><h1>502 Bad Gateway</h1></body></html>",
            {
              status: 502,
              headers: { "Content-Type": "text/html" },
            },
          );
        }),
      );

      await expect(apiClient.get("/html-error")).rejects.toThrow();
    });

    it("isProblemDetail returns false for non-object data", () => {
      expect(isProblemDetail("string")).toBe(false);
      expect(isProblemDetail(42)).toBe(false);
      expect(isProblemDetail(true)).toBe(false);
      expect(isProblemDetail(undefined)).toBe(false);
      expect(isProblemDetail(null)).toBe(false);
      expect(isProblemDetail([])).toBe(false);
    });
  });

  // ============================================
  // Network Timeout
  // ============================================
  describe("network timeout handling", () => {
    it("rejects when request is aborted via signal timeout", async () => {
      server.use(
        http.get(`${API_BASE}/slow-endpoint`, async () => {
          // Delay long enough that the AbortSignal.timeout fires first
          await delay(10_000);
          return HttpResponse.json({ ok: true });
        }),
      );

      // Use AbortSignal.timeout() for reliable timeout behavior in jsdom
      // (axios timeout relies on XHR timeout events which may not fire in jsdom/MSW)
      await expect(
        apiClient.get("/slow-endpoint", {
          signal: AbortSignal.timeout(100),
        }),
      ).rejects.toThrow();
    });

    it("parseError returns null for timeout error (no response)", () => {
      const err = new AxiosError(
        "timeout of 100ms exceeded",
        "ECONNABORTED",
      );
      expect(parseError(err)).toBeNull();
    });

    it("getUserMessage returns error message for timeout", () => {
      const err = new Error("timeout of 100ms exceeded");
      expect(getUserMessage(err)).toBe("timeout of 100ms exceeded");
    });
  });

  // ============================================
  // Very Large Payload
  // ============================================
  describe("very large payload handling", () => {
    it("handles response with many items (10,000 records)", async () => {
      const largeArray = Array.from({ length: 10_000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        email: `item${i + 1}@example.com`,
      }));

      server.use(
        http.get(`${API_BASE}/large-list`, () => {
          return HttpResponse.json(largeArray);
        }),
      );

      const response = await apiClient.get("/large-list");
      expect(response.data).toHaveLength(10_000);
      expect(response.data[0].id).toBe(1);
      expect(response.data[9999].id).toBe(10_000);
    });

    it("handles response with deeply nested objects", async () => {
      // 50 levels of nesting
      let nested: Record<string, unknown> = { value: "leaf" };
      for (let i = 0; i < 50; i++) {
        nested = { child: nested, level: i };
      }

      server.use(
        http.get(`${API_BASE}/deep-nested`, () => {
          return HttpResponse.json(nested);
        }),
      );

      const response = await apiClient.get("/deep-nested");
      expect(response.data.level).toBe(49);
      expect(response.data.child.level).toBe(48);
    });

    it("handles request with large POST body", async () => {
      let receivedSize = 0;

      server.use(
        http.post(`${API_BASE}/large-upload`, async ({ request }) => {
          const body = await request.text();
          receivedSize = body.length;
          return HttpResponse.json({ received: receivedSize });
        }),
      );

      const largePayload = { data: "x".repeat(1_000_000) };
      const response = await apiClient.post("/large-upload", largePayload);

      expect(response.data.received).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Unicode and Special Characters
  // ============================================
  describe("unicode and special characters", () => {
    it("handles unicode characters in response", async () => {
      server.use(
        http.get(`${API_BASE}/unicode-response`, () => {
          return HttpResponse.json({
            name: "Caf\u00e9 \u2603 \uD83C\uDFE0",
            address: "\u4E2D\u6587\u5730\u5740",
            emoji: "\uD83D\uDE00\uD83D\uDE01\uD83D\uDE02",
          });
        }),
      );

      const response = await apiClient.get("/unicode-response");
      expect(response.data.name).toBe("Caf\u00e9 \u2603 \uD83C\uDFE0");
      expect(response.data.address).toBe("\u4E2D\u6587\u5730\u5740");
      expect(response.data.emoji).toBe("\uD83D\uDE00\uD83D\uDE01\uD83D\uDE02");
    });

    it("handles unicode characters in request body", async () => {
      let receivedBody: Record<string, unknown> = {};

      server.use(
        http.post(`${API_BASE}/unicode-request`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ok: true });
        }),
      );

      await apiClient.post("/unicode-request", {
        name: "\u00D1o\u00F1o \u00C9tienne",
        notes: "Meeting at caf\u00E9 \uD83C\uDF75",
      });

      expect(receivedBody.name).toBe("\u00D1o\u00F1o \u00C9tienne");
      expect(receivedBody.notes).toBe("Meeting at caf\u00E9 \uD83C\uDF75");
    });

    it("handles special characters in URL path parameters", async () => {
      server.use(
        http.get(`${API_BASE}/customers/:id`, ({ params }) => {
          // MSW decodes URL params automatically
          return HttpResponse.json({ id: params.id });
        }),
      );

      // URL-encoded special characters - MSW decodes them for the handler
      const response = await apiClient.get(
        `/customers/${encodeURIComponent("user@example.com")}`,
      );
      // MSW returns decoded params
      expect(response.data.id).toBe("user@example.com");
    });

    it("handles newlines and tabs in response strings", async () => {
      server.use(
        http.get(`${API_BASE}/whitespace-response`, () => {
          return HttpResponse.json({
            description: "Line 1\nLine 2\tTabbed",
            notes: "Carriage\r\nReturn",
          });
        }),
      );

      const response = await apiClient.get("/whitespace-response");
      expect(response.data.description).toContain("\n");
      expect(response.data.description).toContain("\t");
      expect(response.data.notes).toContain("\r\n");
    });
  });

  // ============================================
  // Null/Undefined Values in API Responses
  // ============================================
  describe("null/undefined values in API responses", () => {
    it("handles null values in response fields", async () => {
      server.use(
        http.get(`${API_BASE}/nullable-fields`, () => {
          return HttpResponse.json({
            id: 1,
            name: "Test",
            phone: null,
            email: null,
            address: null,
          });
        }),
      );

      const response = await apiClient.get("/nullable-fields");
      expect(response.data.phone).toBeNull();
      expect(response.data.email).toBeNull();
      expect(response.data.address).toBeNull();
    });

    it("handles response that is entirely null", async () => {
      server.use(
        http.get(`${API_BASE}/null-response`, () => {
          return HttpResponse.json(null);
        }),
      );

      const response = await apiClient.get("/null-response");
      expect(response.data).toBeNull();
    });

    it("handles mixed null/valid nested objects", async () => {
      server.use(
        http.get(`${API_BASE}/mixed-nulls`, () => {
          return HttpResponse.json({
            customer: {
              id: 1,
              name: "Test",
              company: null,
              address: {
                street: "123 Main",
                city: null,
                state: "TX",
                zip: null,
              },
            },
          });
        }),
      );

      const response = await apiClient.get("/mixed-nulls");
      expect(response.data.customer.company).toBeNull();
      expect(response.data.customer.address.city).toBeNull();
      expect(response.data.customer.address.street).toBe("123 Main");
    });

    it("handles empty arrays in response", async () => {
      server.use(
        http.get(`${API_BASE}/empty-arrays`, () => {
          return HttpResponse.json({
            items: [],
            results: [],
            total: 0,
          });
        }),
      );

      const response = await apiClient.get("/empty-arrays");
      expect(response.data.items).toEqual([]);
      expect(response.data.results).toEqual([]);
      expect(response.data.total).toBe(0);
    });
  });

  // ============================================
  // Missing Required Fields in Responses
  // ============================================
  describe("missing required fields in responses", () => {
    it("handles response missing expected id field", async () => {
      server.use(
        http.get(`${API_BASE}/missing-id`, () => {
          return HttpResponse.json({
            name: "Test Customer",
            email: "test@example.com",
            // id is missing
          });
        }),
      );

      const response = await apiClient.get("/missing-id");
      expect(response.data.id).toBeUndefined();
      expect(response.data.name).toBe("Test Customer");
    });

    it("handles response with extra unexpected fields", async () => {
      server.use(
        http.get(`${API_BASE}/extra-fields`, () => {
          return HttpResponse.json({
            id: 1,
            name: "Test",
            _internal_debug: true,
            __v: 42,
            $meta: { created: "2026-01-01" },
          });
        }),
      );

      const response = await apiClient.get("/extra-fields");
      expect(response.data.id).toBe(1);
      expect(response.data._internal_debug).toBe(true);
    });

    it("handles response with wrong types for fields", async () => {
      server.use(
        http.get(`${API_BASE}/wrong-types`, () => {
          return HttpResponse.json({
            id: "not-a-number",
            count: "42",
            active: "true",
            tags: "not-an-array",
          });
        }),
      );

      const response = await apiClient.get("/wrong-types");
      // apiClient does not validate types - it passes data through
      expect(response.data.id).toBe("not-a-number");
      expect(response.data.count).toBe("42");
      expect(response.data.active).toBe("true");
    });

    it("parseError wraps response with only detail field", () => {
      const err = makeAxiosError(422, { detail: "Validation failed" });
      const problem = parseError(err);
      expect(problem).not.toBeNull();
      expect(problem!.detail).toBe("Validation failed");
      expect(problem!.code).toBe("UNKNOWN");
    });

    it("parseError wraps response with only message field", () => {
      const err = makeAxiosError(500, { message: "Something broke" });
      const problem = parseError(err);
      expect(problem).not.toBeNull();
      expect(problem!.detail).toBe("Something broke");
    });

    it("parseError wraps response with only error field", () => {
      const err = makeAxiosError(400, { error: "Bad request data" });
      const problem = parseError(err);
      expect(problem).not.toBeNull();
      expect(problem!.detail).toBe("Bad request data");
    });

    it("parseError wraps response with no known detail fields", () => {
      const err = makeAxiosError(500, { unknown: "format" });
      const problem = parseError(err);
      expect(problem).not.toBeNull();
      expect(problem!.detail).toBe("An error occurred");
    });
  });

  // ============================================
  // Rate Limiting (429)
  // ============================================
  describe("rate limiting (429) response handling", () => {
    it("rejects on 429 status", async () => {
      server.use(
        http.get(`${API_BASE}/rate-limited`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Too Many Requests",
              status: 429,
              detail: "Rate limit exceeded",
              code: "BIZ_002",
              timestamp: new Date().toISOString(),
              trace_id: "rate-limit-trace",
              retry_after: 30,
            },
            { status: 429 },
          );
        }),
      );

      await expect(apiClient.get("/rate-limited")).rejects.toThrow();
    });

    it("getUserMessage returns friendly rate limit message with retry_after", () => {
      const err = makeAxiosError(429, {
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded",
        code: ErrorCodes.QUOTA_EXCEEDED,
        timestamp: new Date().toISOString(),
        trace_id: "rl-trace",
        retry_after: 45,
      });

      expect(getUserMessage(err)).toBe(
        "Rate limit exceeded. Please wait 45 seconds.",
      );
    });

    it("getUserMessage uses default retry_after when not provided", () => {
      const err = makeAxiosError(429, {
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded",
        code: ErrorCodes.QUOTA_EXCEEDED,
        timestamp: new Date().toISOString(),
        trace_id: "rl-trace",
      });

      expect(getUserMessage(err)).toBe(
        "Rate limit exceeded. Please wait 60 seconds.",
      );
    });

    it("parseError correctly parses 429 with retry_after", () => {
      const err = makeAxiosError(429, {
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded",
        code: ErrorCodes.QUOTA_EXCEEDED,
        timestamp: new Date().toISOString(),
        trace_id: "rl-trace",
        retry_after: 120,
      });

      const problem = parseError(err);
      expect(problem).not.toBeNull();
      expect(problem!.retry_after).toBe(120);
      expect(problem!.code).toBe(ErrorCodes.QUOTA_EXCEEDED);
    });
  });

  // ============================================
  // Server Error (500) with Retry
  // ============================================
  describe("server error (500) response handling", () => {
    it("rejects on 500 with RFC 7807 response", async () => {
      server.use(
        http.get(`${API_BASE}/server-error`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Server Error",
              status: 500,
              detail: "Internal server error",
              code: "SRV_001",
              timestamp: new Date().toISOString(),
              trace_id: "srv-trace-1",
            },
            { status: 500 },
          );
        }),
      );

      await expect(apiClient.get("/server-error")).rejects.toThrow();
    });

    it("rejects on 503 Service Unavailable", async () => {
      server.use(
        http.get(`${API_BASE}/unavailable`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Service Unavailable",
              status: 503,
              detail: "Service temporarily unavailable",
              code: "SRV_002",
              timestamp: new Date().toISOString(),
              trace_id: "srv-trace-2",
            },
            { status: 503 },
          );
        }),
      );

      await expect(apiClient.get("/unavailable")).rejects.toThrow();
    });

    it("getUserMessage returns friendly message for INTERNAL_ERROR", () => {
      const err = makeAxiosError(500, {
        type: "about:blank",
        title: "Server Error",
        status: 500,
        detail: "Database connection pool exhausted",
        code: ErrorCodes.INTERNAL_ERROR,
        timestamp: new Date().toISOString(),
        trace_id: "db-trace",
      });

      expect(getUserMessage(err)).toBe(
        "An unexpected error occurred. Please try again.",
      );
    });

    it("getUserMessage returns friendly message for SERVICE_UNAVAILABLE", () => {
      const err = makeAxiosError(503, {
        type: "about:blank",
        title: "Service Unavailable",
        status: 503,
        detail: "Maintenance in progress",
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        trace_id: "maint-trace",
      });

      expect(getUserMessage(err)).toBe(
        "The server is temporarily unavailable. Please try again later.",
      );
    });

    it("getUserMessage returns friendly message for EXTERNAL_SERVICE_ERROR", () => {
      const err = makeAxiosError(502, {
        type: "about:blank",
        title: "Bad Gateway",
        status: 502,
        detail: "Payment gateway timeout",
        code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
        timestamp: new Date().toISOString(),
        trace_id: "ext-trace",
      });

      expect(getUserMessage(err)).toBe(
        "A service is temporarily unavailable. Please try again.",
      );
    });

    it("handles 502 Bad Gateway with non-JSON response", async () => {
      server.use(
        http.get(`${API_BASE}/bad-gateway`, () => {
          return new HttpResponse("Bad Gateway", {
            status: 502,
            headers: { "Content-Type": "text/plain" },
          });
        }),
      );

      await expect(apiClient.get("/bad-gateway")).rejects.toThrow();
    });
  });

  // ============================================
  // Concurrent Request Handling
  // ============================================
  describe("concurrent request handling", () => {
    it("handles multiple simultaneous GET requests", async () => {
      server.use(
        http.get(`${API_BASE}/concurrent/:id`, ({ params }) => {
          return HttpResponse.json({ id: params.id });
        }),
      );

      const promises = Array.from({ length: 10 }, (_, i) =>
        apiClient.get(`/concurrent/${i + 1}`),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((res, i) => {
        expect(res.data.id).toBe(String(i + 1));
      });
    });

    it("handles mixed success and failure in concurrent requests", async () => {
      server.use(
        http.get(`${API_BASE}/mixed/:id`, ({ params }) => {
          const id = Number(params.id);
          if (id % 2 === 0) {
            return HttpResponse.json(
              { error: "Not found" },
              { status: 404 },
            );
          }
          return HttpResponse.json({ id: params.id, status: "ok" });
        }),
      );

      const promises = Array.from({ length: 6 }, (_, i) =>
        apiClient
          .get(`/mixed/${i + 1}`)
          .then((res) => ({ status: "fulfilled", value: res.data }))
          .catch((err) => ({ status: "rejected", reason: err.response?.status })),
      );

      const results = await Promise.all(promises);

      // Odd IDs succeed, even IDs fail with 404
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect(results[2].status).toBe("fulfilled");
      expect(results[3].status).toBe("rejected");
    });

    it("each concurrent request gets its own unique X-Request-ID", async () => {
      const requestIds: string[] = [];

      server.use(
        http.get(`${API_BASE}/parallel-ids`, ({ request }) => {
          requestIds.push(
            request.headers.get("x-request-id") || "",
          );
          return HttpResponse.json({ ok: true });
        }),
      );

      await Promise.all(
        Array.from({ length: 5 }, () => apiClient.get("/parallel-ids")),
      );

      expect(requestIds).toHaveLength(5);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(5);
    });

    it("handles POST and GET running concurrently", async () => {
      server.use(
        http.get(`${API_BASE}/concurrent-mixed`, () => {
          return HttpResponse.json({ type: "get", data: "read" });
        }),
        http.post(`${API_BASE}/concurrent-mixed`, () => {
          return HttpResponse.json({ type: "post", data: "written" });
        }),
      );

      const [getResult, postResult] = await Promise.all([
        apiClient.get("/concurrent-mixed"),
        apiClient.post("/concurrent-mixed", { item: "new" }),
      ]);

      expect(getResult.data.type).toBe("get");
      expect(postResult.data.type).toBe("post");
    });
  });

  // ============================================
  // Error Edge Cases
  // ============================================
  describe("error edge cases", () => {
    it("handles network error (no response at all)", async () => {
      server.use(
        http.get(`${API_BASE}/network-fail`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(apiClient.get("/network-fail")).rejects.toThrow();
    });

    it("parseError returns null for plain Error (non-Axios)", () => {
      expect(parseError(new Error("network down"))).toBeNull();
      expect(parseError(new TypeError("failed to fetch"))).toBeNull();
    });

    it("parseError returns null for non-error values", () => {
      expect(parseError("string error")).toBeNull();
      expect(parseError(42)).toBeNull();
      expect(parseError(null)).toBeNull();
      expect(parseError(undefined)).toBeNull();
    });

    it("getUserMessage handles all non-error types", () => {
      expect(getUserMessage(null)).toBe("An unexpected error occurred");
      expect(getUserMessage(undefined)).toBe("An unexpected error occurred");
      expect(getUserMessage(0)).toBe("An unexpected error occurred");
      expect(getUserMessage(false)).toBe("An unexpected error occurred");
    });

    it("handles 422 validation error with errors array", () => {
      const err = makeAxiosError(422, {
        type: "about:blank",
        title: "Validation Error",
        status: 422,
        detail: "Request validation failed",
        code: ErrorCodes.VALIDATION_ERROR,
        timestamp: new Date().toISOString(),
        trace_id: "val-trace",
        errors: [
          { field: "email", message: "Invalid email format", type: "format" },
          { field: "phone", message: "Phone is required", type: "missing" },
        ],
      });

      expect(getUserMessage(err)).toBe(
        "Invalid email format. Phone is required",
      );
    });

    it("handles 409 Conflict error", async () => {
      server.use(
        http.post(`${API_BASE}/conflict`, () => {
          return HttpResponse.json(
            {
              type: "about:blank",
              title: "Conflict",
              status: 409,
              detail: "Customer with this email already exists",
              code: "RES_002",
              timestamp: new Date().toISOString(),
              trace_id: "conflict-trace",
            },
            { status: 409 },
          );
        }),
      );

      await expect(
        apiClient.post("/conflict", { email: "dup@test.com" }),
      ).rejects.toThrow();
    });

    it("handles request that is aborted by AbortController", async () => {
      server.use(
        http.get(`${API_BASE}/abort-test`, async () => {
          await delay(5000);
          return HttpResponse.json({ ok: true });
        }),
      );

      const controller = new AbortController();
      const promise = apiClient.get("/abort-test", {
        signal: controller.signal,
      });

      // Abort immediately
      controller.abort();

      await expect(promise).rejects.toThrow();
    });
  });

  // ============================================
  // Content-Type Edge Cases
  // ============================================
  describe("content-type edge cases", () => {
    it("handles JSON with charset in content-type", async () => {
      server.use(
        http.get(`${API_BASE}/json-charset`, () => {
          return new HttpResponse(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }),
      );

      const response = await apiClient.get("/json-charset");
      expect(response.data.ok).toBe(true);
    });

    it("handles application/problem+json content type (RFC 7807)", async () => {
      server.use(
        http.get(`${API_BASE}/problem-json`, () => {
          return new HttpResponse(
            JSON.stringify({
              type: "about:blank",
              title: "Not Found",
              status: 404,
              detail: "Resource not found",
              code: "RES_001",
              timestamp: new Date().toISOString(),
              trace_id: "problem-trace",
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/problem+json",
              },
            },
          );
        }),
      );

      try {
        await apiClient.get("/problem-json");
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(404);
      }
    });
  });

  // ============================================
  // Boolean/Number Edge Cases in Responses
  // ============================================
  describe("type coercion edge cases", () => {
    it("handles numeric zero and empty string as valid values", async () => {
      server.use(
        http.get(`${API_BASE}/falsy-values`, () => {
          return HttpResponse.json({
            count: 0,
            name: "",
            active: false,
            items: [],
          });
        }),
      );

      const response = await apiClient.get("/falsy-values");
      expect(response.data.count).toBe(0);
      expect(response.data.name).toBe("");
      expect(response.data.active).toBe(false);
      expect(response.data.items).toEqual([]);
    });

    it("handles numeric string IDs (common in some APIs)", async () => {
      server.use(
        http.get(`${API_BASE}/string-id`, () => {
          return HttpResponse.json({
            id: "12345",
            name: "Test",
          });
        }),
      );

      const response = await apiClient.get("/string-id");
      expect(response.data.id).toBe("12345");
      expect(typeof response.data.id).toBe("string");
    });
  });
});
