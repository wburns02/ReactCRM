import { create } from "zustand";
import type { CallMapState, DetectedLocation, NearbyJob } from "./types";

export const useCallMapStore = create<CallMapState>((set, get) => ({
  location: null,
  nearbyJobs: [],
  isVisible: false,
  isExpanded: false,
  activeCallSid: null,
  callerNumber: null,

  setLocation: (location: DetectedLocation) => {
    const current = get().location;
    if (current && location.confidence <= current.confidence) {
      const latDiff = Math.abs(location.lat - current.lat);
      const lngDiff = Math.abs(location.lng - current.lng);
      if (latDiff < 0.008 && lngDiff < 0.008) {
        return;
      }
    }
    set({ location, isVisible: true });
  },

  setNearbyJobs: (nearbyJobs: NearbyJob[]) => set({ nearbyJobs }),

  clearLocation: () => set({ location: null, nearbyJobs: [] }),

  setVisible: (isVisible: boolean) => set({ isVisible }),

  setExpanded: (isExpanded: boolean) => set({ isExpanded }),

  setActiveCallSid: (activeCallSid: string | null) => set({ activeCallSid }),

  setCallerNumber: (callerNumber: string | null) => set({ callerNumber }),

  reset: () =>
    set({
      location: null,
      nearbyJobs: [],
      isVisible: false,
      isExpanded: false,
      activeCallSid: null,
      callerNumber: null,
    }),
}));
