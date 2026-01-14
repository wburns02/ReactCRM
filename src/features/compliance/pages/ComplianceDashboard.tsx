import { useState } from "react";
import { useComplianceDashboard } from "../api/compliance.ts";
import { LicenseList } from "../components/LicenseList.tsx";
import { CertificationList } from "../components/CertificationList.tsx";
import { InspectionList } from "../components/InspectionList.tsx";
import { ComplianceAlerts } from "../components/ComplianceAlerts.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";

type Tab = "overview" | "licenses" | "certifications" | "inspections";

export function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { data: dashboard, isLoading } = useComplianceDashboard(30);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "licenses", label: "Licenses", icon: "📜" },
    { id: "certifications", label: "Certifications", icon: "🎓" },
    { id: "inspections", label: "Inspections", icon: "🔍" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          ✅ Compliance Dashboard
        </h1>
        <p className="text-text-muted mt-1">
          Track licenses, certifications, and inspections
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Licenses</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading ? "-" : dashboard?.summary?.total_licenses || 0}
                </p>
                <p className="text-xs text-warning mt-1">
                  {dashboard?.summary?.expiring_licenses_count || 0} expiring
                  soon
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-2xl">📜</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Certifications</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading
                    ? "-"
                    : dashboard?.summary?.total_certifications || 0}
                </p>
                <p className="text-xs text-warning mt-1">
                  {dashboard?.summary?.expiring_certifications_count || 0}{" "}
                  expiring soon
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-2xl">🎓</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Inspections</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading ? "-" : dashboard?.summary?.total_inspections || 0}
                </p>
                <p className="text-xs text-success mt-1">
                  {dashboard?.summary?.completed_inspections || 0} completed
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-2xl">🔍</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Pending</p>
                <p className="text-2xl font-bold text-warning">
                  {isLoading
                    ? "-"
                    : dashboard?.summary?.pending_inspections_count || 0}
                </p>
                <p className="text-xs text-danger mt-1">
                  {dashboard?.summary?.overdue_inspections_count || 0} overdue
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full text-2xl">⏳</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 border-b-2 -mb-px transition-colors
                ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Compliance Alerts
              </h2>
              <ComplianceAlerts expiringWithinDays={30} />
            </div>

            {/* Quick Stats */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Pending Inspections
              </h2>
              {dashboard?.pending_inspections &&
              dashboard.pending_inspections.length > 0 ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {dashboard.pending_inspections
                        .slice(0, 5)
                        .map((inspection) => (
                          <div
                            key={inspection.id}
                            className="flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                #{inspection.inspection_number}
                              </p>
                              <p className="text-xs text-text-muted">
                                {inspection.inspection_type}
                              </p>
                            </div>
                            <p className="text-xs text-text-muted">
                              {inspection.scheduled_date || "Not scheduled"}
                            </p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-text-muted">No pending inspections</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === "licenses" && (
          <Card>
            <CardHeader>
              <CardTitle>Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <LicenseList />
            </CardContent>
          </Card>
        )}

        {activeTab === "certifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationList />
            </CardContent>
          </Card>
        )}

        {activeTab === "inspections" && (
          <Card>
            <CardHeader>
              <CardTitle>Inspections</CardTitle>
            </CardHeader>
            <CardContent>
              <InspectionList />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ComplianceDashboard;
