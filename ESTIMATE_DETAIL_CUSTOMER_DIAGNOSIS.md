# Estimate Detail Customer Integration - Diagnosis Report

**Date**: 2026-01-28
**Status**: ROOT CAUSE IDENTIFIED

## Problem Statement
On the Estimate detail page, customer section shows "N/A" for all fields (name, email, phone, address) despite the estimate having a valid `customer_id`.

## Root Cause

### Backend Issue
In `/home/will/projects/react-crm-api/app/api/v2/quotes.py`:

```python
@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(...):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    return quote  # Returns only Quote data, no customer lookup
```

**Problem:** The endpoint only fetches the Quote table - no JOIN with Customer table.

### Schema Issue
In `/home/will/projects/react-crm-api/app/schemas/quote.py`:

```python
class QuoteResponse(QuoteBase):
    id: int
    # Only customer_id is inherited from QuoteBase
    # NO customer_name, customer_email, customer_phone, customer_address fields
```

**Problem:** QuoteResponse doesn't include customer detail fields.

### Frontend Expectation
In `/home/will/ReactCRM/src/features/billing/pages/EstimateDetailPage.tsx`:

```tsx
<p>{estimate?.customer_name || "N/A"}</p>
<p>{estimate?.customer_email || "N/A"}</p>
<p>{estimate?.customer_phone || "N/A"}</p>
<p>{estimate?.customer_address || "N/A"}</p>
```

**Problem:** Frontend expects these fields but backend never provides them.

## Solution Required

### Backend Changes (react-crm-api)

1. **Update QuoteResponse schema** to include:
   - `customer_name: Optional[str]`
   - `customer_email: Optional[str]`
   - `customer_phone: Optional[str]`
   - `customer_address: Optional[str]`

2. **Update GET /quotes/{id} endpoint** to:
   - JOIN with Customer table
   - Populate customer fields from Customer model

### Frontend Changes (ReactCRM)

1. **Add "View Customer" link** in customer section
2. Navigate to `/customers/{customer_id}` on click

## Customer Model Fields Available
- `first_name`, `last_name` → combine for `customer_name`
- `email` → `customer_email`
- `phone` → `customer_phone`
- `address_line1`, `city`, `state`, `postal_code` → combine for `customer_address`

---
<promise>ESTIMATE_DETAIL_CUSTOMER_ROOT_CAUSE_IDENTIFIED</promise>
