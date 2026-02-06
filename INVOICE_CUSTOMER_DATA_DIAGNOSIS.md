# Invoice Customer Data Bug Diagnosis

## Problem
Invoice detail page shows `Customer #[UUID]` instead of actual customer name, email, and phone.

## Root Cause

### Backend (invoices.py lines 69-70)
```python
"customer_name": None,  # Would need to join to get this
"customer": None,
```

The `invoice_to_response()` function **hardcodes customer data to None**. No customer lookup is performed.

### Frontend Fallback (InvoiceDetailPage.tsx lines 265-269)
```typescript
const customerName =
  invoice.customer_name ||
  (invoice.customer
    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
    : `Customer #${invoice.customer_id}`);  // <-- FALLBACK USED
```

Since both `customer_name` and `customer` are null, the fallback shows `Customer #[UUID]`.

## Type Mismatch Issue

- **Invoice.customer_id**: UUID (generated via `uuid5(NAMESPACE, str(int_id))`)
- **Customer.id**: Integer

The invoice stores a UUID derived from the integer customer ID, but there's no reverse lookup implemented.

## Data Flow

```
CREATE INVOICE:
Frontend sends: { customer_id: 123 } (integer)
Backend converts: customer_id = uuid5(NAMESPACE, "123") → UUID
Database stores: customer_id = "a1b2c3..." (UUID)

GET INVOICE:
Database returns: customer_id = "a1b2c3..." (UUID)
Backend returns: { customer_id: "a1b2c3...", customer: null, customer_name: null }
Frontend shows: "Customer #a1b2c3..."
```

## Fix Required

1. In `get_invoice` endpoint, query Customer table
2. Find customer where `uuid5(NAMESPACE, str(customer.id))` matches `invoice.customer_id`
3. Return customer data in response

## Files to Modify

- `/home/will/projects/react-crm-api/app/api/v2/invoices.py`
  - Import Customer model
  - Modify `invoice_to_response()` to accept customer parameter
  - Modify `get_invoice()` to fetch and pass customer

## Expected Result

Invoice detail page should show:
- Customer full name (e.g., "John Smith")
- Customer email (clickable mailto link)
- Customer phone (clickable tel link)
- "View Customer" button that works
