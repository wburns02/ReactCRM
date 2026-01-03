import { useComplianceDashboard } from '../api/compliance.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { formatDate } from '@/lib/utils.ts';

interface ComplianceAlertsProps {
  expiringWithinDays?: number;
}

export function ComplianceAlerts({ expiringWithinDays = 30 }: ComplianceAlertsProps) {
  const { data: dashboard, isLoading, error } = useComplianceDashboard(expiringWithinDays);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 bg-bg-muted rounded-lg" />
        <div className="h-24 bg-bg-muted rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-text-error py-4">
        Error loading alerts
      </div>
    );
  }

  const hasAlerts = (dashboard?.expiring_licenses?.length || 0) > 0 ||
    (dashboard?.expiring_certifications?.length || 0) > 0 ||
    (dashboard?.overdue_inspections?.length || 0) > 0;

  if (!hasAlerts) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <span className="text-4xl block mb-2">✅</span>
          <p className="text-text-muted">No compliance alerts at this time</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expiring Licenses */}
      {dashboard?.expiring_licenses && dashboard.expiring_licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ⚠️ Expiring Licenses
              <Badge variant="warning">{dashboard.expiring_licenses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.expiring_licenses.map((license) => (
                <div key={license.id} className="flex items-center justify-between p-2 bg-bg-muted rounded">
                  <div>
                    <p className="font-medium text-text-primary">{license.license_type}</p>
                    <p className="text-xs text-text-muted">#{license.license_number}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${license.days_until_expiry !== null && license.days_until_expiry !== undefined && license.days_until_expiry < 0 ? 'text-danger' : 'text-warning'}`}>
                      {formatDate(license.expiry_date)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {license.days_until_expiry !== null && license.days_until_expiry !== undefined && license.days_until_expiry < 0
                        ? `Expired ${Math.abs(license.days_until_expiry)} days ago`
                        : `${license.days_until_expiry} days left`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Certifications */}
      {dashboard?.expiring_certifications && dashboard.expiring_certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🎓 Expiring Certifications
              <Badge variant="warning">{dashboard.expiring_certifications.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.expiring_certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between p-2 bg-bg-muted rounded">
                  <div>
                    <p className="font-medium text-text-primary">{cert.name}</p>
                    <p className="text-xs text-text-muted">{cert.technician_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${cert.days_until_expiry !== null && cert.days_until_expiry !== undefined && cert.days_until_expiry < 0 ? 'text-danger' : 'text-warning'}`}>
                      {cert.expiry_date ? formatDate(cert.expiry_date) : '-'}
                    </p>
                    {cert.days_until_expiry !== null && cert.days_until_expiry !== undefined && (
                      <p className="text-xs text-text-muted">
                        {cert.days_until_expiry < 0
                          ? `Expired ${Math.abs(cert.days_until_expiry)} days ago`
                          : `${cert.days_until_expiry} days left`
                        }
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Inspections */}
      {dashboard?.overdue_inspections && dashboard.overdue_inspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🚨 Overdue Inspections
              <Badge variant="danger">{dashboard.overdue_inspections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.overdue_inspections.map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-2 bg-bg-muted rounded">
                  <div>
                    <p className="font-medium text-text-primary">#{inspection.inspection_number}</p>
                    <p className="text-xs text-text-muted">{inspection.inspection_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-danger">
                      {inspection.scheduled_date ? formatDate(inspection.scheduled_date) : '-'}
                    </p>
                    <p className="text-xs text-text-muted">Overdue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
