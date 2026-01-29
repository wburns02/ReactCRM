import { useState, useCallback } from "react";
import {
  useCommissionStats,
  useCommissionsList,
  useUpdateCommission,
  useBulkApproveCommissions,
  useBulkMarkPaidCommissions,
} from "@/api/hooks/usePayroll.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import type { CommissionFilters, Commission } from "@/api/types/payroll.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

import { CommissionStatsCards } from "./CommissionStatsCards.tsx";
import { CommissionFilters as CommissionFiltersComponent } from "./CommissionFilters.tsx";
import { CommissionsTable } from "./CommissionsTable.tsx";
import { BulkActionsBar } from "./BulkActionsBar.tsx";
import { CommissionLeaderboard } from "./CommissionLeaderboard.tsx";
import { CommissionInsightsPanel } from "./CommissionInsightsPanel.tsx";
import { CommissionFormModal } from "./CommissionFormModal.tsx";
import { ExportButton } from "./ExportButton.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { LayoutList, Trophy, Plus } from "lucide-react";

type TabType = "list" | "insights";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

interface CommissionsDashboardProps {
  technicianId?: string;
}

export function CommissionsDashboard({
  technicianId,
}: CommissionsDashboardProps) {
  // Filter state
  const [filters, setFilters] = useState<CommissionFilters>({
    status: "all",
    technician_id: technicianId || undefined,
    commission_type: "all",
    date_from: undefined,
    date_to: undefined,
    page: 1,
    page_size: 20,
  });

  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>("list");

  // Commission form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(
    null,
  );

  // Data fetching
  const { data: stats, isLoading: statsLoading } = useCommissionStats();
  const { data: commissionsData, isLoading: listLoading } =
    useCommissionsList(filters);
  const { data: techniciansData } = useTechnicians({ active_only: true });

  // Mutations
  const updateCommission = useUpdateCommission();
  const bulkApprove = useBulkApproveCommissions();
  const bulkMarkPaid = useBulkMarkPaidCommissions();

  // Handlers
  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await updateCommission.mutateAsync({
          commissionId: id,
          input: { status: "approved" },
        });
        toastSuccess("Commission Approved", "Commission has been approved");
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
      } catch (error) {
        toastError("Error", getErrorMessage(error));
      }
    },
    [updateCommission, selectedIds],
  );

  const handleMarkPaid = useCallback(
    async (id: string) => {
      try {
        await updateCommission.mutateAsync({
          commissionId: id,
          input: { status: "paid" },
        });
        toastSuccess("Commission Paid", "Commission marked as paid");
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
      } catch (error) {
        toastError("Error", getErrorMessage(error));
      }
    },
    [updateCommission, selectedIds],
  );

  const handleBulkApprove = useCallback(async () => {
    try {
      const ids = Array.from(selectedIds);
      await bulkApprove.mutateAsync(ids);
      toastSuccess(
        "Commissions Approved",
        `${ids.length} commission(s) approved`,
      );
      setSelectedIds(new Set());
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  }, [bulkApprove, selectedIds]);

  const handleBulkMarkPaid = useCallback(async () => {
    try {
      const ids = Array.from(selectedIds);
      await bulkMarkPaid.mutateAsync(ids);
      toastSuccess(
        "Commissions Paid",
        `${ids.length} commission(s) marked as paid`,
      );
      setSelectedIds(new Set());
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  }, [bulkMarkPaid, selectedIds]);

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedIds(new Set());
  };

  // Modal handlers
  const handleAddCommission = useCallback(() => {
    setEditingCommission(null);
    setShowFormModal(true);
  }, []);

  const handleEditCommission = useCallback((commission: Commission) => {
    setEditingCommission(commission);
    setShowFormModal(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingCommission(null);
  }, []);

  const technicians = techniciansData?.items || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards Section */}
      <CommissionStatsCards stats={stats} isLoading={statsLoading} />

      {/* Filters Section */}
      <CommissionFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        technicians={technicians}
        isLoading={listLoading}
      />

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("list")}
            className="flex items-center gap-2"
          >
            <LayoutList className="w-4 h-4" />
            Commissions List
          </Button>
          <Button
            variant={activeTab === "insights" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("insights")}
            className="flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Leaderboard & Insights
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddCommission}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Commission
          </Button>
          <ExportButton filters={filters} />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "list" && (
        <div>
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <BulkActionsBar
              selectedCount={selectedIds.size}
              onApproveAll={handleBulkApprove}
              onMarkPaid={handleBulkMarkPaid}
              onClear={() => setSelectedIds(new Set())}
              isApproving={bulkApprove.isPending}
              isMarkingPaid={bulkMarkPaid.isPending}
            />
          )}

          <CommissionsTable
            commissions={commissionsData?.commissions || []}
            total={commissionsData?.total || 0}
            page={filters.page || 1}
            pageSize={filters.page_size || 20}
            isLoading={listLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onPageChange={handlePageChange}
            onApprove={handleApprove}
            onMarkPaid={handleMarkPaid}
            onEdit={handleEditCommission}
          />
        </div>
      )}

      {activeTab === "insights" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <CommissionLeaderboard />
          <CommissionInsightsPanel />
        </div>
      )}

      {/* Add/Edit Commission Modal */}
      <CommissionFormModal
        open={showFormModal}
        onClose={handleCloseFormModal}
        commission={editingCommission}
      />
    </div>
  );
}
