import { describe, it, expect } from "vitest";
import {
  hasAuthToken,
  isApiError,
  getErrorMessage,
  is404Error,
  is500Error,
  is401Error,
  withFallback,
  withAuthFallback,
} from "../client";
import { AxiosError, AxiosHeaders } from "axios";

function makeAxiosError(status: number, data?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers } as AxiosError["config"];
  return new AxiosError("fail", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "Error",
    headers: {},
    config: config!,
    data: data ?? {},
  });
}

describe("hasAuthToken", () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("returns true when session_state is authenticated", () => {
    sessionStorage.setItem("session_state", JSON.stringify({ isAuthenticated: true }));
    expect(hasAuthToken()).toBe(true);
  });

  it("returns false when no auth state", () => {
    expect(hasAuthToken()).toBe(false);
  });

  it("returns false for invalid JSON in session_state", () => {
    sessionStorage.setItem("session_state", "not-json");
    expect(hasAuthToken()).toBe(false);
  });
});

describe("isApiError", () => {
  it("returns true for legacy error format", () => {
    const err = makeAxiosError(400, { error: "Bad request" });
    expect(isApiError(err)).toBe(true);
  });

  it("returns true for RFC 7807 format", () => {
    const err = makeAxiosError(404, { code: "RES_001", trace_id: "abc" });
    expect(isApiError(err)).toBe(true);
  });

  it("returns false for non-Axios errors", () => {
    expect(isApiError(new Error("nope"))).toBe(false);
  });

  it("returns false for Axios error without matching data shape", () => {
    const err = makeAxiosError(500, { message: "oops" });
    expect(isApiError(err)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("extracts RFC 7807 detail", () => {
    const err = makeAxiosError(404, {
      code: "RES_001",
      trace_id: "abc",
      detail: "Customer not found",
      type: "about:blank",
      title: "Not Found",
      status: 404,
      timestamp: "2026-01-01T00:00:00Z",
    });
    expect(getErrorMessage(err)).toBe("Customer not found");
  });

  it("extracts legacy error field", () => {
    const err = makeAxiosError(400, { error: "Invalid input" });
    expect(getErrorMessage(err)).toBe("Invalid input");
  });

  it("falls back to Error.message", () => {
    expect(getErrorMessage(new Error("timeout"))).toBe("timeout");
  });

  it("returns generic for unknown types", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });
});

describe("status checkers", () => {
  it("is404Error detects 404", () => {
    expect(is404Error(makeAxiosError(404))).toBe(true);
    expect(is404Error(makeAxiosError(500))).toBe(false);
    expect(is404Error(new Error("x"))).toBe(false);
  });

  it("is500Error detects 500", () => {
    expect(is500Error(makeAxiosError(500))).toBe(true);
    expect(is500Error(makeAxiosError(404))).toBe(false);
  });

  it("is401Error detects 401", () => {
    expect(is401Error(makeAxiosError(401))).toBe(true);
    expect(is401Error(makeAxiosError(403))).toBe(false);
  });
});

describe("withFallback", () => {
  it("returns API result on success", async () => {
    const result = await withFallback(() => Promise.resolve("data"), "default");
    expect(result).toBe("data");
  });

  it("returns default on 404", async () => {
    const result = await withFallback(() => Promise.reject(makeAxiosError(404)), "default");
    expect(result).toBe("default");
  });

  it("returns default on 500", async () => {
    const result = await withFallback(() => Promise.reject(makeAxiosError(500)), "default");
    expect(result).toBe("default");
  });

  it("throws on other errors", async () => {
    await expect(
      withFallback(() => Promise.reject(makeAxiosError(403)), "default"),
    ).rejects.toThrow();
  });
});

describe("withAuthFallback", () => {
  it("returns default on 401", async () => {
    const result = await withAuthFallback(() => Promise.reject(makeAxiosError(401)), []);
    expect(result).toEqual([]);
  });

  it("returns default on 404", async () => {
    const result = await withAuthFallback(() => Promise.reject(makeAxiosError(404)), []);
    expect(result).toEqual([]);
  });

  it("throws on 500", async () => {
    await expect(
      withAuthFallback(() => Promise.reject(makeAxiosError(500)), []),
    ).rejects.toThrow();
  });
});
