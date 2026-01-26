/**
 * Septic Service Catalog - 2026 Pricing
 *
 * Preset services for fast, accurate quoting.
 * Based on industry-standard pricing for Central Texas market.
 */

export interface PresetService {
  code: string;
  name: string;
  rate: number;
  category: ServiceCategory;
  description?: string;
  unit?: string;
}

export type ServiceCategory =
  | "pumping"
  | "inspection"
  | "maintenance"
  | "repair"
  | "fees";

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  pumping: "Pumping",
  inspection: "Inspection",
  maintenance: "Maintenance",
  repair: "Repair",
  fees: "Fees & Surcharges",
};

export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  pumping: "🚛",
  inspection: "🔍",
  maintenance: "🔧",
  repair: "⚠️",
  fees: "💰",
};

/**
 * All preset septic services organized by category
 */
export const SEPTIC_SERVICES: Record<ServiceCategory, PresetService[]> = {
  pumping: [
    {
      code: "PUMP-1000",
      name: "Pump Out - Up to 1000 gal",
      rate: 295,
      category: "pumping",
      description: "Standard residential tank pumping",
      unit: "service",
    },
    {
      code: "PUMP-1500",
      name: "Pump Out - Up to 1500 gal",
      rate: 395,
      category: "pumping",
      description: "Large residential tank pumping",
      unit: "service",
    },
    {
      code: "PUMP-2000",
      name: "Pump Out - Up to 2000 gal",
      rate: 495,
      category: "pumping",
      description: "Commercial/large tank pumping",
      unit: "service",
    },
    {
      code: "PUMP-EXTRA",
      name: "Additional Gallons (per 100)",
      rate: 35,
      category: "pumping",
      description: "For tanks over quoted size",
      unit: "per 100 gal",
    },
    {
      code: "PUMP-JET",
      name: "Jet Cleaning Add-on",
      rate: 125,
      category: "pumping",
      description: "High-pressure tank cleaning",
      unit: "service",
    },
  ],
  inspection: [
    {
      code: "INSP-ROUTINE",
      name: "Routine Inspection",
      rate: 195,
      category: "inspection",
      description: "Standard system check",
      unit: "service",
    },
    {
      code: "INSP-REALESTATE",
      name: "Real Estate Inspection",
      rate: 395,
      category: "inspection",
      description: "Full inspection with report for property transfer",
      unit: "service",
    },
    {
      code: "INSP-CAMERA",
      name: "Camera Inspection",
      rate: 225,
      category: "inspection",
      description: "Video inspection of lines and tank",
      unit: "service",
    },
    {
      code: "INSP-FULL",
      name: "Full System Assessment",
      rate: 495,
      category: "inspection",
      description: "Comprehensive evaluation with recommendations",
      unit: "service",
    },
  ],
  maintenance: [
    {
      code: "MAINT-FILTER",
      name: "Filter Cleaning",
      rate: 75,
      category: "maintenance",
      description: "Effluent filter clean/replace",
      unit: "service",
    },
    {
      code: "MAINT-RISER",
      name: "Riser Installation",
      rate: 295,
      category: "maintenance",
      description: "Install access riser to grade",
      unit: "each",
    },
    {
      code: "MAINT-LID",
      name: "Lid Replacement",
      rate: 145,
      category: "maintenance",
      description: "Replace damaged or missing lid",
      unit: "each",
    },
    {
      code: "MAINT-AERATION",
      name: "Aerator Service",
      rate: 195,
      category: "maintenance",
      description: "Aerobic system aerator maintenance",
      unit: "service",
    },
  ],
  repair: [
    {
      code: "REP-PUMP",
      name: "Pump Repair",
      rate: 325,
      category: "repair",
      description: "Repair or adjust existing pump",
      unit: "service",
    },
    {
      code: "REP-PUMP-REPLACE",
      name: "Pump Replacement",
      rate: 850,
      category: "repair",
      description: "Full pump replacement with labor",
      unit: "each",
    },
    {
      code: "REP-BAFFLE",
      name: "Baffle Repair",
      rate: 225,
      category: "repair",
      description: "Repair or replace inlet/outlet baffle",
      unit: "each",
    },
    {
      code: "REP-LINE",
      name: "Line Repair (per foot)",
      rate: 85,
      category: "repair",
      description: "Repair/replace septic line",
      unit: "per foot",
    },
    {
      code: "REP-DISTBOX",
      name: "Distribution Box Repair",
      rate: 595,
      category: "repair",
      description: "Repair or replace distribution box",
      unit: "each",
    },
  ],
  fees: [
    {
      code: "FEE-EMERGENCY",
      name: "Emergency/After-Hours Fee",
      rate: 195,
      category: "fees",
      description: "Service outside normal hours",
      unit: "fee",
    },
    {
      code: "FEE-WEEKEND",
      name: "Weekend Service Fee",
      rate: 95,
      category: "fees",
      description: "Saturday/Sunday service",
      unit: "fee",
    },
    {
      code: "FEE-DIG",
      name: "Digging/Access Fee",
      rate: 95,
      category: "fees",
      description: "Excavation to access buried tank",
      unit: "fee",
    },
    {
      code: "FEE-LOCATE",
      name: "Tank Locating Fee",
      rate: 95,
      category: "fees",
      description: "Locate unmarked/buried tank",
      unit: "fee",
    },
    {
      code: "FEE-MILEAGE",
      name: "Mileage (per mile over 20)",
      rate: 3,
      category: "fees",
      description: "Extended travel distance",
      unit: "per mile",
    },
  ],
};

