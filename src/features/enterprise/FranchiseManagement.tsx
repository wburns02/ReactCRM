/**
 * Franchise Management Component
 * Royalty tracking, territory management, and franchise performance
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useFranchiseRoyalties,
  useMarkRoyaltyPaid,
  useTerritories,
  useRegions,
} from '@/api/hooks/useEnterprise';
import type { FranchiseRoyalty, Territory, Region } from '@/api/types/enterprise';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

type FranchiseTab = 'royalties' | 'territories';

export function FranchiseManagement() {
  const [activeTab, setActiveTab] = useState<FranchiseTab>('royalties');
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();

  const { data: regions } = useRegions();
  const franchiseRegions = regions?.filter((r) => r.is_franchise) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Franchise Management</h1>
          <p className="text-text-secondary">
            Manage {franchiseRegions.length} franchise locations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Generate All Invoices</Button>
          <Button variant="primary">Add Franchise</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'royalties' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('royalties')}
        >
          💰 Royalties
        </Button>
        <Button
          variant={activeTab === 'territories' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('territories')}
        >
          🗺️ Territories
        </Button>
      </div>

      {/* Region Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Filter by region:</span>
        <select
          value={selectedRegion || ''}
          onChange={(e) => setSelectedRegion(e.target.value || undefined)}
          className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="">All Franchises</option>
          {franchiseRegions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {activeTab === 'royalties' && <RoyaltiesTab franchiseId={selectedRegion} />}
      {activeTab === 'territories' && <TerritoriesTab regionId={selectedRegion} />}
    </div>
  );
}

function RoyaltiesTab({ franchiseId }: { franchiseId?: string }) {
  const { data: royalties, isLoading } = useFranchiseRoyalties(franchiseId);
  const markPaid = useMarkRoyaltyPaid();

  const handleMarkPaid = async (royaltyId: string) => {
    try {
      await markPaid.mutateAsync({
        royalty_id: royaltyId,
        paid_date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  // Group by status for summary
  const summary = royalties?.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + r.total_fees;
      acc.total += r.total_fees;
      return acc;
    },
    { pending: 0, invoiced: 0, paid: 0, overdue: 0, total: 0 } as Record<string, number>
  ) || { pending: 0, invoiced: 0, paid: 0, overdue: 0, total: 0 };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Fees" value={formatCurrency(summary.total)} />
        <SummaryCard
          label="Pending"
          value={formatCurrency(summary.pending)}
          variant="warning"
        />
        <SummaryCard
          label="Invoiced"
          value={formatCurrency(summary.invoiced)}
          variant="info"
        />
        <SummaryCard
          label="Overdue"
          value={formatCurrency(summary.overdue)}
          variant="danger"
        />
        <SummaryCard
          label="Paid"
          value={formatCurrency(summary.paid)}
          variant="success"
        />
      </div>

      {/* Royalties List */}
      <Card>
        <CardHeader>
          <CardTitle>Royalty Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-60 bg-background-secondary animate-pulse rounded" />
          ) : !royalties?.length ? (
            <div className="text-center py-8 text-text-secondary">
              No royalty reports found
            </div>
          ) : (
            <div className="space-y-4">
              {royalties.map((royalty) => (
                <RoyaltyRow
                  key={royalty.id}
                  royalty={royalty}
                  onMarkPaid={() => handleMarkPaid(royalty.id)}
                  isPending={markPaid.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoyaltyRow({
  royalty,
  onMarkPaid,
  isPending,
}: {
  royalty: FranchiseRoyalty;
  onMarkPaid: () => void;
  isPending: boolean;
}) {
  const statusStyles = {
    pending: 'bg-warning/10 border-warning/30',
    invoiced: 'bg-info/10 border-info/30',
    paid: 'bg-success/10 border-success/30',
    overdue: 'bg-error/10 border-error/30',
  };

  const statusBadge = {
    pending: { label: 'Pending', class: 'bg-warning text-white' },
    invoiced: { label: 'Invoiced', class: 'bg-info text-white' },
    paid: { label: 'Paid', class: 'bg-success text-white' },
    overdue: { label: 'Overdue', class: 'bg-error text-white' },
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        statusStyles[royalty.status]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{royalty.franchise_name}</span>
            <Badge className={statusBadge[royalty.status].class}>
              {statusBadge[royalty.status].label}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary">
            Period: {formatDate(royalty.period_start)} - {formatDate(royalty.period_end)}
          </p>
          {royalty.invoice_number && (
            <p className="text-sm text-text-muted">
              Invoice #{royalty.invoice_number}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-bold">{formatCurrency(royalty.total_fees)}</p>
          {royalty.due_date && royalty.status !== 'paid' && (
            <p className={cn(
              'text-sm',
              royalty.status === 'overdue' ? 'text-error' : 'text-text-muted'
            )}>
              Due: {formatDate(royalty.due_date)}
            </p>
          )}
          {royalty.paid_date && (
            <p className="text-sm text-success">
              Paid: {formatDate(royalty.paid_date)}
            </p>
          )}
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span className="text-text-muted">Gross Revenue</span>
          <p className="font-medium">{formatCurrency(royalty.gross_revenue)}</p>
        </div>
        <div>
          <span className="text-text-muted">Qualifying Revenue</span>
          <p className="font-medium">{formatCurrency(royalty.qualifying_revenue)}</p>
        </div>
        <div>
          <span className="text-text-muted">Royalty ({(royalty.royalty_rate * 100).toFixed(1)}%)</span>
          <p className="font-medium">{formatCurrency(royalty.royalty_amount)}</p>
        </div>
        {royalty.marketing_fee !== null && royalty.marketing_fee !== undefined && (
          <div>
            <span className="text-text-muted">Marketing Fee</span>
            <p className="font-medium">{formatCurrency(royalty.marketing_fee)}</p>
          </div>
        )}
        {royalty.technology_fee !== null && royalty.technology_fee !== undefined && (
          <div>
            <span className="text-text-muted">Tech Fee</span>
            <p className="font-medium">{formatCurrency(royalty.technology_fee)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {royalty.status !== 'paid' && (
        <div className="mt-4 flex justify-end gap-2">
          {royalty.status === 'pending' && (
            <Button variant="outline" size="sm">
              Generate Invoice
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onMarkPaid}
            disabled={isPending}
          >
            Mark as Paid
          </Button>
        </div>
      )}
    </div>
  );
}

function TerritoriesTab({ regionId }: { regionId?: string }) {
  const { data: territories, isLoading } = useTerritories(regionId);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Territories"
          value={territories?.length?.toString() || '0'}
        />
        <SummaryCard
          label="Exclusive"
          value={territories?.filter((t) => t.is_exclusive).length?.toString() || '0'}
          variant="info"
        />
        <SummaryCard
          label="Total ZIP Codes"
          value={territories?.reduce((sum, t) => sum + t.zip_codes.length, 0)?.toString() || '0'}
        />
        <SummaryCard
          label="Assigned Techs"
          value={territories?.reduce((sum, t) => sum + t.assigned_technician_ids.length, 0)?.toString() || '0'}
        />
      </div>

      {/* Territories List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Territories</CardTitle>
            <Button variant="primary" size="sm">
              Create Territory
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-60 bg-background-secondary animate-pulse rounded" />
          ) : !territories?.length ? (
            <div className="text-center py-8 text-text-secondary">
              No territories defined
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {territories.map((territory) => (
                <TerritoryCard key={territory.id} territory={territory} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TerritoryCard({ territory }: { territory: Territory }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{territory.name}</h3>
            <p className="text-sm text-text-muted">
              {territory.zip_codes.length} ZIP codes
            </p>
          </div>
          {territory.is_exclusive && (
            <Badge className="bg-info text-white">Exclusive</Badge>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {territory.zip_codes.slice(0, 8).map((zip) => (
            <Badge key={zip} variant="outline" className="text-xs">
              {zip}
            </Badge>
          ))}
          {territory.zip_codes.length > 8 && (
            <Badge variant="outline" className="text-xs">
              +{territory.zip_codes.length - 8} more
            </Badge>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Assigned Technicians</span>
            <p className="font-medium">{territory.assigned_technician_ids.length}</p>
          </div>
          {territory.population && (
            <div>
              <span className="text-text-muted">Population</span>
              <p className="font-medium">{territory.population.toLocaleString()}</p>
            </div>
          )}
          {territory.estimated_potential && (
            <div>
              <span className="text-text-muted">Est. Potential</span>
              <p className="font-medium">{formatCurrency(territory.estimated_potential)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Map
          </Button>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variantStyles = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-error',
    info: 'text-info',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <p className={cn('text-xl font-bold', variantStyles[variant])}>{value}</p>
      </CardContent>
    </Card>
  );
}
