# Build Fix Plan - PaymentPlansPage TypeScript Error

## Problem Summary
Line 87 in PaymentPlansPage.tsx declares `customer_name?: string` but the actual Invoice type from API allows `string | null | undefined`.

## Fix Options

### Option 1: Update inline type to allow null (RECOMMENDED)
**Change line 87 from:**
```typescript
customer_name?: string;
```
**To:**
```typescript
customer_name?: string | null;
```

**Pros:**
- Minimal change
- Matches actual API response type
- Fallback `|| "Unknown Customer"` on line 96 already handles null

**Cons:**
- None - this is the correct fix

### Option 2: Normalize in mapper
Keep the type as-is but transform null to undefined in the mapper.

**Not recommended** - adds unnecessary complexity when the fallback already handles it.

### Option 3: Use the actual Invoice type
Import and use the Invoice type from `@/api/types/invoice.ts` instead of inline typing.

**Could work** but the inline type is more minimal and documents exactly what's needed.

## Chosen Solution: Option 1

Simply update line 87 to include `null` in the union type.

## Implementation Steps

1. Edit PaymentPlansPage.tsx line 87
2. Change `customer_name?: string;` to `customer_name?: string | null;`
3. Run `npm run build` to verify
4. Commit and deploy

---
Generated: 2026-01-26
