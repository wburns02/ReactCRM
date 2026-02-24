import { useState, useMemo } from "react";
import {
  GREASE_TRAP_TIERS,
  GREASE_TRAP_SUBSCRIPTIONS,
  calculateGreaseTrapQuote,
  type ServiceFrequency,
  type GreaseTrapTier,
  type GreaseTrapSubscription,
} from "./greaseTrapPricing";

// ─── Sub-components ──────────────────────────────────────────────────────────

function OneTimePricingTable({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      {/* Header row */}
      <div className="grid grid-cols-4 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold text-sm">
        <div className="px-4 py-3">TANK SIZE</div>
        <div className="px-4 py-3 text-right">PUMP FEES</div>
        <div className="px-4 py-3 text-right">DUMP FEES</div>
        <div className="px-4 py-3 text-right">TOTAL</div>
      </div>
      {GREASE_TRAP_TIERS.map((tier, i) => (
        <button
          key={tier.id}
          onClick={() => onSelect(tier.id)}
          className={`grid grid-cols-4 w-full text-left text-sm transition-all hover:bg-primary/5 cursor-pointer ${
            i % 2 === 0 ? "bg-bg-body" : "bg-bg-secondary/50"
          } ${selected === tier.id ? "ring-2 ring-primary ring-inset bg-primary/10" : ""}`}
        >
          <div className="px-4 py-3 font-semibold text-text-primary">{tier.label}</div>
          <div className="px-4 py-3 text-right text-text-secondary">${tier.pumpFee.toLocaleString()}</div>
          <div className="px-4 py-3 text-right text-text-secondary">${tier.dumpFee.toLocaleString()}</div>
          <div className="px-4 py-3 text-right font-bold text-primary">${tier.total.toLocaleString()}</div>
        </button>
      ))}
    </div>
  );
}

