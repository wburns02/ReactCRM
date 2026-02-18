import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useTechnicianCertifications,
  useTechnicianLicenses,
} from "@/api/hooks/useTechnicianCompliance.ts";
import { formatDate } from "@/lib/utils.ts";
import {
  TECHNICIAN_SKILL_LABELS,
  type Technician,
  type TechnicianSkill,
} from "@/api/types/technician.ts";

interface TechComplianceTabProps {
  technician: Technician;
  technicianId: string;
}

function getExpiryVariant(daysUntilExpiry: number | null | undefined): "success" | "warning" | "danger" | "default" {
  if (daysUntilExpiry == null) return "default";
  if (daysUntilExpiry < 0) return "danger";
  if (daysUntilExpiry < 30) return "danger";
  if (daysUntilExpiry < 90) return "warning";
  return "success";
}

function getExpiryLabel(daysUntilExpiry: number | null | undefined): string {
  if (daysUntilExpiry == null) return "No expiry";
  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)}d ago`;
  if (daysUntilExpiry === 0) return "Expires today";
  return `${daysUntilExpiry}d remaining`;
}

export function TechComplianceTab({ technician, technicianId }: TechComplianceTabProps) {
  const { data: certsData, isLoading: certsLoading } = useTechnicianCertifications(technicianId);
  const { data: licensesData, isLoading: licensesLoading } = useTechnicianLicenses(technicianId);

  const expiringCount = useMemo(() => {
    let count = 0;
    const certs = certsData?.items ?? [];
    const licenses = licensesData?.items ?? [];
    for (const cert of certs) {
      if (cert.expiry_date) {
        const days = Math.floor(
          (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (days <= 30) count++;
      }
    }
    for (const lic of licenses) {
      if (lic.expiry_date) {
        const days = Math.floor(
          (new Date(lic.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (days <= 30) count++;
      }
    }
    return count;
  }, [certsData, licensesData]);

  return (
    <div className="space-y-6">
      {/* Expiry Alert Banner */}
      {expiringCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-400 text-lg">!</span>
          <p className="text-sm text-red-400 font-medium">
            {expiringCount} item{expiringCount > 1 ? "s" : ""} expiring within 30 days
          </p>
        </div>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent>
          {technician.skills && technician.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {technician.skills.map((skill) => (
                <Badge key={skill} variant="default">
                  {TECHNICIAN_SKILL_LABELS[skill as TechnicianSkill] || skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-text-muted">No skills listed</p>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>
            Certifications {certsData ? `(${certsData.total})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-bg-muted rounded" />
              ))}
            </div>
          ) : !certsData || certsData.items.length === 0 ? (
            <p className="text-center text-text-muted py-6">
              No certifications on file
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-text-muted font-medium">Name</th>
                      <th className="pb-3 text-text-muted font-medium">Type</th>
                      <th className="pb-3 text-text-muted font-medium">Issuer</th>
                      <th className="pb-3 text-text-muted font-medium">Issued</th>
                      <th className="pb-3 text-text-muted font-medium">Expiry</th>
                      <th className="pb-3 text-text-muted font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {certsData.items.map((cert) => {
                      const daysUntil = cert.expiry_date
                        ? Math.floor(
                            (new Date(cert.expiry_date).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : null;
                      return (
                        <tr key={cert.id} className="hover:bg-bg-hover transition-colors">
                          <td className="py-3 text-text-primary font-medium">
                            {cert.name}
                            {cert.certification_number && (
                              <span className="block text-xs text-text-muted font-mono">
                                #{cert.certification_number}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-text-secondary capitalize">
                            {cert.certification_type}
                          </td>
                          <td className="py-3 text-text-secondary">
                            {cert.issuing_organization || "-"}
                          </td>
                          <td className="py-3 text-text-primary">
                            {cert.issue_date ? formatDate(cert.issue_date) : "-"}
                          </td>
                          <td className="py-3">
                            {cert.expiry_date ? (
                              <div>
                                <span className="text-text-primary">
                                  {formatDate(cert.expiry_date)}
                                </span>
                                <Badge
                                  variant={getExpiryVariant(daysUntil)}
                                  className="ml-2"
                                >
                                  {getExpiryLabel(daysUntil)}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-text-muted">No expiry</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                cert.status === "active"
                                  ? "success"
                                  : cert.status === "expired"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {cert.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {certsData.items.map((cert) => {
                  const daysUntil = cert.expiry_date
                    ? Math.floor(
                        (new Date(cert.expiry_date).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                  return (
                    <div key={cert.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-text-primary">{cert.name}</p>
                          <p className="text-xs text-text-secondary capitalize">
                            {cert.certification_type}
                          </p>
                        </div>
                        <Badge
                          variant={
                            cert.status === "active" ? "success" : "danger"
                          }
                        >
                          {cert.status}
                        </Badge>
                      </div>
                      {cert.expiry_date && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-text-muted">
                            Expires: {formatDate(cert.expiry_date)}
                          </span>
                          <Badge variant={getExpiryVariant(daysUntil)}>
                            {getExpiryLabel(daysUntil)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Licenses */}
      <Card>
        <CardHeader>
          <CardTitle>
            Licenses {licensesData ? `(${licensesData.total})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {licensesLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-bg-muted rounded" />
              ))}
            </div>
          ) : !licensesData || licensesData.items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-text-muted">No licenses on file</p>
              {technician.license_number && (
                <p className="text-sm text-text-secondary mt-2">
                  License from profile: {technician.license_number}
                  {technician.license_expiry &&
                    ` (expires ${formatDate(technician.license_expiry)})`}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-text-muted font-medium">License #</th>
                      <th className="pb-3 text-text-muted font-medium">Type</th>
                      <th className="pb-3 text-text-muted font-medium">Authority</th>
                      <th className="pb-3 text-text-muted font-medium">Expiry</th>
                      <th className="pb-3 text-text-muted font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {licensesData.items.map((lic) => {
                      const daysUntil = lic.expiry_date
                        ? Math.floor(
                            (new Date(lic.expiry_date).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : null;
                      return (
                        <tr key={lic.id} className="hover:bg-bg-hover transition-colors">
                          <td className="py-3 text-text-primary font-mono">
                            {lic.license_number}
                          </td>
                          <td className="py-3 text-text-secondary capitalize">
                            {lic.license_type}
                          </td>
                          <td className="py-3 text-text-secondary">
                            {lic.issuing_authority || "-"}
                          </td>
                          <td className="py-3">
                            {lic.expiry_date ? (
                              <div>
                                <span className="text-text-primary">
                                  {formatDate(lic.expiry_date)}
                                </span>
                                <Badge
                                  variant={getExpiryVariant(daysUntil)}
                                  className="ml-2"
                                >
                                  {getExpiryLabel(daysUntil)}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-text-muted">No expiry</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                lic.status === "active"
                                  ? "success"
                                  : lic.status === "expired"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {lic.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {licensesData.items.map((lic) => {
                  const daysUntil = lic.expiry_date
                    ? Math.floor(
                        (new Date(lic.expiry_date).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                  return (
                    <div key={lic.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-text-primary font-mono">
                            {lic.license_number}
                          </p>
                          <p className="text-xs text-text-secondary capitalize">
                            {lic.license_type}
                          </p>
                        </div>
                        <Badge
                          variant={
                            lic.status === "active" ? "success" : "danger"
                          }
                        >
                          {lic.status}
                        </Badge>
                      </div>
                      {lic.expiry_date && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-text-muted">
                            Expires: {formatDate(lic.expiry_date)}
                          </span>
                          <Badge variant={getExpiryVariant(daysUntil)}>
                            {getExpiryLabel(daysUntil)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
