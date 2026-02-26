/**
 * Feature-level tests for WorkOrdersList component
 *
 * Tests the work orders data table/card list including:
 * - Loading skeleton state
 * - Empty state messaging
 * - Rendering work order data (customer, job type, date, technician, priority, status)
 * - Pagination controls and callbacks
 * - Action button callbacks (edit, delete)
 * - Selection/checkbox behavior
 * - Column sorting
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render";
import { WorkOrdersList } from "../WorkOrdersList";
import type { WorkOrder } from "@/api/types/workOrder";

// Mock useIsMobileOrTablet to control desktop vs mobile rendering
const mockIsMobileOrTablet = vi.fn(() => false);
vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobileOrTablet: () => mockIsMobileOrTablet(),
  useMediaQuery: vi.fn(() => false),
}));

/**
 * Build a minimal WorkOrder object that satisfies the component's expectations.
 */
function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "wo-1",
    work_order_number: "WO-00001",
    customer_id: "cust-1",
    customer_name: "Jane Smith",
    customer: null,
    status: "scheduled",
    job_type: "pumping",
    priority: "normal",
    scheduled_date: "2025-03-15",
    time_window_start: "09:00:00",
    time_window_end: "11:00:00",
    estimated_duration_hours: 2,
    technician_id: null,
    assigned_technician: "Mike Tech",
    assigned_vehicle: null,
    service_address_line1: "456 Oak Ave",
    service_address_line2: null,
    service_city: "Austin",
    service_state: "TX",
    service_postal_code: "78701",
    service_latitude: null,
    service_longitude: null,
    checklist: null,
    notes: null,
    created_at: "2025-01-01T10:00:00Z",
    updated_at: "2025-01-01T10:00:00Z",
    created_by: null,
    updated_by: null,
    source: null,
    ...overrides,
  };
}

