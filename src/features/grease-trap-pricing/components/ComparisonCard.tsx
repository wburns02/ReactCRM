import type { GreaseTrapTier, GreaseTrapSubscription } from "../greaseTrapPricing";

export function ComparisonCard({ tier, sub }: { tier: GreaseTrapTier; sub: GreaseTrapSubscription }) {
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
