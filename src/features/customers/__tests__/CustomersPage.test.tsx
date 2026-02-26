/**
 * Feature-level tests for CustomersPage component
 *
 * Tests the main customers page including:
 * - Header rendering with title and Add Customer button
 * - View mode tabs (Active vs Legacy Archive)
 * - Loading / error / data states delegated to CustomersList
 * - Opening the create customer form modal
 * - Opening the edit customer form modal
 * - Delete confirmation dialog
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render";
import { CustomersPage } from "../CustomersPage";
import type { Customer } from "@/api/types/customer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock customer data for hooks
const mockCustomers: Customer[] = [
  {
    id: "c1",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
    phone: "5125550101",
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
  },
];

const mockUseCustomers = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/api/hooks/useCustomers.ts", () => ({
  useCustomers: (filters: unknown) => mockUseCustomers(filters),
  useCreateCustomer: () => ({
    mutateAsync: mockCreateMutate,
    isPending: false,
  }),
  useUpdateCustomer: () => ({
    mutateAsync: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteCustomer: () => ({
    mutateAsync: mockDeleteMutate,
    isPending: false,
  }),
}));

// Mock api client for archive/unarchive
vi.mock("@/api/client.ts", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useIsMobileOrTablet for CustomersList
vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobileOrTablet: () => false,
  useMediaQuery: vi.fn(() => false),
}));

// Mock EmailCompose context for CustomersList
vi.mock("@/context/EmailComposeContext", () => ({
  useEmailCompose: () => ({
    openEmailCompose: vi.fn(),
  }),
}));

// Mock CustomerFilters (lightweight stub)
vi.mock("../components/CustomerFilters.tsx", () => ({
  CustomerFilters: () => <div data-testid="customer-filters">Filters</div>,
}));

// Mock CustomerForm modal
vi.mock("../components/CustomerForm.tsx", () => ({
  CustomerForm: ({
    open,
    onClose,
    customer,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: unknown) => void;
    customer: Customer | null;
    isLoading: boolean;
  }) =>
    open ? (
      <div data-testid="customer-form-modal">
        <span>{customer ? `Edit ${customer.first_name}` : "New Customer Form"}</span>
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null,
}));

// Mock ApiError component
vi.mock("@/components/ui/ApiError.tsx", () => ({
  ApiError: ({
    title,
    onRetry,
  }: {
    error: unknown;
    title: string;
    onRetry: () => void;
  }) => (
    <div data-testid="api-error">
      <span>{title}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock ConfirmDialog
vi.mock("@/components/ui/Dialog.tsx", () => ({
  ConfirmDialog: ({
    open,
    onClose,
    onConfirm,
    title,
    message,
  }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: string;
    isLoading?: boolean;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <span>{message}</span>
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
}));

describe("CustomersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return active customers for the main list,
    // and zero for the archived count query
    mockUseCustomers.mockImplementation((filters: Record<string, unknown>) => {
      if (filters?.is_archived === true) {
        return {
          data: { items: [], total: 0, page: 1, page_size: 1 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: { items: mockCustomers, total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  describe("page header", () => {
    it("renders the Customers heading", () => {
      renderWithProviders(<CustomersPage />);

      expect(screen.getByText("Customers")).toBeInTheDocument();
      expect(
        screen.getByText("Manage your customer database and service history"),
      ).toBeInTheDocument();
    });

    it("renders the Add Customer button", () => {
      renderWithProviders(<CustomersPage />);

      expect(screen.getByText("+ Add Customer")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // View mode tabs
  // ---------------------------------------------------------------------------
  describe("view mode tabs", () => {
    it("shows Active Customers and Legacy Archive tabs", () => {
      renderWithProviders(<CustomersPage />);

      expect(screen.getByText("Active Customers")).toBeInTheDocument();
      expect(screen.getByText("Legacy Archive")).toBeInTheDocument();
    });

    it("shows customer count badge in active tab", () => {
      renderWithProviders(<CustomersPage />);

      // The total count from mockUseCustomers is 1
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("switches to archived view when Legacy Archive tab is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      await user.click(screen.getByText("Legacy Archive"));

      // Should show the archive info banner with descriptive text
      expect(
        screen.getByText(/historical records imported from your previous system/),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Customer list rendering
  // ---------------------------------------------------------------------------
  describe("customer list", () => {
    it("renders customer data from the hook", () => {
      renderWithProviders(<CustomersPage />);

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    it("renders the filters component", () => {
      renderWithProviders(<CustomersPage />);

      expect(screen.getByTestId("customer-filters")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading skeleton when data is loading", () => {
      mockUseCustomers.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithProviders(<CustomersPage />);

      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  describe("error state", () => {
    it("renders ApiError component when there is an error", () => {
      mockUseCustomers.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("API failure"),
        refetch: vi.fn(),
      });

      renderWithProviders(<CustomersPage />);

      expect(screen.getByTestId("api-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to load customers")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Create customer modal
  // ---------------------------------------------------------------------------
  describe("create customer modal", () => {
    it("opens the customer form when Add Customer is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      expect(screen.queryByTestId("customer-form-modal")).not.toBeInTheDocument();

      await user.click(screen.getByText("+ Add Customer"));

      expect(screen.getByTestId("customer-form-modal")).toBeInTheDocument();
      expect(screen.getByText("New Customer Form")).toBeInTheDocument();
    });

    it("closes the form modal", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      await user.click(screen.getByText("+ Add Customer"));
      expect(screen.getByTestId("customer-form-modal")).toBeInTheDocument();

      await user.click(screen.getByText("Close Form"));
      expect(screen.queryByTestId("customer-form-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Edit customer modal
  // ---------------------------------------------------------------------------
  describe("edit customer modal", () => {
    it("opens the form in edit mode when Edit is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      // Click Edit for Alice Smith
      await user.click(screen.getByRole("button", { name: /Edit Alice Smith/ }));

      expect(screen.getByTestId("customer-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Delete confirmation
  // ---------------------------------------------------------------------------
  describe("delete confirmation", () => {
    it("opens confirm dialog when Delete is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      await user.click(screen.getByRole("button", { name: /Delete Alice Smith/ }));

      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Customer")).toBeInTheDocument();
    });

    it("calls deleteMutation when confirmed", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      await user.click(screen.getByRole("button", { name: /Delete Alice Smith/ }));
      await user.click(screen.getByText("Confirm Delete"));

      expect(mockDeleteMutate).toHaveBeenCalledWith("c1");
    });

    it("closes dialog when cancel is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(<CustomersPage />);

      await user.click(screen.getByRole("button", { name: /Delete Alice Smith/ }));
      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

      await user.click(screen.getByText("Cancel Delete"));
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    });
  });
});
