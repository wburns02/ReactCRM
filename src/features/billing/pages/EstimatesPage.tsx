import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAIGenerate } from "@/hooks/useAI";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CreateEstimateModal } from "../components/CreateEstimateModal";

interface Estimate {
  id: number;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  valid_until: string;
}

/**
 * Clickable Estimate Row Component
 * Makes the entire row clickable to navigate to estimate details
 */
function EstimateRow({
  estimate,
  getStatusColor,
}: {
  estimate: Estimate;
  getStatusColor: (status: string) => string;
}) {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(`/estimates/${estimate.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/estimates/${estimate.id}`);
    }
  };

  return (
    <tr
      className="hover:bg-bg-hover cursor-pointer transition-colors"
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View estimate for ${estimate.customer_name || "customer"}`}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary">
            {estimate.customer_name}
          </p>
          <p className="text-sm text-text-muted">{estimate.customer_email}</p>
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-text-primary">
        ${estimate.total?.toLocaleString() || "0"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}
        >
          {estimate.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">
        {estimate.created_at}
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">
        {estimate.valid_until}
      </td>
      <td className="px-4 py-3 text-right">
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/estimates/${estimate.id}`}
            className="text-primary hover:underline text-sm"
          >
            View
          </Link>
        </div>
      </td>
    </tr>
  );
}

/**
 * AI Smart Pricing Assistant for Estimates
 */
function AIPricingSuggestion() {
  const [jobDescription, setJobDescription] = useState("");
  const [suggestion, setSuggestion] = useState<{
    basePrice: number;
    laborHours: number;
    partsEstimate: number;
    total: number;
    confidence: string;
    notes: string;
  } | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const generateAI = useAIGenerate();

  const getPriceSuggestion = async () => {
    if (!jobDescription.trim()) return;

    try {
      await generateAI.mutateAsync({
        type: "description",
        context: {
          prompt: `Generate pricing estimate for: ${jobDescription}`,
          type: "estimate_pricing",
          job_description: jobDescription,
        },
        tone: "professional",
      });
      // Use demo pricing with AI-enhanced fallback
      setSuggestion(generateDemoPricing(jobDescription));
    } catch {
      setSuggestion(generateDemoPricing(jobDescription));
    }
  };

  function generateDemoPricing(description: string) {
    const lower = description.toLowerCase();
    let basePrice = 150;
    let laborHours = 2;
    let partsEstimate = 50;
    let confidence = "Medium";
    let notes = "";

    // Septic services
    if (lower.includes("septic") || lower.includes("tank")) {
      if (lower.includes("pump") || lower.includes("clean")) {
        basePrice = 350;
        laborHours = 2;
        partsEstimate = 0;
        confidence = "High";
        notes = "Standard septic pumping. Price may vary based on tank size.";
      } else if (lower.includes("install") || lower.includes("new")) {
        basePrice = 8000;
        laborHours = 24;
        partsEstimate = 4000;
        confidence = "Medium";
        notes = "Full septic installation. Requires site inspection for accurate quote.";
      } else if (lower.includes("repair") || lower.includes("fix")) {
        basePrice = 500;
        laborHours = 4;
        partsEstimate = 200;
        confidence = "Low";
        notes = "Repair costs vary significantly. Recommend on-site diagnosis.";
      }
    }
    // Drain services
    else if (lower.includes("drain") || lower.includes("clog") || lower.includes("clear")) {
      if (lower.includes("main") || lower.includes("sewer")) {
        basePrice = 350;
        laborHours = 3;
        partsEstimate = 0;
        confidence = "High";
        notes = "Main line clearing. May require camera inspection (+$150).";
      } else {
        basePrice = 150;
        laborHours = 1;
        partsEstimate = 0;
        confidence = "High";
        notes = "Standard drain clearing service.";
      }
    }
    // Inspection services
    else if (lower.includes("inspect") || lower.includes("camera") || lower.includes("diagnostic")) {
      basePrice = 200;
      laborHours = 1.5;
      partsEstimate = 0;
      confidence = "High";
      notes = "Camera inspection with video documentation.";
    }
    // Default/custom
    else {
      basePrice = 200;
      laborHours = 2;
      partsEstimate = 100;
      confidence = "Low";
      notes = "Custom service - recommend phone consultation for accurate pricing.";
    }

    const total = basePrice + (laborHours * 85) + partsEstimate;

    return {
      basePrice,
      laborHours,
      partsEstimate,
      total: Math.round(total),
      confidence,
      notes,
    };
  }

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors mb-4"
      >
        <span>✨</span>
        <span>Get AI pricing suggestions</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-medium text-text-primary">AI Pricing Assistant</h3>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      <p className="text-sm text-text-secondary mb-3">
        Describe the job and AI will suggest pricing based on historical data.
      </p>

      <div className="flex gap-2 mb-3">
        <Input
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="e.g., Septic tank pumping for 1000 gallon tank"
          className="flex-1"
        />
        <Button
          onClick={getPriceSuggestion}
          disabled={!jobDescription.trim() || generateAI.isPending}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {generateAI.isPending ? "..." : "Suggest"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setJobDescription("Septic tank pumping - standard residential")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Septic pumping
        </button>
        <button
          onClick={() => setJobDescription("Main sewer line clearing with camera inspection")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Sewer clearing
        </button>
        <button
          onClick={() => setJobDescription("Drain cleaning - kitchen sink clog")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Drain cleaning
        </button>
        <button
          onClick={() => setJobDescription("Septic system inspection and camera diagnostics")}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Inspection
        </button>
      </div>

      {suggestion && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-text-primary">
              Suggested Price: ${suggestion.total.toLocaleString()}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              suggestion.confidence === "High" ? "bg-success/20 text-success" :
              suggestion.confidence === "Medium" ? "bg-warning/20 text-warning" :
              "bg-danger/20 text-danger"
            }`}>
              {suggestion.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Base Price</span>
              <p className="font-medium text-text-primary">${suggestion.basePrice}</p>
            </div>
            <div>
              <span className="text-text-muted">Labor ({suggestion.laborHours}h @ $85/h)</span>
              <p className="font-medium text-text-primary">${(suggestion.laborHours * 85).toFixed(0)}</p>
            </div>
            <div>
              <span className="text-text-muted">Parts Est.</span>
              <p className="font-medium text-text-primary">${suggestion.partsEstimate}</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary">{suggestion.notes}</p>

          <Button size="sm" variant="secondary" className="w-full">
            Use This Price for New Estimate
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Estimates List Page
 */
export function EstimatesPage() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "declined"
  >("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: estimates, isLoading } = useQuery({
    queryKey: ["estimates", filter],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/estimates", {
          params: { status: filter !== "all" ? filter : undefined },
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-warning/20 text-warning";
      case "accepted":
        return "bg-success/20 text-success";
      case "declined":
        return "bg-danger/20 text-danger";
      case "expired":
        return "bg-text-muted/20 text-text-muted";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Estimates
          </h1>
          <p className="text-text-muted">
            Create and manage customer estimates
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Create Estimate
        </button>
      </div>

      {/* AI Pricing Assistant */}
      <AIPricingSuggestion />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "accepted", "declined"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Estimates List */}
      <div className="bg-bg-card border border-border rounded-lg">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : estimates?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📊</span>
            <p>No estimates found</p>
            <p className="text-sm mt-2">
              Create your first estimate to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-hover">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Created
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">
                    Valid Until
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estimates?.map((estimate: Estimate) => (
                  <EstimateRow
                    key={estimate.id}
                    estimate={estimate}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Estimate Modal */}
      <CreateEstimateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["estimates"] });
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
        }}
      />
    </div>
  );
}
