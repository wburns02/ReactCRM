import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { TechnicianCoachPanel } from "./TechnicianCoachPanel";
import { TechnicianPerformanceStats } from "./TechnicianPerformanceStats";
import { TechnicianJobsModal } from "./TechnicianJobsModal";
import { useTechnicianJobs } from "@/api/hooks/useTechnicians.ts";
import { formatDate, formatCurrency } from "@/lib/utils.ts";
import {
  JOB_TYPE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type JobType,
  type WorkOrderStatus,
} from "@/api/types/workOrder.ts";
import type { JobCategory, Technician } from "@/api/types/technician.ts";

interface TechJobsTabProps {
  technician: Technician;
  technicianId: string;
}

export function TechJobsTab({ technician, technicianId }: TechJobsTabProps) {
  const technicianName = `${technician.first_name} ${technician.last_name}`;
  const [jobCategory, setJobCategory] = useState<JobCategory>("all");
  const [page, setPage] = useState(1);
  const [jobsModalCategory, setJobsModalCategory] = useState<JobCategory | null>(null);

  const { data: jobsData, isLoading: jobsLoading } = useTechnicianJobs(
    technicianId,
    jobCategory,
    page,
    20,
  );

  const handlePumpOutsClick = useCallback(() => {
    setJobsModalCategory("pump_outs");
  }, []);

  const handleRepairsClick = useCallback(() => {
    setJobsModalCategory("repairs");
  }, []);

  const totalPages = jobsData ? Math.ceil(jobsData.total / jobsData.page_size) : 0;

  return (
    <div className="space-y-6">
      {/* Performance Stats */}
      <TechnicianPerformanceStats
        technicianId={technicianId}
        onPumpOutsClick={handlePumpOutsClick}
        onRepairsClick={handleRepairsClick}
      />

      {/* AI Performance Coach */}
      <TechnicianCoachPanel technicianId={technicianId} />

      {/* Job History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>
              Job History {jobsData ? `(${jobsData.total})` : ""}
            </CardTitle>
            <div className="flex gap-2">
              {(["all", "pump_outs", "repairs"] as const).map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={jobCategory === cat ? "primary" : "secondary"}
                  onClick={() => {
                    setJobCategory(cat);
                    setPage(1);
                  }}
                >
                  {cat === "all" ? "All" : cat === "pump_outs" ? "Pump Outs" : "Repairs"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-bg-muted rounded" />
              ))}
            </div>
          ) : !jobsData || jobsData.items.length === 0 ? (
            <p className="text-center text-text-muted py-8">
              No jobs found for this category
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-text-muted font-medium">Date</th>
                      <th className="pb-3 text-text-muted font-medium">Customer</th>
                      <th className="pb-3 text-text-muted font-medium">Type</th>
                      <th className="pb-3 text-text-muted font-medium">Status</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Amount</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobsData.items.map((job) => (
                      <tr key={job.id} className="hover:bg-bg-hover transition-colors">
                        <td className="py-3 text-text-primary">
                          {job.scheduled_date
                            ? formatDate(job.scheduled_date)
                            : job.completed_date
                              ? formatDate(job.completed_date)
                              : "-"}
                        </td>
                        <td className="py-3 text-text-primary">
                          {job.customer_name || "-"}
                        </td>
                        <td className="py-3">
                          <Badge variant="default">
                            {JOB_TYPE_LABELS[job.job_type as JobType] || job.job_type || "-"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              job.status === "completed"
                                ? "success"
                                : job.status === "canceled"
                                  ? "danger"
                                  : ["enroute", "on_site", "in_progress"].includes(
                                      job.status || "",
                                    )
                                    ? "warning"
                                    : "default"
                            }
                          >
                            {WORK_ORDER_STATUS_LABELS[job.status as WorkOrderStatus] ||
                              job.status ||
                              "-"}
                          </Badge>
                        </td>
                        <td className="py-3 text-text-primary text-right">
                          {formatCurrency(job.total_amount)}
                        </td>
                        <td className="py-3 text-text-secondary text-right">
                          {job.duration_minutes
                            ? `${Math.floor(job.duration_minutes / 60)}h ${job.duration_minutes % 60}m`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {jobsData.items.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary">
                          {job.customer_name || "-"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {job.scheduled_date ? formatDate(job.scheduled_date) : "-"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          job.status === "completed" ? "success" : "default"
                        }
                      >
                        {WORK_ORDER_STATUS_LABELS[job.status as WorkOrderStatus] ||
                          job.status || "-"}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        {JOB_TYPE_LABELS[job.job_type as JobType] || job.job_type}
                      </span>
                      <span className="text-text-primary font-medium">
                        {formatCurrency(job.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-text-muted">
                    Page {page} of {totalPages} ({jobsData.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Jobs Detail Modal (from stat card clicks) */}
      {jobsModalCategory && (
        <TechnicianJobsModal
          isOpen={!!jobsModalCategory}
          onClose={() => setJobsModalCategory(null)}
          technicianId={technicianId}
          technicianName={technicianName}
          jobCategory={jobsModalCategory}
        />
      )}
    </div>
  );
}
