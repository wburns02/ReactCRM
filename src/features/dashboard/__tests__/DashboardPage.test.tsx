/**
 * Feature-level tests for DashboardPage component
 *
 * Tests the main dashboard including:
 * - Loading states (stats, prospects, customers)
 * - Greeting message based on user name
 * - Stats cards with correct values
 * - Quick action links
 * - Today's jobs section
 * - Recent prospects and customers sections
 * - Empty state messaging
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { DashboardPage } from "../DashboardPage";
import type { DashboardFullStats } from "@/api/hooks/useDashboardStats";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useDashboardStats hook
const mockUseDashboardStats = vi.fn();
vi.mock("@/api/hooks/useDashboardStats", () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/useAuth.ts", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock AIDispatchStats (heavy component with its own API calls)
vi.mock("@/features/ai-dispatch", () => ({
  AIDispatchStats: ({ className }: { className?: string }) => (
    <div data-testid="ai-dispatch-stats" className={className}>
      AI Dispatch Stats Mock
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDashboardData(overrides: Partial<DashboardFullStats> = {}): DashboardFullStats {
  return {
    stats: {
      total_prospects: 25,
      active_prospects: 10,
      total_customers: 150,
      total_work_orders: 80,
      scheduled_work_orders: 15,
      in_progress_work_orders: 5,
      today_jobs: 3,
      pipeline_value: 125000,
      revenue_mtd: 50000,
      invoices_pending: 8,
      invoices_overdue: 2,
      upcoming_followups: 7,
      recent_prospect_ids: [],
      recent_customer_ids: [],
      ...overrides.stats,
    },
    recent_prospects: overrides.recent_prospects ?? [
      {
        id: "p1",
        first_name: "Prospect",
        last_name: "Alpha",
        company_name: "Alpha Corp",
        prospect_stage: "new_lead",
        estimated_value: 5000,
        created_at: "2025-01-15T10:00:00Z",
      },
    ],
    recent_customers: overrides.recent_customers ?? [
      {
        id: "c1",
        first_name: "Customer",
        last_name: "Beta",
        city: "Austin",
        state: "TX",
        is_active: true,
        created_at: "2025-01-10T08:00:00Z",
      },
    ],
    today_jobs: overrides.today_jobs ?? [
      {
        id: "j1",
        customer_id: "cust-1",
        customer_name: "Today Job Customer",
        job_type: "pumping",
        status: "scheduled",
        time_window_start: "09:00:00",
        assigned_technician: "Tech Mike",
      },
    ],
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "admin@example.com",
        first_name: "Will",
        last_name: "Admin",
        role: "admin",
      },
      isLoading: false,
      isAuthenticated: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading indicators when data is loading", () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderWithProviders(<DashboardPage />);

      // Stats show "..." while loading
      const loadingDots = screen.getAllByText("...");
      expect(loadingDots.length).toBeGreaterThan(0);
    });

    it("shows the greeting even while loading", () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderWithProviders(<DashboardPage />);

      // Should still show the user's name in the greeting
      expect(screen.getByText(/Will/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Greeting
  // ---------------------------------------------------------------------------
  describe("greeting", () => {
    it("displays the user's first name in the greeting", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText(/Will/)).toBeInTheDocument();
    });

    it("shows 'there' when user has no first name", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-2",
          email: "no-name@example.com",
          first_name: "",
          last_name: "",
          role: "admin",
        },
        isLoading: false,
        isAuthenticated: true,
      });

      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText(/there/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Stats cards
  // ---------------------------------------------------------------------------
  describe("stats cards", () => {
    it("displays total prospects count", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Total Prospects")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("displays total customers count", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Total Customers")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("displays pipeline value formatted as currency", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Pipeline Value")).toBeInTheDocument();
      // formatCurrency should render $125,000
      expect(screen.getByText(/\$125,000/)).toBeInTheDocument();
    });

    it("displays total work orders count", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      // "Work Orders" appears in stat card and quick actions - just check the bold count
      expect(screen.getByText("80")).toBeInTheDocument();
      // Sub-text: "15 scheduled, 5 in progress"
      expect(screen.getByText(/15 scheduled/)).toBeInTheDocument();
    });

    it("displays today's jobs count", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Today's Jobs")).toBeInTheDocument();
    });

    it("displays upcoming followups count", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Upcoming Follow-ups")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("shows summary stats in the welcome banner", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("3 jobs today")).toBeInTheDocument();
      expect(screen.getByText("5 in progress")).toBeInTheDocument();
      expect(screen.getByText("7 follow-ups")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Quick Actions
  // ---------------------------------------------------------------------------
  describe("quick actions", () => {
    beforeEach(() => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });
    });

    it("renders quick action buttons with correct links", () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Quick Actions")).toBeInTheDocument();

      const scheduleLink = screen.getByRole("link", { name: /View Schedule/ });
      expect(scheduleLink).toHaveAttribute("href", "/schedule");

      const workOrdersLink = screen.getByRole("link", { name: /Work Orders/ });
      expect(workOrdersLink).toHaveAttribute("href", "/work-orders");

      const prospectsLink = screen.getByRole("link", { name: /Prospects/ });
      expect(prospectsLink).toHaveAttribute("href", "/prospects");

      const customersLink = screen.getByRole("link", { name: /Customers/ });
      expect(customersLink).toHaveAttribute("href", "/customers");
    });
  });

  // ---------------------------------------------------------------------------
  // Today's Jobs section
  // ---------------------------------------------------------------------------
  describe("today's jobs section", () => {
    it("renders today's jobs when they exist", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      // The section heading includes the count: "Today's Jobs (1)"
      expect(screen.getByText(/Today's Jobs \(1\)/)).toBeInTheDocument();
      expect(screen.getByText("Today Job Customer")).toBeInTheDocument();
      expect(screen.getByText("Scheduled")).toBeInTheDocument();
    });

    it("shows assigned technician for today's jobs", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText(/Assigned to: Tech Mike/)).toBeInTheDocument();
    });

    it("does not render today's jobs section when there are none", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData({ today_jobs: [] }),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      // The "Today's Jobs (N)" heading should not be present
      expect(screen.queryByText(/Today's Jobs \(/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Recent Prospects
  // ---------------------------------------------------------------------------
  describe("recent prospects section", () => {
    it("renders recent prospects with name and company", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Recent Prospects")).toBeInTheDocument();
      expect(screen.getByText("Prospect Alpha")).toBeInTheDocument();
      expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
    });

    it("shows estimated value for prospects", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      // formatCurrency($5,000)
      expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
    });

    it("shows 'No prospects yet' when no recent prospects", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData({ recent_prospects: [] }),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("No prospects yet")).toBeInTheDocument();
    });

    it("shows 'Loading...' when loading and no prospects", () => {
      mockUseDashboardStats.mockReturnValue({
        data: {
          ...makeDashboardData(),
          recent_prospects: [],
        },
        isLoading: true,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Recent Customers
  // ---------------------------------------------------------------------------
  describe("recent customers section", () => {
    it("renders recent customers with name and location", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Recent Customers")).toBeInTheDocument();
      expect(screen.getByText("Customer Beta")).toBeInTheDocument();
      expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    });

    it("shows Active badge for active customers", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows 'No customers yet' when no recent customers", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData({ recent_customers: [] }),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("No customers yet")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Navigation links
  // ---------------------------------------------------------------------------
  describe("navigation links", () => {
    it("has View all link for prospects", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      const viewAllLinks = screen.getAllByText("View all");
      expect(viewAllLinks.length).toBeGreaterThanOrEqual(2);
    });

    it("has View schedule link for today's jobs", () => {
      mockUseDashboardStats.mockReturnValue({
        data: makeDashboardData(),
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText("View schedule")).toBeInTheDocument();
    });
  });
});
