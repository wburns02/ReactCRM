import { Users } from "lucide-react";

const SOC_BASE = "https://soc.ecbtx.com";

export function SecurityAgents() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-green-500" />
          <h1 className="text-2xl font-bold text-text-primary">Security Agents</h1>
        </div>
        <iframe
          src={`${SOC_BASE}/agents?embed=true`}
          className="w-full border border-border rounded-lg bg-[#0a0e17]"
          style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
          title="Security Agents"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
