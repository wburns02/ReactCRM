import { useState, useCallback } from 'react';
import {
  useProspects,
  useCreateProspect,
  useUpdateProspect,
  useDeleteProspect,
} from '@/api/hooks/useProspects.ts';
import { ProspectsList } from './ProspectsList.tsx';
import { PipelineView } from './components/PipelineView.tsx';
import { ProspectFilters } from './components/ProspectFilters.tsx';
import { ProspectForm } from './components/ProspectForm.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { ApiError } from '@/components/ui/ApiError.tsx';
import { ConfirmDialog } from '@/components/ui/Dialog.tsx';
import type { ProspectFilters as ProspectFiltersType } from '@/api/types/prospect.ts';
import type { Prospect, ProspectFormData } from '@/api/types/prospect.ts';

type ViewMode = 'list' | 'pipeline';

/**
 * Main Prospects page - list/pipeline view with filters and CRUD modals
 *
 * Features:
 * - Toggle between List and Pipeline (Kanban) views
 * - Paginated list with filters (search, stage, source)
 * - Drag-and-drop stage updates in Pipeline view
 * - Create/Edit modal with form validation
 * - Delete confirmation dialog
 * - Error handling with retry and fallback to legacy
 */
export function ProspectsPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filter state
  const [filters, setFilters] = useState<ProspectFiltersType>({
    page: 1,
    page_size: viewMode === 'pipeline' ? 100 : 20, // Load more for pipeline view
  });

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null);

  // Data fetching - larger page size for pipeline view
  const { data, isLoading, error, refetch } = useProspects({
    ...filters,
    page_size: viewMode === 'pipeline' ? 100 : filters.page_size,
  });

  // Mutations
  const createMutation = useCreateProspect();
  const updateMutation = useUpdateProspect();
  const deleteMutation = useDeleteProspect();

  // View mode toggle handler
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset pagination when switching views
    setFilters((prev) => ({
      ...prev,
      page: 1,
      page_size: mode === 'pipeline' ? 100 : 20,
    }));
  };

  // Filter handlers
  const handleFilterChange = useCallback((newFilters: Partial<ProspectFiltersType>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // CRUD handlers
  const handleCreate = () => {
    setEditingProspect(null);
    setIsFormOpen(true);
  };

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (prospect: Prospect) => {
    setDeletingProspect(prospect);
  };

  const handleFormSubmit = async (data: ProspectFormData) => {
    if (editingProspect) {
      await updateMutation.mutateAsync({ id: editingProspect.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingProspect) {
      await deleteMutation.mutateAsync(deletingProspect.id);
      setDeletingProspect(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProspect(null);
  };

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Prospects</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your sales pipeline and track leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-bg-subtle rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              List
            </button>
            <button
              onClick={() => handleViewModeChange('pipeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'pipeline'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Pipeline
            </button>
          </div>
          <Button onClick={handleCreate}>+ Add Prospect</Button>
        </div>
      </div>

      {/* Filters - only show in list view or for search */}
      {viewMode === 'list' && (
        <Card className="mb-6">
          <ProspectFilters filters={filters} onFilterChange={handleFilterChange} />
        </Card>
      )}

      {/* Search bar for pipeline view */}
      {viewMode === 'pipeline' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search prospects..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="w-full max-w-md px-4 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      )}

      {/* Error state - handles 500, network errors, etc. */}
      {error && (
        <div className="mb-6">
          <ApiError
            error={error}
            onRetry={() => refetch()}
            title="Failed to load prospects"
          />
        </div>
      )}

      {/* Content */}
      {!error && (
        <>
          {viewMode === 'list' ? (
            <Card>
              <ProspectsList
                prospects={data?.items || []}
                total={data?.total || 0}
                page={filters.page || 1}
                pageSize={filters.page_size || 20}
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            </Card>
          ) : (
            <div className="flex-1 min-h-0 bg-bg-subtle rounded-lg border border-border overflow-hidden">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-text-muted">Loading pipeline...</div>
                </div>
              ) : (
                <PipelineView
                  prospects={data?.items || []}
                  onEdit={handleEdit}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Form Modal */}
      <ProspectForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        prospect={editingProspect}
        isLoading={isFormLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingProspect}
        onClose={() => setDeletingProspect(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Prospect"
        message={`Are you sure you want to delete ${deletingProspect?.first_name} ${deletingProspect?.last_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
