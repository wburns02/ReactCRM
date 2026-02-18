import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  useContractTemplates,
  useCreateContract,
  useGenerateFromTemplate,
  useSeedTemplates,
  useNeighborhoodBundles,
  useCreateNeighborhoodBundle,
  type ContractTemplate,
  type ContractCreate,
} from "../api/contracts.ts";
import { useCustomer, useCreateCustomer } from "@/api/hooks/useCustomers.ts";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatCurrency } from "@/lib/utils.ts";

// ========================
// Contract Types with Pricing
// ========================

interface ContractTypeOption {
  code: string;
  name: string;
  price: number;
  duration: number;
  type: string;
  autoRenew: boolean;
  description: string;
  badge: string | null;
  badgeColor: string;
  category: "residential" | "commercial";
  tier?: string;
  visits?: string;
  flowRange?: string;
}

const CONTRACT_TYPES: ContractTypeOption[] = [
  // Residential
  {
    code: "INIT_2YR_EVERGREEN",
    name: "Initial 2-Year Evergreen",
    price: 575,
    duration: 24,
    type: "multi-year",
    autoRenew: true,
    description: "Comprehensive 2-year plan with pumping, inspection, and preventive maintenance",
    badge: "Best Value",
    badgeColor: "bg-success/20 text-success",
    category: "residential",
  },
  {
    code: "YEARLY_MAINT",
    name: "Typical Yearly Maintenance",
    price: 350,
    duration: 12,
    type: "annual",
    autoRenew: false,
    description: "Annual pumping and inspection for standard residential systems",
    badge: "Popular",
    badgeColor: "bg-primary/20 text-primary",
    category: "residential",
  },
  {
    code: "EVERGREEN_MAINT",
    name: "Evergreen Maintenance",
    price: 300,
    duration: 12,
    type: "maintenance",
    autoRenew: true,
    description: "Budget-friendly ongoing maintenance with auto-renewal",
    badge: null,
    badgeColor: "",
    category: "residential",
  },
  {
    code: "EVERGREEN_SVC_1",
    name: "Evergreen Service - 1 Visit",
    price: 175,
    duration: 12,
    type: "service",
    autoRenew: true,
    description: "1 annual service visit for low-usage residential systems",
    badge: null,
    badgeColor: "",
    category: "residential",
  },
  {
    code: "EVERGREEN_SVC_2",
    name: "Evergreen Service - 2 Visits",
    price: 295,
    duration: 12,
    type: "service",
    autoRenew: true,
    description: "2 annual service visits, recommended for standard systems",
    badge: "Recommended",
    badgeColor: "bg-info/20 text-info",
    category: "residential",
  },
  {
    code: "EVERGREEN_SVC_3",
    name: "Evergreen Service - 3 Visits",
    price: 325,
    duration: 12,
    type: "service",
    autoRenew: true,
    description: "3 annual visits for high-usage residential systems",
    badge: null,
    badgeColor: "",
    category: "residential",
  },
  // Commercial
  {
    code: "COMMERCIAL_SMALL",
    name: "Commercial - Small",
    price: 650,
    duration: 12,
    type: "commercial",
    autoRenew: true,
    description: "Quarterly visits for small commercial systems (<500 gal/day)",
    badge: null,
    badgeColor: "",
    category: "commercial",
    tier: "commercial_small",
    visits: "4 visits/year",
    flowRange: "<500 gal/day",
  },
  {
    code: "COMMERCIAL_MEDIUM",
    name: "Commercial - Medium",
    price: 1050,
    duration: 12,
    type: "commercial",
    autoRenew: true,
    description: "Bi-monthly visits + grease trap for medium systems (500-2,000 gal/day)",
    badge: "Most Popular",
    badgeColor: "bg-primary/20 text-primary",
    category: "commercial",
    tier: "commercial_medium",
    visits: "6 visits/year + grease trap",
    flowRange: "500-2,000 gal/day",
  },
  {
    code: "COMMERCIAL_LARGE",
    name: "Commercial - Large",
    price: 1800,
    duration: 12,
    type: "commercial",
    autoRenew: true,
    description: "Monthly visits + testing for large systems (>2,000 gal/day)",
    badge: "Enterprise",
    badgeColor: "bg-purple-100 text-purple-700",
    category: "commercial",
    tier: "commercial_large",
    visits: "12 visits/year + testing",
    flowRange: ">2,000 gal/day",
  },
];

