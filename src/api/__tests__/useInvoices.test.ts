import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from './test-utils';
import {
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useMarkInvoicePaid,
  invoiceKeys,
} from '../hooks/useInvoices';
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

const mockLineItem = {
  id: 'line-1',
  description: 'Pest control service',
  quantity: 1,
  rate: 150,
  amount: 150,
};

const mockInvoice = {
  id: 'inv-123',
  invoice_number: 'INV-2025-001',
  customer_id: '456',
  customer_name: 'John Doe',
  work_order_id: 'wo-789',
  status: 'draft',
  issue_date: '2025-01-02',
  due_date: '2025-01-16',
  line_items: [mockLineItem],
  subtotal: 150,
  tax_rate: 8.25,
  tax: 12.38,
  total: 162.38,
  notes: 'Thank you for your business',
  created_at: '2025-01-02T10:00:00Z',
  updated_at: '2025-01-02T10:00:00Z',
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockInvoice],
};

describe('useInvoices hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('invoiceKeys', () => {
    it('generates correct query keys', () => {
      expect(invoiceKeys.all).toEqual(['invoices']);
      expect(invoiceKeys.lists()).toEqual(['invoices', 'list']);
      expect(invoiceKeys.list({ page: 1 })).toEqual(['invoices', 'list', { page: 1 }]);
      expect(invoiceKeys.details()).toEqual(['invoices', 'detail']);
      expect(invoiceKeys.detail('inv-123')).toEqual(['invoices', 'detail', 'inv-123']);
    });
  });

  describe('useInvoices', () => {
    it('fetches invoices list successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useInvoices());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/invoices?');
    });

    it('handles array response format', async () => {
      // Backend sometimes returns bare arrays
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockInvoice] });

      const { result } = renderHookWithClient(() => useInvoices());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        items: [mockInvoice],
        total: 1,
        page: 1,
        page_size: 1,
      });
    });

    it('passes filters to query params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = { page: 2, page_size: 10, status: 'draft', customer_id: '456' };
      const { result } = renderHookWithClient(() => useInvoices(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=draft')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('customer_id=456')
      );
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useInvoices());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('useInvoice', () => {
    it('fetches single invoice by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockInvoice });

      const { result } = renderHookWithClient(() => useInvoice('inv-123'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockInvoice);
      expect(apiClient.get).toHaveBeenCalledWith('/invoices/inv-123');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHookWithClient(() => useInvoice(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateInvoice', () => {
    it('creates invoice with calculated totals and invalidates list queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInvoice });

      const { result, queryClient } = renderHookWithClient(() => useCreateInvoice());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const newInvoice = {
        customer_id: '456',
        work_order_id: 'wo-789',
        issue_date: '2025-01-02',
        due_date: '2025-01-16',
        line_items: [{ description: 'Service', quantity: 2, rate: 100 }],
        tax_rate: 8.25,
      };

      result.current.mutate(newInvoice);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify totals are calculated
      expect(apiClient.post).toHaveBeenCalledWith('/invoices', expect.objectContaining({
        customer_id: '456',
        line_items: [{ description: 'Service', quantity: 2, rate: 100, amount: 200 }],
        subtotal: 200,
        tax: 16.5, // 200 * 0.0825
        total: 216.5,
      }));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.lists(),
      });
    });
  });

  describe('useUpdateInvoice', () => {
    it('updates invoice and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockInvoice, status: 'sent' } });

      const { result, queryClient } = renderHookWithClient(() => useUpdateInvoice());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: 'inv-123',
        data: { status: 'sent' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/invoices/inv-123', { status: 'sent' });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.detail('inv-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.lists(),
      });
    });

    it('recalculates line item amounts when updating line items', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockInvoice });

      const { result } = renderHookWithClient(() => useUpdateInvoice());

      result.current.mutate({
        id: 'inv-123',
        data: {
          line_items: [{ description: 'Updated service', quantity: 3, rate: 50 }],
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/invoices/inv-123', {
        line_items: [{ description: 'Updated service', quantity: 3, rate: 50, amount: 150 }],
      });
    });
  });

  describe('useDeleteInvoice', () => {
    it('deletes invoice and invalidates list queries', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() => useDeleteInvoice());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('inv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/invoices/inv-123');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.lists(),
      });
    });
  });

  describe('useSendInvoice', () => {
    it('sends invoice and invalidates queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...mockInvoice, status: 'sent' } });

      const { result, queryClient } = renderHookWithClient(() => useSendInvoice());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('inv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith('/invoices/inv-123/send');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.detail('inv-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.lists(),
      });
    });
  });

  describe('useMarkInvoicePaid', () => {
    it('marks invoice as paid and invalidates queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...mockInvoice, status: 'paid' } });

      const { result, queryClient } = renderHookWithClient(() => useMarkInvoicePaid());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('inv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith('/invoices/inv-123/mark-paid');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.detail('inv-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: invoiceKeys.lists(),
      });
    });
  });
});
