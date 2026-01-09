# Billing Placement Plan - ECBTX CRM

**Document:** `docs/architecture/placement/billing.md`
**Status:** Architecture Plan - Ready for Implementation
**Generated:** 2026-01-09

---

## Executive Summary

The ECBTX CRM currently implements billing via the **Financial** sidebar group, which consolidates invoicing and payments alongside payroll and job costing.

**Current State:**
- ✓ Invoice management: `/invoices`, `/invoices/:id`
- ✓ Payment tracking: `/payments`
- ✓ Customer portal invoices: `/portal/invoices`
- ✓ Stripe integration

**Planned Additions:**
- NEW: Public payment links (`/pay/:token`)
- NEW: Estimates/Quotes management
- NEW: Payment plan financing options
- NEW: Billing overview dashboard

---

## 1. Sidebar Placement Decision

### Current State
**Group Name:** Financial
**Icon:** 💰
**Current Items:**
- Invoices (🧾) → `/invoices`
- Payments (💳) → `/payments`
- Payroll (💵) → `/payroll`
- Job Costing (💹) → `/job-costing`

### Recommendation: KEEP AS "FINANCIAL" GROUP

### Updated Structure
```
Financial (💰)
├── Invoices (🧾) → /invoices
├── Payments (💳) → /payments
├── Estimates (📊) → /estimates [NEW]
├── Payment Plans (📈) → /billing/payment-plans [NEW]
├── Payroll (💵) → /payroll
└── Job Costing (💹) → /job-costing
```

---

## 2. Route Structure

### Current Routes (Implemented)

| Path | Component | Status |
|------|-----------|--------|
| `/invoices` | InvoicesPage | ✓ Exists |
| `/invoices/:id` | InvoiceDetailPage | ✓ Exists |
| `/payments` | PaymentsPage | ✓ Exists |
| `/portal/invoices` | PortalInvoicesPage | ✓ Exists |

### Planned Routes (NEW)

| Path | Component | Type |
|------|-----------|------|
| `/estimates` | EstimatesPage | Protected |
| `/estimates/:id` | EstimateDetailPage | Protected |
| `/invoices/new` | InvoiceCreatePage | Protected |
| `/billing/overview` | BillingOverview | Protected |
| `/billing/payment-plans` | PaymentPlansPage | Protected |
| `/pay/:token` | PublicPaymentPage | **PUBLIC** |

---

## 3. Source Code Structure

### Feature Directory Organization

```
src/features/
├── invoicing/                    [EXISTING]
│   ├── InvoicesPage.tsx
│   ├── InvoiceDetailPage.tsx
│   └── components/
│
├── payments/                     [EXISTING]
│   ├── PaymentsPage.tsx
│   └── components/
│       └── StripeCheckout.tsx
│
├── financing/                    [EXISTING]
│   ├── PaymentPlanCalculator.tsx
│   └── FinancingEligibilityWidget.tsx
│
└── billing/                      [NEW]
    ├── pages/
    │   ├── BillingOverview.tsx
    │   ├── EstimatesPage.tsx
    │   ├── EstimateDetailPage.tsx
    │   ├── PaymentPlansPage.tsx
    │   └── PublicPaymentPage.tsx [PUBLIC]
    ├── components/
    │   ├── BillingKPIs/
    │   ├── EstimateBuilder/
    │   ├── PaymentLinkGenerator/
    │   └── PublicPaymentForm/
    ├── hooks/
    │   ├── useBillingDashboard.ts
    │   ├── useEstimates.ts
    │   ├── usePaymentLinks.ts
    │   └── usePaymentPlans.ts
    └── index.ts
```

---

## 4. Public Payment Route Details

### `/pay/:token` Implementation

**Purpose:** Allow customers to pay invoices without authentication

**Access Control:**
- NO authentication required
- Token-based validation (24-48 hour expiration)
- Rate limiting

**Component Hierarchy:**
```
PublicPaymentPage
├── InvoiceDisplay
│   ├── InvoiceItems
│   ├── AmountSummary
│   └── CustomerInfo
├── PaymentProcessor
│   ├── PaymentMethodSelect (Card/ACH)
│   ├── PaymentForm
│   └── ProcessButton
└── SuccessState or ErrorState
```

**Route Configuration:**
```typescript
// PUBLIC route (OUTSIDE RequireAuth)
<Route path="/pay/:token" element={<PublicPaymentPage />} />
```

---

## 5. Feature Requirements

### Invoice Management
- Create new invoice page
- Email invoice functionality
- PDF generation
- Invoice templates
- Recurring invoices

### Payment Processing
- Record manual payments
- Stripe integration for cards
- ACH payment support
- Payment reconciliation
- Partial payments
- Refunds/credits

### Payment Links (NEW)
- Generate shareable links
- Set expiration dates
- Track link metrics
- QR code generation

### Financing Options (NEW)
- Payment plan calculator
- Interest/fee calculation
- Auto-generate payment schedule
- Customer acceptance workflow

---

## 6. Implementation Roadmap

### Phase 1: Foundation
- Create `src/features/billing/` directory
- Set up lazy routes
- Create BillingOverview dashboard

### Phase 2: Estimates
- Implement EstimatesPage
- Create estimate builder
- Estimate-to-invoice conversion

### Phase 3: Public Payment Link
- Implement PublicPaymentPage
- Create payment link generator
- Stripe integration

### Phase 4: Payment Plans
- Integrate financing calculator
- Create payment plan UI
- Payment schedule display

### Phase 5: Polish & Testing
- E2E tests
- Mobile responsiveness
- Error handling

---

## 7. Role-Based Access Control

| Feature | Admin | Manager | Billing | Technician |
|---------|-------|---------|---------|------------|
| View Invoices | ✓ | ✓ | ✓ | ✗ |
| Create Invoice | ✓ | ✓ | ✓ | ✗ |
| View Payments | ✓ | ✓ | ✓ | ✗ |
| Record Payment | ✓ | ✓ | ✓ | ✗ |
| Create Estimate | ✓ | ✓ | ✓ | ✗ |
| Create Payment Link | ✓ | ✓ | ✓ | ✗ |

---

## 8. Final Sidebar Code

**Location:** `src/components/layout/AppLayout.tsx`

```typescript
{
  name: 'financial',
  label: 'Financial',
  icon: '💰',
  items: [
    { path: '/invoices', label: 'Invoices', icon: '🧾' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/estimates', label: 'Estimates', icon: '📊' },
    { path: '/billing/payment-plans', label: 'Payment Plans', icon: '📈' },
    { path: '/payroll', label: 'Payroll', icon: '💵' },
    { path: '/job-costing', label: 'Job Costing', icon: '💹' },
  ],
}
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Sidebar Group** | Keep "Financial" name |
| **Public Route** | `/pay/:token` outside auth |
| **New Feature Location** | `src/features/billing/` |
| **Estimates** | New feature under `/estimates` |
| **Payment Plans** | Under `/billing/payment-plans` |

---

**BILLING_PLACEMENT_COMPLETE**
