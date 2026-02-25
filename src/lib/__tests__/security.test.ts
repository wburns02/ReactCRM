import {
  getCSRFToken,
  requiresCSRF,
  getCSRFHeader,
  getSessionState,
  setSessionState,
  clearSessionState,
  needsRevalidation,
  markSessionValidated,
  markSessionInvalid,
  hasCookie,
  deleteCookie,
  sanitizeHTML,
  isSafeUrl,
  sanitizeRedirectUrl,
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
  hasLegacyToken,
  getLegacyToken,
  clearLegacyToken,
  cleanupLegacyAuth,
} from "../security";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

describe("security", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearCookies();
  });

  // CSRF
  describe("getCSRFToken", () => {
    it("returns null when no csrf cookie", () => {
      expect(getCSRFToken()).toBeNull();
    });

    it("reads csrf_token cookie value", () => {
      document.cookie = "csrf_token=abc123; path=/";
      expect(getCSRFToken()).toBe("abc123");
    });

    it("decodes URI-encoded value", () => {
      document.cookie = "csrf_token=hello%20world; path=/";
      expect(getCSRFToken()).toBe("hello world");
    });
  });

  describe("requiresCSRF", () => {
    it("returns false for GET", () => expect(requiresCSRF("GET")).toBe(false));
    it("returns false for HEAD", () => expect(requiresCSRF("HEAD")).toBe(false));
    it("returns false for OPTIONS", () => expect(requiresCSRF("OPTIONS")).toBe(false));
    it("returns false for TRACE", () => expect(requiresCSRF("TRACE")).toBe(false));
    it("returns true for POST", () => expect(requiresCSRF("POST")).toBe(true));
    it("returns true for PUT", () => expect(requiresCSRF("PUT")).toBe(true));
    it("returns true for PATCH", () => expect(requiresCSRF("PATCH")).toBe(true));
    it("returns true for DELETE", () => expect(requiresCSRF("DELETE")).toBe(true));
    it("is case-insensitive", () => expect(requiresCSRF("get")).toBe(false));
  });

  describe("getCSRFHeader", () => {
    it("returns empty object when no token", () => {
      expect(getCSRFHeader()).toEqual({});
    });

    it("returns header with token", () => {
      document.cookie = "csrf_token=tok123; path=/";
      expect(getCSRFHeader()).toEqual({ "X-CSRF-Token": "tok123" });
    });
  });

  // Session state
  describe("session state", () => {
    it("returns null when empty", () => {
      expect(getSessionState()).toBeNull();
    });

    it("setSessionState stores in both storages", () => {
      const state = { isAuthenticated: true, lastValidated: 1000 };
      setSessionState(state);
      expect(JSON.parse(sessionStorage.getItem("session_state")!)).toEqual(state);
      expect(JSON.parse(localStorage.getItem("session_state")!)).toEqual(state);
    });

    it("getSessionState reads from sessionStorage first", () => {
      sessionStorage.setItem("session_state", JSON.stringify({ isAuthenticated: true, lastValidated: 1 }));
      localStorage.setItem("session_state", JSON.stringify({ isAuthenticated: false, lastValidated: 2 }));
      expect(getSessionState()!.lastValidated).toBe(1);
    });

    it("getSessionState falls back to localStorage", () => {
      localStorage.setItem("session_state", JSON.stringify({ isAuthenticated: true, lastValidated: 99 }));
      expect(getSessionState()!.lastValidated).toBe(99);
    });

    it("clearSessionState removes from both", () => {
      setSessionState({ isAuthenticated: true, lastValidated: 1 });
      clearSessionState();
      expect(sessionStorage.getItem("session_state")).toBeNull();
      expect(localStorage.getItem("session_state")).toBeNull();
    });
  });

  describe("needsRevalidation", () => {
    it("returns true when no session", () => {
      expect(needsRevalidation()).toBe(true);
    });

    it("returns true when not authenticated", () => {
      setSessionState({ isAuthenticated: false, lastValidated: Date.now() });
      expect(needsRevalidation()).toBe(true);
    });

    it("returns false when recently validated", () => {
      markSessionValidated("user1");
      expect(needsRevalidation()).toBe(false);
    });

    it("returns true when validated >5 min ago", () => {
      setSessionState({ isAuthenticated: true, lastValidated: Date.now() - 6 * 60 * 1000 });
      expect(needsRevalidation()).toBe(true);
    });
  });

  describe("markSessionValidated / markSessionInvalid", () => {
    it("marks session as authenticated with userId", () => {
      markSessionValidated("u1");
      const s = getSessionState()!;
      expect(s.isAuthenticated).toBe(true);
      expect(s.userId).toBe("u1");
    });

    it("markSessionInvalid sets authenticated false", () => {
      markSessionInvalid();
      expect(getSessionState()!.isAuthenticated).toBe(false);
    });
  });

  // Cookie utilities
  describe("hasCookie / deleteCookie", () => {
    it("hasCookie returns false for missing cookie", () => {
      expect(hasCookie("nope")).toBe(false);
    });

    it("hasCookie returns true for existing cookie", () => {
      document.cookie = "foo=bar; path=/";
      expect(hasCookie("foo")).toBe(true);
    });

    it("deleteCookie removes a cookie", () => {
      document.cookie = "foo=bar; path=/";
      deleteCookie("foo");
      expect(hasCookie("foo")).toBe(false);
    });
  });

  // Content security
  describe("sanitizeHTML", () => {
    it("escapes HTML tags", () => {
      expect(sanitizeHTML("<script>alert(1)</script>")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;"
      );
    });

    it("passes plain text through", () => {
      expect(sanitizeHTML("hello")).toBe("hello");
    });
  });

  describe("isSafeUrl", () => {
    it("allows same-origin relative paths", () => {
      expect(isSafeUrl("/dashboard")).toBe(true);
    });

    it("rejects foreign origins", () => {
      expect(isSafeUrl("https://evil.com/hack")).toBe(false);
    });

    it("allows explicitly allowed origins", () => {
      expect(isSafeUrl("https://allowed.com/page", ["https://allowed.com"])).toBe(true);
    });
  });

  describe("sanitizeRedirectUrl", () => {
    it("allows valid relative URL", () => {
      expect(sanitizeRedirectUrl("/settings")).toBe("/settings");
    });

    it("rejects non-relative URL", () => {
      expect(sanitizeRedirectUrl("https://evil.com")).toBe("/dashboard");
    });

    it("rejects protocol-relative URL", () => {
      expect(sanitizeRedirectUrl("//evil.com")).toBe("/dashboard");
    });

    it("rejects javascript: in encoded URL", () => {
      expect(sanitizeRedirectUrl("/%6Aavascript:alert(1)")).toBe("/dashboard");
    });

    it("uses custom fallback", () => {
      expect(sanitizeRedirectUrl("https://x.com", "/home")).toBe("/home");
    });
  });

  // Bearer token
  describe("session token helpers", () => {
    it("stores and retrieves token", () => {
      storeSessionToken("jwt123");
      expect(getSessionToken()).toBe("jwt123");
    });

    it("clearSessionToken removes it", () => {
      storeSessionToken("jwt123");
      clearSessionToken();
      expect(getSessionToken()).toBeNull();
    });
  });

  // Legacy
  describe("legacy token helpers", () => {
    it("hasLegacyToken detects auth_token", () => {
      localStorage.setItem("auth_token", "old");
      expect(hasLegacyToken()).toBe(true);
      expect(getLegacyToken()).toBe("old");
    });

    it("clearLegacyToken removes it", () => {
      localStorage.setItem("auth_token", "old");
      clearLegacyToken();
      expect(hasLegacyToken()).toBe(false);
    });

    it("cleanupLegacyAuth removes all legacy keys", () => {
      localStorage.setItem("auth_token", "a");
      localStorage.setItem("token", "b");
      localStorage.setItem("jwt", "c");
      localStorage.setItem("access_token", "d");
      cleanupLegacyAuth();
      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("jwt")).toBeNull();
      expect(localStorage.getItem("access_token")).toBeNull();
    });
  });
});
