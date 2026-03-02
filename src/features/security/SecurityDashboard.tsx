import { Shield } from "lucide-react";

const SOC_BASE = "https://soc.ecbtx.com";

export function SecurityDashboard() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-text-primary">Security Dashboard</h1>
        </div>
        <iframe
          src={`${SOC_BASE}/?embed=true`}
          className="w-full border border-border rounded-lg bg-[#0a0e17]"
          style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
          title="SOC Dashboard"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
