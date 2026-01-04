import { useContractsDashboard } from '../api/contracts.ts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { formatDate } from '@/lib/utils.ts';

interface ExpiringContractsAlertProps {
  expiringWithinDays?: number;
}

export function ExpiringContractsAlert({ expiringWithinDays = 30 }: ExpiringContractsAlertProps) {
  const { data: dashboard, isLoading, error } = useContractsDashboard(expiringWithinDays);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-text-error">
          Failed to load expiring contracts
        </CardContent>
      </Card>
    );
  }

  const expiringContracts = dashboard?.expiring_contracts || [];

  if (expiringContracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            ⚠️ Expiring Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <span className="text-2xl">✅</span>
            <p className="text-text-muted mt-2">
              No contracts expiring within {expiringWithinDays} days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            ⚠️ Expiring Contracts
          </span>
          <Badge variant="warning">{expiringContracts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expiringContracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-3 bg-bg-hover rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">
                    #{contract.contract_number}
                  </p>
                  {contract.auto_renew && (
                    <Badge variant="info">Auto-Renew</Badge>
                  )}
                </div>
                {contract.customer_name && (
                  <p className="text-sm text-text-muted">
                    {contract.customer_name}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">
                  Expires: {formatDate(contract.end_date)}
                </p>
                <p className={`font-medium ${
                  (contract.days_until_expiry ?? 0) <= 7 ? 'text-danger' :
                  (contract.days_until_expiry ?? 0) <= 14 ? 'text-warning' :
                  'text-text-primary'
                }`}>
                  {contract.days_until_expiry} days
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