/**
 * Flat list of all services for search
 */
export const ALL_SERVICES: PresetService[] =
  Object.values(SEPTIC_SERVICES).flat();

/**
 * Service codes for most commonly used services (quick-add buttons)
 */
export const COMMON_SERVICE_CODES = [
  "PUMP-1000",
  "PUMP-1500",
  "INSP-ROUTINE",
  "FEE-EMERGENCY",
];

/**
 * Get common services for quick-add buttons
 */
export const COMMON_SERVICES = COMMON_SERVICE_CODES.map(
  (code) => ALL_SERVICES.find((s) => s.code === code)!,
);

/**
 * Service packages - bundled services with discount
 */
export interface ServicePackage {
  code: string;
  name: string;
  description: string;
  serviceCodes: string[];
  discountPercent: number;
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    code: "PKG-MAINT",
    name: "Maintenance Package",
    description: "Pump + Inspection + Filter Clean",
    serviceCodes: ["PUMP-1000", "INSP-ROUTINE", "MAINT-FILTER"],
    discountPercent: 10,
  },
  {
    code: "PKG-REALESTATE",
    name: "Real Estate Package",
    description: "Full Inspection + Camera",
    serviceCodes: ["INSP-REALESTATE", "INSP-CAMERA"],
    discountPercent: 5,
  },
  {
    code: "PKG-EMERGENCY",
    name: "Emergency Pump Out",
    description: "Emergency Fee + Pump Out",
    serviceCodes: ["FEE-EMERGENCY", "PUMP-1000"],
    discountPercent: 0,
  },
];

/**
 * Get service by code
 */
export function getServiceByCode(code: string): PresetService | undefined {
  return ALL_SERVICES.find((s) => s.code === code);
}

/**
 * Get package items with calculated prices
 */
export function getPackageItems(
  pkg: ServicePackage,
): { service: PresetService; discountedRate: number }[] {
  return pkg.serviceCodes
    .map((code) => {
      const service = getServiceByCode(code);
      if (!service) return null;
      const discountedRate = service.rate * (1 - pkg.discountPercent / 100);
      return { service, discountedRate };
    })
    .filter(Boolean) as { service: PresetService; discountedRate: number }[];
}

/**
 * Calculate package total
 */
export function calculatePackageTotal(pkg: ServicePackage): {
  originalTotal: number;
  discountedTotal: number;
  savings: number;
} {
  const items = getPackageItems(pkg);
  const originalTotal = items.reduce((sum, i) => sum + i.service.rate, 0);
  const discountedTotal = items.reduce((sum, i) => sum + i.discountedRate, 0);
  return {
    originalTotal,
    discountedTotal,
    savings: originalTotal - discountedTotal,
  };
}
