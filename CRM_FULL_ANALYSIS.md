# ReactCRM Full System Analysis

> **Analysis Date:** February 1, 2026
> **Analyst:** Claude Opus (John Hammond Mode - We Spared No Expense)
> **Purpose:** Complete deep dive before legendary Marketing Tasks implementation

---

## Executive Summary

ReactCRM is a comprehensive, enterprise-grade CRM system for septic service companies. It consists of:

- **Frontend:** React 19 + TypeScript + Vite + TanStack Query (deployed on Railway)
- **Backend:** FastAPI + SQLAlchemy 2.0 async + PostgreSQL (deployed on Railway)
- **Scale:** 55+ feature modules, 483 components, 78 API hooks, 80+ backend endpoints

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ReactCRM Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │   React Frontend     │         │   FastAPI Backend    │              │
│  │   react.ecbtx.com    │◄───────►│   react-crm-api      │              │
│  │                      │  HTTPS  │   .up.railway.app    │              │
│  │  - React 19          │         │                      │              │
│  │  - TypeScript        │         │  - FastAPI           │              │
│  │  - TanStack Query    │         │  - SQLAlchemy 2.0    │              │
│  │  - Zustand           │         │  - PostgreSQL        │              │
│  │  - Tailwind CSS      │         │  - JWT Auth          │              │
│  └──────────────────────┘         └──────────────────────┘              │
│           │                                │                             │
│           │ WebSocket                      │                             │
│           ▼                                ▼                             │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │   External Services  │         │   Integrations       │              │
│  │                      │         │                      │              │
│  │  - Twilio (SMS)      │         │  - Stripe            │              │
│  │  - Brevo (Email)     │         │  - QuickBooks        │              │
│  │  - RingCentral       │         │  - Samsara (Fleet)   │              │
│  │  - Ollama (AI)       │         │  - Google Ads        │              │
│  └──────────────────────┘         └──────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Deep Dive

### Major Feature Modules (55+)

| Category | Features |
|----------|----------|
| **Core CRM** | customers, prospects, customer-success, technicians |
| **Operations** | workorders, schedule, equipment, fleet, gps-tracking |
| **Billing** | invoicing, billing, payments, payroll, estimates |
| **Communications** | communications, sms, email-marketing, phone |
| **Marketing** | marketing (hub, ai-content, google-ads, reviews, tasks) |
| **Compliance** | permits, compliance, contracts, service-intervals |
| **AI/Intelligence** | ai-assistant, ai-dispatch, call-intelligence, iot |
| **Admin** | admin, users, integrations, notifications |

### Routing Structure

```
/dashboard              → Main dashboard
/customers              → Customer list/detail
/work-orders            → Work orders (list, calendar, kanban, map)
/technicians            → Technician management
/schedule               → Scheduling (week, day, tech, map views)
/invoices               → Invoice management
/estimates              → Estimates/quotes
/billing/*              → Billing suite
/communications/*       → Unified inbox
/marketing/*            → Marketing hub
/payroll                → Payroll management
/admin/*                → System administration
```

### State Management

| Type | Solution | Usage |
|------|----------|-------|
| Server State | TanStack Query | API data fetching, caching, mutations |
| Client State | Zustand | UI state (filters, view modes, selections) |
| Form State | React Hook Form | Form validation and submission |
| Real-time | WebSocket | Live updates, notifications |

### API Client Architecture

- **HTTP Client:** Axios with credentials
- **Authentication:** HTTP-only cookies (primary), JWT Bearer (fallback)
- **Error Handling:** RFC 7807 Problem Details
- **Security:** CSRF tokens, correlation IDs, session management

### Common Patterns

**Page Structure:**
```typescript
// Header with title + action button
// Filter card
// Error state with retry
// Data list/table with pagination
// Create/Edit modal
// Delete confirmation dialog
```

**Data Fetching:**
```typescript
const { data, isLoading, error, refetch } = useFeature(filters);
const createMutation = useCreateFeature();
const updateMutation = useUpdateFeature();
```

**Mobile Responsiveness:**
```typescript
const isMobile = useIsMobileOrTablet();
return isMobile ? <MobileCards /> : <DesktopTable />;
```

---

## Backend Deep Dive

### API Structure (80+ Endpoints)

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| `/api/v2/customers` | 6 | Customer CRUD, search |
| `/api/v2/work-orders` | 10+ | Jobs, scheduling, photos |
| `/api/v2/technicians` | 15+ | Employees, performance |
| `/api/v2/invoices` | 8+ | Billing, PDF generation |
| `/api/v2/payments` | 6+ | Stripe integration |
| `/api/v2/payroll` | 12+ | Time, commissions, periods |
| `/api/v2/communications` | 8+ | SMS/Email (Twilio/Brevo) |
| `/api/v2/schedule` | 6+ | Calendar, dispatch |
| `/api/v2/gps-tracking` | 15+ | Real-time location |
| `/api/v2/marketing-*` | 15+ | Marketing hub, tasks |
| `/api/v2/cs/*` | 50+ | Customer Success Platform |

### Database Models (50+)

**Core Models:**
- Customer (integer ID, lead tracking, service info)
- WorkOrder (UUID, status enum, time tracking, GPS)
- Technician (UUID, skills JSON, pay rates)
- Invoice (UUID, line items JSON, status enum)
- Payment (Stripe integration, refund tracking)

