import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "./test-utils";
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

// Import after mocking
import {
  useTechnicians,
  useTechnician,
  useCreateTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
  technicianKeys,
} from "../hooks/useTechnicians";

const mockTechnician = {
  id: "tech-1",
  user_id: "user-1",
  first_name: "Mike",
  last_name: "Johnson",
  email: "mike@example.com",
  phone: "512-555-0101",
  skills: ["HVAC", "Plumbing"],
  is_active: true,
  hourly_rate: 45.0,
  created_at: "2025-01-01T10:00:00Z",
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockTechnician],
};

describe("useTechnicians hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("technicianKeys", () => {
    it("generates correct query keys", () => {
      expect(technicianKeys.all).toEqual(["technicians"]);
      expect(technicianKeys.lists()).toEqual(["technicians", "list"]);
      expect(technicianKeys.list({ is_active: true })).toEqual([
        "technicians",
        "list",
        { is_active: true },
      ]);
      expect(technicianKeys.detail("tech-1")).toEqual([
        "technicians",
        "detail",
        "tech-1",
      ]);
    });
  });

  describe("useTechnicians", () => {
    it("fetches technicians list successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useTechnicians());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
    });

    it("handles errors gracefully", async () => {
      const error = new Error("Network error");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useTechnicians());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("useTechnician", () => {
    it("fetches single technician by ID", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTechnician });

      const { result } = renderHookWithClient(() => useTechnician("tech-1"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTechnician);
    });

    it("does not fetch when id is undefined", () => {
      const { result } = renderHookWithClient(() => useTechnician(undefined));

      expect(result.current.fetchStatus).toBe("idle");
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe("useCreateTechnician", () => {
    it("creates technician and invalidates list queries", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTechnician });

      const { result, queryClient } = renderHookWithClient(() =>
        useCreateTechnician(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({
        first_name: "Mike",
        last_name: "Johnson",
        email: "mike@example.com",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe("useUpdateTechnician", () => {
    it("updates technician and invalidates queries", async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockTechnician, hourly_rate: 50.0 },
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useUpdateTechnician(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({
        id: "tech-1",
        data: { hourly_rate: 50.0 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith("/technicians/tech-1", {
        hourly_rate: 50.0,
      });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe("useDeleteTechnician", () => {
    it("deletes technician and invalidates list queries", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useDeleteTechnician(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("tech-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith("/technicians/tech-1");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: technicianKeys.lists(),
      });
    });
  });
});
