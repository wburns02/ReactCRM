/**
 * Unit tests for ErrorBoundary component
 *
 * Tests error catching, fallback UI rendering, Sentry reporting,
 * and user recovery actions (reload / navigate to dashboard).
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

// ---------------------------------------------------------------------------
// Mock @/lib/sentry so we can assert calls without a real Sentry SDK
// ---------------------------------------------------------------------------
vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Import mocked functions for assertions
import { captureException, addBreadcrumb } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A component that throws on render, used to trigger the error boundary.
 */
function ThrowingChild({ message }: { message?: string }) {
  throw new Error(message ?? "Test explosion");
}

/**
 * Suppress console.error noise from React's error boundary logging.
 * React logs the error + componentStack to console.error; we capture
 * and silence it during boundary tests.
 */
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("does not show error UI when children render successfully", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error catching & fallback UI
  // -------------------------------------------------------------------------
  it("catches errors and displays the default error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows a descriptive message in the error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText(/encountered an error/i),
    ).toBeInTheDocument();
  });

  it("shows error details in DEV mode", () => {
    // import.meta.env.DEV is set to true in test-setup.ts
    render(
      <ErrorBoundary>
        <ThrowingChild message="Detailed failure info" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Detailed failure info")).toBeInTheDocument();
  });

  it("displays an error ID for user reference", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    // The error ID is formatted as ERR-<base36timestamp>
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/ERR-/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Custom fallback
  // -------------------------------------------------------------------------
  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error page</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error page")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Recovery actions
  // -------------------------------------------------------------------------
  it("provides a 'Try Again' button that calls window.location.reload", async () => {
    const user = userEvent.setup();

    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock, href: window.location.href },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();

    await user.click(tryAgainButton);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("provides a 'Return to Dashboard' button that navigates to /dashboard", async () => {
    const user = userEvent.setup();

    // Track href assignment
    let capturedHref = "";
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        reload: vi.fn(),
        get href() {
          return capturedHref;
        },
        set href(value: string) {
          capturedHref = value;
        },
      },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    const dashboardButton = screen.getByRole("button", {
      name: /return to dashboard/i,
    });
    expect(dashboardButton).toBeInTheDocument();

    await user.click(dashboardButton);
    expect(capturedHref).toBe("/dashboard");
  });

  // -------------------------------------------------------------------------
  // Sentry integration
  // -------------------------------------------------------------------------
  it("reports the error to Sentry via captureException", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Sentry test error" />
      </ErrorBoundary>,
    );

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Sentry test error" }),
      expect.objectContaining({
        errorBoundary: true,
        componentStack: expect.any(String),
      }),
    );
  });

  it("adds a breadcrumb before reporting to Sentry", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(addBreadcrumb).toHaveBeenCalledWith(
      "React Error Boundary triggered",
      "error",
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
      "error",
    );
  });

  it("does not report to Sentry when children render successfully", () => {
    render(
      <ErrorBoundary>
        <p>No error here</p>
      </ErrorBoundary>,
    );

    expect(captureException).not.toHaveBeenCalled();
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });
});
