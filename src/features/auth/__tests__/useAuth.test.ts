import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { renderHookWithClient } from "@/api/__tests__/test-utils";
import { useAuth } from "../useAuth";
import { apiClient, hasAuthToken, clearAuthToken } from "@/api/client";
import * as security from "@/lib/security";
import * as sentry from "@/lib/sentry";

// Mock the API client
vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  hasAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

// Mock security module
vi.mock("@/lib/security", () => ({
  markSessionValidated: vi.fn(),
  markSessionInvalid: vi.fn(),
  clearSessionState: vi.fn(),
  clearSessionToken: vi.fn(),
  onSecurityEvent: vi.fn(() => vi.fn()), // returns unsubscribe function
  dispatchSecurityEvent: vi.fn(),
}));

// Mock sentry
vi.mock("@/lib/sentry", () => ({
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

const mockUser = {
  id: "user-123",
  email: "admin@example.com",
  first_name: "Test",
  last_name: "Admin",
  role: "admin" as const,
  permissions: {},
};

const mockTechUser = {
  id: "tech-456",
  email: "tech@example.com",
  first_name: "Jane",
  last_name: "Tech",
  role: "technician" as const,
};

const mockSalesUser = {
  id: "sales-789",
  email: "sales@example.com",
  first_name: "Bob",
  last_name: "Sales",
  role: "sales" as const,
};

const mockManagerUser = {
  id: "mgr-101",
  email: "mgr@example.com",
  first_name: "Mary",
  last_name: "Manager",
  role: "manager" as const,
};

describe("useAuth", () => {
  // Store original window.location so we can restore it
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restore window.location if it was replaced
    if (window.location !== originalLocation) {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    }
  });

  describe("authenticated user", () => {
    it("returns user data when authenticated", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.fullName).toBe("Test Admin");
      expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
    });

    it("marks session as validated on successful auth check", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(security.markSessionValidated).toHaveBeenCalledWith("user-123");
    });

    it("sets Sentry user context on successful auth", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(sentry.setUser).toHaveBeenCalledWith({
        id: "user-123",
        email: "admin@example.com",
        username: "Test Admin",
        role: "admin",
      });
    });

    it("correctly identifies admin role", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isManager).toBe(false);
      expect(result.current.isTechnician).toBe(false);
      expect(result.current.isSales).toBe(false);
    });

    it("correctly identifies technician role", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockTechUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(result.current.isTechnician).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isManager).toBe(false);
      expect(result.current.isSales).toBe(false);
    });

    it("correctly identifies sales role", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockSalesUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(result.current.isSales).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it("correctly identifies manager role", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockManagerUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(result.current.isManager).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe("unauthenticated user", () => {
    it("returns null user when no auth token exists", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      const { result } = renderHookWithClient(() => useAuth());

      // Query is disabled (enabled: hasAuthToken()), so it stays idle
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeUndefined();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.fullName).toBeUndefined();
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("returns error when auth check fails with 401", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      const error = new Error("Unauthorized");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeUndefined();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("clears Sentry user context when user is undefined", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      renderHookWithClient(() => useAuth());

      // When user is undefined, setUser(null) should be called
      await waitFor(() => {
        expect(sentry.setUser).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("logout", () => {
    it("calls backend logout endpoint", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { message: "Logged out" },
      });

      // Mock window.location.href setter
      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      await act(async () => {
        await result.current.logout();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
    });

    it("clears all auth state on logout", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockResolvedValue({});

      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      await act(async () => {
        await result.current.logout();
      });

      expect(sentry.setUser).toHaveBeenCalledWith(null);
      expect(security.markSessionInvalid).toHaveBeenCalled();
      expect(security.clearSessionState).toHaveBeenCalled();
      expect(security.clearSessionToken).toHaveBeenCalled();
      expect(clearAuthToken).toHaveBeenCalled();
    });

    it("dispatches auth:logout security event", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockResolvedValue({});

      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      await act(async () => {
        await result.current.logout();
      });

      expect(security.dispatchSecurityEvent).toHaveBeenCalledWith(
        "auth:logout",
      );
    });

    it("redirects to /login after logout", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockResolvedValue({});

      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      await act(async () => {
        await result.current.logout();
      });

      expect(locationMock.href).toBe("/login");
    });

    it("clears query client cache on logout", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockResolvedValue({});

      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result, queryClient } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      const clearSpy = vi.spyOn(queryClient, "clear");

      await act(async () => {
        await result.current.logout();
      });

      expect(clearSpy).toHaveBeenCalled();
    });

    it("proceeds with client cleanup even if backend logout fails", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });
      vi.mocked(apiClient.post).mockRejectedValue(new Error("Network error"));

      const locationMock = { href: "/" } as Location;
      Object.defineProperty(window, "location", {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear auth state even if POST /auth/logout failed
      expect(security.markSessionInvalid).toHaveBeenCalled();
      expect(security.clearSessionState).toHaveBeenCalled();
      expect(clearAuthToken).toHaveBeenCalled();
      expect(locationMock.href).toBe("/login");
    });
  });

  describe("session expiry", () => {
    it("subscribes to session:expired security event", () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      renderHookWithClient(() => useAuth());

      expect(security.onSecurityEvent).toHaveBeenCalledWith(
        "session:expired",
        expect.any(Function),
      );
    });

    it("subscribes to session:invalid security event", () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      renderHookWithClient(() => useAuth());

      expect(security.onSecurityEvent).toHaveBeenCalledWith(
        "session:invalid",
        expect.any(Function),
      );
    });

    it("clears auth data when session:expired event fires", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      // Capture the event handler when onSecurityEvent is called
      let expiredHandler: ((event: CustomEvent) => void) | undefined;
      vi.mocked(security.onSecurityEvent).mockImplementation(
        (type, handler) => {
          if (type === "session:expired") {
            expiredHandler = handler;
          }
          return vi.fn(); // unsubscribe
        },
      );

      const { result, queryClient } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      // Verify user is set before event fires
      expect(result.current.isAuthenticated).toBe(true);

      // Fire the session:expired event via the captured handler
      const setDataSpy = vi.spyOn(queryClient, "setQueryData");
      act(() => {
        expiredHandler?.(new CustomEvent("session:expired"));
      });

      expect(setDataSpy).toHaveBeenCalledWith(["auth", "me"], null);
    });

    it("clears auth data when session:invalid event fires", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      let invalidHandler: ((event: CustomEvent) => void) | undefined;
      vi.mocked(security.onSecurityEvent).mockImplementation(
        (type, handler) => {
          if (type === "session:invalid") {
            invalidHandler = handler;
          }
          return vi.fn();
        },
      );

      const { result, queryClient } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      const setDataSpy = vi.spyOn(queryClient, "setQueryData");
      act(() => {
        invalidHandler?.(new CustomEvent("session:invalid"));
      });

      expect(setDataSpy).toHaveBeenCalledWith(["auth", "me"], null);
    });

    it("unsubscribes from security events on unmount", () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      const unsubExpired = vi.fn();
      const unsubInvalid = vi.fn();
      let callCount = 0;
      vi.mocked(security.onSecurityEvent).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? unsubExpired : unsubInvalid;
      });

      const { unmount } = renderHookWithClient(() => useAuth());

      unmount();

      expect(unsubExpired).toHaveBeenCalled();
      expect(unsubInvalid).toHaveBeenCalled();
    });
  });

  describe("query configuration", () => {
    it("does not retry failed auth queries", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // retry: false means only 1 call to apiClient.get
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it("disables query when no auth token exists", () => {
      vi.mocked(hasAuthToken).mockReturnValue(false);

      const { result } = renderHookWithClient(() => useAuth());

      // Query should be idle (disabled), not loading
      expect(result.current.isLoading).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("enables query when auth token exists", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      renderHookWithClient(() => useAuth());

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
      });
    });
  });

  describe("refetch", () => {
    it("exposes refetch function", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      expect(typeof result.current.refetch).toBe("function");
    });

    it("re-fetches auth data when refetch is called", async () => {
      vi.mocked(hasAuthToken).mockReturnValue(true);
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHookWithClient(() => useAuth());

      await waitFor(() => expect(result.current.user).toBeDefined());

      // Clear the call count after initial fetch
      vi.mocked(apiClient.get).mockClear();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { user: { ...mockUser, first_name: "Updated" } },
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
    });
  });
});
