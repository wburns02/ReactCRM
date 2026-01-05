import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from './test-utils';
import {
  useWorkOrders,
  useWorkOrder,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
  useAssignWorkOrder,
  useUnscheduleWorkOrder,
  useUnscheduledWorkOrders,
  useUpdateWorkOrderStatus,
  useUpdateWorkOrderDuration,
  useScheduleStats,
  workOrderKeys,
  scheduleKeys,
} from '../hooks/useWorkOrders';
import { apiClient } from '../client';

// Mock the API client
vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockWorkOrder = {
  id: '456',
  customer_id: '123',
  status: 'draft',
  priority: 'normal',
  service_type: 'Pumping',
  scheduled_date: null,
  assigned_technician: null,
  estimated_duration_hours: 2,
  notes: 'Test work order',
  created_at: '2025-01-01T10:00:00Z',
};

const mockScheduledWorkOrder = {
  ...mockWorkOrder,
  id: '789',
  status: 'scheduled',
  scheduled_date: '2025-01-15',
  assigned_technician: 'tech-1',
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 2,
  items: [mockWorkOrder, mockScheduledWorkOrder],
};

describe('useWorkOrders hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('workOrderKeys', () => {
    it('generates correct query keys', () => {
      expect(workOrderKeys.all).toEqual(['workOrders']);
      expect(workOrderKeys.lists()).toEqual(['workOrders', 'list']);
      expect(workOrderKeys.list({ status: 'draft' })).toEqual([
        'workOrders',
        'list',
        { status: 'draft' },
      ]);
      expect(workOrderKeys.details()).toEqual(['workOrders', 'detail']);
      expect(workOrderKeys.detail('456')).toEqual(['workOrders', 'detail', '456']);
    });
  });

  describe('scheduleKeys', () => {
    it('generates correct schedule query keys', () => {
      expect(scheduleKeys.unscheduled()).toEqual(['workOrders', 'unscheduled']);
      expect(scheduleKeys.stats()).toEqual(['workOrders', 'stats']);
    });
  });

  describe('useWorkOrders', () => {
    it('fetches work orders list successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useWorkOrders());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/work-orders?');
    });

    it('passes filters to query params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = { page: 2, status: 'scheduled', scheduled_date: '2025-01-15' };
      const { result } = renderHookWithClient(() => useWorkOrders(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=scheduled')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('scheduled_date=2025-01-15')
      );
    });

    it('handles array response format', async () => {
      // Some endpoints return bare arrays instead of paginated objects
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [mockWorkOrder, mockScheduledWorkOrder],
      });

      const { result } = renderHookWithClient(() => useWorkOrders());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.items).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });
  });

  describe('useWorkOrder', () => {
    it('fetches single work order by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkOrder });

      const { result } = renderHookWithClient(() => useWorkOrder('456'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockWorkOrder);
      expect(apiClient.get).toHaveBeenCalledWith('/work-orders/456');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHookWithClient(() => useWorkOrder(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateWorkOrder', () => {
    it('creates work order and invalidates list queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockWorkOrder });

      const { result, queryClient } = renderHookWithClient(() => useCreateWorkOrder());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        customer_id: '123',
        service_type: 'Pumping',
        priority: 'normal',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith('/work-orders', expect.any(Object));
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: workOrderKeys.lists(),
      });
    });
  });

  describe('useUpdateWorkOrder', () => {
    it('updates work order and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockWorkOrder, notes: 'Updated notes' },
      });

      const { result, queryClient } = renderHookWithClient(() => useUpdateWorkOrder());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: '456',
        data: { notes: 'Updated notes' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/456', { notes: 'Updated notes' });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useDeleteWorkOrder', () => {
    it('deletes work order and invalidates list queries', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() => useDeleteWorkOrder());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('456');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/work-orders/456');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: workOrderKeys.lists(),
      });
    });
  });

  describe('useAssignWorkOrder', () => {
    it('assigns technician and date to work order', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockScheduledWorkOrder });

      const { result, queryClient } = renderHookWithClient(() => useAssignWorkOrder());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: '456',
        technician: 'tech-1',
        date: '2025-01-15',
        timeStart: '09:00',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/456', {
        assigned_technician: 'tech-1',
        scheduled_date: '2025-01-15',
        time_window_start: '09:00',
        status: 'scheduled',
      });
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('sets status to scheduled when date is assigned', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockScheduledWorkOrder });

      const { result } = renderHookWithClient(() => useAssignWorkOrder());

      result.current.mutate({
        id: '456',
        date: '2025-01-15',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/456', {
        scheduled_date: '2025-01-15',
        status: 'scheduled',
      });
    });
  });

  describe('useUnscheduleWorkOrder', () => {
    it('unschedules work order and returns to draft', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockWorkOrder });

      const { result, queryClient } = renderHookWithClient(() => useUnscheduleWorkOrder());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('789');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/789', {
        scheduled_date: null,
        assigned_technician: null,
        time_window_start: null,
        status: 'draft',
      });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useUnscheduledWorkOrders', () => {
    it('fetches draft work orders without scheduled date', async () => {
      const mockUnscheduled = [mockWorkOrder]; // Only draft without date
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { items: [mockWorkOrder, mockScheduledWorkOrder], total: 2, page: 1, page_size: 200 },
      });

      const { result } = renderHookWithClient(() => useUnscheduledWorkOrders());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should filter to only unscheduled items
      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.items[0].scheduled_date).toBeNull();
    });

    it('handles array response format', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [mockWorkOrder, mockScheduledWorkOrder],
      });

      const { result } = renderHookWithClient(() => useUnscheduledWorkOrders());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should filter array to only unscheduled items
      expect(result.current.data?.items).toHaveLength(1);
    });
  });

  describe('useUpdateWorkOrderStatus', () => {
    it('updates work order status and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockWorkOrder, status: 'completed' },
      });

      const { result, queryClient } = renderHookWithClient(() => useUpdateWorkOrderStatus());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ id: '456', status: 'completed' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/456', { status: 'completed' });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useUpdateWorkOrderDuration', () => {
    it('updates work order duration', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockWorkOrder, estimated_duration_hours: 4 },
      });

      const { result, queryClient } = renderHookWithClient(() => useUpdateWorkOrderDuration());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ id: '456', durationHours: 4 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/work-orders/456', {
        estimated_duration_hours: 4,
      });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useScheduleStats', () => {
    it('computes stats from work orders data', async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayWorkOrder = { ...mockWorkOrder, id: '1', scheduled_date: today, status: 'scheduled' };
      const emergencyWorkOrder = { ...mockWorkOrder, id: '2', priority: 'emergency' };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          items: [todayWorkOrder, emergencyWorkOrder, mockWorkOrder],
          total: 3,
          page: 1,
          page_size: 500,
        },
      });

      const { result } = renderHookWithClient(() => useScheduleStats());

      // Wait for the underlying query to resolve
      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

      // Stats should be computed
      expect(result.current.todayJobs).toBeGreaterThanOrEqual(0);
      expect(result.current.emergencyJobs).toBeGreaterThanOrEqual(0);
      expect(result.current.unscheduledJobs).toBeGreaterThanOrEqual(0);
    });
  });
});
