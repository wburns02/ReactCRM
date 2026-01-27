# Estimates Creation Fix Plan

**Date**: 2026-01-27
**Phase 2**: Implementation Plan

## Overview

Create complete backend quotes/estimates API and fix frontend to enable working estimate creation.

## Backend Implementation

### 1. Quote Model (`app/models/quote.py`)

```python
# SQLAlchemy model with:
- id: UUID primary key
- quote_number: unique string (auto-generated)
- customer_id: integer (indexed)
- status: string (draft, sent, accepted, declined, expired)
- line_items: JSON array
- subtotal: float
- tax_rate: float
- tax: float
- total: float
- valid_until: date (nullable)
- notes: text (nullable)
- terms: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

### 2. Quote Schemas (`app/schemas/quote.py`)

```python
# Pydantic schemas:
- LineItemCreate: service, description, quantity, rate
- QuoteCreate: customer_id, line_items[], tax_rate, valid_until, notes, terms
- QuoteUpdate: all fields optional for PATCH
- QuoteResponse: full quote with calculated fields
- QuoteListResponse: paginated list
```

### 3. Quote Service (`app/services/quote_service.py`)

```python
# Business logic:
- create(): Create quote with auto-generated quote_number
- get_by_id(): Fetch single quote
- list(): Paginated list with status filter
- update(): Partial update
- delete(): Soft or hard delete
- send(): Update status to 'sent'
- convert_to_invoice(): Create invoice from quote
```

### 4. Quote Endpoints (`app/api/v2/endpoints/quotes.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /quotes | List quotes with pagination |
| GET | /quotes/{id} | Get single quote |
| POST | /quotes | Create new quote |
| PATCH | /quotes/{id} | Update quote |
| DELETE | /quotes/{id} | Delete quote |
| POST | /quotes/{id}/send | Send quote to customer |
| POST | /quotes/{id}/convert-to-invoice | Convert to invoice |

### 5. Register Router (`app/api/v2/api.py`)

Add quotes router with /quotes prefix.

### 6. Database Migration

Create Alembic migration for `quotes` table.

## Frontend Implementation

### 1. Update `EstimatesPage.tsx`

- Add state for modal open/close
- Add Create Estimate modal with form
- Use `useCreateQuote()` mutation
- Add loading state during submission
- Show success toast on creation
- Show error toast with message from 422 response
- Invalidate and refetch list on success
- Close modal on success

### 2. Create Estimate Form Fields

- Customer selection (dropdown)
- Line items (dynamic add/remove)
  - Service name
  - Description
  - Quantity
  - Rate
- Tax rate (percentage)
- Valid until (date picker)
- Notes (textarea)
- Terms (textarea)

## Implementation Order

1. Backend model + schema
2. Backend service
3. Backend endpoints
4. Register router
5. Create migration
6. Push backend changes
7. Verify backend deploys
8. Frontend modal + form
9. Push frontend changes
10. Full E2E testing

## Success Criteria

- POST /api/v2/quotes returns 201 Created
- Quote appears in list after creation
- Success toast shown
- Error toast shown for validation errors
- No 422 errors
- Playwright tests pass
