import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useTickets,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "@/api/hooks/useTickets.ts";
import { TicketsList } from "./components/TicketsList.tsx";
import { TicketForm } from "./components/TicketForm.tsx";
import { TicketFilters } from "./components/TicketFilters.tsx";
import {
  type Ticket,
  type TicketFormData,
  type TicketFilters as TicketFiltersType,
  type TicketType,
  type TicketStatus,
  type TicketPriority,
} from "@/api/types/ticket.ts";

const PAGE_SIZE = 20;

/**
 * Tickets list page with CRUD operations
 */
export function TicketsPage() {
  // Filters state
  const [filters, setFilters] = useState<TicketFiltersType>({
    page: 1,
    page_size: PAGE_SIZE,
    search: "",
    type: undefined,
    status: undefined,
    priority: undefined,
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  // Delete confirmation state
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);

  // Fetch tickets
  const { data, isLoading, error } = useTickets(filters);

  // Mutations
  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket();
  const deleteMutation = useDeleteTicket();

  // Filter handlers
  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  }, []);

  const handleTypeFilter = useCallback((value: TicketType | undefined) => {
    setFilters((prev) => ({ ...prev, type: value, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((value: TicketStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  }, []);

  const handlePriorityFilter = useCallback(
    (value: TicketPriority | undefined) => {
      setFilters((prev) => ({ ...prev, priority: value, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // CRUD handlers
  const handleCreate = useCallback(() => {
    setEditingTicket(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((ticket: Ticket) => {
    setDeletingTicket(ticket);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: TicketFormData) => {
      if (editingTicket) {
        await updateMutation.mutateAsync({ id: editingTicket.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingTicket(null);
    },
    [editingTicket, createMutation, updateMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingTicket) {
      await deleteMutation.mutateAsync(deletingTicket.id);
      setDeletingTicket(null);
    }
  }, [deletingTicket, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">
              Failed to load tickets. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Tickets</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track and manage support tickets and feature requests
          </p>
        </div>
        <Button onClick={handleCreate}>+ Create Ticket</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <TicketFilters
            search={filters.search || ""}
            type={filters.type}
            status={filters.status}
            priority={filters.priority}
            onSearchChange={handleSearch}
            onTypeChange={handleTypeFilter}
            onStatusChange={handleStatusFilter}
            onPriorityChange={handlePriorityFilter}
          />
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total
              ? `${data.total} ticket${data.total !== 1 ? "s" : ""}`
              : "Tickets"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TicketsList
            tickets={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      <TicketForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTicket(null);
        }}
        onSubmit={handleFormSubmit}
        ticket={editingTicket}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTicket} onClose={() => setDeletingTicket(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingTicket(null)}>
            Delete Ticket
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete ticket{" "}
              <span className="font-medium text-text-primary">
                {deletingTicket?.title}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingTicket(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
