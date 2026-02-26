/**
 * Feature-level tests for BillingOverview component
 *
 * Tests the billing dashboard including:
 * - KPI cards rendering with stats data
 * - Quick action navigation links
 * - Default (zero) values when API returns no data
 * - Recent activity empty state
 * - AI Insights toggle button
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render";
import { BillingOverview } from "../pages/BillingOverview";
import { apiClient } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  clearAuthToken: vi.fn(),
  hasAuthToken: vi.fn(() => false),
}));

// Mock the useAI hooks
vi.mock("@/hooks/useAI", () => ({
  useAIAnalyze: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAIGenerate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("BillingOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Page header
  // ---------------------------------------------------------------------------
  describe("page header", () => {
    it("renders the Billing Overview heading", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        },
      });

      renderWithProviders(<BillingOverview />);

      expect(screen.getByText("Billing Overview")).toBeInTheDocument();
      expect(
        screen.getByText("Financial metrics and billing management"),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // KPI cards with data
  // ---------------------------------------------------------------------------
  describe("KPI cards with data", () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 75000,
          outstanding_invoices: 12500,
          pending_estimates: 8,
          active_payment_plans: 3,
        },
      });
    });

    it("displays total revenue formatted as currency", async () => {
      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        expect(screen.getByText("$75,000")).toBeInTheDocument();
      });
    });

    it("displays outstanding invoices formatted as currency", async () => {
      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        expect(screen.getByText("$12,500")).toBeInTheDocument();
      });
    });

    it("displays pending estimates count", async () => {
      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        expect(screen.getByText("8")).toBeInTheDocument();
      });
    });

    it("displays active payment plans count", async () => {
      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("renders all KPI labels", async () => {
      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        expect(screen.getByText("Total Revenue (MTD)")).toBeInTheDocument();
        expect(screen.getByText("Outstanding Invoices")).toBeInTheDocument();
        expect(screen.getByText("Pending Estimates")).toBeInTheDocument();
        expect(screen.getByText("Active Payment Plans")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Default zero values
  // ---------------------------------------------------------------------------
  describe("default values when stats are zero", () => {
    it("shows zero values when all stats are zero", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        },
      });

      renderWithProviders(<BillingOverview />);

      await waitFor(() => {
        // All KPI cards should show $0 or 0
        const zeroValues = screen.getAllByText("$0");
        expect(zeroValues.length).toBe(2); // revenue + outstanding
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBe(2); // pending estimates + payment plans
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Quick action links
  // ---------------------------------------------------------------------------
  describe("quick action links", () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        },
      });
    });

    it("renders Invoices quick action link", () => {
      renderWithProviders(<BillingOverview />);

      const link = screen.getByRole("link", { name: /Invoices.*View all invoices/s });
      expect(link).toHaveAttribute("href", "/invoices");
    });

    it("renders Estimates quick action link", () => {
      renderWithProviders(<BillingOverview />);

      const link = screen.getByRole("link", { name: /Estimates.*Create & manage estimates/s });
      expect(link).toHaveAttribute("href", "/estimates");
    });

    it("renders Payment Plans quick action link", () => {
      renderWithProviders(<BillingOverview />);

      const link = screen.getByRole("link", { name: /Payment Plans.*Financing options/s });
      expect(link).toHaveAttribute("href", "/billing/payment-plans");
    });
  });

  // ---------------------------------------------------------------------------
  // Recent Activity section
  // ---------------------------------------------------------------------------
  describe("recent activity", () => {
    it("displays empty state for recent activity", () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 0,
          outstanding_invoices: 0,
          pending_estimates: 0,
          active_payment_plans: 0,
        },
      });

      renderWithProviders(<BillingOverview />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByText("No recent billing activity")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AI Billing Insights toggle
  // ---------------------------------------------------------------------------
  describe("AI Billing Insights", () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          total_revenue: 50000,
          outstanding_invoices: 5000,
          pending_estimates: 3,
          active_payment_plans: 1,
        },
      });
    });

    it("shows the AI insights toggle button initially", () => {
      renderWithProviders(<BillingOverview />);

      expect(screen.getByText("Get AI Billing Insights")).toBeInTheDocument();
    });

    it("expands AI insights panel when toggle is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<BillingOverview />);

      await user.click(screen.getByText("Get AI Billing Insights"));

      // The panel should now show the analyze button
      expect(screen.getByText("AI Billing Insights")).toBeInTheDocument();
      expect(screen.getByText("Analyze Billing Data")).toBeInTheDocument();
    });

    it("collapses AI insights panel when Close is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<BillingOverview />);

      // Open the panel
      await user.click(screen.getByText("Get AI Billing Insights"));
      expect(screen.getByText("Analyze Billing Data")).toBeInTheDocument();

      // Close the panel
      await user.click(screen.getByText("Close"));

      // Should be back to just the toggle
      expect(screen.getByText("Get AI Billing Insights")).toBeInTheDocument();
      expect(screen.queryByText("Analyze Billing Data")).not.toBeInTheDocument();
    });
  });
});
