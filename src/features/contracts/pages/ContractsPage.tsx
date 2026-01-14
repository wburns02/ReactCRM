import { useState } from "react";
import { useContractsDashboard, type Contract } from "../api/contracts.ts";
import { ContractList } from "../components/ContractList.tsx";
import { ContractDetails } from "../components/ContractDetails.tsx";
import { ContractTemplates } from "../components/ContractTemplates.tsx";
import { ExpiringContractsAlert } from "../components/ExpiringContractsAlert.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatCurrency } from "@/lib/utils.ts";

type Tab = "contracts" | "templates" | "expiring";

export function ContractsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("contracts");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );
  const { data: dashboard, isLoading } = useContractsDashboard(30);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "contracts", label: "All Contracts", icon: "📄" },
    { id: "templates", label: "Templates", icon: "📋" },
    { id: "expiring", label: "Expiring Soon", icon: "⚠️" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          📄 Contracts
        </h1>
        <p className="text-text-muted mt-1">
          Manage service agreements and contract templates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Contracts</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading ? "-" : dashboard?.summary?.total_contracts || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-2xl">📄</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Contracts</p>
                <p className="text-2xl font-bold text-success">
                  {isLoading ? "-" : dashboard?.summary?.active_contracts || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Pending Signature</p>
                <p className="text-2xl font-bold text-warning">
                  {isLoading ? "-" : dashboard?.summary?.pending_signature || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full text-2xl">✍️</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Value</p>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading
                    ? "-"
                    : formatCurrency(
                        dashboard?.summary?.total_active_value || 0,
                      )}
                </p>
                <p className="text-xs text-warning mt-1">
                  {dashboard?.summary?.expiring_count || 0} expiring soon
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-2xl">💰</div>
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
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedContract(null);
              }}
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
              {tab.id === "expiring" && dashboard?.summary?.expiring_count ? (
                <span className="ml-1 px-2 py-0.5 text-xs bg-warning/20 text-warning rounded-full">
                  {dashboard.summary.expiring_count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "contracts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className={selectedContract ? "lg:col-span-2" : "lg:col-span-3"}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContractList
                    onContractSelect={(contract) =>
                      setSelectedContract(contract)
                    }
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

        {activeTab === "expiring" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpiringContractsAlert expiringWithinDays={30} />
            <ExpiringContractsAlert expiringWithinDays={60} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractsPage;
