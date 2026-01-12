import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePortalWorkOrders } from "@/api/hooks/usePortal";

/**
 * Customer Portal Work Orders Page
 * Shows all past and upcoming service appointments
 */
export function PortalWorkOrdersPage() {
  const { data: workOrders = [], isLoading } = usePortalWorkOrders();
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

  const filteredOrders = workOrders.filter((wo) => {
    if (filter === "all") return true;
    if (filter === "upcoming")
      return wo.status === "scheduled" || wo.status === "in_progress";
    if (filter === "completed") return wo.status === "completed";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Work Orders</h1>
          <p className="text-text-secondary">
            View your service history and upcoming appointments
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-surface-hover"
            }`}
            onClick={() => setFilter("all")}
          >
            All ({workOrders.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "upcoming"
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-surface-hover"
            }`}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-surface-hover"
            }`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-text-muted mb-4">No work orders found</p>
            <Button onClick={() => setFilter("all")}>Show All</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((wo) => (
            <Link
              key={wo.id}
              to={`/portal/work-orders/${wo.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-text-primary text-lg">
                          {wo.service_type}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            wo.status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : wo.status === "in_progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : wo.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : wo.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {wo.status.replace("_", " ")}
                        </span>
                        {wo.status === "in_progress" && (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <span className="animate-pulse">🔴</span> Live
                            Tracking
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-text-secondary mb-1">
                        Work Order #{wo.work_order_number}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                        {wo.scheduled_date && (
                          <span className="flex items-center gap-1">
                            📅{" "}
                            {new Date(wo.scheduled_date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        )}
                        {wo.technician_name && (
                          <span className="flex items-center gap-1">
                            👷 {wo.technician_name}
                          </span>
                        )}
                        {wo.total_amount && (
                          <span className="flex items-center gap-1">
                            💰 $
                            {wo.total_amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </div>

                      {wo.notes && (
                        <p className="mt-3 text-sm text-text-secondary bg-surface-hover p-3 rounded">
                          {wo.notes}
                        </p>
                      )}
                    </div>

                    {/* Right side actions */}
                    <div className="flex flex-col gap-2 items-end">
                      <span className="text-primary text-sm">
                        View Details &rarr;
                      </span>
                      {wo.completed_date && (
                        <span className="text-xs text-text-muted text-right">
                          Completed:{" "}
                          {new Date(wo.completed_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
