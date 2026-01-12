import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { WorkOrderStatus, Priority } from "@/api/types/workOrder";
import type {
  SortOrder,
  WorkOrderFilterState,
} from "../utils/workOrderHelpers";
import { DEFAULT_FILTERS } from "../utils/workOrderHelpers";

/**
 * View mode options for work order display
 */
export type ViewMode = "list" | "kanban";

/**
 * Work order UI state
 */
export interface WorkOrderUIState {
  /** Currently selected work order ID */
  selectedWorkOrderId: string | null;

  /** Current view mode */
  viewMode: ViewMode;

  /** Current filter state */
  filters: WorkOrderFilterState;

  /** Current sort order */
  sortOrder: SortOrder;

  /** Whether the filter panel is open (mobile) */
  isFilterPanelOpen: boolean;

  /** Whether the detail panel is open */
  isDetailPanelOpen: boolean;

  /** Search query for quick search */
  searchQuery: string;

  /** Currently expanded work order IDs (for list view) */
  expandedIds: Set<string>;

  /** Kanban column order (for drag-and-drop customization) */
  kanbanColumnOrder: WorkOrderStatus[];
}

/**
 * Work order store actions
 */
export interface WorkOrderStoreActions {
  // Selection
  selectWorkOrder: (id: string | null) => void;
  clearSelection: () => void;

  // View mode
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  // Filters
  setFilters: (filters: Partial<WorkOrderFilterState>) => void;
  setStatusFilter: (statuses: WorkOrderStatus[]) => void;
  setPriorityFilter: (priorities: Priority[]) => void;
  setTechnicianFilter: (technicianId: string | null) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;

  // Sorting
  setSortOrder: (sortOrder: SortOrder) => void;
  toggleSortDirection: () => void;

  // UI panels
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;

  // List expansion
  toggleExpanded: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;

  // Kanban customization
  setKanbanColumnOrder: (order: WorkOrderStatus[]) => void;
  resetKanbanColumnOrder: () => void;

  // Reset
  resetStore: () => void;
}

/**
 * Complete work order store type
 */
export type WorkOrderStore = WorkOrderUIState & WorkOrderStoreActions;

/**
 * Default Kanban column order
 */
