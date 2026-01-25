# Invoice Creation Fix Plan

## Overview
Fix the Create Invoice page to ensure:
1. Quantity and Rate fields are clearly readable (font >= 14px)
2. Invoice creation succeeds with proper payload
3. Helpful error messages on validation failures
4. Clean console without critical warnings

## Fix Strategy

### Fix 1: UI Readability - Increase Font Size and Width

**File:** `/src/features/invoicing/InvoiceCreatePage.tsx`

**Current (lines 153-182):**
```tsx
<div className="w-20">
  <input
    type="number"
    value={item.quantity}
    onChange={...}
    placeholder="Qty"
    min="1"
    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm"
  />
</div>
<div className="w-28">
  <input
    type="number"
    value={item.rate}
    onChange={...}
    placeholder="Rate"
    step="0.01"
    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm"
  />
</div>
```

**Change to:**
```tsx
<div className="w-24">
  <input
    type="number"
    value={item.quantity}
    onChange={...}
    placeholder="Qty"
    min="1"
    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-base"
  />
</div>
<div className="w-32">
  <input
    type="number"
    value={item.rate}
    onChange={...}
    placeholder="Rate"
    step="0.01"
    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-base"
  />
</div>
```

### Fix 2: Data Structure - Align with Backend Schema

**File:** `/src/features/invoicing/InvoiceCreatePage.tsx`

**Current LineItem interface:**
```tsx
interface LineItem {
  description: string;  // WRONG - backend expects "service"
  quantity: number;
  rate: number;
  // Missing "amount" field!
}
```

**Change to:**
```tsx
interface LineItem {
  service: string;       // Renamed from description
  description?: string;  // Optional additional description
  quantity: number;
  rate: number;
}
```

**Update initial state:**
```tsx
line_items: [{ service: "", description: "", quantity: 1, rate: 0 }] as LineItem[],
```

### Fix 3: Calculate Amount and Format Payload

**Before submit, prepare payload:**
```tsx
const createMutation = useMutation({
  mutationFn: async () => {
    // Prepare line items with calculated amount
    const preparedLineItems = invoice.line_items.map(item => ({
      service: item.service || item.description || "Service",  // Use service or fallback
      description: item.description || "",
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,  // Calculate amount
    }));

    // Prepare payload - remove empty strings
    const payload = {
      customer_id: invoice.customer_id || undefined,  // Will be set by customer selector
      line_items: preparedLineItems,
      due_date: invoice.due_date || undefined,  // undefined instead of ""
      notes: invoice.notes || undefined,
      status: "draft",
    };

    const response = await apiClient.post("/invoices/", payload);
    return response.data;
  },
  ...
});
```

### Fix 4: Add Customer Selection

The page needs a way to select a customer (with valid UUID). Options:

**Option A: Customer Dropdown (Simpler)**
```tsx
import { useCustomers } from "@/api/hooks/useCustomers";

// In component:
const { data: customersData } = useCustomers({ page_size: 100 });

// In form:
<select
  value={invoice.customer_id}
  onChange={(e) => setInvoice({ ...invoice, customer_id: e.target.value })}
  className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary"
>
  <option value="">Select Customer</option>
  {customersData?.items?.map(c => (
    <option key={c.id} value={c.id}>
      {c.first_name} {c.last_name}
    </option>
  ))}
</select>
```

**Option B: Search Autocomplete (Better UX)**
- Use existing CustomerSelect component if available
- Search API as user types

### Fix 5: Error Handling and Toast

**Add toast imports and error handling:**
```tsx
import { toastSuccess, toastError } from "@/components/ui/Toast";

const createMutation = useMutation({
  mutationFn: async () => { ... },
  onSuccess: (data) => {
    toastSuccess("Invoice created", `Invoice #${data.invoice_number || data.id} created successfully`);
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    navigate(`/invoices/${data.id}`);
  },
  onError: (error: any) => {
    console.error("Invoice creation failed:", error);
    if (error.response?.data?.detail) {
      const details = error.response.data.detail;
      if (Array.isArray(details)) {
        const messages = details.map(d => d.msg).join(", ");
        toastError("Validation Error", messages);
      } else {
        toastError("Error", String(details));
      }
    } else {
      toastError("Error", "Failed to create invoice");
    }
  },
});
```

### Fix 6: Validation Before Submit

**Add client-side validation:**
```tsx
const validateInvoice = () => {
  if (!invoice.customer_id) {
    toastError("Validation Error", "Please select a customer");
    return false;
  }
  if (!invoice.line_items.some(item => item.service && item.quantity > 0)) {
    toastError("Validation Error", "Add at least one line item with service and quantity");
    return false;
  }
  return true;
};

// In submit handler:
const handleSubmit = () => {
  if (validateInvoice()) {
    createMutation.mutate();
  }
};
```

## Implementation Order

1. **UI Readability** - Change text-sm to text-base, increase widths
2. **Data Structure** - Rename description to service, add amount calculation
3. **Customer Selection** - Add customer dropdown
4. **Error Handling** - Add toast notifications and error display
5. **Validation** - Add client-side validation

## Success Criteria

| Requirement | Target |
|-------------|--------|
| Quantity font size | >= 14px (text-base = 16px) |
| Rate font size | >= 14px (text-base = 16px) |
| POST /invoices/ | Returns 201 Created |
| Error on invalid | Toast with specific message |
| Success feedback | Toast + redirect to invoice detail |

## Test Cases (Playwright)

1. Verify quantity input font size >= 14px
2. Verify rate input font size >= 14px
3. Fill valid invoice data and submit → 201 response
4. Leave customer empty → validation error toast
5. Leave line items empty → validation error toast
6. Invalid data → helpful error message from 422 response
