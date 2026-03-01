import { useState } from "react";
import {
  useCustomerPermits,
  useUnlinkPermit,
} from "@/api/hooks/usePermits.ts";
import type { PermitCustomerSummary } from "@/api/types/permit.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate } from "@/lib/utils.ts";

interface PermitHistoryProps {
  customerId: string;
}

function PermitCard({ permit, onUnlink }: { permit: PermitCustomerSummary; onUnlink: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {permit.permit_number && (
              <span className="font-mono text-sm font-medium text-text-primary">
                #{permit.permit_number}
              </span>
            )}
            {permit.system_type_raw && (
              <Badge variant="default">{permit.system_type_raw}</Badge>
            )}
            {permit.data_quality_score != null && (
              <Badge
                variant={
                  permit.data_quality_score >= 70
                    ? "success"
                    : permit.data_quality_score >= 40
                      ? "warning"
                      : "danger"
                }
              >
                Q: {permit.data_quality_score}
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {permit.address}
            {permit.city && `, ${permit.city}`}
            {permit.county_name && ` (${permit.county_name} County)`}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            {permit.permit_date && (
              <span>Permit: {formatDate(permit.permit_date)}</span>
            )}
            {permit.install_date && (
              <span>Installed: {formatDate(permit.install_date)}</span>
            )}
            {permit.contractor_name && (
              <span>Installer: {permit.contractor_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Less" : "More"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onUnlink(permit.id)}
          >
            Unlink
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {permit.tank_size_gallons && (
              <div>
                <dt className="text-text-muted">Tank Size</dt>
                <dd className="font-medium">{permit.tank_size_gallons} gal</dd>
              </div>
            )}
            {permit.drainfield_size_sqft && (
              <div>
                <dt className="text-text-muted">Drainfield</dt>
                <dd className="font-medium">{permit.drainfield_size_sqft} sq ft</dd>
              </div>
            )}
            {permit.bedrooms && (
              <div>
                <dt className="text-text-muted">Bedrooms</dt>
                <dd className="font-medium">{permit.bedrooms}</dd>
              </div>
            )}
            {permit.owner_name && (
              <div>
                <dt className="text-text-muted">Owner (Permit)</dt>
                <dd className="font-medium">{permit.owner_name}</dd>
              </div>
            )}
            {permit.raw_data?.gate_code && (
              <div>
                <dt className="text-text-muted">Gate Code</dt>
                <dd className="font-medium font-mono">{permit.raw_data.gate_code}</dd>
              </div>
            )}
            {permit.raw_data?.drainfield_type && (
              <div>
                <dt className="text-text-muted">Drainfield Type</dt>
                <dd className="font-medium">{permit.raw_data.drainfield_type}</dd>
              </div>
            )}
            {permit.raw_data?.soil_type && (
              <div>
                <dt className="text-text-muted">Soil Type</dt>
                <dd className="font-medium">{permit.raw_data.soil_type}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function PermitHistory({ customerId }: PermitHistoryProps) {
  const { data, isLoading } = useCustomerPermits(customerId);
  const unlinkMutation = useUnlinkPermit();
  const [isOpen, setIsOpen] = useState(true);

  const permits = data?.permits || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permit History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-bg-muted rounded" />
            <div className="h-20 bg-bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permits.length === 0) {
    return null; // Don't show if no permits
  }

  const handleUnlink = async (permitId: string) => {
    try {
      await unlinkMutation.mutateAsync(permitId);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Permit History</CardTitle>
            <Badge variant="default">{permits.length}</Badge>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="space-y-3">
            {permits.map((permit) => (
              <PermitCard
                key={permit.id}
                permit={permit}
                onUnlink={handleUnlink}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
