import { useState } from "react";
import { Badge } from "@/components/ui/Badge.tsx";

/**
 * County rules for MAC Septic service area counties.
 * Matches the data from /home/will/mac-septic-docs/county-rules.html
 */
const COUNTY_RULES: Record<
  string,
  {
    enforcement: string;
    enforcementColor: string;
    selfMaintenance: boolean;
    phone: string;
    department: string;
    keyRules: string[];
  }
> = {
  Travis: {
    enforcement: "Aggressive",
    enforcementColor: "bg-red-100 text-red-800 border-red-300",
    selfMaintenance: false,
    phone: "512-854-9383",
    department: "Transportation & Natural Resources (TNR)",
    keyRules: [
      "Licensed provider required at all times",
      "Reports every 4 months via county portal",
      "LCRA lake zone within 2,000 ft of Lake Travis",
      "Daily inspection fees until violations corrected",
    ],
  },
  Hays: {
    enforcement: "Aggressive",
    enforcementColor: "bg-red-100 text-red-800 border-red-300",
    selfMaintenance: false,
    phone: "512-393-2150",
    department: "Development Services",
    keyRules: [
      "Licensed provider required for all aerobic systems",
      "Edwards Aquifer protection plan may be required",
      "Permit required for ALL OSSF regardless of lot size",
      "County pursues fines for failed/unmaintained systems",
    ],
  },
  Bexar: {
    enforcement: "Strict",
    enforcementColor: "bg-amber-100 text-amber-800 border-amber-300",
    selfMaintenance: false,
    phone: "210-335-6700",
    department: "Environmental Services",
    keyRules: [
      "Continuous service contract required (mandatory)",
      "SARA-certified provider required",
      "1-year lapse = renewal permit + engineer cert",
      "Conventional systems renew every 5 years ($30)",
    ],
  },
  Comal: {
    enforcement: "Active",
    enforcementColor: "bg-blue-100 text-blue-800 border-blue-300",
    selfMaintenance: true,
    phone: "830-608-2090",
    department: "Environmental Health",
    keyRules: [
      "Self-maintenance allowed (single-family only)",
      "Two-strike rule: 2 violations in 3 yrs = mandatory contract",
      "10-day cure period after violation notice",
      "$150 reinspection fee on property transfer",
    ],
  },
  Guadalupe: {
    enforcement: "Standard",
    enforcementColor: "bg-gray-100 text-gray-800 border-gray-300",
    selfMaintenance: true,
    phone: "830-303-8858",
    department: "Environmental Health",
    keyRules: [
      "Follows TCEQ baseline (no extra restrictions)",
      "1-acre minimum lot for new OSSF",
      "County License to Operate required",
      "Permit required even to connect to existing OSSF",
    ],
  },
};

interface CountyBadgeProps {
  county: string | null | undefined;
  compact?: boolean;
  className?: string;
}

/**
 * County badge with expandable rules panel.
 * Shows the county name with enforcement level, and clicking reveals
 * the county-specific septic rules — designed for Dannia to quickly
 * identify county requirements during sales calls.
 */
export function CountyBadge({ county, compact, className }: CountyBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!county) {
    return null;
  }

  const rules = COUNTY_RULES[county];
  const isServiceArea = !!rules;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm ${className || ""}`}>
        <span className="font-medium text-text-primary">{county} County</span>
        {isServiceArea && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${rules.enforcementColor}`}
          >
            {rules.enforcement}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => isServiceArea && setIsExpanded(!isExpanded)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
          ${isServiceArea
            ? "border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer"
            : "border-border bg-bg-muted cursor-default"
          }
        `}
      >
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-semibold text-text-primary">{county} County</span>
        {isServiceArea && (
          <>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${rules.enforcementColor}`}
            >
              {rules.enforcement}
            </span>
            {!rules.selfMaintenance && (
              <Badge variant="danger">No Self-Maint.</Badge>
            )}
            {rules.selfMaintenance && (
              <Badge variant="success">Self-Maint. OK</Badge>
            )}
            <svg
              className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isExpanded && rules && (
        <div className="mt-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-text-primary text-sm">
              {county} County — {rules.department}
            </h4>
            <a
              href={`tel:${rules.phone}`}
              className="text-sm text-primary hover:underline font-medium"
            >
              {rules.phone}
            </a>
          </div>
          <ul className="space-y-1.5">
            {rules.keyRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-primary mt-0.5 flex-shrink-0">
                  {rule.toLowerCase().includes("required") || rule.toLowerCase().includes("mandatory") ? (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-primary/10 flex items-center gap-2 text-xs text-text-muted">
            <span>Reporting: Every 4 months</span>
            <span>&bull;</span>
            <span>Self-maintenance: {rules.selfMaintenance ? "Allowed" : "Prohibited"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
