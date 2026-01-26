/**
 * ServiceSelector - Quick service selection for estimates
 *
 * Features:
 * - Quick-add buttons for common services
 * - Searchable service list
 * - Category filtering
 * - Package selection with discount
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  SEPTIC_SERVICES,
  ALL_SERVICES,
  COMMON_SERVICES,
  SERVICE_PACKAGES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  getPackageItems,
  calculatePackageTotal,
  type PresetService,
  type ServiceCategory,
  type ServicePackage,
} from "../constants/septicServices";

interface ServiceSelectorProps {
  onSelectService: (service: PresetService) => void;
  onSelectPackage: (
    items: { name: string; rate: number; description: string }[],
  ) => void;
}

export function ServiceSelector({
  onSelectService,
  onSelectPackage,
}: ServiceSelectorProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    ServiceCategory | "all" | "packages"
  >("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter services by search and category
  const filteredServices = useMemo(() => {
    let services = ALL_SERVICES;

    if (activeCategory !== "all" && activeCategory !== "packages") {
      services = SEPTIC_SERVICES[activeCategory];
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term),
      );
    }

    return services;
  }, [search, activeCategory]);

  const handleSelectService = (service: PresetService) => {
    onSelectService(service);
    setSearch("");
  };

  const handleSelectPackage = (pkg: ServicePackage) => {
    const items = getPackageItems(pkg);
    onSelectPackage(
      items.map((i) => ({
        name: i.service.name,
        rate: Math.round(i.discountedRate * 100) / 100,
        description:
          pkg.discountPercent > 0
            ? `${pkg.name} (${pkg.discountPercent}% off)`
            : pkg.name,
      })),
    );
    setActiveCategory("all");
  };

  const categories: (ServiceCategory | "all" | "packages")[] = [
    "all",
    "pumping",
    "inspection",
    "maintenance",
    "repair",
    "fees",
    "packages",
  ];

  return (
    <div className="border border-border rounded-lg bg-bg-card mb-4">
      {/* Quick Add Buttons */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Quick Add
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:underline"
          >
            {isExpanded ? "Hide catalog" : "Browse all services"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_SERVICES.map((service) => (
            <Button
              key={service.code}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSelectService(service)}
              className="text-xs"
            >
              {service.name.replace("Pump Out - ", "").replace(" gal", "g")}
              <span className="ml-1 text-text-muted">${service.rate}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Expanded Catalog */}
      {isExpanded && (
        <>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <Input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-white"
                    : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {cat === "all"
                  ? "All"
                  : cat === "packages"
                    ? "📦 Packages"
                    : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
              </button>
            ))}
          </div>

          {/* Service/Package List */}
          <div className="max-h-64 overflow-y-auto">
            {activeCategory === "packages" ? (
              // Packages
              <div className="divide-y divide-border">
                {SERVICE_PACKAGES.map((pkg) => {
                  const { discountedTotal, savings } =
                    calculatePackageTotal(pkg);
                  return (
                    <button
                      key={pkg.code}
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className="w-full px-4 py-3 text-left hover:bg-bg-hover transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-text-primary text-sm">
                            📦 {pkg.name}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {pkg.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-primary text-sm">
                            ${discountedTotal.toFixed(0)}
                          </div>
                          {savings > 0 && (
                            <div className="text-xs text-success">
                              Save ${savings.toFixed(0)} ({pkg.discountPercent}%
                              off)
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Services
              <div className="divide-y divide-border">
                {filteredServices.length === 0 ? (
                  <div className="px-4 py-6 text-center text-text-muted text-sm">
                    No services found
                  </div>
                ) : (
                  filteredServices.map((service) => (
                    <button
                      key={service.code}
                      type="button"
                      onClick={() => handleSelectService(service)}
                      className="w-full px-4 py-2.5 text-left hover:bg-bg-hover transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary text-sm truncate">
                          {CATEGORY_ICONS[service.category]} {service.name}
                        </div>
                        {service.description && (
                          <div className="text-xs text-text-muted truncate">
                            {service.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="font-medium text-primary text-sm">
                          ${service.rate}
                        </span>
                        <span className="text-success text-lg">+</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ServiceSelector;
