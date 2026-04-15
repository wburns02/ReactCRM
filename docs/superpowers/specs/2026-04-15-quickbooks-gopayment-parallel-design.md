# QuickBooks GoPayment — Parallel Integration Design

**Date:** 2026-04-15
**Status:** Approved for implementation
**Goal:** Add QuickBooks Online (QBO) + GoPayment card-reader support in parallel to the existing Clover integration. Nothing about Clover is removed. A runtime admin setting selects the default payment processor; both remain usable.

---

## Why parallel, not replacement

Mac Septic is switching from Clover to QuickBooks GoPayment card readers in production. The CRM must support a safe transition window where:
- Existing Clover flows keep working unchanged
- QB flows come online behind an admin toggle
- Historical Clover payment records stay intact
- The team can flip the default when the new hardware is fully rolled out

## Reality check — what the QB GoPayment API can actually do

QuickBooks GoPayment card readers do **not** expose a "trigger the reader from our web app" API (unlike Stripe Terminal). The physical reader is driven by the **GoPayment mobile app**. What QB Payments *does* offer:

- OAuth 2.0 to QBO, then REST access to the company's transactions
- Card-not-present charges via API (not used in this design — field flow is app-driven)
- Read access to charges/payments so we can pull them back into the CRM

**Operational pattern:** tech swipes the card in the GoPayment app in the field. The CRM's job is to reliably **pull that transaction back, match it to the right invoice, and mark the invoice paid**.

## Existing scaffolding (already merged, ~80% of Slice 1 done)

**Backend (`react-crm-api`):**
- `app/services/qbo_service.py` — OAuth, token refresh, sync helpers
- `app/api/v2/quickbooks.py` — router registered at `/api/v2/integrations/quickbooks`
- `app/models/qbo_oauth.py` + migration `058_create_qbo_oauth_tokens.py`

**Frontend (`ReactCRM`):**
- `src/features/integrations/components/QuickBooksSettings.tsx` — connect/disconnect/sync UI
- `src/api/hooks/useQuickBooks.ts`, `src/api/types/quickbooks.ts`
- Already wired into `IntegrationsPage.tsx`

Slice 1 reduces to setting Railway env vars (`QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`) and clicking Connect.

---

## Architecture

### Data model changes (Alembic `095_qbo_gopayment_parallel.py`)

```sql
ALTER TABLE payments
  ADD COLUMN processor VARCHAR(32),           -- 'clover' | 'quickbooks_gopayment' | 'manual' | 'stripe'
  ADD COLUMN external_txn_id VARCHAR(128),    -- QB txn id or Clover payment id
  ADD COLUMN reference_code VARCHAR(32),      -- code tech types in GoPayment memo
  ADD COLUMN sync_status VARCHAR(16),         -- 'pending' | 'matched' | 'unmatched' | 'failed'
  ADD COLUMN synced_at TIMESTAMP;
CREATE INDEX ix_payments_external_txn_id ON payments(external_txn_id);
CREATE INDEX ix_payments_reference_code ON payments(reference_code);
CREATE INDEX ix_payments_sync_status ON payments(sync_status);

-- Backfill existing records
UPDATE payments SET processor = 'stripe' WHERE stripe_charge_id IS NOT NULL;
UPDATE payments SET processor = 'clover' WHERE processor IS NULL AND payment_method = 'clover';
UPDATE payments SET processor = 'manual' WHERE processor IS NULL;

CREATE TABLE qb_sync_log (
  id UUID PRIMARY KEY,
  run_started_at TIMESTAMP NOT NULL,
  run_completed_at TIMESTAMP,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_matched INTEGER DEFAULT 0,
  transactions_unmatched INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by VARCHAR(64)              -- 'manual' | 'scheduled' | user email
);

-- Admin integration setting
CREATE TABLE IF NOT EXISTS integration_settings_kv (
  key VARCHAR(64) PRIMARY KEY,
  value VARCHAR(255),
  updated_at TIMESTAMP DEFAULT now(),
  updated_by VARCHAR(255)
);
INSERT INTO integration_settings_kv (key, value)
  VALUES ('primary_payment_processor', 'clover') ON CONFLICT DO NOTHING;
```

### Reference code strategy (D — hybrid)

- When a tech opens CollectPaymentModal for an invoice, CRM shows them a short code (default: `invoice_number`, e.g. `MAC-1234`).
- Tech types this code into the GoPayment app's memo/note field when taking payment.
- Sync worker pulls QB transactions, scans the memo field, matches by code.
- If no code match, the transaction lands in the **unmatched queue**. Office reconciles manually via a new view inside `QuickBooksSettings`.

### Sync mechanism — pull, not push

