/**
 * Feature-level tests for EstimatesPage component
 *
 * Tests the estimates list page including:
 * - Loading state with spinner
 * - Empty state messaging
 * - Rendering estimate rows with customer, total, status, dates
 * - Filter buttons (All, Pending, Accepted, Declined)
 * - Create Estimate button opens modal
 * - AI Pricing toggle
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render";
import { EstimatesPage } from "../pages/EstimatesPage";
import type { Quote } from "@/api/types/quote";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useQuotes hook
const mockUseQuotes = vi.fn();
vi.mock("@/api/hooks/useQuotes", () => ({
  useQuotes: (filters: Record<string, unknown>) => mockUseQuotes(filters),
  quoteKeys: {
    all: ["quotes"],
    lists: () => ["quotes", "list"],
    list: (f: unknown) => ["quotes", "list", f],
  },
}));

// Mock CreateEstimateModal
vi.mock("../components/CreateEstimateModal", () => ({
  CreateEstimateModal: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    open ? (
      <div data-testid="create-estimate-modal">
        <span>Create Estimate Modal</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock useAI hooks
vi.mock("@/hooks/useAI", () => ({
  useAIGenerate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAIAnalyze: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q-1",
    quote_number: "EST-0001",
    customer_id: "cust-1",
    customer_name: "Test Customer",
    customer: {
      id: "cust-1",
      first_name: "Test",
      last_name: "Customer",
      email: "test@example.com",
      phone: "555-0100",
    },
    status: "pending",
    line_items: [],
    subtotal: 500,
    tax_rate: 0.0825,
    tax: 41.25,
    total: 541.25,
    valid_until: "2025-06-01",
    notes: null,
    terms: null,
    created_at: "2025-03-01T10:00:00Z",
    updated_at: "2025-03-01T10:00:00Z",
    ...overrides,
  };
}

describe("EstimatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Page header
  // ---------------------------------------------------------------------------
  describe("page header", () => {
    it("renders the Estimates heading and description", () => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });

      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("Estimates")).toBeInTheDocument();
      expect(
        screen.getByText("Create and manage customer estimates"),
      ).toBeInTheDocument();
    });

    it("renders the Create Estimate button", () => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });

      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("Create Estimate")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows a loading spinner when data is loading", () => {
      mockUseQuotes.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = renderWithProviders(<EstimatesPage />);

      // The spinner uses animate-spin
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("does not show estimates while loading", () => {
      mockUseQuotes.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderWithProviders(<EstimatesPage />);

      expect(screen.queryByText("Test Customer")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("shows empty state message when no estimates exist", () => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });

      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("No estimates found")).toBeInTheDocument();
      expect(
        screen.getByText("Create your first estimate to get started"),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Data rendering
  // ---------------------------------------------------------------------------
  describe("data rendering", () => {
    const quotes = [
      makeQuote({
        id: "q-a",
        customer_name: "Alpha Customer",
        customer: {
          id: "ca",
          first_name: "Alpha",
          last_name: "Customer",
          email: "alpha@example.com",
        },
        total: 1200,
        status: "pending",
        created_at: "2025-02-15T08:00:00Z",
        valid_until: "2025-04-15",
      }),
      makeQuote({
        id: "q-b",
        customer_name: "Beta Corp",
        customer: {
          id: "cb",
          first_name: "Beta",
          last_name: "Corp",
          email: "beta@corp.com",
        },
        total: 3500,
        status: "accepted",
        created_at: "2025-01-20T10:00:00Z",
        valid_until: null,
      }),
    ];

    beforeEach(() => {
      mockUseQuotes.mockReturnValue({
        data: { items: quotes, total: 2, page: 1, page_size: 20 },
        isLoading: false,
      });
    });

    it("renders table headers", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Valid Until")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("displays customer names and emails", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("Alpha Customer")).toBeInTheDocument();
      expect(screen.getByText("alpha@example.com")).toBeInTheDocument();
      expect(screen.getByText("Beta Corp")).toBeInTheDocument();
      expect(screen.getByText("beta@corp.com")).toBeInTheDocument();
    });

    it("displays estimate totals formatted as currency", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("$1,200")).toBeInTheDocument();
      expect(screen.getByText("$3,500")).toBeInTheDocument();
    });

    it("displays status badges", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("pending")).toBeInTheDocument();
      expect(screen.getByText("accepted")).toBeInTheDocument();
    });

    it("renders View links for each estimate", () => {
      renderWithProviders(<EstimatesPage />);

      const viewLinks = screen.getAllByText("View");
      expect(viewLinks.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Filter buttons
  // ---------------------------------------------------------------------------
  describe("filter buttons", () => {
    beforeEach(() => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });
    });

    it("renders all filter buttons", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Declined")).toBeInTheDocument();
    });

    it("calls useQuotes with status filter when a filter button is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<EstimatesPage />);

      await user.click(screen.getByText("Pending"));

      // useQuotes should have been called with the pending status
      expect(mockUseQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("calls useQuotes without status filter when All is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<EstimatesPage />);

      // First click Pending, then click All
      await user.click(screen.getByText("Pending"));
      await user.click(screen.getByText("All"));

      // The last call should have no status filter (undefined)
      const lastCall = mockUseQuotes.mock.calls[mockUseQuotes.mock.calls.length - 1];
      expect(lastCall[0].status).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Create Estimate modal
  // ---------------------------------------------------------------------------
  describe("create estimate modal", () => {
    beforeEach(() => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });
    });

    it("opens modal when Create Estimate button is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<EstimatesPage />);

      expect(screen.queryByTestId("create-estimate-modal")).not.toBeInTheDocument();

      await user.click(screen.getByText("Create Estimate"));

      expect(screen.getByTestId("create-estimate-modal")).toBeInTheDocument();
      expect(screen.getByText("Create Estimate Modal")).toBeInTheDocument();
    });

    it("closes modal when onClose is called", async () => {
      const user = userEvent.setup();

      renderWithProviders(<EstimatesPage />);

      // Open modal
      await user.click(screen.getByText("Create Estimate"));
      expect(screen.getByTestId("create-estimate-modal")).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText("Close Modal"));
      expect(screen.queryByTestId("create-estimate-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AI Pricing toggle
  // ---------------------------------------------------------------------------
  describe("AI Pricing Assistant", () => {
    beforeEach(() => {
      mockUseQuotes.mockReturnValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
      });
    });

    it("shows AI pricing toggle button by default", () => {
      renderWithProviders(<EstimatesPage />);

      expect(screen.getByText("Get AI pricing suggestions")).toBeInTheDocument();
    });

    it("expands AI pricing panel when toggle is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<EstimatesPage />);

      await user.click(screen.getByText("Get AI pricing suggestions"));

      expect(screen.getByText("AI Pricing Assistant")).toBeInTheDocument();
    });
  });
});
