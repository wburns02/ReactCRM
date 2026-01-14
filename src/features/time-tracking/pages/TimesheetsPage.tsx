import { useState } from "react";
import { usePayrollStats, useCurrentPeriod } from "../api/timeTracking.ts";
import { TimeEntryList } from "../components/TimeEntryList.tsx";
import { TimeClockWidget } from "../components/TimeClockWidget.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";

type Tab = "entries" | "pending";

export function TimesheetsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("entries");
  const { data: stats, isLoading: loadingStats } = usePayrollStats();
  const { data: currentPeriod } = useCurrentPeriod();

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "entries", label: "Time Entries", icon: "⏱️" },
    {
      id: "pending",
      label: "Pending Approval",
      icon: "⏳",
      badge: stats?.pending_approvals || 0,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          ⏱️ Timesheets
        </h1>
        <p className="text-text-muted mt-1">
          Track time entries and manage timesheets
        </p>
      </div>

      {/* Time Clock Widget */}
      <TimeClockWidget />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Current Period Hours</p>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingStats
                    ? "-"
                    : stats?.current_period?.hours?.toFixed(1) || 0}
                  h
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Pending Approval</p>
                <p className="text-2xl font-bold text-warning">
                  {loadingStats ? "-" : stats?.pending_approvals || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full text-2xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">YTD Gross Pay</p>
                <p className="text-2xl font-bold text-success">
                  {loadingStats
                    ? "-"
                    : formatCurrency(stats?.ytd_gross_pay || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">YTD Commissions</p>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingStats
                    ? "-"
                    : formatCurrency(stats?.ytd_commissions || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-2xl">🎯</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Period Info */}
      {currentPeriod && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-text-muted">Current Pay Period</p>
                  <p className="font-medium text-text-primary">
                    {formatDate(currentPeriod.start_date)} -{" "}
                    {formatDate(currentPeriod.end_date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Period Gross</p>
                <p className="font-bold text-text-primary">
                  {formatCurrency(currentPeriod.total_gross_pay || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {tab.badge && tab.badge > 0 ? (
                <span className="ml-1 px-2 py-0.5 text-xs bg-warning/20 text-warning rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "entries" && (
          <Card>
            <CardHeader>
              <CardTitle>All Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeEntryList showApprove={false} />
            </CardContent>
          </Card>
        )}

        {activeTab === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeEntryList showApprove={true} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default TimesheetsPage;
