import { GREASE_TRAP_SUBSCRIPTIONS } from "../greaseTrapPricing";

export function SubscriptionPricingTable({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
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