const DEFAULT_KANBAN_ORDER: WorkOrderStatus[] = [
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

/**
 * Default sort order
 */
const DEFAULT_SORT_ORDER: SortOrder = {
  field: "scheduled_date",
  direction: "asc",
};

/**
 * Initial state
 */
const initialState: WorkOrderUIState = {
  selectedWorkOrderId: null,
  viewMode: "list",
  filters: DEFAULT_FILTERS,
  sortOrder: DEFAULT_SORT_ORDER,
  isFilterPanelOpen: false,
  isDetailPanelOpen: false,
  searchQuery: "",
  expandedIds: new Set<string>(),
  kanbanColumnOrder: DEFAULT_KANBAN_ORDER,
};

/**
 * Work Order Store
 *
 * Zustand store for managing work order UI state including:
 * - Selected work order tracking
 * - View mode (list/kanban)
 * - Filters and sorting
 * - Panel visibility
 *
 * Persists user preferences (view mode, sort order, kanban column order) to localStorage
 */
export const useWorkOrderStore = create<WorkOrderStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialState,

        // Selection actions
        selectWorkOrder: (id) => {
          set({ selectedWorkOrderId: id, isDetailPanelOpen: id !== null });
        },

        clearSelection: () => {
          set({ selectedWorkOrderId: null, isDetailPanelOpen: false });
        },

        // View mode actions
        setViewMode: (mode) => {
          set({ viewMode: mode });
        },

        toggleViewMode: () => {
          set((state) => ({
            viewMode: state.viewMode === "list" ? "kanban" : "list",
          }));
        },

        // Filter actions
        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
          }));
        },

        setStatusFilter: (statuses) => {
          set((state) => ({
            filters: { ...state.filters, statuses },
          }));
        },

        setPriorityFilter: (priorities) => {
          set((state) => ({
            filters: { ...state.filters, priorities },
          }));
        },

        setTechnicianFilter: (technicianId) => {
          set((state) => ({
            filters: { ...state.filters, technicianId },
          }));
        },

        setDateRange: (from, to) => {
          set((state) => ({
            filters: { ...state.filters, dateFrom: from, dateTo: to },
          }));
        },

        setSearchQuery: (query) => {
          set((state) => ({
            filters: { ...state.filters, searchQuery: query },
            searchQuery: query,
          }));
        },

        clearFilters: () => {
          set({
            filters: DEFAULT_FILTERS,
            searchQuery: "",
          });
        },

        hasActiveFilters: () => {
          const { filters } = get();
          return (
            filters.statuses.length > 0 ||
            filters.priorities.length > 0 ||
            filters.technicianId !== null ||
            filters.dateFrom !== null ||
            filters.dateTo !== null ||
            filters.searchQuery !== ""
          );
        },

        // Sorting actions
        setSortOrder: (sortOrder) => {
          set({ sortOrder });
        },

        toggleSortDirection: () => {
          set((state) => ({
            sortOrder: {
              ...state.sortOrder,
              direction: state.sortOrder.direction === "asc" ? "desc" : "asc",
            },
          }));
        },

        // UI panel actions
        toggleFilterPanel: () => {
          set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen }));
        },

        setFilterPanelOpen: (open) => {
          set({ isFilterPanelOpen: open });
        },

        toggleDetailPanel: () => {
          set((state) => ({ isDetailPanelOpen: !state.isDetailPanelOpen }));
        },

        setDetailPanelOpen: (open) => {
          set({ isDetailPanelOpen: open });
        },

        // List expansion actions
        toggleExpanded: (id) => {
          set((state) => {
            const newExpanded = new Set(state.expandedIds);
            if (newExpanded.has(id)) {
              newExpanded.delete(id);
            } else {
              newExpanded.add(id);
            }
            return { expandedIds: newExpanded };
          });
        },

        expandAll: (ids) => {
          set({ expandedIds: new Set(ids) });
        },

        collapseAll: () => {
          set({ expandedIds: new Set() });
        },

        // Kanban customization actions
        setKanbanColumnOrder: (order) => {
          set({ kanbanColumnOrder: order });
        },

        resetKanbanColumnOrder: () => {
          set({ kanbanColumnOrder: DEFAULT_KANBAN_ORDER });
        },

        // Reset action
        resetStore: () => {
          set(initialState);
        },
      }),
      {
        name: "workorder-store",
        // Only persist user preferences, not session state
        partialize: (state) => ({
          viewMode: state.viewMode,
          sortOrder: state.sortOrder,
          kanbanColumnOrder: state.kanbanColumnOrder,
        }),
        // Handle Set serialization
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const parsed = JSON.parse(str);
            return {
              state: {
                ...parsed.state,
                expandedIds: new Set(),
              },
            };
          },
          setItem: (name, value) => {
            const toStore = {
              ...value,
              state: {
                ...value.state,
                expandedIds: undefined,
              },
            };
            localStorage.setItem(name, JSON.stringify(toStore));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      },
    ),
    { name: "WorkOrderStore" },
  ),
);

/**
 * Selector hooks for common use cases
 */

/**
 * Get just the selected work order ID
 */
export const useSelectedWorkOrderId = () =>
  useWorkOrderStore((state) => state.selectedWorkOrderId);

/**
 * Get just the view mode
 */
export const useWorkOrderViewMode = () =>
  useWorkOrderStore((state) => state.viewMode);

/**
 * Get just the filters
 */
export const useWorkOrderFilters = () =>
  useWorkOrderStore((state) => state.filters);

/**
 * Get just the sort order
 */
export const useWorkOrderSortOrder = () =>
  useWorkOrderStore((state) => state.sortOrder);

/**
 * Get filter and sort actions
 */
export const useWorkOrderFilterActions = () =>
  useWorkOrderStore((state) => ({
    setFilters: state.setFilters,
    setStatusFilter: state.setStatusFilter,
    setPriorityFilter: state.setPriorityFilter,
    setTechnicianFilter: state.setTechnicianFilter,
    setDateRange: state.setDateRange,
    setSearchQuery: state.setSearchQuery,
    clearFilters: state.clearFilters,
    hasActiveFilters: state.hasActiveFilters,
    setSortOrder: state.setSortOrder,
    toggleSortDirection: state.toggleSortDirection,
  }));

export default useWorkOrderStore;
