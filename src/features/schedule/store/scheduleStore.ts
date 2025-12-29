import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScheduleView = 'week' | 'day' | 'tech' | 'map' | 'timeline';

export interface ScheduleFilters {
  technician: string | null;
  technicianId: number | null;
  statuses: string[];
  status: string | null;
  region: string | null;
}

export interface ScheduleState {
  // View state
  currentView: ScheduleView;
  currentDate: Date;

  // Filters
  filters: ScheduleFilters;

  // UI state
  unscheduledPanelOpen: boolean;
  selectedWorkOrderId: string | null;

  // Actions
  setView: (view: ScheduleView) => void;
  setCurrentDate: (date: Date) => void;
  goToToday: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;

  // Filter actions
  setTechnicianFilter: (technician: string | null) => void;
  setStatusFilter: (statuses: string[]) => void;
  setRegionFilter: (region: string | null) => void;
  clearFilters: () => void;

  // UI actions
  toggleUnscheduledPanel: () => void;
  setUnscheduledPanelOpen: (open: boolean) => void;
  selectWorkOrder: (id: string | null) => void;
}

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Schedule state store using Zustand
 * Persists view preferences to localStorage
 */
export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'week',
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

      // View actions
      setView: (view) => set({ currentView: view }),

      setCurrentDate: (date) => set({ currentDate: date }),

      goToToday: () => {
        const { currentView } = get();
        if (currentView === 'day') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          set({ currentDate: today });
        } else {
          set({ currentDate: getWeekStart(new Date()) });
        }
      },

      goToPreviousWeek: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        set({ currentDate: newDate });
      },

      goToNextWeek: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        set({ currentDate: newDate });
      },

      goToPreviousDay: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        set({ currentDate: newDate });
      },

      goToNextDay: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        set({ currentDate: newDate });
      },

      // Filter actions
      setTechnicianFilter: (technician) =>
        set((state) => ({
          filters: { ...state.filters, technician },
        })),

      setStatusFilter: (statuses) =>
        set((state) => ({
          filters: { ...state.filters, statuses },
        })),

      setRegionFilter: (region) =>
        set((state) => ({
          filters: { ...state.filters, region },
        })),

      clearFilters: () =>
        set({
          filters: {
            technician: null,
            technicianId: null,
            statuses: [],
            status: null,
            region: null,
          },
        }),

      // UI actions
      toggleUnscheduledPanel: () =>
        set((state) => ({ unscheduledPanelOpen: !state.unscheduledPanelOpen })),

      setUnscheduledPanelOpen: (open) => set({ unscheduledPanelOpen: open }),

      selectWorkOrder: (id) => set({ selectedWorkOrderId: id }),
    }),
    {
      name: 'schedule-store',
      partialize: (state) => ({
        currentView: state.currentView,
        filters: state.filters,
      }),
    }
  )
);
