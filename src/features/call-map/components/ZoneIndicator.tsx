import type { ServiceZone } from "../types";

const ZONE_CONFIG: Record<ServiceZone, { label: string; icon: string; className: string }> = {
  core: {
    label: "Core Service Area",
    icon: "\u2713",
    className: "text-green-600 bg-green-50 border-green-200",
  },
  extended: {
    label: "Extended Service Area",
    icon: "\u26A0",
    className: "text-amber-600 bg-amber-50 border-amber-200",
  },
  outside: {
    label: "Outside Service Area",
    icon: "\u2717",
    className: "text-red-600 bg-red-50 border-red-200",
  },
};

interface ZoneIndicatorProps {
  zone: ServiceZone;
  compact?: boolean;
}

export function ZoneIndicator({ zone, compact = false }: ZoneIndicatorProps) {
  const config = ZONE_CONFIG[zone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      <span>{config.icon}</span>
      {!compact && <span>{config.label}</span>}
    </span>
  );
}