- Pull-based: scheduled job + manual "Sync Now" button.
- Poll QB's `Payment` and `SalesReceipt` endpoints with date filter `TxnDate >= last_successful_sync - 1 day`.
- Idempotent on `external_txn_id`.

---

## Three vertical slices

### Slice 1 — QB OAuth connect *(mostly done, Railway env vars only)*
- Set `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI` on Railway.
- QB callback URL in Intuit Developer app: `https://react.ecbtx.com/api/v2/integrations/quickbooks/callback`.
- Verify connect → status → disconnect flow in Integrations page.

### Slice 2 — Payment sync (QBO → CRM) + reconciliation

**Backend:**
- New endpoint `POST /integrations/quickbooks/sync/pull` — triggers a sync run, writes to `qb_sync_log`.
- New endpoint `GET /integrations/quickbooks/payments/unmatched` — returns unmatched QB transactions.
- New endpoint `POST /integrations/quickbooks/payments/{qb_txn_id}/match` — manually link a QB txn to an invoice.
- New endpoint `GET /integrations/quickbooks/reference-code/{invoice_id}` — returns code for tech to type.
- Extend `qbo_service.py` with `pull_recent_payments(db, since)` that:
  1. Fetches QB `Payment` + `SalesReceipt` since last successful sync
  2. For each txn: look up existing `payments.external_txn_id` — if present, update; else, attempt match by `reference_code` parsed from memo
  3. On match: insert payment row with `processor='quickbooks_gopayment'`, link to invoice, mark invoice paid if fully covered
  4. On no match: insert payment row with `sync_status='unmatched'`, no `invoice_id`
  5. Write summary row to `qb_sync_log`

**Frontend:**
- Add "Payment Sync" tab inside `QuickBooksSettings` with:
  - "Sync Now" button (calls pull endpoint)
  - Last sync status (from `qb_sync_log`)
  - Unmatched payments table with manual-match action (dropdown of open invoices)

### Slice 3 — Parallel toggle + QB field collection

**Backend:**
- New endpoint `GET /admin/settings/primary-payment-processor` + `PATCH` to update.
- Uses the `integration_settings_kv` table.

**Frontend:**
- Admin toggle in `IntegrationSettings` or QuickBooksSettings: "Primary payment processor: [Clover ▾ / QuickBooks GoPayment]".
- `CollectPaymentModal` changes:
  - Add new method `quickbooks_gopayment` to `PAYMENT_METHODS` array (emoji `💳`, label "QB GoPayment").
  - When selected, branch to new `QBGoPaymentInstructions` component instead of `CloverCheckout`:
    1. Show big reference code (`MAC-1234`) with copy button
    2. "1. Open GoPayment app on your phone"
    3. "2. Enter ${amount} and swipe the card"
    4. "3. Paste `MAC-1234` into the memo field"
    5. "4. Complete sale — we'll auto-match it within 5 minutes"
    6. "Mark as Collected" button → records a pending payment with `sync_status='pending'`, `processor='quickbooks_gopayment'`, `reference_code=MAC-1234`
  - Ordering of methods in the grid: primary processor appears first (driven by admin setting).

---

## Error handling

- **QB token expired:** auto-refresh in `qbo_service`. On refresh failure, UI shows "Re-authorize" (already handled).
- **QB API rate limit (429):** exponential backoff up to 3 tries per run, log the error in `qb_sync_log.error_message`.
- **Unmatched txn:** lands in unmatched queue, doesn't crash the sync run.
- **Tech hits "Mark as Collected" but never actually charged in GoPayment:** payment row sits in `sync_status='pending'` forever. Reconciliation view flags pending records older than 24h for review.
- **Duplicate reference code match:** if two invoices share the same `invoice_number` prefix (shouldn't happen, but defensive), log a conflict and route to unmatched queue.

## Testing

- **Backend unit:** `test_qbo_service.py` — mock Intuit API for pull/match; assert idempotency on `external_txn_id`, correct status transitions.
- **Playwright e2e:**
  - `qbo-gopayment-reconcile.e2e.spec.ts` — admin sees QB tab, can trigger sync, unmatched list renders.
  - `qbo-gopayment-collect.e2e.spec.ts` — tech selects QB GoPayment in modal, sees reference code, marks collected, payment row appears with correct `processor`/`reference_code`/`sync_status='pending'`.
  - `qbo-parallel-toggle.e2e.spec.ts` — admin flips primary processor, method grid re-orders.
- **Manual:** sandbox QB account for OAuth flow verification before prod.

## Out of scope

- Removing Clover (future work once QB is production-validated)
- Auto-pushing invoices from CRM to QB so they're available in GoPayment (existing scaffolded endpoint works; not required for the match flow)
- Stripe Terminal-style direct reader control (QB GoPayment does not expose this)
- QB Desktop support
