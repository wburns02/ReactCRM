/**
 * GPS Tracking Hooks
 * React Query hooks for real-time location tracking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  TechnicianLocation,
  AllTechniciansLocationResponse,
  LocationUpdate,
  LocationHistoryResponse,
  ETAResponse,
  Geofence,
  GeofenceCreate,
  GeofenceEvent,
  TrackingLink,
  TrackingLinkCreate,
  PublicTrackingInfo,
  DispatchMapData,
  GPSConfig,
  GPSConfigUpdate,
} from "@/api/types/gpsTracking.ts";

const GPS_KEYS = {
  all: ["gps"] as const,
  locations: () => [...GPS_KEYS.all, "locations"] as const,
  location: (technicianId: number) =>
    [...GPS_KEYS.locations(), technicianId] as const,
  allLocations: () => [...GPS_KEYS.locations(), "all"] as const,
  history: (technicianId: number, date?: string) =>
    [...GPS_KEYS.all, "history", technicianId, date] as const,
  eta: (workOrderId: number) => [...GPS_KEYS.all, "eta", workOrderId] as const,
  geofences: () => [...GPS_KEYS.all, "geofences"] as const,
  geofence: (id: number) => [...GPS_KEYS.geofences(), id] as const,
  geofenceEvents: () => [...GPS_KEYS.all, "geofence-events"] as const,
  trackingLinks: (workOrderId: number) =>
    [...GPS_KEYS.all, "tracking-links", workOrderId] as const,
  publicTracking: (token: string) =>
    [...GPS_KEYS.all, "public-tracking", token] as const,
  dispatchMap: () => [...GPS_KEYS.all, "dispatch-map"] as const,
  config: () => [...GPS_KEYS.all, "config"] as const,
  technicianConfig: (technicianId: number) =>
    [...GPS_KEYS.config(), technicianId] as const,
};

// ==================== Location Queries ====================

export function useTechnicianLocation(technicianId: number) {
  return useQuery({
    queryKey: GPS_KEYS.location(technicianId),
    queryFn: async () => {
      const response = await apiClient.get<TechnicianLocation>(
        `/gps/location/${technicianId}`,
      );
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

export function useAllTechnicianLocations() {
  return useQuery({
    queryKey: GPS_KEYS.allLocations(),
    queryFn: async () => {
      const response =
        await apiClient.get<AllTechniciansLocationResponse>("/gps/locations");
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

export function useLocationHistory(
  technicianId: number,
  date?: string,
  workOrderId?: number,
) {
  return useQuery({
    queryKey: GPS_KEYS.history(technicianId, date),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (workOrderId) params.append("work_order_id", workOrderId.toString());
      const response = await apiClient.get<LocationHistoryResponse>(
        `/gps/history/${technicianId}?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!technicianId,
  });
}

// ==================== Location Mutations ====================

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: LocationUpdate) => {
      const response = await apiClient.post<TechnicianLocation>(
        "/gps/location",
        location,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(GPS_KEYS.location(data.technician_id), data);
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.allLocations() });
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.dispatchMap() });
    },
  });
}

export function useUpdateLocationBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locations: LocationUpdate[]) => {
      const response = await apiClient.post<{
        processed: number;
        total: number;
        success: boolean;
      }>("/gps/location/batch", { locations });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.allLocations() });
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.dispatchMap() });
    },
  });
}

// ==================== ETA Queries ====================

export function useETA(workOrderId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: GPS_KEYS.eta(workOrderId),
    queryFn: async () => {
      const response = await apiClient.get<ETAResponse>(
        `/gps/eta/${workOrderId}`,
      );
      return response.data;
    },
    enabled: enabled && !!workOrderId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
}

export function useRecalculateETA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: number) => {
      const response = await apiClient.get<ETAResponse>(
        `/gps/eta/${workOrderId}?recalculate=true`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(GPS_KEYS.eta(data.work_order_id), data);
    },
  });
}

// ==================== Geofence Queries ====================

export function useGeofences(type?: string, isActive?: boolean) {
  return useQuery({
    queryKey: GPS_KEYS.geofences(),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append("geofence_type", type);
      if (isActive !== undefined)
        params.append("is_active", isActive.toString());
      const response = await apiClient.get<Geofence[]>(
        `/gps/geofences?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useGeofence(id: number) {
  return useQuery({
    queryKey: GPS_KEYS.geofence(id),
    queryFn: async () => {
      const response = await apiClient.get<Geofence>(`/gps/geofences/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useGeofenceEvents(filters?: {
  technician_id?: number;
  geofence_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: GPS_KEYS.geofenceEvents(),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.technician_id)
        params.append("technician_id", filters.technician_id.toString());
      if (filters?.geofence_id)
        params.append("geofence_id", filters.geofence_id.toString());
      if (filters?.start_date) params.append("start_date", filters.start_date);
      if (filters?.end_date) params.append("end_date", filters.end_date);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      const response = await apiClient.get<GeofenceEvent[]>(
        `/gps/geofences/events?${params.toString()}`,
      );
      return response.data;
    },
  });
}

// ==================== Geofence Mutations ====================

export function useCreateGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GeofenceCreate) => {
      const response = await apiClient.post<Geofence>("/gps/geofences", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.geofences() });
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.dispatchMap() });
    },
  });
}

export function useUpdateGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<GeofenceCreate>;
    }) => {
      const response = await apiClient.patch<Geofence>(
        `/gps/geofences/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(GPS_KEYS.geofence(data.id), data);
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.geofences() });
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.dispatchMap() });
    },
  });
}

export function useDeleteGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/gps/geofences/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.geofences() });
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.dispatchMap() });
    },
  });
}

// ==================== Tracking Link Queries ====================

export function useTrackingLinks(workOrderId: number) {
  return useQuery({
    queryKey: GPS_KEYS.trackingLinks(workOrderId),
    queryFn: async () => {
      const response = await apiClient.get<TrackingLink[]>(
        `/gps/tracking-links/${workOrderId}`,
      );
      return response.data;
    },
    enabled: !!workOrderId,
  });
}

export function usePublicTracking(token: string) {
  return useQuery({
    queryKey: GPS_KEYS.publicTracking(token),
    queryFn: async () => {
      const response = await apiClient.get<PublicTrackingInfo>(
        `/gps/track/${token}`,
      );
      return response.data;
    },
    enabled: !!token,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  });
}

// ==================== Tracking Link Mutations ====================

export function useCreateTrackingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TrackingLinkCreate) => {
      const response = await apiClient.post<TrackingLink>(
        "/gps/tracking-links",
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: GPS_KEYS.trackingLinks(data.work_order_id),
      });
    },
  });
}

// ==================== Dispatch Map ====================

export function useDispatchMapData(includeCompleted: boolean = false) {
  return useQuery({
    queryKey: GPS_KEYS.dispatchMap(),
    queryFn: async () => {
      const response = await apiClient.get<DispatchMapData>(
        `/gps/dispatch-map?include_completed=${includeCompleted}`,
      );
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

// ==================== GPS Config ====================

export function useGPSConfig() {
  return useQuery({
    queryKey: GPS_KEYS.config(),
    queryFn: async () => {
      const response = await apiClient.get<GPSConfig>("/gps/config");
      return response.data;
    },
  });
}

export function useTechnicianGPSConfig(technicianId: number) {
  return useQuery({
    queryKey: GPS_KEYS.technicianConfig(technicianId),
    queryFn: async () => {
      const response = await apiClient.get<GPSConfig>(
        `/gps/config/${technicianId}`,
      );
      return response.data;
    },
    enabled: !!technicianId,
  });
}

export function useUpdateGPSConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GPSConfigUpdate) => {
      const response = await apiClient.patch<GPSConfig>("/gps/config", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GPS_KEYS.config() });
    },
  });
}
