import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { RequireAuth } from "../RequireAuth";

// We need to mock useAuth since RequireAuth depends on it
const mockUseAuth = vi.fn();
vi.mock("../useAuth.ts", () => ({
  useAuth: () => mockUseAuth(),
}));

// Track navigation calls
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function ProtectedContent() {
  return <div data-testid="protected-content">Secret Dashboard</div>;
}

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner while checking auth", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: true,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("displays a loading spinner element", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: true,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      // The loading state includes an animated spinner div
      const loadingContainer = screen.getByText("Loading...").closest("div");
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe("authenticated user", () => {
    it("renders children when authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-123",
          email: "admin@example.com",
          first_name: "Test",
          last_name: "Admin",
          role: "admin",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.getByText("Secret Dashboard")).toBeInTheDocument();
    });

    it("does not show loading or redirect when authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-123",
          email: "admin@example.com",
          first_name: "Test",
          last_name: "Admin",
          role: "admin",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Redirecting to login..."),
      ).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("unauthenticated user", () => {
    it("redirects to /login when unauthenticated", async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
        { route: "/dashboard" },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining("/login?return="),
          { replace: true },
        );
      });
    });

    it("does not render children when unauthenticated", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("shows redirecting message while redirect happens", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Redirecting to login...")).toBeInTheDocument();
    });
  });

  describe("return URL preservation", () => {
    it("preserves current path in return URL", async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
        { route: "/customers" },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `/login?return=${encodeURIComponent("/customers")}`,
          { replace: true },
        );
      });
    });

    it("preserves path with query parameters in return URL", async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
        { route: "/work-orders?status=open&page=2" },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `/login?return=${encodeURIComponent("/work-orders?status=open&page=2")}`,
          { replace: true },
        );
      });
    });

    it("uses replace navigation to prevent back-button loops", async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
        { route: "/dashboard" },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.any(String),
          { replace: true },
        );
      });
    });
  });

  describe("role requirements", () => {
    it("renders children when user has the required role", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "tech-456",
          email: "tech@example.com",
          first_name: "Jane",
          last_name: "Tech",
          role: "technician",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="technician">
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("allows admin to access any role-restricted route", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-123",
          email: "admin@example.com",
          first_name: "Test",
          last_name: "Admin",
          role: "admin",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="technician">
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("shows Access Denied when user lacks required role", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "sales-789",
          email: "sales@example.com",
          first_name: "Bob",
          last_name: "Sales",
          role: "sales",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="technician">
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to access this page."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("shows Return to Dashboard link on access denied", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "sales-789",
          email: "sales@example.com",
          first_name: "Bob",
          last_name: "Sales",
          role: "sales",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="admin">
          <ProtectedContent />
        </RequireAuth>,
      );

      const link = screen.getByText("Return to Dashboard");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("denies access to sales user for admin-only route", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "sales-789",
          email: "sales@example.com",
          first_name: "Bob",
          last_name: "Sales",
          role: "sales",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="admin">
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("denies access to technician user for sales-only route", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "tech-456",
          email: "tech@example.com",
          first_name: "Jane",
          last_name: "Tech",
          role: "technician",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth requiredRole="sales">
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("renders children when no role requirement is specified", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "sales-789",
          email: "sales@example.com",
          first_name: "Bob",
          last_name: "Sales",
          role: "sales",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    });
  });

  describe("state transitions", () => {
    it("transitions from loading to authenticated", async () => {
      // Start with loading state
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: true,
        isAuthenticated: false,
      });

      const { rerender } = renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

      // Update to authenticated state
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-123",
          email: "admin@example.com",
          first_name: "Test",
          last_name: "Admin",
          role: "admin",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      rerender(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("transitions from loading to unauthenticated and redirects", async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: true,
        isAuthenticated: false,
      });

      const { rerender } = renderWithProviders(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();

      // Transition to unauthenticated
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      });

      rerender(
        <RequireAuth>
          <ProtectedContent />
        </RequireAuth>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining("/login"),
          { replace: true },
        );
      });
    });
  });
});
