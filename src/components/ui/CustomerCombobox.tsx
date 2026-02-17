import { useState, useMemo, useCallback } from "react";
import { useCustomers, useCreateCustomer } from "@/api/hooks/useCustomers.ts";
import type { Customer } from "@/api/types/customer.ts";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/Dialog.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { cn } from "@/lib/utils.ts";

// ── Types ────────────────────────────────────────────────────────────────

export interface CustomerComboboxProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  error?: string;
  /** Called after a new customer is created via quick-add (use to auto-fill address) */
  onCustomerCreated?: (customer: Customer) => void;
}

// ── Quick-Add Form State ─────────────────────────────────────────────────

interface QuickAddForm {
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
}

const EMPTY_FORM: QuickAddForm = {
  first_name: "",
  last_name: "",
  phone: "",
  address_line1: "",
  city: "",
  state: "",
  postal_code: "",
};

// ── Component ────────────────────────────────────────────────────────────

export function CustomerCombobox({
  value,
  onChange,
  disabled,
  error,
  onCustomerCreated,
}: CustomerComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(EMPTY_FORM);

  const { data: customersData, isLoading } = useCustomers({
    page: 1,
    page_size: 500,
  });
  const createCustomer = useCreateCustomer();

  const customers = customersData?.items || [];

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query),
    );
  }, [customers, searchQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(value)),
    [customers, value],
  );

  const handleSelect = useCallback(
    (customerId: string) => {
      onChange(customerId);
      setSearchQuery("");
      setIsOpen(false);
    },
    [onChange],
  );

  const handleOpenQuickAdd = useCallback(() => {
    // Pre-fill first/last name from search query if it looks like a name
    const parts = searchQuery.trim().split(/\s+/);
    setQuickAddForm({
      ...EMPTY_FORM,
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
    });
    setShowQuickAdd(true);
    setIsOpen(false);
  }, [searchQuery]);

  const handleQuickAddSubmit = useCallback(async () => {
    if (!quickAddForm.first_name.trim() || !quickAddForm.last_name.trim()) {
      toastError("First and last name are required");
      return;
    }
    try {
      const newCustomer = await createCustomer.mutateAsync({
        first_name: quickAddForm.first_name.trim(),
        last_name: quickAddForm.last_name.trim(),
        phone: quickAddForm.phone.trim() || undefined,
        address_line1: quickAddForm.address_line1.trim() || undefined,
        city: quickAddForm.city.trim() || undefined,
        state: quickAddForm.state.trim() || undefined,
        postal_code: quickAddForm.postal_code.trim() || undefined,
      });
      toastSuccess(
        `Created ${quickAddForm.first_name} ${quickAddForm.last_name}`,
      );
      setShowQuickAdd(false);
      setQuickAddForm(EMPTY_FORM);
      // Auto-select the new customer
      onChange(String(newCustomer.id));
      setSearchQuery("");
      // Notify parent (for address auto-fill)
      onCustomerCreated?.(newCustomer);
    } catch {
      toastError("Failed to create customer. Please try again.");
    }
  }, [quickAddForm, createCustomer, onChange, onCustomerCreated]);

  const updateField = useCallback(
    (field: keyof QuickAddForm, val: string) => {
      setQuickAddForm((prev) => ({ ...prev, [field]: val }));
    },
    [],
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="customer-search" required>
        Customer
      </Label>

      {/* Search Input */}
      <div className="relative">
        <Input
          id="customer-search"
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={
            isOpen
              ? searchQuery
              : selectedCustomer
                ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                : ""
          }
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
          disabled={disabled}
        />

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-bg-card border border-border rounded-md shadow-lg">
            {isLoading ? (
              <div className="p-4 text-center text-text-muted">
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                No customers found
                {searchQuery && (
                  <p className="text-xs mt-1">
                    Try a different search or create a new customer below
                  </p>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-bg-hover transition-colors",
                    String(customer.id) === String(value) && "bg-primary/10",
                  )}
                  onClick={() => handleSelect(String(customer.id))}
                >
                  <div className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {customer.email}
                    {customer.phone && ` | ${customer.phone}`}
                  </div>
                </button>
              ))
            )}

            {/* Quick-Add Button — always visible at bottom */}
            <button
              type="button"
              className="w-full px-4 py-3 text-left border-t border-border hover:bg-bg-hover transition-colors flex items-center gap-2 text-primary font-medium"
              onClick={handleOpenQuickAdd}
            >
              <span className="text-lg">+</span> Create New Customer
              {searchQuery && (
                <span className="text-text-muted font-normal text-sm ml-1">
                  "{searchQuery}"
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Selected Customer Preview */}
      {selectedCustomer && !isOpen && (
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold">
                {selectedCustomer.first_name?.[0]}
                {selectedCustomer.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </p>
              {selectedCustomer.email && (
                <p className="text-sm text-text-muted truncate">
                  {selectedCustomer.email}
                </p>
              )}
              {selectedCustomer.phone && (
                <p className="text-sm text-text-muted">
                  {selectedCustomer.phone}
                </p>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                className="text-text-muted hover:text-text-primary text-sm"
                onClick={() => {
                  setSearchQuery("");
                  setIsOpen(true);
                }}
              >
                Change
              </button>
            )}
          </div>
        </Card>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Click outside overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Quick-Add Customer Modal ──────────────────────────────────── */}
      {showQuickAdd && (
        <Dialog
          open={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          size="md"
        >
          <DialogHeader onClose={() => setShowQuickAdd(false)}>
            <h3 className="text-lg font-semibold">Quick Add Customer</h3>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qa-first" required>
                  First Name
                </Label>
                <Input
                  id="qa-first"
                  value={quickAddForm.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="First name"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-last" required>
                  Last Name
                </Label>
                <Input
                  id="qa-last"
                  value={quickAddForm.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="qa-phone">Phone</Label>
              <Input
                id="qa-phone"
                type="tel"
                value={quickAddForm.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="qa-address">Street Address</Label>
              <Input
                id="qa-address"
                value={quickAddForm.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qa-city">City</Label>
                <Input
                  id="qa-city"
                  value={quickAddForm.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-state">State</Label>
                <Input
                  id="qa-state"
                  value={quickAddForm.state}
                  onChange={(e) =>
                    updateField("state", e.target.value.toUpperCase().slice(0, 2))
                  }
                  placeholder="TX"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-zip">Zip</Label>
                <Input
                  id="qa-zip"
                  value={quickAddForm.postal_code}
                  onChange={(e) => updateField("postal_code", e.target.value)}
                  placeholder="78666"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuickAdd(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddSubmit}
              disabled={
                createCustomer.isPending ||
                !quickAddForm.first_name.trim() ||
                !quickAddForm.last_name.trim()
              }
              type="button"
            >
              {createCustomer.isPending ? "Creating..." : "Create & Select"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
