import { useState } from "react";
import { useContractsDashboard, type Contract } from "../api/contracts.ts";
import { ContractList } from "../components/ContractList.tsx";
import { ContractDetails } from "../components/ContractDetails.tsx";
import { ContractTemplates } from "../components/ContractTemplates.tsx";
import { NewContractForm } from "../components/NewContractForm.tsx";
import { RenewalsTab } from "../components/RenewalsTab.tsx";
import { ReportsTab } from "../components/ReportsTab.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatCurrency } from "@/lib/utils.ts";

type Tab = "contracts" | "new" | "renewals" | "reports" | "templates";

export function ContractsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("contracts");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const { data: dashboard, isLoading } = useContractsDashboard(30);

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "contracts", label: "Active Contracts", icon: "📋" },
    { id: "new", label: "New Contract", icon: "➕" },
    {
      id: "renewals",
      label: "Renewals",
      icon: "🔄",
      badge: dashboard?.summary?.expiring_count,
    },
    { id: "reports", label: "Reports", icon: "📊" },
    { id: "templates", label: "Templates", icon: "📄" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          🤝 Contracts & Maintenance
        </h1>
        <p className="text-text-muted mt-1">
          Manage service agreements, renewals, and recurring revenue
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-text-muted">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-text-primary">
                  {isLoading ? "-" : dashboard?.summary?.total_contracts || 0}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xl sm:text-2xl">📋</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-text-muted">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-success">
                  {isLoading ? "-" : dashboard?.summary?.active_contracts || 0}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-xl sm:text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-text-muted">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-warning">
                  {isLoading ? "-" : dashboard?.summary?.pending_signature || 0}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-xl sm:text-2xl">✍️</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-text-muted">Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-text-primary">
                  {isLoading
                    ? "-"
                    : formatCurrency(dashboard?.summary?.total_active_value || 0)}
                </p>
                {(dashboard?.summary?.expiring_count || 0) > 0 && (
                  <p className="text-xs text-warning mt-0.5">
                    {dashboard?.summary?.expiring_count} expiring
                  </p>
                )}
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xl sm:text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 sm:gap-4 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedContract(null);
              }}
              className={`
                flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b-2 -mb-px transition-colors whitespace-nowrap text-sm
                ${
                  activeTab === tab.id
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              {tab.badge ? (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded-full font-medium">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "contracts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={selectedContract ? "lg:col-span-2" : "lg:col-span-3"}>
              <Card>
                <CardHeader>
                  <CardTitle>Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContractList
                    onContractSelect={(contract) => setSelectedContract(contract)}
                  />
                </CardContent>
              </Card>
            </div>

            {selectedContract && (
              <div className="lg:col-span-1">
                <ContractDetails
                  contractId={selectedContract.id}
                  onClose={() => setSelectedContract(null)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "new" && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <NewContractForm
                onSuccess={() => setActiveTab("contracts")}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "renewals" && <RenewalsTab />}

        {activeTab === "reports" && <ReportsTab />}

        {activeTab === "templates" && (
          <Card>
            <CardHeader>
              <CardTitle>Contract Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractTemplates />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ContractsPage;
