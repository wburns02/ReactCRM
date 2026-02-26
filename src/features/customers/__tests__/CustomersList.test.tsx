/**
 * Feature-level tests for CustomersList component
 *
 * Tests the data table/card list including:
 * - Loading skeleton state
 * - Empty state messaging
 * - Rendering customer data (names, emails, locations, types, statuses)
 * - Pagination controls and callbacks
 * - Action button callbacks (edit, delete, archive)
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render";
import { CustomersList } from "../CustomersList";
import type { Customer } from "@/api/types/customer";

// Mock useIsMobileOrTablet to control desktop vs mobile rendering
const mockIsMobileOrTablet = vi.fn(() => false);
vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobileOrTablet: () => mockIsMobileOrTablet(),
  useMediaQuery: vi.fn(() => false),
}));

// Mock EmailCompose context
vi.mock("@/context/EmailComposeContext", () => ({
  useEmailCompose: () => ({
    openEmailCompose: vi.fn(),
  }),
}));

/**
 * Build a minimal Customer object that satisfies the component's expectations.
 */
function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "5125550100",
    address_line1: "123 Main St",
    address_line2: null,
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    latitude: null,
    longitude: null,
    default_payment_terms: null,
    is_active: true,
    is_archived: false,
    customer_type: "residential",
    prospect_stage: null,
    lead_source: null,
    estimated_value: null,
    assigned_sales_rep: null,
    next_follow_up_date: null,
    lead_notes: null,
    system_type: null,
    manufacturer: null,
    quickbooks_customer_id: null,
    hubspot_contact_id: null,
    servicenow_ticket_ref: null,
    created_at: "2025-01-01T10:00:00Z",
    updated_at: "2025-01-01T10:00:00Z",
    ...overrides,
  };
}

describe("CustomersList", () => {
  const defaultProps = {
    customers: [] as Customer[],
    total: 0,
    page: 1,
    pageSize: 20,
    isLoading: false,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobileOrTablet.mockReturnValue(false);
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe("loading state", () => {
    it("renders a loading skeleton when isLoading is true", () => {
      const { container } = renderWithProviders(
        <CustomersList {...defaultProps} isLoading={true} />,
      );

      // The loading skeleton uses animate-pulse
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render customer rows while loading", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[makeCustomer()]}
          total={1}
          isLoading={true}
        />,
      );

      expect(screen.queryByText("John")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("shows 'No customers found' when the list is empty", () => {
      renderWithProviders(<CustomersList {...defaultProps} />);

      expect(screen.getByText("No customers found")).toBeInTheDocument();
      expect(
        screen.getByText(/Try adjusting your filters or add a new customer/),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Data rendering (desktop table)
  // ---------------------------------------------------------------------------
  describe("desktop table rendering", () => {
    const customers: Customer[] = [
      makeCustomer({
        id: "c1",
        first_name: "Alice",
        last_name: "Smith",
        email: "alice@example.com",
        phone: "5125550101",
        city: "Dallas",
        state: "TX",
        customer_type: "commercial",
        is_active: true,
      }),
      makeCustomer({
        id: "c2",
        first_name: "Bob",
        last_name: "Jones",
        email: "bob@example.com",
        phone: null,
        city: null,
        state: null,
        customer_type: null,
        is_active: false,
      }),
    ];

    it("renders a table with column headers", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={2}
        />,
      );

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("displays customer names", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={2}
        />,
      );

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("displays customer location when available", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={2}
        />,
      );

      expect(screen.getByText("Dallas, TX")).toBeInTheDocument();
    });

    it("shows dash when location is missing", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[
            makeCustomer({ id: "c3", city: null, state: null }),
          ]}
          total={1}
        />,
      );

      // The table cell for location should show "-"
      const dash = screen.getAllByText("-");
      expect(dash.length).toBeGreaterThan(0);
    });

    it("displays customer type label", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={2}
        />,
      );

      expect(screen.getByText("Commercial")).toBeInTheDocument();
    });

    it("displays Active/Inactive badges based on is_active", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={2}
        />,
      );

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("displays prospect stage badge when prospect_stage is set", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[
            makeCustomer({ id: "c4", prospect_stage: "new_lead" }),
          ]}
          total={1}
        />,
      );

      expect(screen.getByText("New Lead")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  describe("pagination", () => {
    const customers = [makeCustomer()];

    it("displays page info text", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={50}
          page={2}
          pageSize={20}
        />,
      );

      expect(screen.getByText(/Showing 21 to 40 of 50 customers/)).toBeInTheDocument();
    });

    it("displays page number", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={50}
          page={2}
          pageSize={20}
        />,
      );

      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });

    it("calls onPageChange with next page when Next is clicked", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={50}
          page={1}
          pageSize={20}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Next page" }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onPageChange with previous page when Previous is clicked", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={50}
          page={2}
          pageSize={20}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Previous page" }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("disables Previous button on first page", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={50}
          page={1}
          pageSize={20}
        />,
      );

      expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });

    it("disables Next button on last page", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={customers}
          total={20}
          page={1}
          pageSize={20}
        />,
      );

      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Action callbacks
  // ---------------------------------------------------------------------------
  describe("action callbacks", () => {
    const customer = makeCustomer({
      id: "act-1",
      first_name: "Carol",
      last_name: "White",
    });

    it("calls onEdit when Edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
          onEdit={onEdit}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Edit Carol White/ }));
      expect(onEdit).toHaveBeenCalledWith(customer);
    });

    it("calls onDelete when Delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Delete Carol White/ }));
      expect(onDelete).toHaveBeenCalledWith(customer);
    });

    it("calls onArchive when Archive button is clicked", async () => {
      const user = userEvent.setup();
      const onArchive = vi.fn();

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
          onArchive={onArchive}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Archive Carol White/ }));
      expect(onArchive).toHaveBeenCalledWith(customer);
    });

    it("shows Restore instead of Archive in archived view mode", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
          onArchive={vi.fn()}
          viewMode="archived"
        />,
      );

      expect(screen.getByRole("button", { name: /Restore Carol White/ })).toBeInTheDocument();
    });

    it("does not render Edit button when onEdit is not provided", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
        />,
      );

      expect(screen.queryByRole("button", { name: /Edit Carol White/ })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Mobile card view
  // ---------------------------------------------------------------------------
  describe("mobile card view", () => {
    beforeEach(() => {
      mockIsMobileOrTablet.mockReturnValue(true);
    });

    it("renders cards instead of a table on mobile", () => {
      const customer = makeCustomer({
        first_name: "Mobile",
        last_name: "User",
      });

      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[customer]}
          total={1}
        />,
      );

      // Cards use role="article"
      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(screen.getByText("Mobile User")).toBeInTheDocument();
      // Table should not be present
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("shows View button on mobile cards", () => {
      renderWithProviders(
        <CustomersList
          {...defaultProps}
          customers={[makeCustomer()]}
          total={1}
        />,
      );

      expect(screen.getByText("View")).toBeInTheDocument();
    });
  });
});
