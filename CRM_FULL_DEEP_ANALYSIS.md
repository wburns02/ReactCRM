# CRM FULL DEEP ANALYSIS

> **Analysis Date:** February 2, 2026
> **Analyst:** Claude Opus - John Hammond No-Expense-Spared CRM Auditor
> **Purpose:** Complete system deep dive before remaining issues annihilation

---

## EXECUTIVE SUMMARY

**ReactCRM** is a production-grade, enterprise-scale CRM system for septic service management consisting of:

| Component | Technology | Size |
|-----------|------------|------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, TanStack Query 5 | 862 TS/TSX files, ~11MB |
| **Backend** | FastAPI, SQLAlchemy (async), PostgreSQL | 100+ models, 71 API modules |
| **Deployment** | Railway (auto-deploy on push) | Frontend + API separate services |

**Current Maturity:** 78/100 (PRODUCTION READY - upgraded from 66 in previous session)

---

## 1. FRONTEND ARCHITECTURE

### Directory Structure

```
src/
├── api/                    # API client & data layer (78 hooks)
│   ├── client.ts           # Axios with security/observability
│   ├── errorHandler.ts     # RFC 7807 error parsing
│   ├── validateResponse.ts # Zod validation with Sentry reporting
│   ├── types/              # Zod schemas (35+ files)
│   └── hooks/              # TanStack Query hooks (78 files)
├── components/             # Shared UI (45 .tsx files)
│   ├── ui/                 # Design system components
│   ├── shared/             # Reusable patterns
│   └── layout/             # AppLayout, Navigation
├── features/               # Feature modules (50+ directories)
│   ├── customers/          # Customer management
│   ├── technicians/        # Tech profiles, payroll
│   ├── workorders/         # Core work order lifecycle
│   ├── schedule/           # Dispatch board
│   ├── billing/            # Invoices, payments
│   ├── ai-dispatch/        # Agentic AI scheduling
│   └── [45+ more modules]
├── lib/                    # Utilities (security, sentry, sync)
├── providers/              # Context providers
└── routes/                 # Modular route config
```

### Key Technologies

| Layer | Technology |
|-------|------------|
| State Management | TanStack Query 5 (server) + Zustand (local) |
| Forms | React Hook Form + Zod validation |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Error Tracking | Sentry with breadcrumbs |
| Real-time | WebSocket provider |
| Offline | PWA with Workbox caching |

### TanStack Query Hooks (78 Total)

**Core Domain (30 hooks):**
- useCustomers, useWorkOrders, useTechnicians, useInvoices, usePayments
- Full CRUD mutations with cache invalidation

**AI Features (14 hooks):**
- useAIDispatch, useSchedulingAI, useTechnicianAI, useLeadScoring
- Many return fallback data (endpoints not fully implemented)

**Integrations (8 hooks):**
- useStripe, useQuickBooks, usePushNotifications, usePayroll

### API Client Security

```typescript
// HTTP-only cookie auth (primary)
withCredentials: true

// CSRF protection
X-CSRF-Token: ${getCSRFToken()}

// Request tracing
X-Correlation-ID: ${SESSION_CORRELATION_ID}
X-Request-ID: ${generateRequestId()}
```

---

## 2. BACKEND ARCHITECTURE

### Directory Structure

```
app/
├── api/
│   ├── v2/                 # Internal API (71 endpoint files)
│   ├── public/             # OAuth2 public API
│   └── deps.py             # Dependency injection
├── models/                 # SQLAlchemy models (100+ files)
├── schemas/                # Pydantic validation
├── security/               # RBAC, rate limiting, MFA
├── middleware/             # Correlation ID, metrics
├── services/               # Business logic
├── tasks/                  # Background tasks
└── main.py                 # FastAPI app init
```

### Database Models - ID Types (CRITICAL)

| Model | ID Type | Problem |
|-------|---------|---------|
| Customer | INTEGER | Legacy, can't FK from UUID tables |
| WorkOrder | VARCHAR(36) | UUID as string |
| Invoice | UUID | customer_id is UUID but Customer.id is Integer |
| Payment | INTEGER | Has 3 different FK types (Int, VARCHAR, UUID) |
| Technician | VARCHAR(36) | UUID as string |
| Other models | UUID | Correct |

### API Endpoints (71 Modules)

