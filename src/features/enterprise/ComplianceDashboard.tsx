/**
 * Compliance Dashboard
 * Monitor compliance scores and address issues
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useComplianceReport, useRegions } from "@/api/hooks/useEnterprise";
import type { ComplianceReport } from "@/api/types/enterprise";
import { formatDate, cn } from "@/lib/utils";

export function ComplianceDashboard() {
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();

  const { data: regions } = useRegions();
  const { data: report, isLoading } = useComplianceReport(selectedRegion);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Compliance Dashboard
          </h1>
          <p className="text-text-secondary">
            Monitor regulatory compliance and address issues
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedRegion || ""}
            onChange={(e) => setSelectedRegion(e.target.value || undefined)}
            className="px-3 py-2 rounded-md border border-border bg-background"
          >
            <option value="">All Regions</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Button variant="outline">Download Report</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-60 bg-background-secondary animate-pulse rounded" />
      ) : report ? (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              className={cn(
                "border-2",
                report.compliance_score >= 90
                  ? "border-success"
                  : report.compliance_score >= 70
                    ? "border-warning"
                    : "border-error",
              )}
            >
              <CardContent className="pt-6 text-center">
                <div
                  className={cn(
                    "text-5xl font-bold",
                    report.compliance_score >= 90
                      ? "text-success"
                      : report.compliance_score >= 70
                        ? "text-warning"
                        : "text-error",
                  )}
                >
                  {report.compliance_score}
                </div>
                <p className="text-lg text-text-muted mt-2">
                  Overall Compliance Score
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {report.compliance_score >= 90
                    ? "Excellent compliance status"
                    : report.compliance_score >= 70
                      ? "Needs attention"
                      : "Critical - immediate action required"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-text-primary mb-4">
                  Report Period
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Start Date</span>
                    <span className="font-medium">
                      {formatDate(report.period_start)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">End Date</span>
                    <span className="font-medium">
                      {formatDate(report.period_end)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Generated</span>
                    <span className="font-medium">
                      {formatDate(report.generated_at)}
                    </span>
                  </div>
                  {report.region_name && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Region</span>
                      <span className="font-medium">{report.region_name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-text-primary mb-4">
                  Issue Summary
                </h3>
                <div className="space-y-2">
                  {(["critical", "high", "medium", "low"] as const).map(
                    (severity) => {
                      const count = report.areas.reduce(
                        (sum, area) =>
                          sum +
                          area.issues.filter((i) => i.severity === severity)
                            .length,
                        0,
                      );
                      return (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <SeverityBadge severity={severity} />
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Areas */}
          <div className="space-y-4">
            {report.areas.map((area, index) => (
              <ComplianceArea key={index} area={area} />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            No compliance data available
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComplianceArea({ area }: { area: ComplianceReport["areas"][number] }) {
  const [expanded, setExpanded] = useState(area.issues.length > 0);

  const scoreColor =
    area.score >= 90
      ? "text-success"
      : area.score >= 70
        ? "text-warning"
        : "text-error";

  const criticalCount = area.issues.filter(
    (i) => i.severity === "critical",
  ).length;
  const highCount = area.issues.filter((i) => i.severity === "high").length;

  return (
    <Card
      className={cn(
        criticalCount > 0 && "border-error/50",
        criticalCount === 0 && highCount > 0 && "border-warning/50",
      )}
    >
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("text-2xl font-bold", scoreColor)}>
              {area.score}
            </div>
            <div>
              <CardTitle>{area.name}</CardTitle>
              <p className="text-sm text-text-muted">
                {area.issues.length} issue{area.issues.length !== 1 ? "s" : ""}{" "}
                found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-error text-white">
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-warning text-white">{highCount} High</Badge>
            )}
            <span className="text-text-muted">{expanded ? "▼" : "▶"}</span>
          </div>
        </div>
      </CardHeader>

      {expanded && area.issues.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {area.issues
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a.severity] - order[b.severity];
              })
              .map((issue, i) => (
                <IssueCard key={i} issue={issue} />
              ))}
          </div>
        </CardContent>
      )}

      {expanded && area.issues.length === 0 && (
        <CardContent className="pt-0">
          <div className="text-center py-4 text-success">
            ✓ No issues found in this area
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function IssueCard({
  issue,
}: {
  issue: ComplianceReport["areas"][number]["issues"][number];
}) {
  const severityStyles = {
    critical: "bg-error/10 border-error/30",
    high: "bg-warning/10 border-warning/30",
    medium: "bg-info/10 border-info/30",
    low: "bg-background-secondary border-border",
  };

  return (
    <div
      className={cn("p-4 rounded-lg border", severityStyles[issue.severity])}
    >
      <div className="flex items-start gap-3">
        <SeverityBadge severity={issue.severity} />
        <div className="flex-1">
          <p className="font-medium">{issue.description}</p>
          {issue.recommendation && (
            <div className="mt-2 p-2 bg-background rounded text-sm">
              <span className="text-text-muted">Recommendation: </span>
              {issue.recommendation}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm">
          Resolve
        </Button>
      </div>
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: "critical" | "high" | "medium" | "low";
}) {
  const styles = {
    critical: "bg-error text-white",
    high: "bg-warning text-white",
    medium: "bg-info text-white",
    low: "bg-text-muted text-white",
  };

  const icons = {
    critical: "🚨",
    high: "⚠️",
    medium: "ℹ️",
    low: "📝",
  };

  return (
    <Badge className={cn("gap-1", styles[severity])}>
      <span>{icons[severity]}</span>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}