// Available add-ons
const AVAILABLE_ADD_ONS = [
  { name: "telemetry", label: "Remote Telemetry Monitoring", price: 150, description: "24/7 system health alerts via IoT sensor" },
  { name: "emergency_response", label: "Emergency Response Plan", price: 300, description: "Priority 4-hour emergency dispatch" },
  { name: "pumping_bundle", label: "Annual Pumping Bundle", price: 250, description: "One full pump-out per year included" },
  { name: "chlorine_supply", label: "Chlorine Supply Package", price: 50, description: "Year's supply of calcium hypochlorite tablets" },
];

interface NewContractFormProps {
  onSuccess?: () => void;
}

export function NewContractForm({ onSuccess }: NewContractFormProps) {
  const [step, setStep] = useState<"type" | "customer" | "details" | "review">("type");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "residential" | "commercial">("all");
  const [selectedType, setSelectedType] = useState<ContractTypeOption | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");

  // Add-ons state
  const [selectedAddOns, setSelectedAddOns] = useState<{ name: string; price: number }[]>([]);

  // Neighborhood bundle state
  const [isNeighborhoodBundle, setIsNeighborhoodBundle] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [newBundleName, setNewBundleName] = useState("");
  const [newBundleDiscount, setNewBundleDiscount] = useState(10);

  // Referral
  const [referralCode, setReferralCode] = useState("");

  // Commercial fields
  const [systemSize, setSystemSize] = useState("");
  const [dailyFlow, setDailyFlow] = useState<number | "">("");

  const { data: templatesData } = useContractTemplates({ active_only: true });
  const { data: bundlesData } = useNeighborhoodBundles();
  const templates = templatesData?.items || [];
  const bundles = bundlesData?.items || [];

  // Resolve customer name from selected ID
  const { data: selectedCustomerData } = useCustomer(customerId || undefined);
  const resolvedCustomerName = selectedCustomerData
    ? `${selectedCustomerData.first_name || ""} ${selectedCustomerData.last_name || ""}`.trim()
    : customerName;

  const createContract = useCreateContract();
  const generateFromTemplate = useGenerateFromTemplate();
  const createCustomer = useCreateCustomer();
  const seedTemplates = useSeedTemplates();
  const createBundle = useCreateNeighborhoodBundle();

  const {
    register: registerDetails,
    watch: watchDetails,
  } = useForm({
    defaultValues: {
      notes: "",
      special_terms: "",
      coverage_details: "",
      service_address: "",
    },
  });

  // Match template from selected contract type
  const matchTemplate = (code: string) => {
    return templates.find((t) => t.code === code);
  };

  const handleTypeSelect = (type: ContractTypeOption) => {
    setSelectedType(type);
    const template = matchTemplate(type.code);
    setSelectedTemplate(template || null);
    // Reset commercial fields if switching away from commercial
    if (type.category !== "commercial") {
      setSystemSize("");
      setDailyFlow("");
    }
    setStep("customer");
  };

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    // Name will be resolved from the combobox's selected customer
  };

  const handleCustomerCreated = (customer: { id: string; first_name: string | null; last_name: string | null }) => {
    setCustomerId(customer.id);
    setCustomerName(`${customer.first_name || ""} ${customer.last_name || ""}`.trim());
    setStep("details");
  };

  const toggleAddOn = (addOn: { name: string; price: number }) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, { name: addOn.name, price: addOn.price }],
    );
  };

  // Calculate total price
  const basePrice = selectedType?.price || 0;
  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const subtotal = basePrice + addOnTotal;
  const discountPercent = isNeighborhoodBundle ? newBundleDiscount : 0;
  const discount = subtotal * (discountPercent / 100);
  const totalPrice = subtotal - discount;

  const handleCreateBundle = async () => {
    if (!newBundleName) return;
    try {
      const bundle = await createBundle.mutateAsync({
        name: newBundleName,
        discount_percent: newBundleDiscount,
        min_contracts: 5,
      });
      setSelectedBundleId(bundle.id);
      setNewBundleName("");
    } catch {
      // Error handled by mutation
    }
  };

  const handleSubmitContract = async () => {
    if (!selectedType || !customerId) return;

    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + selectedType.duration);
    const endDateStr = endDate.toISOString().split("T")[0];

    const extras = {
      tier: selectedType.tier || (selectedType.category === "residential" ? "residential" : undefined),
      system_size: systemSize || undefined,
      daily_flow_gallons: dailyFlow ? Number(dailyFlow) : undefined,
      add_ons: selectedAddOns.length > 0 ? selectedAddOns : undefined,
      bundle_id: selectedBundleId || undefined,
      neighborhood_group_name: isNeighborhoodBundle ? (bundles.find((b) => b.id === selectedBundleId)?.name || newBundleName || undefined) : undefined,
      discount_percent: discountPercent > 0 ? discountPercent : undefined,
      referral_code: referralCode || undefined,
      referral_credit: referralCode ? 50 : undefined,
    };

    // Try to use template-based generation if template exists
    if (selectedTemplate) {
      try {
        await generateFromTemplate.mutateAsync({
          template_id: selectedTemplate.id,
          customer_id: customerId,
          customer_name: resolvedCustomerName,
          start_date: startDate,
          total_value: totalPrice,
          special_terms: watchDetails("special_terms") || undefined,
          covered_properties: watchDetails("service_address") ? [watchDetails("service_address")] : undefined,
          ...extras,
        });
        onSuccess?.();
        return;
      } catch {
        // Fall through to direct creation
      }
    }

    // Direct contract creation
    const contractData: ContractCreate = {
      name: `${selectedType.name} - ${resolvedCustomerName}`,
      contract_type: selectedType.type,
      customer_id: customerId,
      customer_name: resolvedCustomerName,
      start_date: startDate,
      end_date: endDateStr,
      auto_renew: selectedType.autoRenew,
      total_value: totalPrice,
      billing_frequency: selectedType.category === "commercial" ? "monthly" : "annual",
      payment_terms: selectedType.category === "commercial" ? "net-30" : "due-on-receipt",
      notes: watchDetails("notes") || undefined,
      special_terms: watchDetails("special_terms") || undefined,
      coverage_details: watchDetails("coverage_details") || undefined,
      covered_properties: watchDetails("service_address") ? [watchDetails("service_address")] : undefined,
    };

    try {
      await createContract.mutateAsync(contractData);
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = createContract.isPending || generateFromTemplate.isPending;
  const filteredTypes = categoryFilter === "all"
    ? CONTRACT_TYPES
    : CONTRACT_TYPES.filter((t) => t.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {["Select Type", "Choose Customer", "Details", "Review"].map((label, i) => {
          const stepMap = ["type", "customer", "details", "review"] as const;
          const isActive = step === stepMap[i];
          const isPast = stepMap.indexOf(step) > i;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isPast ? "bg-primary" : "bg-border"}`} />}
              <button
                onClick={() => isPast && setStep(stepMap[i])}
                disabled={!isPast}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : isPast
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-bg-muted text-text-muted"
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-white/20">
                  {isPast ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Contract Type */}
      {step === "type" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-text-primary">Select Contract Type</h3>
            <div className="flex items-center gap-2">
              {/* Category filter */}
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(["all", "residential", "commercial"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 capitalize transition-colors ${
                      categoryFilter === cat
                        ? "bg-primary text-white"
                        : "bg-bg-primary text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
              {templates.length === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => seedTemplates.mutate(false)}
                  disabled={seedTemplates.isPending}
                >
                  {seedTemplates.isPending ? "Seeding..." : "Load Templates"}
                </Button>
              )}
            </div>
          </div>

          {/* Residential section */}
          {(categoryFilter === "all" || categoryFilter === "residential") && (
            <>
              {categoryFilter === "all" && (
                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Residential Plans</h4>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.filter((t) => t.category === "residential").map((type) => (
                  <button
                    key={type.code}
                    onClick={() => handleTypeSelect(type)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      selectedType?.code === type.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl font-bold text-text-primary">
                        {formatCurrency(type.price)}
                      </span>
                      {type.badge && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${type.badgeColor}`}>
                          {type.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-text-primary mb-1">{type.name}</h4>
                    <p className="text-sm text-text-muted mb-3">{type.description}</p>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{type.duration} months</span>
                      {type.autoRenew && (
                        <Badge variant="info" className="text-xs">Auto-Renew</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Commercial section */}
          {(categoryFilter === "all" || categoryFilter === "commercial") && (
            <>
              {categoryFilter === "all" && (
                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mt-6">Commercial Plans</h4>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredTypes.filter((t) => t.category === "commercial").map((type) => (
                  <button
                    key={type.code}
                    onClick={() => handleTypeSelect(type)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      selectedType?.code === type.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl font-bold text-text-primary">
                        {formatCurrency(type.price)}
                        <span className="text-sm font-normal text-text-muted">/yr</span>
                      </span>
                      {type.badge && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${type.badgeColor}`}>
                          {type.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-text-primary mb-1">{type.name}</h4>
                    <p className="text-sm text-text-muted mb-2">{type.description}</p>
                    <div className="space-y-1 text-xs text-text-muted">
                      {type.visits && <div className="flex items-center gap-1"><span className="text-success">+</span> {type.visits}</div>}
                      {type.flowRange && <div className="flex items-center gap-1"><span className="text-info">~</span> {type.flowRange}</div>}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="info" className="text-xs">Auto-Renew</Badge>
                      <Badge variant="default" className="text-xs">Evergreen</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Choose Customer */}
      {step === "customer" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Choose Customer</h3>
          <CustomerCombobox
            value={customerId}
            onChange={(id) => handleCustomerSelect(id)}
            onCustomerCreated={handleCustomerCreated}
          />
          {customerId && (
            <div className="flex justify-end">
              <Button onClick={() => {
                // Update customer name from resolved data
                if (resolvedCustomerName) {
                  setCustomerName(resolvedCustomerName);
                }
                setStep("details");
              }}>
                Continue to Details
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === "details" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Contract Details & Add-Ons</h3>

          {/* Commercial system fields */}
          {selectedType?.category === "commercial" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-text-primary">Commercial System Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">System Size / Capacity</label>
                    <Input
                      value={systemSize}
                      onChange={(e) => setSystemSize(e.target.value)}
                      placeholder="e.g., 1,500 gallon tank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Daily Flow (gal/day)</label>
                    <Input
                      type="number"
                      value={dailyFlow}
                      onChange={(e) => setDailyFlow(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add-Ons */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-text-primary">Add-Ons & Bundles</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_ADD_ONS.map((addOn) => {
                  const isSelected = selectedAddOns.some((a) => a.name === addOn.name);
                  return (
                    <button
                      key={addOn.name}
                      onClick={() => toggleAddOn({ name: addOn.name, price: addOn.price })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-text-primary text-sm">{addOn.label}</div>
                          <div className="text-xs text-text-muted mt-0.5">{addOn.description}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-bold text-text-primary">{formatCurrency(addOn.price)}</span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary text-white" : "border-border"
                          }`}>
                            {isSelected && <span className="text-xs">✓</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Neighborhood Bundle */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-text-primary">Neighborhood Discount Bundle</h4>
                <button
                  onClick={() => setIsNeighborhoodBundle(!isNeighborhoodBundle)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isNeighborhoodBundle ? "bg-primary" : "bg-bg-muted"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isNeighborhoodBundle ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              {isNeighborhoodBundle && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-sm text-text-muted">
                    Group 5+ neighbors for 10-15% off each contract. Select an existing bundle or create a new one.
                  </p>
                  {bundles.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Existing Bundles</label>
                      <select
                        value={selectedBundleId}
                        onChange={(e) => {
                          setSelectedBundleId(e.target.value);
                          const b = bundles.find((b) => b.id === e.target.value);
                          if (b) setNewBundleDiscount(b.discount_percent);
                        }}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                      >
                        <option value="">Create new bundle...</option>
                        {bundles.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.discount_percent}% off, {b.contract_count} contracts)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!selectedBundleId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Bundle Name</label>
                        <Input
                          value={newBundleName}
                          onChange={(e) => setNewBundleName(e.target.value)}
                          placeholder="e.g., Cedar Park Estates"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Discount %</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newBundleDiscount}
                            onChange={(e) => setNewBundleDiscount(Number(e.target.value))}
                            min={5}
                            max={20}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCreateBundle}
                            disabled={!newBundleName || createBundle.isPending}
                          >
                            Create
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <div className="p-2 bg-success/10 rounded-lg text-sm text-success font-medium">
                      {discountPercent}% neighborhood discount: Save {formatCurrency(discount)}/yr
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Code */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-text-primary">Referral Program</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Referral code or referring customer name"
                  />
                </div>
                {referralCode && (
                  <Badge variant="success" className="text-xs whitespace-nowrap">$50 credit</Badge>
                )}
              </div>
              <p className="text-xs text-text-muted">Referring customer gets $50 credit when this contract activates</p>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-semibold text-text-primary">Service Details</h4>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Service Address</label>
                <Input
                  {...registerDetails("service_address")}
                  placeholder="Property address for service visits"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Coverage Details</label>
                <textarea
                  {...registerDetails("coverage_details")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary resize-none"
                  placeholder="Describe what's covered under this contract..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Special Terms</label>
                <textarea
                  {...registerDetails("special_terms")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary resize-none"
                  placeholder="Any special terms or conditions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
                <textarea
                  {...registerDetails("notes")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary resize-none"
                  placeholder="Internal notes..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep("review")}>Continue to Review</Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === "review" && selectedType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Review Contract</h3>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-muted">Contract Type</p>
                  <p className="font-semibold text-text-primary">{selectedType.name}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Customer</p>
                  <p className="font-semibold text-text-primary">{resolvedCustomerName}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Duration</p>
                  <p className="font-semibold text-text-primary">{selectedType.duration} months</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Auto-Renew</p>
                  <p className="font-semibold text-text-primary">
                    {selectedType.autoRenew ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* Commercial info */}
              {selectedType.category === "commercial" && (systemSize || dailyFlow) && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                  {systemSize && (
                    <div>
                      <p className="text-sm text-text-muted">System Size</p>
                      <p className="font-semibold text-text-primary">{systemSize}</p>
                    </div>
                  )}
                  {dailyFlow && (
                    <div>
                      <p className="text-sm text-text-muted">Daily Flow</p>
                      <p className="font-semibold text-text-primary">{dailyFlow} gal/day</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Base Plan</span>
                  <span className="text-text-primary">{formatCurrency(basePrice)}</span>
                </div>
                {selectedAddOns.map((addOn) => (
                  <div key={addOn.name} className="flex justify-between text-sm">
                    <span className="text-text-muted">+ {AVAILABLE_ADD_ONS.find((a) => a.name === addOn.name)?.label || addOn.name}</span>
                    <span className="text-text-primary">{formatCurrency(addOn.price)}</span>
                  </div>
                ))}
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Neighborhood Discount ({discountPercent}%)</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-text-primary">{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              {/* Referral info */}
              {referralCode && (
                <div className="flex items-center gap-2 pt-2 text-sm">
                  <Badge variant="success" className="text-xs">Referral</Badge>
                  <span className="text-text-muted">Referred by: {referralCode} ($50 credit)</span>
                </div>
              )}

              {watchDetails("service_address") && (
                <div className="pt-2">
                  <p className="text-sm text-text-muted">Service Address</p>
                  <p className="text-text-primary">{watchDetails("service_address")}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setStep("details")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmitContract}
                  disabled={isSubmitting}
                  className="min-w-[160px]"
                >
                  {isSubmitting ? "Creating Contract..." : `Create Contract (${formatCurrency(totalPrice)})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
