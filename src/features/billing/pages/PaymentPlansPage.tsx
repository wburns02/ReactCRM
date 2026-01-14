import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface PaymentPlan {
  id: number;
  customer_name: string;
  invoice_id: number;
  total_amount: number;
  amount_paid: number;
  remaining: number;
  installments: number;
  frequency: string;
  next_payment_date: string;
  status: string;
}

/**
 * Payment Plans Management Page
 */
export function PaymentPlansPage() {
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "overdue"
  >("all");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["payment-plans", filter],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/payment-plans", {
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
      case "active":
        return "bg-success/20 text-success";
      case "completed":
        return "bg-info/20 text-info";
      case "overdue":
        return "bg-danger/20 text-danger";
      case "paused":
        return "bg-warning/20 text-warning";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Payment Plans
          </h1>
          <p className="text-text-muted">
            Manage customer financing and payment plans
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          Create Payment Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Active Plans</p>
          <p className="text-2xl font-bold text-success">--</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Total Outstanding</p>
          <p className="text-2xl font-bold text-warning">$--</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Due This Week</p>
          <p className="text-2xl font-bold text-info">$--</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Overdue</p>
          <p className="text-2xl font-bold text-danger">--</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "active", "completed", "overdue"] as const).map((f) => (
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

      {/* Plans List */}
      <div className="bg-bg-card border border-border rounded-lg">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : plans?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📈</span>
            <p>No payment plans found</p>
            <p className="text-sm mt-2">Create a payment plan for a customer</p>
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
                    Paid
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Remaining
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Schedule
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Next Due
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans?.map((plan: PaymentPlan) => (
                  <tr key={plan.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">
                        {plan.customer_name}
                      </p>
                      <p className="text-sm text-text-muted">
                        Invoice #{plan.invoice_id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      ${plan.total_amount?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3 text-success">
                      ${plan.amount_paid?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3 text-warning">
                      ${plan.remaining?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {plan.installments} payments / {plan.frequency}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {plan.next_payment_date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-primary hover:underline text-sm">
                        View
                      </button>
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