function SubscriptionPricingTable({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-3 bg-gradient-to-r from-primary to-blue-500 text-white font-bold text-sm">
        <div className="px-4 py-3">TANK SIZE</div>
        <div className="px-4 py-3 text-right">MONTHLY FEE</div>
        <div className="px-4 py-3 text-right">ANNUAL COST</div>
      </div>
      {GREASE_TRAP_SUBSCRIPTIONS.map((sub, i) => (
        <button
          key={sub.id}
          onClick={() => onSelect(sub.id)}
          className={`grid grid-cols-3 w-full text-left text-sm transition-all hover:bg-primary/5 cursor-pointer ${
            i % 2 === 0 ? "bg-bg-body" : "bg-bg-secondary/50"
          } ${selected === sub.id ? "ring-2 ring-primary ring-inset bg-primary/10" : ""}`}
        >
          <div className="px-4 py-3 font-semibold text-text-primary">{sub.label}</div>
          <div className="px-4 py-3 text-right font-bold text-primary">${sub.monthlyFee.toLocaleString()}/mo</div>
          <div className="px-4 py-3 text-right text-text-secondary">${sub.annualCost.toLocaleString()}/yr</div>
        </button>
      ))}
      {/* Subscription includes */}
      <div className="px-4 py-3 bg-primary/5 border-t border-border">
        <p className="text-xs font-bold text-primary mb-2">ALL SUBSCRIPTIONS INCLUDE:</p>
        <div className="grid grid-cols-2 gap-1">
          {GREASE_TRAP_SUBSCRIPTIONS[0].includes.map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="text-success">✓</span> {item}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 italic">* Minimum 12-month commitment</p>
      </div>
    </div>
  );
}

function QuoteCalculator() {
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

function ComparisonCard({ tier, sub }: { tier: GreaseTrapTier; sub: GreaseTrapSubscription }) {
  const quarterlyTotal = tier.total * 4;
  const annualSub = sub.annualCost;
  const savings = quarterlyTotal - annualSub;
  const savingsPercent = Math.round((savings / quarterlyTotal) * 100);

  return (
    <div className="bg-bg-body rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <h4 className="font-bold text-text-primary text-center mb-3">{tier.label} Tank</h4>
      <div className="grid grid-cols-2 gap-4 text-center">
        {/* One-time side */}
        <div>
          <p className="text-[10px] uppercase font-bold text-orange-600 mb-1">Quarterly One-Time</p>
          <p className="text-2xl font-bold text-text-primary">${quarterlyTotal.toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary">4 × ${tier.total.toLocaleString()}/ea</p>
        </div>
        {/* Subscription side */}
        <div>
          <p className="text-[10px] uppercase font-bold text-primary mb-1">Monthly Subscription</p>
          <p className="text-2xl font-bold text-primary">${annualSub.toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary">${sub.monthlyFee}/mo × 12</p>
        </div>
      </div>
      {savings > 0 && (
        <div className="mt-3 bg-success/10 rounded-lg p-2 text-center">
          <span className="text-xs font-bold text-success">Save ${savings.toLocaleString()}/yr ({savingsPercent}%)</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function GreaseTrapPricingPage() {
  const [activeTab, setActiveTab] = useState<"one-time" | "subscription" | "calculator" | "compare">("one-time");
  const [selectedOneTime, setSelectedOneTime] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  const tabs = [
    { key: "one-time" as const, label: "One-Time Fees", icon: "🧾" },
    { key: "subscription" as const, label: "Subscriptions", icon: "📋" },
    { key: "calculator" as const, label: "Quick Quote", icon: "🧮" },
    { key: "compare" as const, label: "Compare", icon: "⚖️" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-white text-2xl shadow-lg">
              🍳
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Grease Trap Pricing</h1>
              <p className="text-sm text-text-secondary">Commercial grease trap cleaning services & subscription plans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-bg-secondary/50 rounded-xl p-1 border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-bg-body text-primary shadow-sm border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "one-time" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <h2 className="text-lg font-bold text-text-primary">One-Time Service Fees</h2>
          </div>
          <p className="text-sm text-text-secondary -mt-2">
            Per-service pricing for grease trap cleaning. Includes pump-out and disposal at certified facility.
          </p>
          <OneTimePricingTable selected={selectedOneTime} onSelect={setSelectedOneTime} />

          {/* Detail panel when a tier is selected */}
          {selectedOneTime && (() => {
            const tier = GREASE_TRAP_TIERS.find((t) => t.id === selectedOneTime)!;
            return (
              <div className="bg-bg-secondary/30 rounded-xl border border-border p-4 animate-in slide-in-from-top-2 duration-200">
                <h3 className="font-bold text-text-primary mb-3">{tier.label} Tank — Service Breakdown</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-body rounded-lg p-3 text-center border border-border">
                    <p className="text-[10px] uppercase text-text-tertiary font-medium">Pump Fee</p>
                    <p className="text-lg font-bold text-text-primary">${tier.pumpFee.toLocaleString()}</p>
                    <p className="text-[10px] text-text-tertiary">Labor + Equipment</p>
                  </div>
                  <div className="bg-bg-body rounded-lg p-3 text-center border border-border">
                    <p className="text-[10px] uppercase text-text-tertiary font-medium">Dump Fee</p>
                    <p className="text-lg font-bold text-text-primary">${tier.dumpFee.toLocaleString()}</p>
                    <p className="text-[10px] text-text-tertiary">Certified Disposal</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/30">
                    <p className="text-[10px] uppercase text-primary font-medium">Total</p>
                    <p className="text-lg font-bold text-primary">${tier.total.toLocaleString()}</p>
                    <p className="text-[10px] text-primary/70">Per Service</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                      Quarterly (4×/yr): <strong>${(tier.total * 4).toLocaleString()}</strong>
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                      Monthly (12×/yr): <strong>${(tier.total * 12).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "subscription" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-lg font-bold text-text-primary">Monthly Subscription Plans</h2>
          </div>
          <p className="text-sm text-text-secondary -mt-2">
            All-inclusive monthly plans with inspections, pump-outs, certification, and dump fees bundled in.
          </p>
          <SubscriptionPricingTable selected={selectedSub} onSelect={setSelectedSub} />

          {selectedSub && (() => {
            const sub = GREASE_TRAP_SUBSCRIPTIONS.find((s) => s.id === selectedSub)!;
            const matchingTier = GREASE_TRAP_TIERS.find((t) => t.label === sub.label)!;
            const quarterlyOneTime = matchingTier.total * 4;
            const savings = quarterlyOneTime - sub.annualCost;
            return (
              <div className="bg-bg-secondary/30 rounded-xl border border-border p-4 animate-in slide-in-from-top-2 duration-200">
                <h3 className="font-bold text-text-primary mb-3">{sub.label} Subscription — Value Breakdown</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">What's Included:</p>
                    {sub.includes.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-xs">✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="bg-bg-body rounded-lg p-3 border border-border text-center">
                      <p className="text-[10px] uppercase text-text-tertiary">Monthly Investment</p>
                      <p className="text-2xl font-bold text-primary">${sub.monthlyFee}/mo</p>
                    </div>
                    {savings > 0 && (
                      <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
                        <p className="text-xs font-bold text-success">vs Quarterly One-Time:</p>
                        <p className="text-sm font-bold text-success">Save ${savings.toLocaleString()}/yr</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "calculator" && (
        <div className="space-y-4">
          <QuoteCalculator />
        </div>
      )}

      {activeTab === "compare" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h2 className="text-lg font-bold text-text-primary">One-Time vs Subscription Comparison</h2>
          </div>
          <p className="text-sm text-text-secondary -mt-2">
            Side-by-side comparison assuming quarterly service (4 pump-outs per year) vs monthly subscription.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GREASE_TRAP_TIERS.map((tier) => {
              const sub = GREASE_TRAP_SUBSCRIPTIONS.find((s) => s.label === tier.label)!;
              return <ComparisonCard key={tier.id} tier={tier} sub={sub} />;
            })}
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">💡 Bottom Line</p>
            <p className="text-xs text-text-secondary">
              For any commercial customer needing 3+ services per year, the monthly subscription is almost always the better deal —
              plus they get monthly inspections, annual certification, and zero surprise dump fees.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
