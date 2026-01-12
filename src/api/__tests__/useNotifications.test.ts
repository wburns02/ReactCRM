import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "./test-utils";
import {
  useNotifications,
  useNotificationStats,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  usePushSubscriptions,
  useRegisterPushSubscription,
  useUnregisterPushSubscription,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useSendTestNotification,
  useVapidPublicKey,
  notificationKeys,
} from "../hooks/useNotifications";
import { apiClient, withFallback } from "../client";

// Mock the API client
vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  withFallback: vi.fn((fn, defaultValue) => fn().catch(() => defaultValue)),
}));

const mockNotification = {
  id: "notif-123",
  user_id: 1,
  type: "work_order" as const,
  title: "New Work Order Assigned",
  body: "You have been assigned work order WO-2025-001",
  data: { work_order_id: "wo-123" },
  read: false,
  created_at: "2025-01-02T10:00:00Z",
  action_url: "/work-orders/wo-123",
};

const mockPreferences = {
  user_id: 1,
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  work_order_assigned: true,
  work_order_updated: true,
  work_order_completed: true,
  schedule_changes: true,
  customer_messages: true,
  payment_received: true,
  invoice_overdue: true,
  system_alerts: true,
  marketing_updates: false,
  quiet_hours_enabled: false,
  quiet_start: "22:00",
  quiet_end: "07:00",
};

const mockStats = {
  total: 10,
  unread: 3,
  by_type: { work_order: 5, schedule: 3, payment: 2 },
};

const mockSubscription = {
  id: "sub-123",
  user_id: 1,
  endpoint: "https://push.service.example.com/abc123",
  p256dh: "base64-p256dh-key",
  auth: "base64-auth-key",
  device_name: "Chrome on Windows",
  created_at: "2025-01-01T10:00:00Z",
  last_used: "2025-01-02T10:00:00Z",
  is_active: true,
};

describe("useNotifications hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset withFallback to default behavior
    vi.mocked(withFallback).mockImplementation((fn, defaultValue) =>
      fn().catch(() => defaultValue),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("notificationKeys", () => {
    it("generates correct query keys", () => {
      expect(notificationKeys.all).toEqual(["notifications"]);
      expect(notificationKeys.lists()).toEqual(["notifications", "list"]);
      expect(notificationKeys.list({ unread_only: true })).toEqual([
        "notifications",
        "list",
        { unread_only: true },
      ]);
      expect(notificationKeys.stats()).toEqual(["notifications", "stats"]);
      expect(notificationKeys.preferences()).toEqual([
        "notifications",
        "preferences",
      ]);
      expect(notificationKeys.subscriptions()).toEqual([
        "notifications",
        "subscriptions",
      ]);
    });
  });

  describe("useNotifications", () => {
    it("fetches notifications list successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { notifications: [mockNotification], total: 1 },
      });

      const { result } = renderHookWithClient(() => useNotifications());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        notifications: [mockNotification],
        total: 1,
      });
    });

    it("passes filters to query params", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { notifications: [], total: 0 },
      });

      const filters = { unread_only: true, type: "work_order", limit: 10 };
      const { result } = renderHookWithClient(() => useNotifications(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("unread_only=true"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("type=work_order"),
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
      );
    });

    it("returns default value when endpoint not implemented (404)", async () => {
      vi.mocked(withFallback).mockResolvedValue({
        notifications: [],
        total: 0,
      });

      const { result } = renderHookWithClient(() => useNotifications());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({ notifications: [], total: 0 });
    });
  });

  describe("useNotificationStats", () => {
    it("fetches notification stats successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      const { result } = renderHookWithClient(() => useNotificationStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStats);
    });

    it("returns default stats on 404", async () => {
      vi.mocked(withFallback).mockResolvedValue({
        total: 0,
        unread: 0,
        by_type: {},
      });

      const { result } = renderHookWithClient(() => useNotificationStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({ total: 0, unread: 0, by_type: {} });
    });
  });

  describe("useNotificationPreferences", () => {
    it("fetches notification preferences successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPreferences });

      const { result } = renderHookWithClient(() =>
        useNotificationPreferences(),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPreferences);
    });
  });

  describe("useUpdateNotificationPreferences", () => {
    it("updates preferences and invalidates query", async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { ...mockPreferences, sms_enabled: true },
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useUpdateNotificationPreferences(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({ sms_enabled: true });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.put).toHaveBeenCalledWith("/notifications/preferences", {
        sms_enabled: true,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.preferences(),
      });
    });
  });

  describe("usePushSubscriptions", () => {
    it("fetches push subscriptions successfully", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { subscriptions: [mockSubscription] },
      });

      const { result } = renderHookWithClient(() => usePushSubscriptions());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockSubscription]);
    });

    it("returns empty array on 404", async () => {
      vi.mocked(withFallback).mockResolvedValue([]);

      const { result } = renderHookWithClient(() => usePushSubscriptions());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useRegisterPushSubscription", () => {
    it("registers subscription and invalidates query", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockSubscription });

      const { result, queryClient } = renderHookWithClient(() =>
        useRegisterPushSubscription(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate({
        endpoint: "https://push.service.example.com/abc123",
        p256dh: "base64-p256dh-key",
        auth: "base64-auth-key",
        device_name: "Chrome on Windows",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/notifications/push/subscribe",
        {
          endpoint: "https://push.service.example.com/abc123",
          p256dh: "base64-p256dh-key",
          auth: "base64-auth-key",
          device_name: "Chrome on Windows",
        },
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.subscriptions(),
      });
    });
  });

  describe("useUnregisterPushSubscription", () => {
    it("unregisters subscription and invalidates query", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useUnregisterPushSubscription(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("sub-123");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith(
        "/notifications/push/subscriptions/sub-123",
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.subscriptions(),
      });
    });
  });

  describe("useMarkNotificationRead", () => {
    it("marks notification as read and invalidates all notification queries", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useMarkNotificationRead(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("notif-123");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith(
        "/notifications/notif-123/read",
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.all,
      });
    });
  });

  describe("useMarkAllNotificationsRead", () => {
    it("marks all notifications as read and invalidates queries", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useMarkAllNotificationsRead(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith("/notifications/read-all");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.all,
      });
    });
  });

  describe("useDeleteNotification", () => {
    it("deletes notification and invalidates queries", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() =>
        useDeleteNotification(),
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      result.current.mutate("notif-123");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith("/notifications/notif-123");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: notificationKeys.all,
      });
    });
  });

  describe("useSendTestNotification", () => {
    it("sends test notification", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      const { result } = renderHookWithClient(() => useSendTestNotification());

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith("/notifications/push/test");
      expect(result.current.data).toEqual({ success: true });
    });
  });

  describe("useVapidPublicKey", () => {
    it("fetches VAPID public key", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { public_key: "BEAbc123..." },
      });

      const { result } = renderHookWithClient(() => useVapidPublicKey());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({ public_key: "BEAbc123..." });
    });

    it("returns empty key on 404", async () => {
      vi.mocked(withFallback).mockResolvedValue({ public_key: "" });

      const { result } = renderHookWithClient(() => useVapidPublicKey());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({ public_key: "" });
    });
  });
});
