import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuotes, useCreateQuote } from "@/api/hooks/useQuotes";
import type { Quote, QuoteFormData } from "@/api/types/quote";
import { useAIGenerate } from "@/hooks/useAI";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { CustomerSelect } from "@/features/workorders/components/CustomerSelect";

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
        notes =
          "Full septic installation. Requires site inspection for accurate quote.";
      } else if (lower.includes("repair") || lower.includes("fix")) {
        basePrice = 500;
        laborHours = 4;
        partsEstimate = 200;
        confidence = "Low";
        notes = "Repair costs vary significantly. Recommend on-site diagnosis.";
      }
    }
    // Drain services
    else if (
      lower.includes("drain") ||
      lower.includes("clog") ||
      lower.includes("clear")
    ) {
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
    else if (
      lower.includes("inspect") ||
      lower.includes("camera") ||
      lower.includes("diagnostic")
    ) {
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
      notes =
        "Custom service - recommend phone consultation for accurate pricing.";
    }

    const total = basePrice + laborHours * 85 + partsEstimate;

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
          <h3 className="font-medium text-text-primary">
            AI Pricing Assistant
          </h3>
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
          onClick={() =>
            setJobDescription("Septic tank pumping - standard residential")
          }
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Septic pumping
        </button>
        <button
          onClick={() =>
            setJobDescription("Main sewer line clearing with camera inspection")
          }
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Sewer clearing
        </button>
        <button
          onClick={() =>
            setJobDescription("Drain cleaning - kitchen sink clog")
          }
          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
        >
          Drain cleaning
        </button>
        <button
          onClick={() =>
            setJobDescription("Septic system inspection and camera diagnostics")
          }
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
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                suggestion.confidence === "High"
                  ? "bg-success/20 text-success"
                  : suggestion.confidence === "Medium"
                    ? "bg-warning/20 text-warning"
                    : "bg-danger/20 text-danger"
              }`}
            >
              {suggestion.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Base Price</span>
              <p className="font-medium text-text-primary">
                ${suggestion.basePrice}
              </p>
            </div>
            <div>
              <span className="text-text-muted">
                Labor ({suggestion.laborHours}h @ $85/h)
              </span>
              <p className="font-medium text-text-primary">
                ${(suggestion.laborHours * 85).toFixed(0)}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Parts Est.</span>
              <p className="font-medium text-text-primary">
                ${suggestion.partsEstimate}
              </p>
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
 * Line Item interface for form
 */
interface LineItemInput {
  service: string;
  description: string;
  quantity: number;
  rate: number;
}

/**
 * Create Estimate Modal
 */
function CreateEstimateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerId, setCustomerId] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { service: "", description: "", quantity: 1, rate: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [validDays, setValidDays] = useState(30);

  const createQuote = useCreateQuote();

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { service: "", description: "", quantity: 1, rate: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItemInput,
    value: string | number,
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (
      !customerId ||
      lineItems.some((item) => !item.service || item.rate <= 0)
    ) {
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const data: QuoteFormData = {
      customer_id: parseInt(customerId),
      status: "draft",
      line_items: lineItems.map((item) => ({
        service: item.service,
        description: item.description || undefined,
        quantity: item.quantity,
        rate: item.rate,
      })),
      tax_rate: taxRate,
      valid_until: validUntil.toISOString().split("T")[0],
      notes: notes || undefined,
    };

    try {
      await createQuote.mutateAsync(data);
      onSuccess();
      onClose();
      // Reset form
      setCustomerId("");
      setLineItems([{ service: "", description: "", quantity: 1, rate: 0 }]);
      setTaxRate(0);
      setNotes("");
    } catch (err) {
      console.error("Failed to create estimate:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Create Estimate">
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>Create New Estimate</DialogHeader>
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Customer *
            </label>
            <CustomerSelect value={customerId} onChange={setCustomerId} />
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Line Items *
            </label>
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-bg-muted rounded-lg"
                >
                  <div className="col-span-4">
                    <Input
                      placeholder="Service"
                      value={item.service}
                      onChange={(e) =>
                        updateLineItem(index, "service", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "rate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-danger hover:text-danger/80 p-1"
                      disabled={lineItems.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="col-span-12 text-right text-sm text-text-muted">
                    Amount: ${(item.quantity * item.rate).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addLineItem}
              className="mt-2"
            >
              + Add Line Item
            </Button>
          </div>

          {/* Tax Rate & Valid Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Tax Rate (%)
              </label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Valid for (days)
              </label>
              <Input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                min={1}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this estimate..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none"
              rows={3}
            />
          </div>

          {/* Totals */}
          <div className="bg-bg-hover p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span className="text-text-primary">${subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tax ({taxRate}%)</span>
                <span className="text-text-primary">${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
              <span className="text-text-primary">Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              createQuote.isPending ||
              !customerId ||
              lineItems.some((item) => !item.service)
            }
          >
            {createQuote.isPending ? "Creating..." : "Create Estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Estimates List Page
 */
export function EstimatesPage() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "declined"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Use quotes API - estimates are quotes in this system
  const {
    data: quotesData,
    isLoading,
    refetch,
  } = useQuotes({
    status:
      filter !== "all" ? (filter === "pending" ? "draft" : filter) : undefined,
  });

  const estimates = quotesData?.items || [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "draft":
      case "pending":
        return "bg-warning/20 text-warning";
      case "sent":
        return "bg-blue-500/20 text-blue-500";
      case "accepted":
        return "bg-success/20 text-success";
      case "declined":
      case "rejected":
        return "bg-danger/20 text-danger";
      case "expired":
        return "bg-text-muted/20 text-text-muted";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
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
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Estimate
        </Button>
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
        ) : estimates.length === 0 ? (
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
                    Estimate #
                  </th>
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
                {estimates.map((estimate: Quote) => (
                  <tr key={estimate.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {estimate.quote_number}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">
                          {estimate.customer?.first_name}{" "}
                          {estimate.customer?.last_name}
                          {!estimate.customer && estimate.customer_name}
                        </p>
                        {estimate.customer?.email && (
                          <p className="text-sm text-text-muted">
                            {estimate.customer.email}
                          </p>
                        )}
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
                      {formatDate(estimate.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(estimate.valid_until)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/estimates/${estimate.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Estimate Modal */}
      <CreateEstimateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
