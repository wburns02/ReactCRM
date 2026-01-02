import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from './test-utils';
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  customerKeys,
} from '../hooks/useCustomers';
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

const mockCustomer = {
  id: '123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '512-555-0100',
  address_line1: '123 Main St',
  city: 'Austin',
  state: 'TX',
  postal_code: '78701',
  is_active: true,
  customer_type: 'residential',
  created_at: '2025-01-01T10:00:00Z',
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockCustomer],
};

describe('useCustomers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('customerKeys', () => {
    it('generates correct query keys', () => {
      expect(customerKeys.all).toEqual(['customers']);
      expect(customerKeys.lists()).toEqual(['customers', 'list']);
      expect(customerKeys.list({ page: 1 })).toEqual(['customers', 'list', { page: 1 }]);
      expect(customerKeys.details()).toEqual(['customers', 'detail']);
      expect(customerKeys.detail('123')).toEqual(['customers', 'detail', '123']);
    });
  });

  describe('useCustomers', () => {
    it('fetches customers list successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useCustomers());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/customers/?');
    });

    it('passes filters to query params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = { page: 2, page_size: 10, search: 'john' };
      const { result } = renderHookWithClient(() => useCustomers(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=john')
      );
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useCustomers());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('useCustomer', () => {
    it('fetches single customer by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCustomer });

      const { result } = renderHookWithClient(() => useCustomer('123'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCustomer);
      expect(apiClient.get).toHaveBeenCalledWith('/customers/123');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHookWithClient(() => useCustomer(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCustomer', () => {
    it('creates customer and invalidates list queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCustomer });

      const { result, queryClient } = renderHookWithClient(() => useCreateCustomer());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith('/customers/', {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customerKeys.lists(),
      });
    });
  });

  describe('useUpdateCustomer', () => {
    it('updates customer and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockCustomer, first_name: 'Jane' } });

      const { result, queryClient } = renderHookWithClient(() => useUpdateCustomer());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: '123',
        data: { first_name: 'Jane' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/customers/123', { first_name: 'Jane' });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customerKeys.detail('123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customerKeys.lists(),
      });
    });
  });

  describe('useDeleteCustomer', () => {
    it('deletes customer and invalidates list queries', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() => useDeleteCustomer());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/customers/123');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customerKeys.lists(),
      });
    });
  });
});
