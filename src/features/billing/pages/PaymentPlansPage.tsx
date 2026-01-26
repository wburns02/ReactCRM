import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { useInvoices } from "@/api/hooks/useInvoices";

interface PaymentPlan {
  id: number;
  customer_name: string;
  customer_id: number;
  invoice_id: number;
  total_amount: number;
  amount_paid: number;
  remaining: number;
  installments: number;
  frequency: string;
  next_payment_date: string;
  status: string;
}

interface PaymentPlanStats {
  active_plans: number;
  total_outstanding: number;
  due_this_week: number;
  overdue_count: number;
  overdue_amount: number;
}

interface PaymentPlanCreateData {
  customer_id: number;
  invoice_id: number;
  total_amount: number;
  installments: number;
  frequency: string;
}

interface InvoiceOption {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_id: number;
  total: number;
  balance_due: number;
  status: string;
}

/**
 * Create Payment Plan Modal
 */
function CreatePaymentPlanModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installments, setInstallments] = useState("4");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">(
    "monthly",
  );

  const queryClient = useQueryClient();

  // Fetch all invoices for the dropdown (filter unpaid client-side)
  // Valid statuses: draft, sent, paid, overdue, void
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    page_size: 100,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: InvoiceOption[] = (invoicesData?.items || [])
    .map((inv: any) => ({
      id: String(inv.id),
      invoice_number: inv.invoice_number || `INV-${inv.id}`,
      customer_name: inv.customer_name || inv.customer?.first_name
        ? `${inv.customer?.first_name || ""} ${inv.customer?.last_name || ""}`.trim()
        : "Unknown Customer",
      customer_id:
        typeof inv.customer_id === "string"
          ? parseInt(inv.customer_id)
          : inv.customer_id || 0,
      total: inv.total || 0,
      // Use balance_due if available, otherwise use total for unpaid invoices
      balance_due: inv.balance_due ?? inv.amount_due ?? inv.total ?? 0,
      status: inv.status || "draft",
    }))
    // Filter to show invoices that can have payment plans:
    // - Must not be fully paid or voided
    // - Allows Draft, Sent, and Overdue invoices regardless of total
    .filter((inv) => inv.status !== "paid" && inv.status !== "void");

  // Auto-fill amount when invoice is selected
  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (invoice) {
        setTotalAmount(String(invoice.balance_due || invoice.total));
      }
    }
  }, [selectedInvoiceId, invoices]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const createMutation = useMutation({
    mutationFn: async (data: PaymentPlanCreateData) => {
      const response = await apiClient.post("/payment-plans/", data);
      return response.data;
    },
    onSuccess: () => {
      toastSuccess("Payment plan created successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["payment-plans-stats"] });
      onSuccess();
      handleReset();
      onClose();
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to create payment plan");
    },
  });

  const handleReset = () => {
    setSelectedInvoiceId("");
    setTotalAmount("");
    setInstallments("4");
    setFrequency("monthly");
  };

  const handleSubmit = () => {
    // Basic validation
    if (!selectedInvoiceId) {
      toastError("Please select an invoice");
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toastError("Valid total amount is required");
      return;
    }
    if (!installments || parseInt(installments) <= 0) {
      toastError("Number of installments must be greater than 0");
      return;
    }

    const data: PaymentPlanCreateData = {
      customer_id: selectedInvoice?.customer_id || 0,
      invoice_id: parseInt(selectedInvoiceId),
      total_amount: parseFloat(totalAmount),
      installments: parseInt(installments),
      frequency,
    };

    createMutation.mutate(data);
  };

  const installmentAmount =
    totalAmount && installments
      ? (parseFloat(totalAmount) / parseInt(installments)).toFixed(2)
      : "0.00";

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Create Payment Plan">
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>Create Payment Plan</DialogHeader>
        <DialogBody className="space-y-4">
          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Select Invoice *
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={invoicesLoading}
            >
              <option value="">
                {invoicesLoading ? "Loading invoices..." : "Select an invoice"}
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {invoice.customer_name} ($
                  {invoice.balance_due.toLocaleString()})
                </option>
              ))}
            </select>
            {invoices.length === 0 && !invoicesLoading && (
              <p className="text-sm text-text-muted mt-1">
                No unpaid invoices available
              </p>
            )}
          </div>

          {/* Selected Invoice Details */}
          {selectedInvoice && (
            <div className="bg-bg-hover p-3 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer:</span>
                <span className="text-text-primary font-medium">
                  {selectedInvoice.customer_name}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-text-muted">Balance Due:</span>
                <span className="text-text-primary font-medium">
                  ${selectedInvoice.balance_due.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Amount to Finance *
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.01}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {selectedInvoice &&
              parseFloat(totalAmount) > selectedInvoice.balance_due && (
                <p className="text-sm text-warning mt-1">
                  Amount exceeds invoice balance
                </p>
              )}
          </div>

          {/* Number of Installments */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Number of Installments *
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="2">2 payments</option>
              <option value="3">3 payments</option>
              <option value="4">4 payments</option>
              <option value="6">6 payments</option>
              <option value="12">12 payments</option>
              <option value="24">24 payments</option>
            </select>
          </div>

          {/* Payment Frequency */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Payment Frequency *
            </label>
            <select
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value as "weekly" | "biweekly" | "monthly",
                )
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Payment Summary */}
          {totalAmount && parseFloat(totalAmount) > 0 && (
            <div className="bg-bg-hover p-4 rounded-lg">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Payment Summary
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Amount:</span>
                  <span className="text-text-primary font-medium">
                    ${parseFloat(totalAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Installments:</span>
                  <span className="text-text-primary">{installments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Frequency:</span>
                  <span className="text-text-primary capitalize">
                    {frequency}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-text-secondary font-medium">
                    Each Payment:
                  </span>
                  <span className="text-primary font-bold">
                    ${installmentAmount}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Payment Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Payment Plans Management Page
 */
export function PaymentPlansPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "overdue"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data: plans,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["payment-plans", filter],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/payment-plans/", {
          params: { status: filter !== "all" ? filter : undefined },
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: stats } = useQuery<PaymentPlanStats>({
    queryKey: ["payment-plans-stats"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/payment-plans/stats/summary");
        return response.data;
      } catch {
        return {
          active_plans: 0,
          total_outstanding: 0,
          due_this_week: 0,
          overdue_count: 0,
          overdue_amount: 0,
        };
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
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Payment Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Active Plans</p>
          <p className="text-2xl font-bold text-success">
            {stats?.active_plans ?? "--"}
          </p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Total Outstanding</p>
          <p className="text-2xl font-bold text-warning">
            ${stats?.total_outstanding?.toLocaleString() ?? "--"}
          </p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Due This Week</p>
          <p className="text-2xl font-bold text-info">
            ${stats?.due_this_week?.toLocaleString() ?? "--"}
          </p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-text-muted">Overdue</p>
          <p className="text-2xl font-bold text-danger">
            {stats?.overdue_count ?? "--"}
          </p>
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
                  <tr
                    key={plan.id}
                    className="hover:bg-bg-hover cursor-pointer transition-colors"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/billing/payment-plans/${plan.id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/billing/payment-plans/${plan.id}`);
                      }
                    }}
                  >
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/billing/payment-plans/${plan.id}`);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payment Plan Modal */}
      <CreatePaymentPlanModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
