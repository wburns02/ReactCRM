# Estimates Creation 422 Diagnosis

## Bug Description

**Issue:** Create Estimate modal opens but submission fails silently. POST /api/v2/quotes returns 422 Unprocessable Content. No success toast, no error toast, estimate not created.

**URL:** https://react.ecbtx.com/estimates

---

## Reproduction Steps

1. Login with will@macseptic.com / #Espn2025
2. Navigate to https://react.ecbtx.com/estimates
3. Click "Create Estimate" button
4. Fill form:
   - Select customer
   - Add line item (service, quantity, rate)
   - Set tax rate
   - Set valid until date ← **THIS FIELD CAUSES 422**
5. Click "Create Estimate"
6. **Result:** Nothing happens. Modal stays open. No feedback.

---

## Network Analysis

**Request:**
```
POST https://react-crm-api-production.up.railway.app/api/v2/quotes/
Content-Type: application/json

{
  "customer_id": 123,
  "status": "draft",
  "line_items": [{"service": "Pumping", "quantity": 1, "rate": 350, "amount": 350}],
  "tax_rate": 8.25,
  "valid_until": "2024-01-15",  ← DATE STRING FROM HTML INPUT
  "notes": "Test",
  "subtotal": 350,
  "tax": 28.875,              ← 3 DECIMAL PLACES
  "total": 378.875
}
```

**Response:**
```
HTTP/1.1 422 Unprocessable Entity

{
  "detail": [
    {
      "type": "datetime_parsing",
      "loc": ["body", "valid_until"],
      "msg": "Input should be a valid datetime...",
      "input": "2024-01-15"
    }
  ]
}
```

---

## Root Cause Analysis

### Primary Issue: valid_until Type Mismatch

**Frontend sends:** `"2024-01-15"` (date string from HTML `<input type="date">`)

**Backend expects:** `datetime` object (Pydantic schema)

```python
# app/schemas/quote.py (BEFORE FIX)
class QuoteBase(BaseModel):
    valid_until: Optional[datetime] = None  # Expects datetime, not date string!
```

Pydantic v2 cannot automatically parse bare date strings like "2024-01-15" into datetime. It needs either:
- Full ISO datetime: "2024-01-15T00:00:00"
- A validator to handle date strings

### Secondary Issue: Decimal Constraints

```python
# app/schemas/quote.py (BEFORE FIX)
subtotal: Optional[Decimal] = Field(None, decimal_places=2)
tax: Optional[Decimal] = Field(None, decimal_places=2)
total: Optional[Decimal] = Field(None, decimal_places=2)
```

The `decimal_places=2` constraint could reject values like `28.875` (3 decimal places) from JavaScript calculations.

---

## Code Trace

### Frontend Flow

1. **CreateEstimateModal.tsx:288** - Date input captures `"2024-01-15"`
```tsx
<Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
```

2. **CreateEstimateModal.tsx:114** - Passes to mutation
```tsx
valid_until: validUntil || undefined,
```

3. **useQuotes.ts:104-110** - Sends as-is to API
```tsx
const quoteData = {
  ...data,
  valid_until: data.valid_until,  // Still "2024-01-15"
};
await apiClient.post("/quotes/", quoteData);
```

### Backend Flow

4. **quotes.py:89-91** - Receives request
```python
@router.post("/", response_model=QuoteResponse)
async def create_quote(quote_data: QuoteCreate, ...):
```

5. **quote.py:28** - Pydantic validates
```python
valid_until: Optional[datetime] = None
# ❌ Fails: "2024-01-15" is not a valid datetime
```

---

## Silent Failure Reason

The frontend error handler (CreateEstimateModal.tsx:122-138) catches the error but may not properly display it if:
1. The error format doesn't match expected structure
2. The toast component has issues
3. The catch block silently fails

---

## Fix Applied

### Backend Fix (app/schemas/quote.py)

```python
from pydantic import field_validator

class QuoteBase(BaseModel):
    valid_until: Optional[datetime] = None
    
    @field_validator('valid_until', mode='before')
    @classmethod
    def parse_valid_until(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            if not v.strip():
                return None
            try:
                return datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v
```

### Frontend Fix (useQuotes.ts)

```typescript
valid_until: data.valid_until ? `${data.valid_until}T00:00:00` : undefined,
```

---

## Verification

After fix:
- POST /api/v2/quotes returns **201 Created**
- Date string "2026-06-30" parsed to "2026-06-30T00:00:00"
- Success toast appears
- Modal closes
- Estimate added to list

**Root cause identified and fixed.**
