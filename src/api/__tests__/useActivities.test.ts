import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "./test-utils";
import {
  useActivities,
  useActivity,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  activityKeys,
} from "../hooks/useActivities";
import { apiClient } from "../client";

// Mock the API client
vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockActivity = {
  id: "act-123",
  customer_id: "456",
  customer_name: "John Doe",
  user_id: 1,
  user_name: "Admin User",
  activity_type: "call",
  subject: "Follow-up call",
  description: "Discussed upcoming service appointment",
  scheduled_at: "2025-01-03T10:00:00Z",
  completed_at: null,
  duration_minutes: 15,
  outcome: "positive",
  created_at: "2025-01-02T10:00:00Z",
  updated_at: "2025-01-02T10:00:00Z",
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockActivity],
};

describe("useActivities hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("activityKeys", () => {
    it("generates correct query keys", () => {
      expect(activityKeys.all).toEqual(["activities"]);
      expect(activityKeys.lists()).toEqual(["activities", "list"]);
      expect(activityKeys.list({ page: 1 })).toEqual([
        "activities",
        "list",
        { page: 1 },
      ]);
      expect(activityKeys.details()).toEqual(["activities", "detail"]);
      expect(activityKeys.detail("act-123")).toEqual([
        "activities",
        "detail",
        "act-123",
      ]);
    });
  });

  describe("useActivities", () => {
    it("fetches activities list successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useActivities());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith("/activities?");
    });

    it("passes filters to query params", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = {
        page: 2,
        page_size: 10,
        customer_id: "456",
        activity_type: "call",
      };
      const { result } = renderHookWithClient(() => useActivities(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("page_size=10"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("customer_id=456"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("activity_type=call"),
      );
    });

    it("handles API errors", async () => {
      const error = new Error("Network error");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useActivities());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("useActivity", () => {
    it("fetches single activity by ID", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockActivity });

      const { result } = renderHookWithClient(() => useActivity("act-123"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockActivity);
      expect(apiClient.get).toHaveBeenCalledWith("/activities/act-123");
    });

    it("does not fetch when id is undefined", () => {
      const { result } = renderHookWithClient(() => useActivity(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe("idle");
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe("useCreateActivity", () => {
    it("creates activity and invalidates list queries", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockActivity });

      const { result, queryClient } = renderHookWithClient(() =>
        useCreateActivity(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const newActivity = {
        customer_id: "456",
        activity_type: "call",
        subject: "Follow-up call",
        description: "Discussed upcoming service appointment",
        scheduled_at: "2025-01-03T10:00:00Z",
      };

      result.current.mutate(newActivity);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith("/activities", newActivity);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activityKeys.lists(),
      });
    });

    it("handles mutation errors", async () => {
      const error = new Error("Failed to create activity");
      vi.mocked(apiClient.post).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useCreateActivity());

      result.current.mutate({
        customer_id: "456",
        activity_type: "call",
        subject: "Test",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("useUpdateActivity", () => {
    it("updates activity and invalidates queries", async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockActivity, outcome: "neutral" },
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useUpdateActivity(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({
        id: "act-123",
        data: { outcome: "neutral" },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith("/activities/act-123", {
        outcome: "neutral",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activityKeys.detail("act-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activityKeys.lists(),
      });
    });

    it("marks activity as completed", async () => {
      const completedActivity = {
        ...mockActivity,
        completed_at: "2025-01-03T10:15:00Z",
      };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: completedActivity });

      const { result } = renderHookWithClient(() => useUpdateActivity());

      result.current.mutate({
        id: "act-123",
        data: { completed_at: "2025-01-03T10:15:00Z" },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith("/activities/act-123", {
        completed_at: "2025-01-03T10:15:00Z",
      });
    });
  });

  describe("useDeleteActivity", () => {
    it("deletes activity and invalidates list queries", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useDeleteActivity(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("act-123");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith("/activities/act-123");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activityKeys.lists(),
      });
    });

    it("handles delete errors", async () => {
      const error = new Error("Failed to delete activity");
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useDeleteActivity());

      result.current.mutate("act-123");

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });
});
