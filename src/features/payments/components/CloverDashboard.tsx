import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  useCloverConfig,
  useCloverMerchant,
  useCloverPayments,
  useCloverOrders,
  useCloverItems,
  useCloverReconciliation,
  useCloverSync,
} from "@/api/hooks/useClover.ts";
import type { CloverPayment, CloverOrder, CloverItem } from "@/api/types/clover.ts";

function formatCloverTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type DashboardTab = "payments" | "orders" | "catalog" | "reconciliation";

/**
 * Clover Integration Dashboard
 *
 * Shows live data from Clover POS: payments, orders, service catalog,
 * and payment reconciliation between Clover and CRM.
 */
export function CloverDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("payments");

  const { data: config, isLoading: configLoading, error: configError } = useCloverConfig();
  const { data: merchant } = useCloverMerchant();
  const { data: paymentsData, isLoading: paymentsLoading } = useCloverPayments(50);
  const { data: ordersData, isLoading: ordersLoading } = useCloverOrders(50);
  const { data: itemsData } = useCloverItems();
  const { data: reconciliation } = useCloverReconciliation();
  const syncMutation = useCloverSync();

  // Loading state
  if (configLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-text-secondary">Connecting to Clover...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not configured
  if (configError || !config?.is_configured) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">&#x1F4B3;</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Clover Not Configured
          </h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Set CLOVER_MERCHANT_ID and CLOVER_API_KEY environment variables
            on Railway to connect your Clover account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tabs: { key: DashboardTab; label: string }[] = [
    { key: "payments", label: "Payments" },
    { key: "orders", label: "Orders" },
    { key: "catalog", label: "Service Catalog" },
    { key: "reconciliation", label: "Reconciliation" },
  ];

  return (
    <div className="space-y-6">
      {/* Merchant Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-text-muted mb-1">Merchant</div>
            <div className="text-lg font-semibold text-text-primary">
              {merchant?.name || config.merchant_name || config.merchant_id}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 font-medium">Connected</span>
              <span className="text-xs text-text-muted">({config.environment})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-text-muted mb-1">REST API</div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${config.rest_api_available ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm font-medium">
                {config.rest_api_available ? "Available" : "Unavailable"}
              </span>
            </div>
            <div className="text-xs text-text-muted mt-1">Read payments, orders, items</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-text-muted mb-1">Online Payments</div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${config.ecommerce_available ? "bg-green-500" : "bg-amber-500"}`} />
              <span className="text-sm font-medium">
                {config.ecommerce_available ? "Available" : "Pending Setup"}
              </span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              {config.ecommerce_available ? "Card processing active" : "Needs ecommerce API key"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-text-muted mb-1">Sync Status</div>
            <div className="flex items-center gap-2">
              {reconciliation ? (
                <>
                  <span className="text-sm font-medium text-text-primary">
                    {reconciliation.summary.matched_count} matched
                  </span>
                  {reconciliation.summary.unmatched_clover_count > 0 && (
                    <span className="text-xs text-amber-600">
                      ({reconciliation.summary.unmatched_clover_count} unsynced)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-text-muted">Loading...</span>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync Result Banner */}
      {syncMutation.data && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Sync complete: {syncMutation.data.synced} new payments imported,{" "}
          {syncMutation.data.skipped} already synced
          {syncMutation.data.errors > 0 && `, ${syncMutation.data.errors} errors`}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border-default">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "payments" && (
        <PaymentsTab payments={paymentsData?.payments || []} isLoading={paymentsLoading} />
      )}
      {activeTab === "orders" && (
        <OrdersTab orders={ordersData?.orders || []} isLoading={ordersLoading} />
      )}
      {activeTab === "catalog" && (
        <CatalogTab items={itemsData?.items || []} />
      )}
      {activeTab === "reconciliation" && reconciliation && (
        <ReconciliationTab data={reconciliation} />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function PaymentsTab({ payments, isLoading }: { payments: CloverPayment[]; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingState label="Loading payments..." />;
  }

  if (payments.length === 0) {
    return <EmptyState label="No payments found in Clover" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Clover Payments ({payments.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-muted">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Tender</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Result</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border-default hover:bg-bg-muted/50">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {formatDollars(p.amount_dollars)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.tender_label}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.result === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : p.result === "DECLINED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }`}>
                      {p.result || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatCloverTime(p.created_time)}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{p.id.slice(0, 12)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersTab({ orders, isLoading }: { orders: CloverOrder[]; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingState label="Loading orders..." />;
  }

  if (orders.length === 0) {
    return <EmptyState label="No orders found in Clover" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Clover Orders ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-muted">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Total</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Line Items</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">State</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border-default hover:bg-bg-muted/50">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {formatDollars(o.total_dollars)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {o.line_items.length > 0 ? (
                      <div className="space-y-0.5">
                        {o.line_items.map((li) => (
                          <div key={li.id} className="text-xs">
                            {li.name || "Item"} — {formatDollars(li.price_dollars)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{o.state || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      o.payment_state === "PAID" ? "text-green-600" : "text-amber-600"
                    }`}>
                      {o.payment_state || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatCloverTime(o.created_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CatalogTab({ items }: { items: CloverItem[] }) {
  if (items.length === 0) {
    return <EmptyState label="No service catalog items in Clover" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clover Service Catalog ({items.length} items)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-muted">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Service</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Price</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => !i.hidden).map((item) => (
                <tr key={item.id} className="border-b border-border-default hover:bg-bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.color_code && (
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color_code }}
                        />
                      )}
                      <span className="font-medium text-text-primary">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {item.price_type === "VARIABLE" ? "Variable" : formatDollars(item.price_dollars)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{item.price_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.available ? "text-green-600" : "text-gray-400"}`}>
                      {item.available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReconciliationTab({ data }: { data: NonNullable<ReturnType<typeof useCloverReconciliation>["data"]> }) {
  const { summary, matched, unmatched_clover } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-text-primary">{summary.total_clover_payments}</div>
            <div className="text-xs text-text-muted">Clover Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-text-primary">{summary.total_crm_payments}</div>
            <div className="text-xs text-text-muted">CRM Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.matched_count}</div>
            <div className="text-xs text-text-muted">Matched</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.unmatched_clover_count}</div>
            <div className="text-xs text-text-muted">Clover Only</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {formatDollars(summary.clover_total_dollars)}
            </div>
            <div className="text-xs text-text-muted">Clover Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Unmatched Clover Payments (not yet synced) */}
      {unmatched_clover.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600">
              Unsynced Clover Payments ({unmatched_clover.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-amber-50">
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Amount</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Tender</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Result</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatched_clover.map((p, i) => (
                    <tr key={p.clover_id || i} className="border-b border-border-default">
                      <td className="px-4 py-2 font-medium">{formatDollars(p.amount_dollars)}</td>
                      <td className="px-4 py-2 text-text-secondary">{p.tender || "—"}</td>
                      <td className="px-4 py-2">{p.result || "—"}</td>
                      <td className="px-4 py-2 text-text-secondary">{formatCloverTime(p.created_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched Payments */}
      {matched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              Matched Payments ({matched.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-green-50">
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Amount</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Tender</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-text-secondary">Clover ID</th>
                  </tr>
                </thead>
                <tbody>
                  {matched.slice(0, 20).map((p, i) => (
                    <tr key={p.clover_id || i} className="border-b border-border-default">
                      <td className="px-4 py-2 font-medium">{formatDollars(p.amount_dollars)}</td>
                      <td className="px-4 py-2 text-text-secondary">{p.tender || "—"}</td>
                      <td className="px-4 py-2 text-text-secondary">{formatCloverTime(p.created_time)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-text-muted">{(p.clover_id || "").slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <span className="text-text-secondary text-sm">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-text-secondary">{label}</p>
      </CardContent>
    </Card>
  );
}
