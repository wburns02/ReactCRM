import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  useContractTemplates,
  useCreateContract,
  useGenerateFromTemplate,
  useSeedTemplates,
  type ContractTemplate,
  type ContractCreate,
} from "../api/contracts.ts";
import { useCustomers } from "@/api/hooks/useCustomers.ts";
import { useCreateCustomer } from "@/api/hooks/useCustomers.ts";
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

// MAC Septic contract types with pricing
const CONTRACT_TYPES = [
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
  },
  {
    code: "EVERGREEN_SVC_3",
    name: "Evergreen Service - 3 Visits",
    price: 325,
    duration: 12,
    type: "service",
    autoRenew: true,
    description: "3 annual visits for commercial or high-usage systems",
    badge: null,
    badgeColor: "",
  },
];

interface NewContractFormProps {
  onSuccess?: () => void;
}

export function NewContractForm({ onSuccess }: NewContractFormProps) {
  const [step, setStep] = useState<"type" | "customer" | "details" | "review">("type");
  const [selectedType, setSelectedType] = useState<typeof CONTRACT_TYPES[0] | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: templatesData } = useContractTemplates({ active_only: true });
  const { data: customersData } = useCustomers({ page: 1, page_size: 200, search: customerSearch || undefined });
  const customers = customersData?.items || [];
  const templates = templatesData?.items || [];

  const createContract = useCreateContract();
  const generateFromTemplate = useGenerateFromTemplate();
  const createCustomer = useCreateCustomer();
  const seedTemplates = useSeedTemplates();

  const {
    register: registerDetails,
    handleSubmit: handleDetailsSubmit,
    setValue: setDetailValue,
    watch: watchDetails,
  } = useForm({
    defaultValues: {
      notes: "",
      special_terms: "",
      coverage_details: "",
      service_address: "",
    },
  });

  const {
    register: registerCustomer,
    handleSubmit: handleNewCustomerSubmit,
    reset: resetCustomerForm,
  } = useForm({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address_line1: "",
      city: "",
      state: "TX",
      postal_code: "",
      company_name: "",
      property_type: "residential",
      notes: "",
    },
  });

  // Match template from selected contract type
  const matchTemplate = (code: string) => {
    return templates.find((t) => t.code === code);
  };

  const handleTypeSelect = (type: typeof CONTRACT_TYPES[0]) => {
    setSelectedType(type);
    const template = matchTemplate(type.code);
    setSelectedTemplate(template || null);
    setStep("customer");
  };

  const handleCustomerSelect = (id: string, name: string) => {
    setCustomerId(id);
    setCustomerName(name);
    setStep("details");
  };

  const handleCreateNewCustomer = async (data: any) => {
    try {
      const customer = await createCustomer.mutateAsync(data);
      setCustomerId(customer.id);
      setCustomerName(`${customer.first_name} ${customer.last_name}`);
      setShowNewCustomer(false);
      resetCustomerForm();
      setStep("details");
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

    // Try to use template-based generation if template exists
    if (selectedTemplate) {
      try {
        await generateFromTemplate.mutateAsync({
          template_id: selectedTemplate.id,
          customer_id: customerId,
          customer_name: customerName,
          start_date: startDate,
          total_value: selectedType.price,
          special_terms: watchDetails("special_terms") || undefined,
          covered_properties: watchDetails("service_address") ? [watchDetails("service_address")] : undefined,
        });
        onSuccess?.();
        return;
      } catch {
        // Fall through to direct creation
      }
    }

    // Direct contract creation
    const contractData: ContractCreate = {
      name: `${selectedType.name} - ${customerName}`,
      contract_type: selectedType.type,
      customer_id: customerId,
      customer_name: customerName,
      start_date: startDate,
      end_date: endDateStr,
      auto_renew: selectedType.autoRenew,
      total_value: selectedType.price,
      billing_frequency: "annual",
      payment_terms: "due-on-receipt",
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Select Contract Type</h3>
            {templates.length === 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => seedTemplates.mutate()}
                disabled={seedTemplates.isPending}
              >
                {seedTemplates.isPending ? "Seeding..." : "Load Templates"}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTRACT_TYPES.map((type) => (
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
        </div>
      )}

      {/* Step 2: Choose Customer */}
      {step === "customer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Choose Customer</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNewCustomer(!showNewCustomer)}
            >
              {showNewCustomer ? "Search Existing" : "+ New Customer"}
            </Button>
          </div>

          {!showNewCustomer ? (
            <div className="space-y-3">
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <div className="max-h-80 overflow-auto space-y-2">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() =>
                      handleCustomerSelect(
                        customer.id,
                        `${customer.first_name} ${customer.last_name}`,
                      )
                    }
                    className="w-full p-3 text-left rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="font-medium text-text-primary">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-text-muted flex items-center gap-3">
                      {customer.phone && <span>{customer.phone}</span>}
                      {customer.email && <span>{customer.email}</span>}
                      {customer.city && <span>{customer.city}, {customer.state}</span>}
                    </div>
                  </button>
                ))}
                {customers.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    No customers found. Try a different search or create a new customer.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>New Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNewCustomerSubmit(handleCreateNewCustomer)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">First Name *</label>
                      <Input {...registerCustomer("first_name", { required: true })} placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Last Name *</label>
                      <Input {...registerCustomer("last_name", { required: true })} placeholder="Smith" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
                      <Input {...registerCustomer("phone")} placeholder="(555) 123-4567" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                      <Input {...registerCustomer("email")} type="email" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Company</label>
                      <Input {...registerCustomer("company_name")} placeholder="Company name (optional)" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Property Type</label>
                      <select
                        {...registerCustomer("property_type")}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Address</label>
                    <Input {...registerCustomer("address_line1")} placeholder="123 Main St" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">City</label>
                      <Input {...registerCustomer("city")} placeholder="Beaumont" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">State</label>
                      <Input {...registerCustomer("state")} placeholder="TX" maxLength={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Zip</label>
                      <Input {...registerCustomer("postal_code")} placeholder="77701" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setShowNewCustomer(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCustomer.isPending}>
                      {createCustomer.isPending ? "Creating..." : "Create & Continue"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === "details" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Additional Details</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
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
              <div className="flex justify-end">
                <Button onClick={() => setStep("review")}>Continue to Review</Button>
              </div>
            </CardContent>
          </Card>
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
                  <p className="text-sm text-text-muted">Price</p>
                  <p className="font-semibold text-text-primary text-xl">{formatCurrency(selectedType.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Customer</p>
                  <p className="font-semibold text-text-primary">{customerName}</p>
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
                <div>
                  <p className="text-sm text-text-muted">Billing</p>
                  <p className="font-semibold text-text-primary capitalize">Annual</p>
                </div>
              </div>

              {watchDetails("service_address") && (
                <div>
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
                  {isSubmitting ? "Creating Contract..." : "Create Contract"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
