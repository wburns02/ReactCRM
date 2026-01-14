import { useContract, useActivateContract } from "../api/contracts.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate, formatCurrency } from "@/lib/utils.ts";

interface ContractDetailsProps {
  contractId: string;
  onClose?: () => void;
}

export function ContractDetails({ contractId, onClose }: ContractDetailsProps) {
  const { data: contract, isLoading, error } = useContract(contractId);
  const activateContract = useActivateContract();

  const getStatusVariant = (
    status: string,
  ): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "expired":
        return "danger";
      case "cancelled":
        return "danger";
      case "draft":
        return "default";
      case "renewed":
        return "info";
      default:
        return "default";
    }
  };

  const handleActivate = async () => {
    if (!contract) return;
    try {
      await activateContract.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to activate contract:", err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-muted rounded w-1/3" />
            <div className="h-4 bg-bg-muted rounded w-2/3" />
            <div className="h-4 bg-bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !contract) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-text-error">
            <p>Failed to load contract details</p>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          📄 Contract Details
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {contract.contract_number}
            </h3>
            <p className="text-text-muted">{contract.name}</p>
          </div>
          <Badge
            variant={getStatusVariant(contract.status)}
            className="text-base py-1 px-3"
          >
            {contract.status}
          </Badge>
        </div>

        {/* Customer info */}
        {contract.customer_name && (
          <div className="flex items-center gap-2">
            <span>👤</span>
            <div>
              <p className="text-sm text-text-muted">Customer</p>
              <p className="font-medium text-text-primary">
                {contract.customer_name}
              </p>
            </div>
          </div>
        )}

        {/* Contract info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <span>📋</span>
            <div>
              <p className="text-sm text-text-muted">Type</p>
              <p className="font-medium text-text-primary capitalize">
                {contract.contract_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>💰</span>
            <div>
              <p className="text-sm text-text-muted">Value</p>
              <p className="font-medium text-text-primary">
                {contract.total_value
                  ? formatCurrency(contract.total_value)
                  : "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>📅</span>
            <div>
              <p className="text-sm text-text-muted">Billing</p>
              <p className="font-medium text-text-primary capitalize">
                {contract.billing_frequency}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <div>
              <p className="text-sm text-text-muted">Auto-Renew</p>
              <p className="font-medium text-text-primary">
                {contract.auto_renew ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        {/* Contract period */}
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-text-muted">Contract Period</p>
              <p className="font-medium text-text-primary">
                {formatDate(contract.start_date)} -{" "}
                {formatDate(contract.end_date)}
              </p>
            </div>
            {contract.days_until_expiry !== null && (
              <div className="text-right">
                <p className="text-sm text-text-muted">Days Until Expiry</p>
                <p
                  className={`font-bold text-lg ${
                    contract.days_until_expiry < 0
                      ? "text-danger"
                      : contract.days_until_expiry <= 30
                        ? "text-warning"
                        : "text-success"
                  }`}
                >
                  {contract.days_until_expiry < 0
                    ? `${Math.abs(contract.days_until_expiry)} days overdue`
                    : `${contract.days_until_expiry} days`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signature status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>✍️</span>
            <p className="text-sm text-text-muted">Customer Signed:</p>
            {contract.customer_signed ? (
              <Badge variant="success">Yes</Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>✍️</span>
            <p className="text-sm text-text-muted">Company Signed:</p>
            {contract.company_signed ? (
              <Badge variant="success">Yes</Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
        </div>

        {/* Document link */}
        {contract.document_url && (
          <div className="flex items-center gap-2">
            <span>📎</span>
            <div>
              <p className="text-sm text-text-muted">Document</p>
              <a
                href={contract.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View Contract Document
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        {contract.status === "pending" && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              onClick={handleActivate}
              disabled={activateContract.isPending}
            >
              {activateContract.isPending
                ? "Activating..."
                : "Activate Contract"}
            </Button>
          </div>
        )}

        {/* Created date */}
        {contract.created_at && (
          <div className="text-xs text-text-muted pt-4 border-t border-border">
            Created: {formatDate(contract.created_at)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
