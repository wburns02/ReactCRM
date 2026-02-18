import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useCustomers, useCustomer, useCreateCustomer } from "@/api/hooks/useCustomers.ts";
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
  /** Hide the label (useful when parent provides its own label) */
  hideLabel?: boolean;
}

// ── Quick-Add Form State ─────────────────────────────────────────────────

interface QuickAddForm {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
}

const EMPTY_FORM: QuickAddForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address_line1: "",
  city: "",
  state: "",
  postal_code: "",
};

// ── Debounce hook ────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Component ────────────────────────────────────────────────────────────

export function CustomerCombobox({
  value,
  onChange,
  disabled,
  error,
  onCustomerCreated,
  hideLabel,
}: CustomerComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(EMPTY_FORM);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search for server-side query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Server-side search — fetch matching customers from API
  const { data: searchData, isLoading: isSearching } = useCustomers({
    page: 1,
    page_size: 50,
    search: debouncedSearch || undefined,
  });

  // Fetch selected customer by ID for preview card
  const { data: selectedCustomer } = useCustomer(value || undefined);

  const createCustomer = useCreateCustomer();

  const customers = useMemo(() => searchData?.items || [], [searchData]);

  const handleSelect = useCallback(
    (customerId: string) => {
      onChange(customerId);
      setSearchQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleOpenQuickAdd = useCallback(() => {
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
        email: quickAddForm.email.trim() || undefined,
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
      onChange(String(newCustomer.id));
      setSearchQuery("");
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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      const totalItems = customers.length + 1; // +1 for "Create New" button

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < customers.length) {
          handleSelect(String(customers[highlightIndex].id));
        } else if (highlightIndex === customers.length) {
          handleOpenQuickAdd();
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    },
    [isOpen, customers, highlightIndex, handleSelect, handleOpenQuickAdd],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <Label htmlFor="customer-search" required>
          Customer
        </Label>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="customer-search"
            type="text"
            placeholder="Search by name, email, or phone..."
            value={
              isOpen
                ? searchQuery
                : selectedCustomer
                  ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                  : ""
            }
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightIndex(-1);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
          />
          {/* Search/loading indicator */}
          {isOpen && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isSearching ? (
                <svg className="w-4 h-4 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-bg-card border border-border rounded-md shadow-lg"
            role="listbox"
          >
            {isSearching && customers.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                <svg className="w-5 h-5 animate-spin mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Searching customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                No customers found
                {searchQuery && (
                  <p className="text-xs mt-1">
                    Try a different search or create a new customer below
                  </p>
                )}
              </div>
            ) : (
              customers.map((customer, idx) => (
                <button
                  key={customer.id}
                  type="button"
                  data-item
                  className={cn(
                    "w-full px-4 py-2.5 text-left hover:bg-bg-hover transition-colors",
                    String(customer.id) === String(value) && "bg-primary/10",
                    highlightIndex === idx && "bg-bg-hover",
                  )}
                  onClick={() => handleSelect(String(customer.id))}
                  role="option"
                  aria-selected={String(customer.id) === String(value)}
                >
                  <div className="font-medium text-text-primary">
                    {customer.first_name} {customer.last_name}
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                    {customer.phone && <span>{customer.phone}</span>}
                    {customer.email && <span>{customer.email}</span>}
                    {customer.city && customer.state && (
                      <span>{customer.city}, {customer.state}</span>
                    )}
                  </div>
                </button>
              ))
            )}

            {/* Quick-Add Button — always visible at bottom */}
            <button
              type="button"
              data-item
              className={cn(
                "w-full px-4 py-3 text-left border-t border-border hover:bg-bg-hover transition-colors flex items-center gap-2 text-primary font-medium",
                highlightIndex === customers.length && "bg-bg-hover",
              )}
              onClick={handleOpenQuickAdd}
            >
              <span className="text-lg leading-none">+</span> Create New Customer
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
              <div className="text-sm text-text-muted flex items-center gap-2 flex-wrap">
                {selectedCustomer.email && (
                  <span className="truncate">{selectedCustomer.email}</span>
                )}
                {selectedCustomer.phone && (
                  <span>{selectedCustomer.phone}</span>
                )}
              </div>
              {selectedCustomer.address_line1 && (
                <p className="text-xs text-text-muted truncate">
                  {selectedCustomer.address_line1}
                  {selectedCustomer.city && `, ${selectedCustomer.city}`}
                  {selectedCustomer.state && `, ${selectedCustomer.state}`}
                </p>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                className="text-text-muted hover:text-text-primary text-sm flex-shrink-0"
                onClick={() => {
                  setSearchQuery("");
                  setIsOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 0);
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
          onClick={() => {
            setIsOpen(false);
            setHighlightIndex(-1);
          }}
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

            <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="qa-email">Email</Label>
                <Input
                  id="qa-email"
                  type="email"
                  value={quickAddForm.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
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
