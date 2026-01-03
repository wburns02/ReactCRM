import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from './test-utils';
import {
  useProspects,
  useProspect,
  useCreateProspect,
  useUpdateProspect,
  useUpdateProspectStage,
  useDeleteProspect,
  prospectKeys,
} from '../hooks/useProspects';
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

const mockProspect = {
  id: 'abc-123',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  phone: '512-555-0200',
  company: 'Acme Corp',
  address_line1: '456 Oak Ave',
  city: 'Austin',
  state: 'TX',
  postal_code: '78702',
  stage: 'qualified',
  lead_source: 'website',
  estimated_value: 5000,
  notes: 'Interested in pest control',
  created_at: '2025-01-02T10:00:00Z',
  updated_at: '2025-01-02T10:00:00Z',
};

const mockListResponse = {
  page: 1,
  page_size: 20,
  total: 1,
  items: [mockProspect],
};

describe('useProspects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('prospectKeys', () => {
    it('generates correct query keys', () => {
      expect(prospectKeys.all).toEqual(['prospects']);
      expect(prospectKeys.lists()).toEqual(['prospects', 'list']);
      expect(prospectKeys.list({ page: 1 })).toEqual(['prospects', 'list', { page: 1 }]);
      expect(prospectKeys.details()).toEqual(['prospects', 'detail']);
      expect(prospectKeys.detail('abc-123')).toEqual(['prospects', 'detail', 'abc-123']);
    });
  });

  describe('useProspects', () => {
    it('fetches prospects list successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const { result } = renderHookWithClient(() => useProspects());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/prospects/?');
    });

    it('passes filters to query params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockListResponse });

      const filters = { page: 2, page_size: 10, search: 'jane', stage: 'qualified' };
      const { result } = renderHookWithClient(() => useProspects(filters));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=jane')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('stage=qualified')
      );
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHookWithClient(() => useProspects());

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('useProspect', () => {
    it('fetches single prospect by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockProspect });

      const { result } = renderHookWithClient(() => useProspect('abc-123'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProspect);
      expect(apiClient.get).toHaveBeenCalledWith('/prospects/abc-123');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHookWithClient(() => useProspect(undefined));

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProspect', () => {
    it('creates prospect and invalidates list queries', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockProspect });

      const { result, queryClient } = renderHookWithClient(() => useCreateProspect());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        stage: 'new',
        lead_source: 'website',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.post).toHaveBeenCalledWith('/prospects/', {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        stage: 'new',
        lead_source: 'website',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.lists(),
      });
    });
  });

  describe('useUpdateProspect', () => {
    it('updates prospect and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockProspect, company: 'Updated Corp' } });

      const { result, queryClient } = renderHookWithClient(() => useUpdateProspect());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: 'abc-123',
        data: { company: 'Updated Corp' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/prospects/abc-123', { company: 'Updated Corp' });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.detail('abc-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.lists(),
      });
    });
  });

  describe('useUpdateProspectStage', () => {
    it('updates prospect stage and invalidates queries', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockProspect, stage: 'won' } });

      const { result, queryClient } = renderHookWithClient(() => useUpdateProspectStage());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        id: 'abc-123',
        stage: 'won',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.patch).toHaveBeenCalledWith('/prospects/abc-123/stage', { stage: 'won' });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.detail('abc-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.lists(),
      });
    });
  });

  describe('useDeleteProspect', () => {
    it('deletes prospect and invalidates list queries', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result, queryClient } = renderHookWithClient(() => useDeleteProspect());

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('abc-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/prospects/abc-123');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prospectKeys.lists(),
      });
    });
  });
});