| Domain | Endpoints |
|--------|-----------|
| Core CRM | customers, work-orders, technicians, communications |
| Finance | invoices, payments, quotes, stripe-payments, clover-payments |
| Operations | schedule, dashboard, dispatch, availability |
| HR/Payroll | payroll, technicians, dump-sites |
| AI | ai, ai-jobs, agents, predictions, local-ai |
| Marketing | marketing, email-marketing, content-generator |
| Enterprise | enterprise, analytics, customer-success platform |

### Authentication

- **Primary:** JWT Bearer token (HS256, 30min expiry)
- **Secondary:** Session cookie
- **OAuth2:** Client credentials for public API

### Authorization (RBAC)

```python
Roles: USER → ADMIN → SUPERUSER

Permissions:
- USER: SEND_SMS, SEND_EMAIL, VIEW_CUSTOMERS, EDIT_CUSTOMERS, MANAGE_WORK_ORDERS
- ADMIN: + DELETE_CUSTOMERS, ADMIN_PANEL, MANAGE_PAYMENTS, MANAGE_INVOICES, MANAGE_PAYROLL
- SUPERUSER: All permissions
```

**Issue:** User model lacks `is_admin` column - uses `getattr(user, "is_admin", False)` fallback

---

## 3. FEATURE MAP

### Core Features (30+)

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| Customers | ✅ Full CRUD | ✅ Full CRUD | Production |
| Work Orders | ✅ List/Calendar/Kanban/Map | ✅ Full CRUD + assignment | Production |
| Technicians | ✅ Profiles, performance | ✅ Full CRUD + payroll | Production |
| Schedule | ✅ Week/Day/Tech views | ✅ Dispatch API | Production |
| Invoices | ✅ Create/Send/Pay | ✅ Full lifecycle | Production |
| Payments | ✅ Record/Track | ✅ Stripe integration | Production |
| Communications | ✅ Email/SMS/Messages | ✅ Twilio/Brevo | Production |
| Payroll | ✅ Timesheets/Commissions | ✅ Period management | Production |
| GPS Tracking | ✅ Real-time map | ✅ Samsara integration | Production |
| AI Dispatch | ✅ Suggestions UI | ⚠️ Partial backend | Development |
| E-Signatures | ✅ Signature pad | ⚠️ PDF generation TODO | Development |

### AI-Enhanced Features (13+)

| Module | Type | Status |
|--------|------|--------|
| AIDispatch | Execution-based scheduling | Partial |
| TechnicianAI | Performance coaching | Partial |
| LeadScoring | Predictive | Partial |
| MaintenanceAI | Predictive intervals | Partial |
| PhotoAnalysisAI | Vision analysis | Partial |

---

## 4. ROUTING STRUCTURE

### Frontend Routes

```
/                       # Root (protected)
├── /dashboard          # Role-specific dashboards
├── /customers          # Customer CRUD
├── /work-orders        # List/Calendar/Board/Map views
├── /technicians        # Technician management
├── /schedule           # Dispatch board
├── /communications     # Inbox, messaging
├── /billing            # Invoices, payments
├── /reports            # Analytics
├── /admin              # Settings
├── /compliance         # Permits
└── /marketing          # Campaigns

/portal                 # Customer self-service
/field                  # Mobile technician app
/login                  # Authentication
```

### Backend API Routes

```
/api/v2/               # Internal API (auth required)
├── /customers/        # Customer CRUD
├── /work-orders/      # Work order CRUD
├── /technicians/      # Technician CRUD
├── /invoices/         # Invoice lifecycle
├── /payments/         # Payment processing
├── /payroll/          # Payroll management
├── /admin/            # Settings & users
├── /ai/               # AI services
└── /cs/               # Customer success platform

/api/public/v1/        # OAuth2 API
├── /oauth/token       # Token endpoint
├── /customers/        # Public customer CRUD
└── /work-orders/      # Public work order CRUD

/health                # Health check
```

---

## 5. ENVIRONMENT VARIABLES

### Frontend (.env)

```env
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
VITE_SENTRY_DSN=<optional>
VITE_VAPID_PUBLIC_KEY=<push notifications>
```

### Backend

```env
# Required
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=<32+ chars>
ENVIRONMENT=production

# Integrations
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
BREVO_API_KEY=<key>
OPENAI_API_KEY=<key>
STRIPE_SECRET_KEY=<key>  # Deprecated
CLOVER_MERCHANT_ID=<id>
CLOVER_API_KEY=<key>
SAMSARA_API_TOKEN=<token>

# Optional
REDIS_URL=<for distributed rate limiting>
SENTRY_DSN=<error tracking>
```

