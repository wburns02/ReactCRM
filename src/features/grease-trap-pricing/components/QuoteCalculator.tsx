import { useState, useMemo } from "react";
import {
  GREASE_TRAP_SUBSCRIPTIONS,
  calculateGreaseTrapQuote,
  type ServiceFrequency,
} from "../greaseTrapPricing";

export function QuoteCalculator() {
  const [gallons, setGallons] = useState(1000);
  const [frequency, setFrequency] = useState<ServiceFrequency>("quarterly");

  const quote = useMemo(
    () => calculateGreaseTrapQuote(gallons, frequency),
    [gallons, frequency],
  );

  const presetSizes = [50, 500, 1000, 1500, 2000];

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-blue-50/50 dark:from-primary/10 dark:to-blue-950/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🧮</span>
        <h3 className="text-lg font-bold text-text-primary">Quick Quote Calculator</h3>
      </div>

      {/* Tank Size Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-text-primary mb-2 block">Tank Capacity (gallons)</label>
        <div className="flex gap-2 mb-2">
          {presetSizes.map((size) => (
            <button
              key={size}
              onClick={() => setGallons(size)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                gallons === size
                  ? "bg-primary text-white shadow-md"
                  : "bg-bg-body border border-border text-text-secondary hover:border-primary/50"
              }`}
            >
              {size >= 1000 ? `${(size / 1000).toFixed(size % 1000 === 0 ? 0 : 1)}K` : size}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={50}
          max={2500}
          step={50}
          value={gallons}
          onChange={(e) => setGallons(+e.target.value)}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary">
          <span>50 gal</span>
          <span className="font-bold text-primary text-xs">{gallons.toLocaleString()} gal</span>
          <span>2,500 gal</span>
        </div>
      </div>

      {/* Frequency Selector */}
      <div className="mb-5">
        <label className="text-sm font-medium text-text-primary mb-2 block">Service Frequency</label>
        <div className="grid grid-cols-5 gap-1.5">
          {(
            [
              ["one-time", "One-Time"],
              ["annual", "Annual"],
              ["semi-annual", "2×/Year"],
              ["quarterly", "Quarterly"],
              ["monthly", "Monthly"],
            ] as [ServiceFrequency, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFrequency(key)}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${
                frequency === key
                  ? "bg-primary text-white shadow-md"
                  : "bg-bg-body border border-border text-text-secondary hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Results */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-body rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-tertiary font-medium uppercase">Per Service</p>
          <p className="text-xl font-bold text-text-primary">${quote.oneTimeCost.toLocaleString()}</p>
        </div>
        <div className="bg-bg-body rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-tertiary font-medium uppercase">Annual ({quote.pumpOuts}×/yr)</p>
          <p className="text-xl font-bold text-orange-600">${quote.annualCost.toLocaleString()}</p>
        </div>
        <div className="bg-bg-body rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-tertiary font-medium uppercase">Monthly Equiv.</p>
          <p className="text-xl font-bold text-primary">${Math.round(quote.monthlyCost).toLocaleString()}</p>
        </div>
      </div>

      {/* Subscription Recommendation */}
      {quote.recommendSubscription && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-start gap-2">
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <p className="text-sm font-bold text-success">Subscription Saves ${quote.subscriptionSavings.toLocaleString()}/year!</p>
            <p className="text-xs text-text-secondary mt-0.5">
              At {quote.pumpOuts} services per year, the monthly subscription ({
                GREASE_TRAP_SUBSCRIPTIONS.find((s) => s.label === quote.tier.label)?.monthlyFee
              }/mo) is more economical than one-time pricing.
            </p>
          </div>
        </div>
      )}

      {frequency === "one-time" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3 flex items-start gap-2">
          <span className="text-lg">ℹ️</span>
          <p className="text-xs text-text-secondary">
            For commercial customers requiring regular service, ask about our <strong>monthly subscription plans</strong> —
            includes inspections, certifications, and all dump fees.
          </p>
        </div>
      )}
    </div>
  );
}
