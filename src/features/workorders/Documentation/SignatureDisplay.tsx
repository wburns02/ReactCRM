/**
 * SignatureDisplay Component
 *
 * Display component for saved signatures.
 * Features:
 * - Display signature image
 * - Show signer name and timestamp
 * - Type indicator (Customer/Technician)
 */
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { WorkOrderSignature, SignatureType } from "@/api/types/workOrder";

const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  customer: "Customer",
  technician: "Technician",
};

const SIGNATURE_TYPE_ICONS: Record<SignatureType, React.ReactNode> = {
  customer: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  technician: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

export interface SignatureDisplayProps {
  signature: WorkOrderSignature;
  className?: string;
  compact?: boolean;
}

export function SignatureDisplay({
  signature,
  className,
  compact = false,
}: SignatureDisplayProps) {
  const formattedDate = new Date(signature.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-card",
          className,
        )}
      >
        {/* Signature thumbnail */}
        <div className="w-20 h-12 rounded border border-border bg-white overflow-hidden flex-shrink-0">
          <img
            src={signature.data}
            alt={`${signature.signerName}'s signature`}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant={signature.type === "customer" ? "primary" : "info"}
              size="sm"
            >
              {SIGNATURE_TYPE_ICONS[signature.type]}
              <span className="ml-1">
                {SIGNATURE_TYPE_LABELS[signature.type]}
              </span>
            </Badge>
          </div>
          <p className="text-sm font-medium text-text-primary truncate">
            {signature.signerName}
          </p>
          <p className="text-xs text-text-muted">{formattedDate}</p>
        </div>

        {/* Status */}
        {signature.uploadStatus === "uploaded" ? (
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : signature.uploadStatus === "failed" ? (
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        ) : (
          <div className="flex-shrink-0 animate-spin">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {SIGNATURE_TYPE_ICONS[signature.type]}
          <span className="font-medium text-text-primary">
            {SIGNATURE_TYPE_LABELS[signature.type]} Signature
          </span>
        </div>
        <Badge
          variant={
            signature.uploadStatus === "uploaded"
              ? "success"
              : signature.uploadStatus === "failed"
                ? "danger"
                : "warning"
          }
          size="sm"
        >
          {signature.uploadStatus === "uploaded"
            ? "Saved"
            : signature.uploadStatus === "failed"
              ? "Failed"
              : "Pending"}
        </Badge>
      </div>

      {/* Signature Image */}
      <div className="p-4 bg-white">
        <div className="border border-border rounded-lg overflow-hidden">
          <img
            src={signature.data}
            alt={`${signature.signerName}'s signature`}
            className="w-full h-32 object-contain bg-white"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-bg-hover/50 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {signature.signerName}
            </p>
            <p className="text-xs text-text-muted">Signed on {formattedDate}</p>
          </div>

          {/* Verified badge */}
          <div className="flex items-center gap-1 text-success">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-xs font-medium">Verified</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Component to display both customer and technician signatures side by side
 */
export interface SignaturePairDisplayProps {
  customerSignature?: WorkOrderSignature;
  technicianSignature?: WorkOrderSignature;
  className?: string;
}

export function SignaturePairDisplay({
  customerSignature,
  technicianSignature,
  className,
}: SignaturePairDisplayProps) {
  const hasCustomer = !!customerSignature;
  const hasTechnician = !!technicianSignature;

  if (!hasCustomer && !hasTechnician) {
    return (
      <div className={cn("text-center py-8 text-text-muted", className)}>
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        <p>No signatures captured yet</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {/* Customer Signature */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-text-secondary">
          Customer Signature
        </h4>
        {hasCustomer ? (
          <SignatureDisplay signature={customerSignature} />
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="text-sm text-text-muted">Not yet signed</p>
          </div>
        )}
      </div>

      {/* Technician Signature */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-text-secondary">
          Technician Signature
        </h4>
        {hasTechnician ? (
          <SignatureDisplay signature={technicianSignature} />
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm text-text-muted">Not yet signed</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignatureDisplay;
