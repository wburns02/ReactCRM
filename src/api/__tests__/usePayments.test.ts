import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "./test-utils";
import {
  usePayments,
  usePayment,
  useRecordPayment,
  useUpdatePayment,
  useDeletePayment,
  usePaymentStats,
  paymentKeys,
} from "../hooks/usePayments";
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

const mockPayment = {
  id: "pay-123",
  invoice_id: "inv-456",
  customer_id: "789",
  customer_name: "John Doe",
  amount: 162.38,
  payment_method: "credit_card",
  status: "completed",
  payment_date: "2025-01-02",
  reference_number: "REF-2025-001",
  notes: "Payment for pest control service",
  created_at: "2025-01-02T10:00:00Z",
  updated_at: "2025-01-02T10:00:00Z",
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockPayment],
};

describe("usePayments hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("paymentKeys", () => {
    it("generates correct query keys", () => {
      expect(paymentKeys.all).toEqual(["payments"]);
      expect(paymentKeys.lists()).toEqual(["payments", "list"]);
      expect(paymentKeys.list({ page: 1 })).toEqual([
        "payments",
        "list",
        { page: 1 },
      ]);
      expect(paymentKeys.details()).toEqual(["payments", "detail"]);
      expect(paymentKeys.detail("pay-123")).toEqual([
        "payments",
        "detail",
        "pay-123",
      ]);
      expect(paymentKeys.stats()).toEqual(["payments", "stats"]);
    });
  });

  describe("usePayments", () => {
    it("fetches payments list successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => usePayments());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith("/payments?");
    });

    it("handles array response format", async () => {
      // Backend sometimes returns bare arrays
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockPayment] });

      const { result } = renderHookWithClient(() => usePayments());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        items: [mockPayment],
        total: 1,
        page: 1,
        page_size: 1,
      });
    });

    it("passes filters to query params", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = {
        page: 2,
        page_size: 10,
        status: "completed",
        payment_method: "credit_card",
        customer_id: "789",
      };
      const { result } = renderHookWithClient(() => usePayments(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("page_size=10"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("status=completed"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("payment_method=credit_card"),
      );
    });

    it("handles API errors", async () => {
      const error = new Error("Network error");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => usePayments());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe("usePayment", () => {
    it("fetches single payment by ID", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPayment });

      const { result } = renderHookWithClient(() => usePayment("pay-123"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPayment);
      expect(apiClient.get).toHaveBeenCalledWith("/payments/pay-123");
    });

    it("does not fetch when id is undefined", () => {
      const { result } = renderHookWithClient(() => usePayment(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe("idle");
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe("useRecordPayment", () => {
    it("records payment and invalidates list and stats queries", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPayment });

      const { result, queryClient } = renderHookWithClient(() =>
        useRecordPayment(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const newPayment = {
        invoice_id: "inv-456",
        amount: 162.38,
        payment_method: "credit_card",
        payment_date: "2025-01-02",
      };

      result.current.mutate(newPayment);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith("/payments", newPayment);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.lists(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.stats(),
      });
    });
  });

  describe("useUpdatePayment", () => {
    it("updates payment and invalidates queries", async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockPayment, status: "pending" },
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useUpdatePayment(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({
        id: "pay-123",
        data: { status: "pending" },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith("/payments/pay-123", {
        status: "pending",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.detail("pay-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.lists(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.stats(),
      });
    });
  });

  describe("useDeletePayment", () => {
    it("deletes payment and invalidates list and stats queries", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useDeletePayment(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("pay-123");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith("/payments/pay-123");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.lists(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: paymentKeys.stats(),
      });
    });
  });

  describe("usePaymentStats", () => {
    it("calculates payment statistics", async () => {
      const mockPayments = [
        {
          ...mockPayment,
          id: "1",
          status: "completed",
          amount: 100,
          payment_date: new Date().toISOString(),
        },
        {
          ...mockPayment,
          id: "2",
          status: "completed",
          amount: 200,
          payment_date: new Date().toISOString(),
        },
        {
          ...mockPayment,
          id: "3",
          status: "pending",
          amount: 150,
          payment_date: new Date().toISOString(),
        },
        {
          ...mockPayment,
          id: "4",
          status: "failed",
          amount: 50,
          payment_date: "2024-01-01",
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { items: mockPayments },
      });

      const { result } = renderHookWithClient(() => usePaymentStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toMatchObject({
        totalReceived: 300, // completed: 100 + 200
        completed: 2,
        pending: 1,
        failed: 1,
        thisMonth: 300, // Both completed payments are this month
      });
    });

    it("handles array response format", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const { result } = renderHookWithClient(() => usePaymentStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toMatchObject({
        totalReceived: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        thisMonth: 0,
      });
    });
  });
});
