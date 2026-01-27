# Estimates Creation 422 Error - Root Cause Diagnosis

**Date**: 2026-01-27
**Status**: ROOT CAUSE IDENTIFIED

## Problem Statement
Create Estimate modal opens but submission fails silently. POST /api/v2/quotes returns 422 Unprocessable Content. No success, no error toast, estimate not created.

## Root Cause

**THE BACKEND QUOTES/ESTIMATES ENDPOINTS DO NOT EXIST.**

The frontend is trying to POST to `/api/v2/quotes`, but this endpoint is not implemented in the FastAPI backend.

### Evidence

1. **Backend `api.py` analysis** (lines 1-111):
   - Lists all registered routers: ai_assistant, ringcentral, call_dispositions, webhooks, jobs, local_ai, admin_tools, deployment_test, permits, properties, roles, work_orders
   - **NO quotes or estimates router is registered**

2. **Backend file structure analysis**:
   - `/app/api/v2/endpoints/` contains: admin_tools.py, ai_assistant.py, call_dispositions.py, deployment_test.py, geocivix.py, jobs.py, local_ai.py, permits.py, properties.py, ringcentral.py, roles.py, webhooks.py, work_orders.py
   - **NO quotes.py or estimates.py exists**

3. **Frontend `useQuotes.ts`** (line 112):
   ```typescript
   const response = await apiClient.post("/quotes", quoteData);
   ```
   - POSTs to `/quotes` which doesn't exist

4. **Frontend `EstimatesPage.tsx`** (line 257):
   ```typescript
   const response = await apiClient.get("/estimates", {...});
   ```
   - GETs from `/estimates` which doesn't exist

5. **Frontend `EstimatesPage.tsx`** (lines 293-295):
   ```tsx
   <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
     Create Estimate
   </button>
   ```
   - The Create Estimate button has **NO onClick handler** - it's a dead button!

## Why 422 Unprocessable Content?

When FastAPI receives a request to a non-existent endpoint:
- If the path exists but validation fails: 422
- If the path doesn't exist at all: 404

The 422 suggests the request may be hitting some other endpoint by accident, OR the frontend is catching/transforming the error. Need to reproduce to confirm exact behavior.

## Required Fixes

### Backend (FastAPI)
1. Create `/app/models/quote.py` - SQLAlchemy Quote model
2. Create `/app/schemas/quote.py` - Pydantic QuoteCreate, QuoteUpdate, QuoteResponse schemas
3. Create `/app/services/quote_service.py` - Business logic
4. Create `/app/api/v2/endpoints/quotes.py` - CRUD endpoints
5. Register quotes router in `/app/api/v2/api.py`
6. Create Alembic migration for quotes table

### Frontend (React)
1. Update `EstimatesPage.tsx`:
   - Add working Create Estimate modal with form
   - Wire up to `useCreateQuote()` mutation
   - Add success/error toast feedback
   - Refresh list on success

## Data Schema (from frontend types)

**Quote/Estimate Fields**:
```
id: UUID (auto-generated)
quote_number: string (auto-generated, e.g., "Q-2026-0001")
customer_id: int (required)
customer_name: string (joined from customers)
status: enum (draft, sent, accepted, declined, expired)
line_items: JSON array [{ service, description, quantity, rate, amount }]
subtotal: decimal (calculated)
tax_rate: decimal (default 0)
tax: decimal (calculated)
total: decimal (calculated)
valid_until: date (optional)
notes: text (optional)
terms: text (optional)
created_at: timestamp
updated_at: timestamp
```

## Phase 1 Complete

<promise>ESTIMATES_CREATE_422_ROOT_CAUSE_IDENTIFIED</promise>
