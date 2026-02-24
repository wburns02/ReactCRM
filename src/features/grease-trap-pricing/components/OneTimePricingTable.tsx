import { GREASE_TRAP_TIERS } from "../greaseTrapPricing";

export function OneTimePricingTable({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
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
