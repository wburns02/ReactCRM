/**
 * Unit tests for Work Order Zustand Store
 *
 * Tests all state management: selection, view modes, filters,
 * sorting, panel toggles, kanban columns, and localStorage persistence.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWorkOrderStore } from "../stores/workOrderStore";
import type { WorkOrderStatus, Priority } from "@/api/types/workOrder";
import type { SortOrder } from "../utils/workOrderHelpers";

const { getState, setState } = useWorkOrderStore;

/**
 * Reset the store to its initial state before each test.
 * Also clear any localStorage entries from persistence middleware.
 */
beforeEach(() => {
  // Clear localStorage to avoid persistence bleed between tests
  localStorage.removeItem("workorder-store");

  // Reset the store using its own resetStore action, then patch
  // expandedIds back to an empty Set (resetStore sets initialState which
  // already has a fresh Set, but we also need to clear any leftover fields
  // that persist middleware might have re-hydrated).
  getState().resetStore();

  // Double-check expandedIds is a fresh Set
  setState({ expandedIds: new Set<string>() });
});

// ---------------------------------------------------------------------------
// Default State
// ---------------------------------------------------------------------------
describe("Default state", () => {
  it("has null selectedWorkOrderId", () => {
    expect(getState().selectedWorkOrderId).toBeNull();
  });

  it("defaults viewMode to 'list'", () => {
    expect(getState().viewMode).toBe("list");
  });

  it("has empty default filters", () => {
    const { filters } = getState();
    expect(filters.statuses).toEqual([]);
    expect(filters.priorities).toEqual([]);
    expect(filters.technicianId).toBeNull();
    expect(filters.dateFrom).toBeNull();
    expect(filters.dateTo).toBeNull();
    expect(filters.searchQuery).toBe("");
  });

  it("defaults sortOrder to scheduled_date ascending", () => {
    expect(getState().sortOrder).toEqual({
      field: "scheduled_date",
      direction: "asc",
    });
  });

  it("has filter and detail panels closed", () => {
    expect(getState().isFilterPanelOpen).toBe(false);
    expect(getState().isDetailPanelOpen).toBe(false);
  });

  it("has empty searchQuery", () => {
    expect(getState().searchQuery).toBe("");
  });

  it("has empty expandedIds Set", () => {
    expect(getState().expandedIds).toBeInstanceOf(Set);
    expect(getState().expandedIds.size).toBe(0);
  });

  it("has default kanban column order", () => {
    const expected: WorkOrderStatus[] = [
      "draft",
      "scheduled",
      "confirmed",
      "enroute",
      "on_site",
      "in_progress",
      "completed",
      "requires_followup",
      "canceled",
    ];
    expect(getState().kanbanColumnOrder).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
describe("selectWorkOrder", () => {
  it("sets the selectedWorkOrderId", () => {
    getState().selectWorkOrder("wo-123");
    expect(getState().selectedWorkOrderId).toBe("wo-123");
  });

  it("opens the detail panel when an ID is provided", () => {
    getState().selectWorkOrder("wo-456");
    expect(getState().isDetailPanelOpen).toBe(true);
  });

  it("closes the detail panel when null is provided", () => {
    // First select something so panel is open
    getState().selectWorkOrder("wo-789");
    expect(getState().isDetailPanelOpen).toBe(true);

    getState().selectWorkOrder(null);
    expect(getState().selectedWorkOrderId).toBeNull();
    expect(getState().isDetailPanelOpen).toBe(false);
  });
});

describe("clearSelection", () => {
  it("clears selectedWorkOrderId", () => {
    getState().selectWorkOrder("wo-999");
    getState().clearSelection();
    expect(getState().selectedWorkOrderId).toBeNull();
  });

  it("closes the detail panel", () => {
    getState().selectWorkOrder("wo-999");
    getState().clearSelection();
    expect(getState().isDetailPanelOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// View Mode
// ---------------------------------------------------------------------------
describe("setViewMode", () => {
  it("changes to kanban", () => {
    getState().setViewMode("kanban");
    expect(getState().viewMode).toBe("kanban");
  });

  it("changes to list", () => {
    getState().setViewMode("kanban");
    getState().setViewMode("list");
    expect(getState().viewMode).toBe("list");
  });
});

describe("toggleViewMode", () => {
  it("toggles from list to kanban", () => {
    expect(getState().viewMode).toBe("list");
    getState().toggleViewMode();
    expect(getState().viewMode).toBe("kanban");
  });

  it("toggles from kanban back to list", () => {
    getState().setViewMode("kanban");
    getState().toggleViewMode();
    expect(getState().viewMode).toBe("list");
  });
});

// ---------------------------------------------------------------------------
// Filter Operations
// ---------------------------------------------------------------------------
describe("setFilters", () => {
  it("merges partial filter state", () => {
    getState().setFilters({ technicianId: "tech-1" });
    expect(getState().filters.technicianId).toBe("tech-1");
    // Other filters remain at defaults
    expect(getState().filters.statuses).toEqual([]);
    expect(getState().filters.priorities).toEqual([]);
  });

  it("merges multiple filter fields at once", () => {
    getState().setFilters({
      statuses: ["draft", "scheduled"],
      dateFrom: "2025-01-01",
    });
    expect(getState().filters.statuses).toEqual(["draft", "scheduled"]);
    expect(getState().filters.dateFrom).toBe("2025-01-01");
  });
});

describe("setStatusFilter", () => {
  it("sets status filter array", () => {
    const statuses: WorkOrderStatus[] = ["in_progress", "completed"];
    getState().setStatusFilter(statuses);
    expect(getState().filters.statuses).toEqual(statuses);
  });

  it("replaces previous status filter", () => {
    getState().setStatusFilter(["draft"]);
    getState().setStatusFilter(["enroute", "on_site"]);
    expect(getState().filters.statuses).toEqual(["enroute", "on_site"]);
  });
});

describe("setPriorityFilter", () => {
  it("sets priority filter array", () => {
    const priorities: Priority[] = ["high", "urgent"];
    getState().setPriorityFilter(priorities);
    expect(getState().filters.priorities).toEqual(priorities);
  });

  it("replaces previous priority filter", () => {
    getState().setPriorityFilter(["low"]);
    getState().setPriorityFilter(["emergency"]);
    expect(getState().filters.priorities).toEqual(["emergency"]);
  });
});

describe("setTechnicianFilter", () => {
  it("sets technician filter", () => {
    getState().setTechnicianFilter("tech-42");
    expect(getState().filters.technicianId).toBe("tech-42");
  });

  it("clears technician filter with null", () => {
    getState().setTechnicianFilter("tech-42");
    getState().setTechnicianFilter(null);
    expect(getState().filters.technicianId).toBeNull();
  });
});

describe("setDateRange", () => {
  it("sets dateFrom and dateTo", () => {
    getState().setDateRange("2025-01-01", "2025-01-31");
    expect(getState().filters.dateFrom).toBe("2025-01-01");
    expect(getState().filters.dateTo).toBe("2025-01-31");
  });

  it("allows null values to clear date range", () => {
    getState().setDateRange("2025-01-01", "2025-01-31");
    getState().setDateRange(null, null);
    expect(getState().filters.dateFrom).toBeNull();
    expect(getState().filters.dateTo).toBeNull();
  });
});

describe("setSearchQuery", () => {
  it("sets search query in both filters and top-level", () => {
    getState().setSearchQuery("plumbing");
    expect(getState().filters.searchQuery).toBe("plumbing");
    expect(getState().searchQuery).toBe("plumbing");
  });
});

describe("clearFilters", () => {
  it("resets all filters to defaults", () => {
    // Set various filters
    getState().setStatusFilter(["draft"]);
    getState().setPriorityFilter(["urgent"]);
    getState().setTechnicianFilter("tech-1");
    getState().setDateRange("2025-01-01", "2025-12-31");
    getState().setSearchQuery("test");

    getState().clearFilters();

    const { filters, searchQuery } = getState();
    expect(filters.statuses).toEqual([]);
    expect(filters.priorities).toEqual([]);
    expect(filters.technicianId).toBeNull();
    expect(filters.dateFrom).toBeNull();
    expect(filters.dateTo).toBeNull();
    expect(filters.searchQuery).toBe("");
    expect(searchQuery).toBe("");
  });
});

describe("hasActiveFilters", () => {
  it("returns false when no filters are active", () => {
    expect(getState().hasActiveFilters()).toBe(false);
  });

  it("returns true when statuses are set", () => {
    getState().setStatusFilter(["draft"]);
    expect(getState().hasActiveFilters()).toBe(true);
  });

  it("returns true when priorities are set", () => {
    getState().setPriorityFilter(["high"]);
    expect(getState().hasActiveFilters()).toBe(true);
  });

  it("returns true when technicianId is set", () => {
    getState().setTechnicianFilter("tech-1");
    expect(getState().hasActiveFilters()).toBe(true);
  });

  it("returns true when dateFrom is set", () => {
    getState().setDateRange("2025-01-01", null);
    expect(getState().hasActiveFilters()).toBe(true);
  });

  it("returns true when dateTo is set", () => {
    getState().setDateRange(null, "2025-12-31");
    expect(getState().hasActiveFilters()).toBe(true);
  });

  it("returns true when searchQuery is set", () => {
    getState().setSearchQuery("test");
    expect(getState().hasActiveFilters()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sort Operations
// ---------------------------------------------------------------------------
describe("setSortOrder", () => {
  it("sets sort order field and direction", () => {
    const order: SortOrder = { field: "priority", direction: "desc" };
    getState().setSortOrder(order);
    expect(getState().sortOrder).toEqual(order);
  });

  it("replaces previous sort order", () => {
    getState().setSortOrder({ field: "priority", direction: "desc" });
    getState().setSortOrder({ field: "created_at", direction: "asc" });
    expect(getState().sortOrder).toEqual({
      field: "created_at",
      direction: "asc",
    });
  });
});

describe("toggleSortDirection", () => {
  it("toggles from asc to desc", () => {
    expect(getState().sortOrder.direction).toBe("asc");
    getState().toggleSortDirection();
    expect(getState().sortOrder.direction).toBe("desc");
  });

  it("toggles from desc back to asc", () => {
    getState().toggleSortDirection(); // asc -> desc
    getState().toggleSortDirection(); // desc -> asc
    expect(getState().sortOrder.direction).toBe("asc");
  });

  it("preserves the sort field when toggling direction", () => {
    getState().setSortOrder({ field: "customer_name", direction: "asc" });
    getState().toggleSortDirection();
    expect(getState().sortOrder.field).toBe("customer_name");
    expect(getState().sortOrder.direction).toBe("desc");
  });
});

// ---------------------------------------------------------------------------
// Panel Toggles
// ---------------------------------------------------------------------------
describe("toggleFilterPanel", () => {
  it("opens the filter panel", () => {
    expect(getState().isFilterPanelOpen).toBe(false);
    getState().toggleFilterPanel();
    expect(getState().isFilterPanelOpen).toBe(true);
  });

  it("closes the filter panel when already open", () => {
    getState().toggleFilterPanel();
    getState().toggleFilterPanel();
    expect(getState().isFilterPanelOpen).toBe(false);
  });
});

describe("setFilterPanelOpen", () => {
  it("explicitly opens the filter panel", () => {
    getState().setFilterPanelOpen(true);
    expect(getState().isFilterPanelOpen).toBe(true);
  });

  it("explicitly closes the filter panel", () => {
    getState().setFilterPanelOpen(true);
    getState().setFilterPanelOpen(false);
    expect(getState().isFilterPanelOpen).toBe(false);
  });
});

describe("toggleDetailPanel", () => {
  it("opens the detail panel", () => {
    expect(getState().isDetailPanelOpen).toBe(false);
    getState().toggleDetailPanel();
    expect(getState().isDetailPanelOpen).toBe(true);
  });

  it("closes the detail panel when already open", () => {
    getState().toggleDetailPanel();
    getState().toggleDetailPanel();
    expect(getState().isDetailPanelOpen).toBe(false);
  });
});

describe("setDetailPanelOpen", () => {
  it("explicitly opens the detail panel", () => {
    getState().setDetailPanelOpen(true);
    expect(getState().isDetailPanelOpen).toBe(true);
  });

  it("explicitly closes the detail panel", () => {
    getState().setDetailPanelOpen(true);
    getState().setDetailPanelOpen(false);
    expect(getState().isDetailPanelOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// List Expansion
// ---------------------------------------------------------------------------
describe("toggleExpanded", () => {
  it("adds an ID to expandedIds", () => {
    getState().toggleExpanded("wo-1");
    expect(getState().expandedIds.has("wo-1")).toBe(true);
  });

  it("removes an ID that is already expanded", () => {
    getState().toggleExpanded("wo-1");
    getState().toggleExpanded("wo-1");
    expect(getState().expandedIds.has("wo-1")).toBe(false);
  });

  it("tracks multiple expanded IDs independently", () => {
    getState().toggleExpanded("wo-1");
    getState().toggleExpanded("wo-2");
    expect(getState().expandedIds.has("wo-1")).toBe(true);
    expect(getState().expandedIds.has("wo-2")).toBe(true);
    expect(getState().expandedIds.size).toBe(2);
  });
});

describe("expandAll", () => {
  it("sets expandedIds to the provided list", () => {
    getState().expandAll(["wo-1", "wo-2", "wo-3"]);
    expect(getState().expandedIds.size).toBe(3);
    expect(getState().expandedIds.has("wo-1")).toBe(true);
    expect(getState().expandedIds.has("wo-2")).toBe(true);
    expect(getState().expandedIds.has("wo-3")).toBe(true);
  });

  it("replaces any existing expanded IDs", () => {
    getState().toggleExpanded("wo-old");
    getState().expandAll(["wo-new"]);
    expect(getState().expandedIds.has("wo-old")).toBe(false);
    expect(getState().expandedIds.has("wo-new")).toBe(true);
  });
});

describe("collapseAll", () => {
  it("clears all expanded IDs", () => {
    getState().expandAll(["wo-1", "wo-2"]);
    getState().collapseAll();
    expect(getState().expandedIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Kanban Column Operations
// ---------------------------------------------------------------------------
describe("setKanbanColumnOrder", () => {
  it("sets a custom column order", () => {
    const customOrder: WorkOrderStatus[] = [
      "in_progress",
      "scheduled",
      "completed",
    ];
    getState().setKanbanColumnOrder(customOrder);
    expect(getState().kanbanColumnOrder).toEqual(customOrder);
  });
});

describe("resetKanbanColumnOrder", () => {
  it("restores the default kanban column order", () => {
    getState().setKanbanColumnOrder(["completed", "canceled"]);
    getState().resetKanbanColumnOrder();

    const expected: WorkOrderStatus[] = [
      "draft",
      "scheduled",
      "confirmed",
      "enroute",
      "on_site",
      "in_progress",
      "completed",
      "requires_followup",
      "canceled",
    ];
    expect(getState().kanbanColumnOrder).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// resetStore
// ---------------------------------------------------------------------------
describe("resetStore", () => {
  it("resets all state to initial defaults", () => {
    // Mutate everything
    getState().selectWorkOrder("wo-999");
    getState().setViewMode("kanban");
    getState().setStatusFilter(["draft"]);
    getState().setPriorityFilter(["urgent"]);
    getState().setTechnicianFilter("tech-1");
    getState().setSearchQuery("plumbing");
    getState().setSortOrder({ field: "priority", direction: "desc" });
    getState().toggleFilterPanel();
    getState().toggleExpanded("wo-1");
    getState().setKanbanColumnOrder(["completed"]);

    getState().resetStore();

    const state = getState();
    expect(state.selectedWorkOrderId).toBeNull();
    expect(state.viewMode).toBe("list");
    expect(state.filters.statuses).toEqual([]);
    expect(state.filters.priorities).toEqual([]);
    expect(state.filters.technicianId).toBeNull();
    expect(state.filters.searchQuery).toBe("");
    expect(state.searchQuery).toBe("");
    expect(state.sortOrder).toEqual({
      field: "scheduled_date",
      direction: "asc",
    });
    expect(state.isFilterPanelOpen).toBe(false);
    expect(state.isDetailPanelOpen).toBe(false);
    expect(state.expandedIds.size).toBe(0);
    expect(state.kanbanColumnOrder).toEqual([
      "draft",
      "scheduled",
      "confirmed",
      "enroute",
      "on_site",
      "in_progress",
      "completed",
      "requires_followup",
      "canceled",
    ]);
  });
});

// ---------------------------------------------------------------------------
// State Persistence to localStorage
// ---------------------------------------------------------------------------
describe("localStorage persistence", () => {
  it("persists viewMode to localStorage", () => {
    getState().setViewMode("kanban");

    // The persist middleware writes asynchronously via microtask; force flush
    // by reading what was written.
    const stored = localStorage.getItem("workorder-store");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.viewMode).toBe("kanban");
  });

  it("persists sortOrder to localStorage", () => {
    getState().setSortOrder({ field: "priority", direction: "desc" });

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.sortOrder).toEqual({
      field: "priority",
      direction: "desc",
    });
  });

  it("persists kanbanColumnOrder to localStorage", () => {
    const customOrder: WorkOrderStatus[] = ["completed", "in_progress"];
    getState().setKanbanColumnOrder(customOrder);

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.kanbanColumnOrder).toEqual(customOrder);
  });

  it("does NOT persist selectedWorkOrderId (session state)", () => {
    getState().selectWorkOrder("wo-123");

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    // The partialize function only includes viewMode, sortOrder, kanbanColumnOrder
    expect(parsed.state.selectedWorkOrderId).toBeUndefined();
  });

  it("does NOT persist filter state (session state)", () => {
    getState().setStatusFilter(["draft"]);

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.filters).toBeUndefined();
  });

  it("does NOT persist panel open states (session state)", () => {
    getState().toggleFilterPanel();
    getState().toggleDetailPanel();

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.isFilterPanelOpen).toBeUndefined();
    expect(parsed.state.isDetailPanelOpen).toBeUndefined();
  });

  it("does NOT persist expandedIds (session state)", () => {
    getState().toggleExpanded("wo-1");

    const stored = localStorage.getItem("workorder-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.expandedIds).toBeUndefined();
  });
});