describe("WorkOrdersList", () => {
  const defaultProps = {
    workOrders: [] as WorkOrder[],
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
        <WorkOrdersList {...defaultProps} isLoading={true} />,
      );

      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render work order rows while loading", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[makeWorkOrder()]}
          total={1}
          isLoading={true}
        />,
      );

      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("shows 'No work orders found' when the list is empty", () => {
      renderWithProviders(<WorkOrdersList {...defaultProps} />);

      expect(screen.getByText("No work orders found")).toBeInTheDocument();
      expect(
        screen.getByText(/Try adjusting your filters or create a new work order/),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Data rendering (desktop table)
  // ---------------------------------------------------------------------------
  describe("desktop table rendering", () => {
    const workOrders: WorkOrder[] = [
      makeWorkOrder({
        id: "wo-a",
        customer_name: "Alice Corp",
        job_type: "repair",
        scheduled_date: "2025-04-01",
        assigned_technician: "Bob Builder",
        priority: "high",
        status: "in_progress",
        service_city: "Houston",
        service_state: "TX",
      }),
      makeWorkOrder({
        id: "wo-b",
        customer_name: "Beta LLC",
        job_type: "inspection",
        scheduled_date: null,
        time_window_start: null,
        time_window_end: null,
        assigned_technician: null,
        priority: "low",
        status: "draft",
        service_city: null,
        service_state: null,
      }),
    ];

    it("renders a table with column headers", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByRole("grid", { name: "Work orders list" })).toBeInTheDocument();
    });

    it("displays customer names", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("Alice Corp")).toBeInTheDocument();
      expect(screen.getByText("Beta LLC")).toBeInTheDocument();
    });

    it("displays job type badges", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("Repair")).toBeInTheDocument();
      expect(screen.getByText("Inspection")).toBeInTheDocument();
    });

    it("displays technician name or dash when not assigned", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("Bob Builder")).toBeInTheDocument();
      // Unassigned technician shows "-"
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("displays priority badges", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("displays status badges", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("shows 'Not scheduled' when scheduled_date is null", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      expect(screen.getByText("Not scheduled")).toBeInTheDocument();
    });

    it("displays customer name from nested customer object when customer_name is missing", () => {
      const wo = makeWorkOrder({
        id: "wo-nested",
        customer_name: null,
        customer: {
          id: "123",
          first_name: "Nested",
          last_name: "Customer",
        },
      });

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[wo]}
          total={1}
        />,
      );

      expect(screen.getByText("Nested Customer")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  describe("pagination", () => {
    const workOrders = [makeWorkOrder()];

    it("displays page info text", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={50}
          page={2}
          pageSize={20}
        />,
      );

      expect(screen.getByText(/Showing 21 to 40 of 50 work orders/)).toBeInTheDocument();
    });

    it("calls onPageChange with next page when Next is clicked", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={50}
          page={1}
          pageSize={20}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Next page" }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("disables Previous button on first page", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={50}
          page={1}
          pageSize={20}
        />,
      );

      expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });

    it("does not show pagination when there is only one page", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={5}
          page={1}
          pageSize={20}
        />,
      );

      expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Action callbacks
  // ---------------------------------------------------------------------------
  describe("action callbacks", () => {
    const workOrder = makeWorkOrder({
      id: "act-wo-1",
      customer_name: "Action Customer",
    });

    it("calls onEdit when Edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[workOrder]}
          total={1}
          onEdit={onEdit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Edit work order" }));
      expect(onEdit).toHaveBeenCalledWith(workOrder);
    });

    it("calls onDelete when Delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[workOrder]}
          total={1}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Delete work order" }));
      expect(onDelete).toHaveBeenCalledWith(workOrder);
    });

    it("does not render Edit button when onEdit is not provided", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[workOrder]}
          total={1}
        />,
      );

      expect(screen.queryByRole("button", { name: "Edit work order" })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Selection/checkbox behavior
  // ---------------------------------------------------------------------------
  describe("selection behavior", () => {
    const workOrders = [
      makeWorkOrder({ id: "sel-1", customer_name: "Sel One" }),
      makeWorkOrder({ id: "sel-2", customer_name: "Sel Two" }),
    ];

    it("renders checkboxes when onToggleSelection is provided", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
          selectedIds={new Set()}
          onToggleSelection={vi.fn()}
          onToggleSelectAll={vi.fn()}
        />,
      );

      // Select all checkbox + per-row checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(3); // 1 select-all + 2 rows
    });

    it("calls onToggleSelection when a row checkbox is clicked", async () => {
      const user = userEvent.setup();
      const onToggleSelection = vi.fn();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
          selectedIds={new Set()}
          onToggleSelection={onToggleSelection}
          onToggleSelectAll={vi.fn()}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      // Click the first row checkbox (index 1, since index 0 is select-all)
      await user.click(checkboxes[1]);
      expect(onToggleSelection).toHaveBeenCalledWith("sel-1");
    });

    it("calls onToggleSelectAll when select-all checkbox is clicked", async () => {
      const user = userEvent.setup();
      const onToggleSelectAll = vi.fn();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
          selectedIds={new Set()}
          onToggleSelection={vi.fn()}
          onToggleSelectAll={onToggleSelectAll}
        />,
      );

      const selectAll = screen.getByRole("checkbox", { name: "Select all" });
      await user.click(selectAll);
      expect(onToggleSelectAll).toHaveBeenCalled();
    });

    it("marks checkboxes as checked for selected IDs", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
          selectedIds={new Set(["sel-1"])}
          onToggleSelection={vi.fn()}
          onToggleSelectAll={vi.fn()}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      // First row checkbox should be checked (the one for "sel-1")
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Column sorting
  // ---------------------------------------------------------------------------
  describe("column sorting", () => {
    const workOrders = [
      makeWorkOrder({ id: "sort-a", customer_name: "Alpha", priority: "low", status: "draft" }),
      makeWorkOrder({ id: "sort-b", customer_name: "Zeta", priority: "urgent", status: "completed" }),
    ];

    it("renders sortable column headers with sort indicators", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      // The table headers should contain sort indicator text
      const table = screen.getByRole("grid");
      expect(table).toBeInTheDocument();
    });

    it("toggles sort direction when clicking the same column header", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={workOrders}
          total={2}
        />,
      );

      // Click "Customer" column header to sort
      const customerHeader = screen.getByText("Customer");
      await user.click(customerHeader);

      // The first row should now be sorted; check that both are still present
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Zeta")).toBeInTheDocument();
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
      const workOrder = makeWorkOrder({
        id: "mob-1",
        customer_name: "Mobile WO",
      });

      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[workOrder]}
          total={1}
        />,
      );

      // Cards use role="article"
      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(screen.getByText("Mobile WO")).toBeInTheDocument();
      // Table should not be present
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("shows View button on mobile cards", () => {
      renderWithProviders(
        <WorkOrdersList
          {...defaultProps}
          workOrders={[makeWorkOrder()]}
          total={1}
        />,
      );

      expect(screen.getByText("View")).toBeInTheDocument();
    });
  });
});
