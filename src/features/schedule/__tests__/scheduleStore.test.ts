/**
 * Unit tests for Schedule Zustand Store
 *
 * Tests all state management: view switching, date navigation,
 * filter operations, panel toggles, and work order selection.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useScheduleStore } from "../store/scheduleStore";
import type { ScheduleView } from "../store/scheduleStore";

const { getState, setState } = useScheduleStore;

/**
 * Helper: get the Monday of the week containing the given date.
 * Mirrors the getWeekStart helper in the store source.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

beforeEach(() => {
  localStorage.removeItem("schedule-store");

  // Reset to initial state
  setState({
    currentView: "week",
    currentDate: getWeekStart(new Date()),
    filters: {
      technician: null,
      technicianId: null,
      statuses: [],
      status: null,
      region: null,
    },
    unscheduledPanelOpen: false,
    selectedWorkOrderId: null,
  });
});

// ---------------------------------------------------------------------------
// Default State
// ---------------------------------------------------------------------------
describe("Default state", () => {
  it("defaults currentView to 'week'", () => {
    expect(getState().currentView).toBe("week");
  });

  it("defaults currentDate to the Monday of the current week", () => {
    const expectedMonday = getWeekStart(new Date());
    const storeDate = getState().currentDate;
    expect(storeDate.getFullYear()).toBe(expectedMonday.getFullYear());
    expect(storeDate.getMonth()).toBe(expectedMonday.getMonth());
    expect(storeDate.getDate()).toBe(expectedMonday.getDate());
  });

  it("has empty default filters", () => {
    const { filters } = getState();
    expect(filters.technician).toBeNull();
    expect(filters.technicianId).toBeNull();
    expect(filters.statuses).toEqual([]);
    expect(filters.status).toBeNull();
    expect(filters.region).toBeNull();
  });

  it("has unscheduled panel closed by default", () => {
    expect(getState().unscheduledPanelOpen).toBe(false);
  });

  it("has null selectedWorkOrderId", () => {
    expect(getState().selectedWorkOrderId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// View Switching
// ---------------------------------------------------------------------------
describe("setView", () => {
  it("changes view to 'day'", () => {
    getState().setView("day");
    expect(getState().currentView).toBe("day");
  });

  it("changes view to 'tech'", () => {
    getState().setView("tech");
    expect(getState().currentView).toBe("tech");
  });

  it("changes view to 'map'", () => {
    getState().setView("map");
    expect(getState().currentView).toBe("map");
  });

  it("changes view to 'timeline'", () => {
    getState().setView("timeline");
    expect(getState().currentView).toBe("timeline");
  });

  it("changes view back to 'week'", () => {
    getState().setView("day");
    getState().setView("week");
    expect(getState().currentView).toBe("week");
  });
});

// ---------------------------------------------------------------------------
// Date Navigation
// ---------------------------------------------------------------------------
describe("setCurrentDate", () => {
  it("sets an arbitrary date", () => {
    const targetDate = new Date(2025, 5, 15); // June 15 2025
    getState().setCurrentDate(targetDate);
    expect(getState().currentDate.getTime()).toBe(targetDate.getTime());
  });
});

describe("goToToday", () => {
  it("sets currentDate to the Monday of the current week when in week view", () => {
    // Move to a date far from today
    getState().setCurrentDate(new Date(2020, 0, 1));
    getState().setView("week");
    getState().goToToday();

    const expectedMonday = getWeekStart(new Date());
    const storeDate = getState().currentDate;
    expect(storeDate.getFullYear()).toBe(expectedMonday.getFullYear());
    expect(storeDate.getMonth()).toBe(expectedMonday.getMonth());
    expect(storeDate.getDate()).toBe(expectedMonday.getDate());
  });

  it("sets currentDate to today (midnight) when in day view", () => {
    getState().setView("day");
    getState().setCurrentDate(new Date(2020, 0, 1));
    getState().goToToday();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const storeDate = getState().currentDate;
    expect(storeDate.getFullYear()).toBe(today.getFullYear());
    expect(storeDate.getMonth()).toBe(today.getMonth());
    expect(storeDate.getDate()).toBe(today.getDate());
  });
});

describe("goToPreviousWeek", () => {
  it("subtracts 7 days from currentDate", () => {
    const startDate = new Date(2025, 5, 16); // Monday June 16
    getState().setCurrentDate(startDate);
    getState().goToPreviousWeek();

    const expected = new Date(2025, 5, 9); // Monday June 9
    expect(getState().currentDate.getFullYear()).toBe(expected.getFullYear());
    expect(getState().currentDate.getMonth()).toBe(expected.getMonth());
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });

  it("works across month boundaries", () => {
    const startDate = new Date(2025, 2, 3); // March 3
    getState().setCurrentDate(startDate);
    getState().goToPreviousWeek();

    const expected = new Date(2025, 1, 24); // Feb 24
    expect(getState().currentDate.getMonth()).toBe(expected.getMonth());
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });
});

describe("goToNextWeek", () => {
  it("adds 7 days to currentDate", () => {
    const startDate = new Date(2025, 5, 16);
    getState().setCurrentDate(startDate);
    getState().goToNextWeek();

    const expected = new Date(2025, 5, 23);
    expect(getState().currentDate.getFullYear()).toBe(expected.getFullYear());
    expect(getState().currentDate.getMonth()).toBe(expected.getMonth());
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });

  it("works across month boundaries", () => {
    const startDate = new Date(2025, 0, 27); // Jan 27
    getState().setCurrentDate(startDate);
    getState().goToNextWeek();

    const expected = new Date(2025, 1, 3); // Feb 3
    expect(getState().currentDate.getMonth()).toBe(expected.getMonth());
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });
});

describe("goToPreviousDay", () => {
  it("subtracts 1 day from currentDate", () => {
    const startDate = new Date(2025, 5, 16);
    getState().setCurrentDate(startDate);
    getState().goToPreviousDay();

    const expected = new Date(2025, 5, 15);
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });
});

describe("goToNextDay", () => {
  it("adds 1 day to currentDate", () => {
    const startDate = new Date(2025, 5, 16);
    getState().setCurrentDate(startDate);
    getState().goToNextDay();

    const expected = new Date(2025, 5, 17);
    expect(getState().currentDate.getDate()).toBe(expected.getDate());
  });
});

// ---------------------------------------------------------------------------
// Filter Operations
// ---------------------------------------------------------------------------
describe("setTechnicianFilter", () => {
  it("sets the technician filter", () => {
    getState().setTechnicianFilter("John Smith");
    expect(getState().filters.technician).toBe("John Smith");
  });

  it("clears the technician filter with null", () => {
    getState().setTechnicianFilter("John Smith");
    getState().setTechnicianFilter(null);
    expect(getState().filters.technician).toBeNull();
  });

  it("preserves other filters when setting technician", () => {
    getState().setStatusFilter(["completed"]);
    getState().setTechnicianFilter("Jane Doe");
    expect(getState().filters.statuses).toEqual(["completed"]);
    expect(getState().filters.technician).toBe("Jane Doe");
  });
});

describe("setStatusFilter", () => {
  it("sets status filter array", () => {
    getState().setStatusFilter(["in_progress", "completed"]);
    expect(getState().filters.statuses).toEqual(["in_progress", "completed"]);
  });

  it("replaces previous status filter", () => {
    getState().setStatusFilter(["draft"]);
    getState().setStatusFilter(["scheduled"]);
    expect(getState().filters.statuses).toEqual(["scheduled"]);
  });

  it("preserves other filters when setting statuses", () => {
    getState().setTechnicianFilter("Tech A");
    getState().setStatusFilter(["completed"]);
    expect(getState().filters.technician).toBe("Tech A");
  });
});

describe("setRegionFilter", () => {
  it("sets the region filter", () => {
    getState().setRegionFilter("North");
    expect(getState().filters.region).toBe("North");
  });

  it("clears the region filter with null", () => {
    getState().setRegionFilter("North");
    getState().setRegionFilter(null);
    expect(getState().filters.region).toBeNull();
  });
});

describe("clearFilters", () => {
  it("resets all filters to default values", () => {
    getState().setTechnicianFilter("Tech A");
    getState().setStatusFilter(["completed"]);
    getState().setRegionFilter("South");

    getState().clearFilters();

    const { filters } = getState();
    expect(filters.technician).toBeNull();
    expect(filters.technicianId).toBeNull();
    expect(filters.statuses).toEqual([]);
    expect(filters.status).toBeNull();
    expect(filters.region).toBeNull();
  });

  it("does not affect non-filter state", () => {
    getState().setView("day");
    getState().selectWorkOrder("wo-123");
    getState().setTechnicianFilter("Tech A");

    getState().clearFilters();

    expect(getState().currentView).toBe("day");
    expect(getState().selectedWorkOrderId).toBe("wo-123");
  });
});

// ---------------------------------------------------------------------------
// Panel Toggle
// ---------------------------------------------------------------------------
describe("toggleUnscheduledPanel", () => {
  it("opens the unscheduled panel", () => {
    expect(getState().unscheduledPanelOpen).toBe(false);
    getState().toggleUnscheduledPanel();
    expect(getState().unscheduledPanelOpen).toBe(true);
  });

  it("closes the unscheduled panel when already open", () => {
    getState().toggleUnscheduledPanel();
    getState().toggleUnscheduledPanel();
    expect(getState().unscheduledPanelOpen).toBe(false);
  });
});

describe("setUnscheduledPanelOpen", () => {
  it("explicitly opens the panel", () => {
    getState().setUnscheduledPanelOpen(true);
    expect(getState().unscheduledPanelOpen).toBe(true);
  });

  it("explicitly closes the panel", () => {
    getState().setUnscheduledPanelOpen(true);
    getState().setUnscheduledPanelOpen(false);
    expect(getState().unscheduledPanelOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Work Order Selection
// ---------------------------------------------------------------------------
describe("selectWorkOrder", () => {
  it("sets the selected work order ID", () => {
    getState().selectWorkOrder("wo-abc");
    expect(getState().selectedWorkOrderId).toBe("wo-abc");
  });

  it("clears the selection with null", () => {
    getState().selectWorkOrder("wo-abc");
    getState().selectWorkOrder(null);
    expect(getState().selectedWorkOrderId).toBeNull();
  });

  it("replaces the previous selection", () => {
    getState().selectWorkOrder("wo-1");
    getState().selectWorkOrder("wo-2");
    expect(getState().selectedWorkOrderId).toBe("wo-2");
  });
});

// ---------------------------------------------------------------------------
// localStorage Persistence
// ---------------------------------------------------------------------------
describe("localStorage persistence", () => {
  it("persists currentView to localStorage", () => {
    getState().setView("timeline");

    const stored = localStorage.getItem("schedule-store");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.currentView).toBe("timeline");
  });

  it("persists filters to localStorage", () => {
    getState().setTechnicianFilter("Tech A");
    getState().setStatusFilter(["completed"]);

    const stored = localStorage.getItem("schedule-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.filters.technician).toBe("Tech A");
    expect(parsed.state.filters.statuses).toEqual(["completed"]);
  });

  it("does NOT persist selectedWorkOrderId (session state)", () => {
    getState().selectWorkOrder("wo-123");

    const stored = localStorage.getItem("schedule-store");
    const parsed = JSON.parse(stored!);
    // partialize only includes currentView and filters
    expect(parsed.state.selectedWorkOrderId).toBeUndefined();
  });

  it("does NOT persist unscheduledPanelOpen (session state)", () => {
    getState().toggleUnscheduledPanel();

    const stored = localStorage.getItem("schedule-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.unscheduledPanelOpen).toBeUndefined();
  });

  it("does NOT persist currentDate (session state)", () => {
    getState().setCurrentDate(new Date(2030, 0, 1));

    const stored = localStorage.getItem("schedule-store");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.currentDate).toBeUndefined();
  });
});
