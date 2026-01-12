import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Job detail view for technicians
 */
export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => {
      const response = await apiClient.get(`/work-orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(`/work-orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
      queryClient.invalidateQueries({ queryKey: ["technician-jobs"] });
    },
  });

  const handleStartJob = () => {
    updateStatusMutation.mutate("in_progress");
  };

  const handleCompleteJob = () => {
    navigate(`/field/job/${id}/complete`);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-4 text-center text-danger">
        <p>Failed to load job details</p>
        <Link to="/field" className="mt-2 text-primary underline block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return "bg-info/20 text-info";
      case "in_progress":
        return "bg-warning/20 text-warning";
      case "completed":
        return "bg-success/20 text-success";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  return (
    <div className="p-4 pb-24">
      {/* Back Button */}
      <Link
        to="/field"
        className="flex items-center gap-2 text-text-secondary mb-4"
      >
        <span>&larr;</span> Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-semibold text-text-primary">
            {job.customer_name || `Job #${job.id}`}
          </h1>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
          >
            {job.status?.replace("_", " ")}
          </span>
        </div>
        <p className="text-text-secondary">{job.service_type}</p>
      </div>

      {/* Customer Info */}
      <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">Customer</h2>
        <div className="space-y-2">
          <p className="text-sm text-text-secondary flex items-center gap-2">
            <span>📍</span> {job.address || "No address"}
          </p>
          {job.customer_phone && (
            <a
              href={`tel:${job.customer_phone}`}
              className="text-sm text-primary flex items-center gap-2"
            >
              <span>📞</span> {job.customer_phone}
            </a>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted">Date</p>
            <p className="text-sm text-text-primary">
              {job.scheduled_date || "TBD"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Time</p>
            <p className="text-sm text-text-primary">
              {job.scheduled_time || "TBD"}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="font-medium text-text-primary mb-3">Description</h2>
          <p className="text-sm text-text-secondary">{job.description}</p>
        </div>
      )}

      {/* Notes */}
      {job.notes && (
        <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="font-medium text-text-primary mb-3">Notes</h2>
          <p className="text-sm text-text-secondary">{job.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-bg-body border-t border-border">
        <div className="flex gap-3">
          <Link
            to={`/field/route/${id}`}
            className="flex-1 py-3 bg-bg-card border border-border rounded-lg text-center font-medium text-text-primary"
          >
            Navigate
          </Link>

          {job.status === "scheduled" && (
            <button
              onClick={handleStartJob}
              disabled={updateStatusMutation.isPending}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {updateStatusMutation.isPending ? "Starting..." : "Start Job"}
            </button>
          )}

          {job.status === "in_progress" && (
            <button
              onClick={handleCompleteJob}
              className="flex-1 py-3 bg-success text-white rounded-lg font-medium"
            >
              Complete Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
