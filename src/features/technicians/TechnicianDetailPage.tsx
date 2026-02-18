import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
} from "@/components/ui/Tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
  useTechnicianPerformance,
} from "@/api/hooks/useTechnicians.ts";
import { useTimeEntries } from "@/api/hooks/usePayroll.ts";
import { TechnicianForm } from "./components/TechnicianForm.tsx";
import { TechOverviewTab } from "./components/TechOverviewTab.tsx";
import { TechJobsTab } from "./components/TechJobsTab.tsx";
import { TechTimesheetsTab } from "./components/TechTimesheetsTab.tsx";
import { TechComplianceTab } from "./components/TechComplianceTab.tsx";
import { TechCompensationTab } from "./components/TechCompensationTab.tsx";
import { TechDetailsTab } from "./components/TechDetailsTab.tsx";
import type { TechnicianFormData } from "@/api/types/technician.ts";
import { formatCurrency } from "@/lib/utils.ts";

/**
 * Comprehensive technician profile page with tabbed layout
 * Shows all technician data: overview, jobs, timesheets, compliance, compensation, details
 */
export function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const { data: technician, isLoading, error } = useTechnician(id);
  const updateMutation = useUpdateTechnician();
  const deleteMutation = useDeleteTechnician();
  const { data: perfStats } = useTechnicianPerformance(id);

  // Fetch time entries for the pending count badge on the timesheets tab
  const { data: timeEntries } = useTimeEntries(id ? { technician_id: id } : undefined);
  const pendingTimesheets = useMemo(
    () => (timeEntries ?? []).filter((e) => e.status === "pending").length,
    [timeEntries],
  );

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = useCallback(
    async (data: TechnicianFormData) => {
      if (id) {
        await updateMutation.mutateAsync({ id, data });
        setIsEditOpen(false);
      }
    },
    [id, updateMutation],
  );

  const handleDelete = useCallback(async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/technicians");
    }
  }, [id, deleteMutation, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted rounded w-1/4 mb-4" />
          <div className="h-12 bg-bg-muted rounded w-1/3 mb-6" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-bg-muted rounded" />
            ))}
          </div>
          <div className="h-10 bg-bg-muted rounded w-2/3 mb-4" />
          <div className="h-64 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !technician) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Technician Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The technician you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/technicians">
              <Button variant="secondary">Back to Technicians</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/technicians"
            className="text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                {technician.first_name} {technician.last_name}
              </h1>
              <Badge variant={technician.is_active ? "success" : "default"}>
                {technician.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {technician.employee_id && (
              <p className="text-sm text-text-secondary mt-1">
                Employee ID: {technician.employee_id}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-bg-card border border-border rounded-lg">
          <p className="text-2xl font-bold text-text-primary">
            {perfStats?.total_jobs_completed ?? "-"}
          </p>
          <p className="text-xs text-text-muted">Total Jobs</p>
        </div>
        <div className="text-center p-3 bg-bg-card border border-border rounded-lg">
          <p className="text-2xl font-bold text-success">
            {perfStats ? formatCurrency(perfStats.total_revenue) : "-"}
          </p>
          <p className="text-xs text-text-muted">Total Revenue</p>
        </div>
        <div className="text-center p-3 bg-bg-card border border-border rounded-lg">
          <p className="text-2xl font-bold text-primary">
            {perfStats
              ? perfStats.pump_out_jobs + perfStats.repair_jobs + perfStats.other_jobs
              : "-"}
          </p>
          <p className="text-xs text-text-muted">Career Jobs</p>
        </div>
        <div className="text-center p-3 bg-bg-card border border-border rounded-lg">
          <p className="text-2xl font-bold text-warning">
            {perfStats?.returns_count ?? "-"}
          </p>
          <p className="text-xs text-text-muted">Returns</p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList className="overflow-x-auto">
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="jobs">
            Jobs{" "}
            {perfStats?.total_jobs_completed
              ? `(${perfStats.total_jobs_completed})`
              : ""}
          </TabTrigger>
          <TabTrigger value="timesheets">
            Timesheets{" "}
            {pendingTimesheets > 0 ? (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-warning rounded-full">
                {pendingTimesheets}
              </span>
            ) : (
              ""
            )}
          </TabTrigger>
          <TabTrigger value="compliance">Compliance</TabTrigger>
          <TabTrigger value="compensation">Compensation</TabTrigger>
          <TabTrigger value="details">Details</TabTrigger>
        </TabList>

        <TabContent value="overview">
          <TechOverviewTab technician={technician} technicianId={id!} />
        </TabContent>

        <TabContent value="jobs">
          <TechJobsTab technician={technician} technicianId={id!} />
        </TabContent>

        <TabContent value="timesheets">
          <TechTimesheetsTab technicianId={id!} />
        </TabContent>

        <TabContent value="compliance">
          <TechComplianceTab technician={technician} technicianId={id!} />
        </TabContent>

        <TabContent value="compensation">
          <TechCompensationTab technicianId={id!} />
        </TabContent>

        <TabContent value="details">
          <TechDetailsTab technician={technician} />
        </TabContent>
      </Tabs>

      {/* Edit Modal */}
      <TechnicianForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        technician={technician}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setIsDeleteOpen(false)}>
            Delete Technician
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                {technician.first_name} {technician.last_name}
              </span>
              ? This will mark them as inactive.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
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
