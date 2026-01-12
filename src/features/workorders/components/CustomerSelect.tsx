// src/features/workorders/components/CustomerSelect.tsx

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useCustomers } from "@/api/hooks/useCustomers";
import { Link } from "react-router-dom";

interface CustomerSelectProps {
  value?: string;
  onChange: (customerId: string) => void;
  onAddNew?: () => void;
  disabled?: boolean;
}

export function CustomerSelect({
  value,
  onChange,
  onAddNew,
  disabled,
}: CustomerSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: customersData } = useCustomers({ page: 1, page_size: 200 });
  const customers = customersData?.items || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!search) return customers.slice(0, 20);
    const term = search.toLowerCase();
    return customers
      .filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term),
      )
      .slice(0, 20);
  }, [customers, search]);

  // Selected customer
  const selectedCustomer = customers.find((c) => c.id === value);

  // Format address for display
  const formatAddress = (customer: typeof selectedCustomer) => {
    if (!customer) return "";
    const parts = [
      customer.address_line1,
      customer.city,
      customer.state,
      customer.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex gap-2">
        {/* Search/Select dropdown */}
        <div className="flex-1 relative">
          <Input
            value={
              selectedCustomer
                ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                : search
            }
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search customers..."
            disabled={disabled}
          />
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="w-full px-4 py-2 text-left hover:bg-bg-hover border-b border-border last:border-b-0"
                  onClick={() => {
                    onChange(customer.id);
                    setSearch("");
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-text-primary">
                    {customer.first_name} {customer.last_name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {customer.city}
                    {customer.city && customer.state ? ", " : ""}
                    {customer.state}
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="px-4 py-2 text-text-muted">
                  No customers found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick-add button */}
        {onAddNew && (
          <Button
            type="button"
            variant="secondary"
            onClick={onAddNew}
            disabled={disabled}
          >
            +
          </Button>
        )}
      </div>

      {/* Customer Preview Card */}
      {selectedCustomer && (
        <Card className="p-4 bg-bg-muted">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-medium text-text-primary">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </p>
              {selectedCustomer.phone && (
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="text-sm text-primary hover:underline block"
                >
                  {selectedCustomer.phone}
                </a>
              )}
              {selectedCustomer.email && (
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="text-sm text-primary hover:underline block"
                >
                  {selectedCustomer.email}
                </a>
              )}
              {formatAddress(selectedCustomer) && (
                <p className="text-sm text-text-secondary">
                  {formatAddress(selectedCustomer)}
                </p>
              )}
            </div>
            <Link to={`/customers/${selectedCustomer.id}`}>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export default CustomerSelect;
