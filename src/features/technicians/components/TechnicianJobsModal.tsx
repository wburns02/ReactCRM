import { useState } from "react";
import { useTechnicianJobs } from "@/api/hooks/useTechnicians";
import type { JobCategory, TechnicianJobDetail } from "@/api/types/technician";

interface TechnicianJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicianId: string;
  technicianName: string;
  jobCategory: JobCategory;
}

/**
 * Modal for displaying detailed job history for a technician
 * Shows different columns based on job category (pump_outs vs repairs)
 */
export function TechnicianJobsModal({
  isOpen,
  onClose,
  technicianId,
  technicianName,
  jobCategory,
}: TechnicianJobsModalProps) {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, error } = useTechnicianJobs(
    technicianId,
    jobCategory,
    page,
    pageSize,
  );

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;
  const title = jobCategory === "pump_outs" ? "Pump Out Jobs" : "Repair Jobs";
  const icon = jobCategory === "pump_outs" ? "🚛" : "🔧";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="text-sm text-gray-400">{technicianName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Failed to load jobs</p>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">
                No {jobCategory === "pump_outs" ? "pump out" : "repair"} jobs
                found
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Location</th>
                  {jobCategory === "pump_outs" ? (
                    <>
                      <th className="pb-3 pr-4 text-right">Gallons</th>
                      <th className="pb-3 pr-4 text-right">Duration</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4 text-right">Labor</th>
                      <th className="pb-3 pr-4 text-right">Parts</th>
                    </>
                  )}
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data?.items.map((job: TechnicianJobDetail) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-800 hover:bg-[#0d1117] transition-colors"
                  >
                    <td className="py-3 pr-4 text-white">
                      {formatDate(job.scheduled_date)}
                    </td>
                    <td className="py-3 pr-4 text-white">
                      {job.customer_name || "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 truncate max-w-[200px]">
                      {job.service_location || "-"}
                    </td>
                    {jobCategory === "pump_outs" ? (
                      <>
                        <td className="py-3 pr-4 text-right text-white">
                          {job.gallons_pumped
                            ? `${job.gallons_pumped.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-400">
                          {formatDuration(job.duration_minutes)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4 text-gray-400 capitalize">
                          {job.job_type || "-"}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-400">
                          {job.labor_hours
                            ? `${job.labor_hours.toFixed(1)}h`
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-400">
                          {job.parts_cost
                            ? formatCurrency(job.parts_cost)
                            : "-"}
                        </td>
                      </>
                    )}
                    <td className="py-3 text-right text-green-400 font-medium">
                      {formatCurrency(job.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with pagination */}
        {data && data.total > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, data.total)} of {data.total} jobs
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-[#0d1117] border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-[#0d1117] border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