**Enums:**
```python
WorkOrderStatus: draft, scheduled, confirmed, enroute, on_site,
                 in_progress, completed, canceled, requires_followup
WorkOrderJobType: pumping, inspection, repair, installation,
                  emergency, maintenance, grease_trap, camera_inspection
WorkOrderPriority: low, normal, high, urgent, emergency
```

### Services Layer (30+)

| Service | Integration |
|---------|-------------|
| TwilioService | SMS/Voice |
| EmailService | Brevo (Sendinblue) |
| GPSTrackingService | Real-time location |
| CommissionService | Auto-calculation |
| RingCentralService | Phone system |
| LocalAIService | Ollama (vision, OCR) |
| StripeService | Payments |

### Security

- JWT Bearer tokens (SPA-friendly)
- HTTP-only session cookies (fallback)
- bcrypt password hashing
- Rate limiting (5 attempts/minute)
- MFA support (TOTP + backup codes)
- CORS hardened for production
- Correlation IDs for tracing

---

## Marketing Feature Analysis

### Current Marketing Structure

```
src/features/marketing/
├── MarketingHubPage.tsx        # Main hub dashboard
├── ai-content/
│   └── AIContentPage.tsx       # AI content generation
├── google-ads/
│   └── GoogleAdsPage.tsx       # Google Ads management
├── reviews/
│   └── ReviewsPage.tsx         # Review aggregation
└── tasks/
    ├── MarketingTasksPage.tsx  # ← MAIN TARGET
    └── components/
        ├── DetailDrawer.tsx
        ├── KeywordsDetail.tsx
        ├── PagesDetail.tsx
        ├── ContentDetail.tsx
        ├── ReviewsDetail.tsx
        └── VitalsDetail.tsx
```

### Backend Marketing Endpoints

```
/api/v2/marketing-hub/tasks/keywords   → Keyword rankings
/api/v2/marketing-hub/tasks/pages      → Indexed pages
/api/v2/marketing-hub/tasks/content    → Generated content
/api/v2/marketing-hub/tasks/reviews    → Customer reviews
/api/v2/marketing-hub/tasks/vitals     → Core Web Vitals
```

### Current State (from session context)

**Working Features:**
- ✅ Keywords drawer - Shows 12 tracked keywords
- ✅ Pages drawer - Shows indexed pages
- ✅ Content drawer - Shows generated content
- ✅ Reviews drawer - Shows customer reviews with ratings
- ✅ Vitals drawer - Shows Core Web Vitals

**Known Issues:**
- ❌ Content Generator not fully functional
- ❌ GBP Sync not working
- ❌ Service health indicators may show stale data

---

## Shared Patterns to Follow

### Table/List Pattern
1. Page component (state, mutations, layout)
2. List component (table/cards, pagination)
3. Form component (modal dialog, validation)

### API Hook Pattern
```typescript
// Query keys with factory pattern
export const featureKeys = {
  all: ["feature"],
  lists: () => [...all, "list"],
  list: (filters) => [...lists(), filters],
  detail: (id) => [...all, "detail", id],
};

// Queries with staleTime
useQuery({
  queryKey: featureKeys.list(filters),
  queryFn: fetchFeatures,
  staleTime: 60_000,
});

// Mutations with invalidation
useMutation({
  mutationFn: createFeature,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: featureKeys.lists() });
  },
});
```

### Error Handling Pattern
```typescript
if (error) {
  return <ApiError error={error} onRetry={refetch} />;
}
```

### Loading Pattern
```typescript
if (isLoading) {
  return <Skeleton count={5} height={60} />;
}
```

---

## Key Files for Marketing Tasks

### Frontend
- `src/features/marketing/tasks/MarketingTasksPage.tsx` - Main page
- `src/features/marketing/tasks/components/*` - Detail drawers
- `src/api/hooks/useMarketingDetails.ts` - Data hooks
- `src/api/types/marketingDetails.ts` - TypeScript types

### Backend
- `app/api/v2/marketing_tasks.py` - API endpoints
- `app/api/v2/marketing_hub.py` - Hub endpoints
- External services at localhost:3001-3003 (SEO, Content, GBP)

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend Framework | React 19 | UI components |
| Type Safety | TypeScript + Zod | Compile-time + runtime validation |
| Build Tool | Vite | Fast development + optimized builds |
| State (Server) | TanStack Query | Caching, fetching, mutations |
| State (Client) | Zustand | UI state management |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | FastAPI | Async Python API |
| ORM | SQLAlchemy 2.0 | Async database access |
| Database | PostgreSQL | Primary data store |
| Auth | JWT + Cookies | Secure authentication |
| Real-time | WebSocket | Live updates |
| Deployment | Railway | CI/CD, hosting |
| Testing | Playwright | E2E testing |

---

## Next Steps: Marketing Tasks Mission

With full CRM understanding, proceed to:

1. **PHASE 2:** Research 2026 best practices for marketing dashboards
2. **PHASE 3:** Deep dive current Marketing Tasks state and bugs
3. **PHASE 4:** Create legendary implementation plan
4. **PHASE 5:** Implement with verification
5. **PHASE 6:** Playwright enforcement

*"We spared no expense."* - John Hammond