---

## 6. TECHNICAL DEBT INVENTORY

### Runtime Schema Patches (main.py)

6 functions run at startup to fix failed migrations:

| Function | Purpose | Migration that failed |
|----------|---------|----------------------|
| `ensure_work_order_photos_table()` | Create photos table | 032/033 |
| `ensure_pay_rate_columns()` | Add pay rate columns | 025 |
| `ensure_messages_columns()` | Add message enums/columns | 036 |
| `ensure_email_templates_table()` | Create templates table | 037 |
| `ensure_commissions_columns()` | Add commission columns | 026/039 |
| `ensure_work_order_number_column()` | Add WO numbers | 042 |

### Disabled Relationships

Due to ID type mismatches, these relationships are commented out:
- `Invoice.customer` (UUID vs Integer)
- `Invoice.work_order` (UUID vs VARCHAR)
- `Payment.customer` (circular dependency)
- `Quote.customer`

### Incomplete Features (31 TODOs)

| File | TODO |
|------|------|
| ai.py | Vector similarity search with pgvector |
| ai_jobs.py | 5 AI analysis features |
| agents.py | Actually send via SMS/email |
| stripe_payments.py | Saved payment methods |
| signatures.py | PDF generation, email notifications |
| pricing.py | Customer tier pricing |
| service_intervals.py | Actually send reminders |

---

## 7. SECURITY ARCHITECTURE

### Strengths

| Area | Implementation |
|------|----------------|
| Authentication | JWT + HTTP-only cookies |
| Password Storage | bcrypt (10 rounds) |
| CSRF Protection | Token in header |
| XSS Prevention | HTML sanitization |
| Error Format | RFC 7807 (no stack traces in prod) |
| Secret Validation | 32+ chars enforced in prod |
| Session Management | Timeout provider, validation |

### Weaknesses

| Area | Issue |
|------|-------|
| Rate Limiting | In-memory only (lost on restart) |
| is_admin Column | Missing from User model |
| WebSocket Auth | Token in query parameter |
| Public Endpoints | availability/bookings have minimal validation |

---

## 8. COMMON PATTERNS

### Frontend Query Hook Pattern

```typescript
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters) => [...customerKeys.lists(), filters] as const,
  detail: (id) => [...customerKeys.all, "detail", id] as const,
};

export function useCustomers(filters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get("/customers/", { params: filters });
      return validateResponse(customerListSchema, data, "/customers/");
    },
  });
}
```

### Backend Endpoint Pattern

```python
@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    result = await db.execute(
        select(Customer).offset(skip).limit(limit)
    )
    return {"data": result.scalars().all()}
```

### Error Handling Pattern

```python
# Backend - RFC 7807
raise CRMException(
    code=ErrorCode.NOT_FOUND,
    message="Customer not found",
    status_code=404
)

# Frontend - User-friendly toast
showErrorToast(error);  // Parses RFC 7807, shows friendly message
```

---

## 9. DEPLOYMENT ARCHITECTURE

```
┌─────────────────┐     ┌─────────────────┐
│   GitHub Repo   │     │   GitHub Repo   │
│   ReactCRM      │     │  react-crm-api  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ push                  │ push
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Railway Service │     │ Railway Service │
│ react.ecbtx.com │     │ react-crm-api-  │
│ (Static/Vite)   │     │ production      │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Railway)     │
                        └─────────────────┘
```

**Verification after deploy:**
```bash
curl -s "https://react-crm-api-production.up.railway.app/health"
# Should return {"status":"healthy","version":"X.X.X"}
```

---

## 10. TESTING INFRASTRUCTURE

### Frontend

| Type | Framework | Location |
|------|-----------|----------|
| Unit | Vitest + Testing Library | `src/**/__tests__/` |
| Contract | Vitest + fixtures | `src/api/__tests__/` |
| E2E | Playwright | `/e2e/` |
| Visual | Percy | Via Playwright |

### Backend

| Type | Framework | Location |
|------|-----------|----------|
| Unit | pytest | `tests/` |
| Integration | pytest + TestClient | `tests/` |

### Current Coverage

- Frontend: 13 contract tests, growing E2E suite
- Backend: Limited unit tests
- **Gap:** Many code paths untested

---

<promise>CRM_FULL_DEEP_ANALYSIS_COMPLETE</promise>
