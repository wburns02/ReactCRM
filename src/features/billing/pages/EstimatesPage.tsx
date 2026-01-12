import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface Estimate {
  id: number;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  valid_until: string;
}

/**
 * Estimates List Page
 */
export function EstimatesPage() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "declined"
  >("all");

  const { data: estimates, isLoading } = useQuery({
    queryKey: ["estimates", filter],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/estimates", {
          params: { status: filter !== "all" ? filter : undefined },
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-warning/20 text-warning";
      case "accepted":
        return "bg-success/20 text-success";
      case "declined":
        return "bg-danger/20 text-danger";
      case "expired":
        return "bg-text-muted/20 text-text-muted";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Estimates
          </h1>
          <p className="text-text-muted">
            Create and manage customer estimates
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          Create Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "accepted", "declined"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Estimates List */}
      <div className="bg-bg-card border border-border rounded-lg">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : estimates?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📊</span>
            <p>No estimates found</p>
            <p className="text-sm mt-2">
              Create your first estimate to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-hover">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Created
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Valid Until
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estimates?.map((estimate: Estimate) => (
                  <tr key={estimate.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">
                          {estimate.customer_name}
                        </p>
                        <p className="text-sm text-text-muted">
                          {estimate.customer_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      ${estimate.total?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}
                      >
                        {estimate.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {estimate.created_at}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {estimate.valid_until}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/estimates/${estimate.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
