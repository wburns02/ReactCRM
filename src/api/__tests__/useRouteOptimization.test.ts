import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "./test-utils";
import {
  useOptimizeRoutes,
  useApplyOptimizedRoutes,
  useRoutePreview,
  useDrivingDirections,
  useOptimizationHistory,
} from "../hooks/useRouteOptimization";
import { apiClient } from "../client";

// Mock the API client
vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockOptimizedStop = {
  work_order_id: "wo-123",
  customer_name: "John Doe",
  address: "123 Main St, Austin, TX 78701",
  lat: 30.2672,
  lng: -97.7431,
  arrival_time: "2025-01-03T09:00:00Z",
  departure_time: "2025-01-03T10:00:00Z",
  service_duration_minutes: 60,
  driving_time_minutes: 15,
  driving_distance_miles: 5.2,
  sequence: 1,
};

const mockTechnicianRoute = {
  technician_id: 1,
  technician_name: "Mike Smith",
  stops: [mockOptimizedStop],
  total_distance_miles: 25.5,
  total_driving_time_minutes: 45,
  total_service_time_minutes: 180,
  route_efficiency_score: 0.85,
};

const mockOptimizationResponse = {
  success: true,
  message: "Routes optimized successfully",
  routes: [mockTechnicianRoute],
  optimization_stats: {
    total_work_orders: 5,
    total_distance_saved_miles: 12.3,
    total_time_saved_minutes: 25,
    improvement_percentage: 18.5,
  },
  polylines: { 1: "encodedPolylineString123" },
};

const mockRoutePreviewResponse = {
  route: [mockOptimizedStop],
  total_distance_miles: 15.2,
  total_driving_time_minutes: 30,
  polyline: "encodedPolylinePreview123",
};

const mockDirectionsResponse = {
  distance_miles: 8.5,
  duration_minutes: 18,
  polyline: "encodedDirectionsPolyline123",
};

const mockOptimizationHistory = {
  optimizations: [
    {
      id: "opt-123",
      date: "2025-01-02",
      created_at: "2025-01-02T08:00:00Z",
      total_distance_saved_miles: 12.3,
      total_time_saved_minutes: 25,
      work_orders_count: 5,
    },
    {
      id: "opt-124",
      date: "2025-01-01",
      created_at: "2025-01-01T08:00:00Z",
      total_distance_saved_miles: 8.7,
      total_time_saved_minutes: 18,
      work_orders_count: 4,
    },
  ],
};

describe("useRouteOptimization hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useOptimizeRoutes", () => {
    it("optimizes routes for a given date", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockOptimizationResponse,
      });

      const { result } = renderHookWithClient(() => useOptimizeRoutes());

      const request = {
        date: "2025-01-03",
        technician_ids: [1, 2],
        optimize_for: "balanced" as const,
      };

      result.current.mutate(request);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/scheduling/optimize-routes",
        request,
      );
      expect(result.current.data).toEqual(mockOptimizationResponse);
    });

    it("includes optional parameters in request", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockOptimizationResponse,
      });

      const { result } = renderHookWithClient(() => useOptimizeRoutes());

      const request = {
        date: "2025-01-03",
        technician_ids: [1],
        work_order_ids: ["wo-123", "wo-456"],
        optimize_for: "time" as const,
        start_location: { lat: 30.25, lng: -97.75, address: "Office" },
        end_location: { lat: 30.26, lng: -97.74, address: "Home" },
        max_driving_time_minutes: 480,
        include_breaks: true,
      };

      result.current.mutate(request);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/scheduling/optimize-routes",
        request,
      );
    });

    it("handles optimization errors", async () => {
      const error = new Error("Optimization failed");
      vi.mocked(apiClient.post).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useOptimizeRoutes());

      result.current.mutate({ date: "2025-01-03" });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("useApplyOptimizedRoutes", () => {
    it("applies optimized routes to work orders", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, updated_count: 5 },
      });

      const { result } = renderHookWithClient(() => useApplyOptimizedRoutes());

      result.current.mutate([mockTechnicianRoute]);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/scheduling/apply-optimized-routes",
        {
          routes: [mockTechnicianRoute],
        },
      );
      expect(result.current.data).toEqual({ success: true, updated_count: 5 });
    });

    it("handles apply errors", async () => {
      const error = new Error("Failed to apply routes");
      vi.mocked(apiClient.post).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useApplyOptimizedRoutes());

      result.current.mutate([mockTechnicianRoute]);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("useRoutePreview", () => {
    it("fetches route preview for work orders", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockRoutePreviewResponse,
      });

      const { result } = renderHookWithClient(() => useRoutePreview());

      result.current.mutate({
        work_order_ids: ["wo-123", "wo-456"],
        technician_id: 1,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith("/scheduling/route-preview", {
        work_order_ids: ["wo-123", "wo-456"],
        technician_id: 1,
      });
      expect(result.current.data).toEqual(mockRoutePreviewResponse);
    });
  });

  describe("useDrivingDirections", () => {
    it("fetches driving directions between two points", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockDirectionsResponse,
      });

      const { result } = renderHookWithClient(() => useDrivingDirections());

      result.current.mutate({
        origin: { lat: 30.25, lng: -97.75 },
        destination: { lat: 30.3, lng: -97.7 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/scheduling/driving-directions",
        {
          origin: { lat: 30.25, lng: -97.75 },
          destination: { lat: 30.3, lng: -97.7 },
        },
      );
      expect(result.current.data).toEqual(mockDirectionsResponse);
    });
  });

  describe("useOptimizationHistory", () => {
    it("fetches optimization history for date range", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockOptimizationHistory,
      });

      const { result } = renderHookWithClient(() =>
        useOptimizationHistory("2025-01-01", "2025-01-03"),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        "/scheduling/optimization-history",
        {
          params: { start_date: "2025-01-01", end_date: "2025-01-03" },
        },
      );
      expect(result.current.data).toEqual(mockOptimizationHistory);
    });

    it("does not fetch when dates are not provided", () => {
      const { result } = renderHookWithClient(() =>
        useOptimizationHistory("", ""),
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe("idle");
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("handles API errors", async () => {
      const error = new Error("Failed to fetch history");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() =>
        useOptimizationHistory("2025-01-01", "2025-01-03"),
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });
});
