import { useState } from "react";
import {
  useRenewalsDashboard,
  useRenewContract,
  useBulkContractAction,
  type RenewalContract,
  type OverdueContract,
} from "../api/contracts.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatDate, formatCurrency } from "@/lib/utils.ts";

type RenewalView = "30" | "60" | "90" | "overdue" | "auto-renew";

export function RenewalsTab() {
  const [view, setView] = useState<RenewalView>("30");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: renewals, isLoading, error } = useRenewalsDashboard();
  const renewContract = useRenewContract();
  const bulkAction = useBulkContractAction();

  const counts = renewals?.counts || {
    expiring_30: 0,
    expiring_60: 0,
    expiring_90: 0,
    overdue: 0,
    auto_renew: 0,
  };

  const views: { id: RenewalView; label: string; count: number; variant: "danger" | "warning" | "info" | "default" | "success" }[] = [
    { id: "overdue", label: "Overdue", count: counts.overdue, variant: "danger" },
    { id: "30", label: "30 Days", count: counts.expiring_30, variant: "warning" },
    { id: "60", label: "60 Days", count: counts.expiring_60, variant: "info" },
    { id: "90", label: "90 Days", count: counts.expiring_90, variant: "default" },
    { id: "auto-renew", label: "Auto-Renew Queue", count: counts.auto_renew, variant: "success" },
  ];

  const getCurrentContracts = (): (RenewalContract | OverdueContract)[] => {
    if (!renewals) return [];
    switch (view) {
      case "30": return renewals.expiring_30;
      case "60": return renewals.expiring_60;
      case "90": return renewals.expiring_90;
      case "overdue": return renewals.overdue;
      case "auto-renew": return renewals.auto_renew_queue as (RenewalContract | OverdueContract)[];
      default: return [];
    }
  };

  const contracts = getCurrentContracts();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contracts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contracts.map((c) => c.id)));
    }
  };

  const handleBulkRenew = () => {
    bulkAction.mutate(
      { contract_ids: Array.from(selectedIds), action: "renew" },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  };

  const handleSingleRenew = (id: string) => {
    renewContract.mutate({ id, data: {} });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-bg-muted rounded-lg" />
          ))}
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger rounded-lg p-4 text-danger">
        Failed to load renewals dashboard: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => { setView(v.id); setSelectedIds(new Set()); }}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              view === v.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl font-bold text-text-primary">{v.count}</span>
              <Badge variant={v.variant} className="text-xs">{v.label}</Badge>
            </div>
            <p className="text-xs text-text-muted">
              {v.id === "overdue" ? "Past due" : v.id === "auto-renew" ? "Queued" : `Within ${v.label}`}
            </p>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {selectedIds.size} contract{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleBulkRenew}
                disabled={bulkAction.isPending}
              >
                {bulkAction.isPending ? "Renewing..." : `Bulk Renew (${selectedIds.size})`}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {view === "overdue" ? "Overdue Contracts" :
             view === "auto-renew" ? "Auto-Renew Queue" :
             `Expiring Within ${view} Days`}
          </CardTitle>
          {contracts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === contracts.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">
                {view === "overdue" ? "✅" : "📋"}
              </span>
              <p className="text-text-muted">
                {view === "overdue"
                  ? "No overdue contracts"
                  : `No contracts expiring within ${view} days`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {contracts.map((contract) => {
                const isOverdue = "days_overdue" in contract;
                return (
                  <div
                    key={contract.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      selectedIds.has(contract.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-bg-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contract.id)}
                        onChange={() => toggleSelect(contract.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-primary">
                            {contract.contract_number}
                          </span>
                          <Badge variant={isOverdue ? "danger" : "warning"}>
                            {isOverdue
                              ? `${(contract as OverdueContract).days_overdue} days overdue`
                              : `${(contract as RenewalContract).days_until_expiry} days left`}
                          </Badge>
                          {contract.auto_renew && (
                            <Badge variant="info">Auto-Renew</Badge>
                          )}
                          {"tier" in contract && contract.tier && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {(contract.tier as string).replace("commercial_", "Comm. ").replace("residential", "Res.")}
                            </span>
                          )}
                          {isOverdue && (contract as OverdueContract).days_overdue > 30 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                              Churn Risk
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                          <span>{contract.customer_name || "Unknown"}</span>
                          <span>{contract.name}</span>
                          {contract.total_value && (
                            <span className="font-medium">{formatCurrency(contract.total_value)}</span>
                          )}
                          {"discount_percent" in contract && (contract.discount_percent as number) > 0 && (
                            <span className="text-green-600 dark:text-green-400 font-medium">{contract.discount_percent as number}% off</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-text-muted hidden sm:inline">
                          {isOverdue ? "Expired" : "Expires"}: {formatDate(contract.end_date)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleSingleRenew(contract.id)}
                          disabled={renewContract.isPending}
                        >
                          Renew
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
