# Build Failure Diagnosis - PaymentPlansPage.tsx

## Error Details
- **File:** `src/features/billing/pages/PaymentPlansPage.tsx`
- **Line:** 84 (and related to line 87)
- **Error Code:** TS2345
- **Error Message:** Argument type mismatch in map function

## Root Cause Analysis

### The Type Mismatch

**API Type (invoice.ts line 45):**
```typescript
customer_name: z.string().nullable().optional(),
// Produces: string | null | undefined
```

**Inline Type in PaymentPlansPage.tsx (line 87):**
```typescript
customer_name?: string;
// Produces: string | undefined (NO NULL!)
```

### Why It Fails

When TypeScript tries to map the invoice data from `useInvoices()`:
1. The actual Invoice type from API returns `customer_name: string | null | undefined`
2. The inline type annotation only accepts `string | undefined`
3. TypeScript correctly complains: `null` is not assignable to `string | undefined`

## Solution

Update line 87 in PaymentPlansPage.tsx to include `null`:

```typescript
// Before:
customer_name?: string;

// After:
customer_name?: string | null;
```

This aligns the inline type with what the API actually returns.

---
Generated: 2026-01-26
