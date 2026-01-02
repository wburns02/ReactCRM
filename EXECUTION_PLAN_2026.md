# ECBTX 2026: Execution Plan

## The Implementation Blueprint for Building the #1 Septic Service Platform

---

## Executive Summary

This document transforms MASTER_PLAN_2026.md into actionable engineering work. After thorough codebase analysis, I've assessed what exists, what's stubbed, and what needs to be built from scratch.

**Key Finding:** We're further along than expected in some areas (Predictions API, Signature Capture, Portal hooks) and behind in others (Offline persistence, Route optimization). This plan re-prioritizes based on real implementation status.

---

## 1. Vision Validation

### Original Vision (Confirmed Valid)
> "Every septic job scheduled, routed, completed, and paid—seamlessly."

### Technical Feasibility Assessment

| Vision Element | Stack Support | Feasibility | Notes |
|----------------|---------------|-------------|-------|
| AI Route Optimization | Google OR-Tools + Python | ✅ High | Backend can run solver, return optimized sequence |
| Offline-First PWA | Service Workers + IndexedDB | ✅ High | React supports, just needs implementation |
| Customer Portal | FastAPI + React | ✅ High | Hooks exist, just need UI components |
| Predictive Maintenance | Predictions API exists | ✅ High | Backend 80% done, need service interval tracking |
| Compliance Reporting | jsPDF + Backend templates | ✅ Medium | Signature capture works, need PDF generation |
| Real-time GPS | Samsara integration exists | ✅ High | Already working in Fleet module |
| AI Content Gen | Claude API integrated | ✅ High | Marketing Hub already generates content |

**Verdict:** Vision is achievable with current stack. No major architectural pivots needed.

---

## 2. Current State Assessment

### Implementation Status Matrix

| Feature | Frontend | Backend | Integration | Overall |
|---------|----------|---------|-------------|---------|
| **Scheduling/Dispatch** | 95% | 90% | 90% | **92%** |
| **Customer Management** | 90% | 95% | 95% | **93%** |
| **Invoicing/Payments** | 85% | 85% | 70% | **80%** |
| **Fleet GPS Tracking** | 80% | 85% | 90% | **85%** |
| **AI Content Generation** | 75% | 80% | 80% | **78%** |
| **RingCentral VoIP** | 70% | 75% | 80% | **75%** |
| **Reports/Analytics** | 80% | 70% | N/A | **75%** |
| **Customer Portal** | 10% | 60% | 50% | **40%** |
| **Offline/PWA** | 40% | N/A | 0% | **20%** |
| **Route Optimization** | 5% | 0% | 0% | **2%** |
| **Predictive Maintenance** | 0% | 30% | 0% | **10%** |
| **Compliance/Forms** | 50% | 20% | 0% | **23%** |

### What's Already Built (Leverage These)

1. **Predictions API** (`app/api/v2/predictions.py`) - 400+ lines
   - Lead scoring with hot/warm/cold labels
   - Churn prediction with risk levels
   - Revenue forecasting with confidence intervals
   - Deal health analysis
   - Summary dashboard endpoint

2. **Signature Capture** (`SignaturePad.tsx`) - Fully functional
   - Canvas-based drawing
   - Touch support for mobile
   - Base64 PNG export
   - Customer and Technician variants

3. **Mobile Workflow** (`MobileWorkOrderView.tsx`) - Complete UI
   - 9-step job completion flow
   - Photo capture integration
   - Location capture
   - Ready for offline enhancement

4. **Portal API Hooks** (`usePortal.ts`) - All endpoints defined
   - Login/verify flow
   - Customer profile
   - Work orders and invoices
   - Service request creation
   - Payment submission

5. **Fleet Tracking** - Live integration
   - Samsara GPS connection
   - Real-time vehicle locations
   - Movement status (moving/idle/stopped)

---

## 3. Re-Prioritized Feature Roadmap

### Priority Scoring Methodology

Each feature scored 1-5 on:
- **Impact (I):** User value and differentiation
- **Effort (E):** Development complexity (inverted: 5=easy, 1=hard)
- **Revenue (R):** Direct impact on sales/retention
- **Dependencies (D):** Blocked by other work? (5=independent, 1=heavily blocked)

**Priority Score = (I×2 + E + R×2 + D) / 6**

### Prioritized Feature List

| Rank | Feature | I | E | R | D | Score | Quarter |
|------|---------|---|---|---|---|-------|---------|
| 1 | **Customer Self-Service Portal** | 5 | 4 | 5 | 5 | **4.8** | Q1 |
| 2 | **Stripe Payment Integration** | 5 | 4 | 5 | 5 | **4.8** | Q1 |
| 3 | **Predictive Maintenance Engine** | 5 | 3 | 5 | 4 | **4.5** | Q1 |
| 4 | **Offline-First PWA** | 5 | 2 | 4 | 5 | **4.2** | Q1-Q2 |
| 5 | **AI Route Optimization** | 5 | 2 | 4 | 4 | **4.0** | Q2 |
| 6 | **QuickBooks Integration** | 4 | 3 | 4 | 5 | **4.0** | Q2 |
| 7 | **Voice-to-Text Notes** | 4 | 4 | 3 | 5 | **3.8** | Q2 |
| 8 | **Automated Compliance Reporting** | 4 | 2 | 4 | 3 | **3.5** | Q3 |
| 9 | **Dynamic Pricing Engine** | 4 | 3 | 4 | 3 | **3.5** | Q3 |
| 10 | **AI Dispatch Assistant** | 4 | 2 | 3 | 3 | **3.2** | Q3 |
| 11 | **Customer Financing** | 4 | 2 | 4 | 2 | **3.2** | Q4 |
| 12 | **Multi-Region/Franchise** | 3 | 1 | 4 | 2 | **2.8** | Q4 |

### Quick Wins (< 1 Week Each)

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| Push notifications setup | 2 days | Medium | FCM infrastructure |
| Stripe checkout (hosted) | 3 days | High | Use Stripe's hosted page first |
| Service interval field | 1 day | High | Add to work order schema |
| Portal login page | 2 days | High | Magic link auth |
| "Optimize" button POC | 3 days | Medium | Basic nearest-neighbor algorithm |

---

## 4. Quarterly Breakdown

### Q1 2026: Foundation & Revenue (January - March)

**Theme:** "Get Paid Faster, Keep Customers Forever"

#### Sprint 1-2 (Jan 1-14): Payment & Portal Foundation

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Stripe account setup & API keys | DevOps | 1 day | None |
| `POST /payments/create-checkout` endpoint | Backend | 2 days | Stripe account |
| Stripe webhook handler (`/webhooks/stripe`) | Backend | 2 days | Checkout endpoint |
| Payment success/failure pages | Frontend | 1 day | Webhook handler |
| Portal login page (`/portal/login`) | Frontend | 2 days | None |
| Magic link email sending | Backend | 2 days | SendGrid/SES setup |
| Portal auth middleware | Backend | 1 day | Login endpoint |

**Sprint 1-2 Success Criteria:**
- [ ] Customer can pay invoice via Stripe hosted checkout
- [ ] Payment status auto-updates in system
- [ ] Customer can request magic link and log in to portal

#### Sprint 3-4 (Jan 15-28): Portal MVP

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Portal dashboard page | Frontend | 3 days | Auth working |
| Service history view | Frontend | 2 days | usePortalWorkOrders hook |
| Invoice list with pay buttons | Frontend | 2 days | usePortalInvoices hook |
| Service request form | Frontend | 2 days | useCreateServiceRequest hook |
| Portal navigation & layout | Frontend | 1 day | None |
| Mobile responsive polish | Frontend | 2 days | All portal pages |

**Sprint 3-4 Success Criteria:**
- [ ] Customer can view all past services
- [ ] Customer can see and pay outstanding invoices
- [ ] Customer can request new service online
- [ ] Portal works on mobile devices

#### Sprint 5-6 (Jan 29 - Feb 11): Predictive Maintenance v1

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Add `service_interval_days` to Customer model | Backend | 1 day | None |
| Add `last_service_date`, `next_service_due` to WorkOrder | Backend | 1 day | None |
| Service interval calculation job | Backend | 2 days | Schema changes |
| "Due for Service" API endpoint | Backend | 1 day | Calculation job |
| Automated reminder email/SMS | Backend | 3 days | SendGrid, Twilio |
| "Due Soon" dashboard widget | Frontend | 2 days | API endpoint |
| One-click booking from reminder | Frontend | 2 days | Service request flow |

**Sprint 5-6 Success Criteria:**
- [ ] System tracks when each customer is due for service
- [ ] Customers receive automatic reminders 30 days before due
- [ ] Dispatchers see "Due Soon" list on dashboard
- [ ] Customers can book directly from reminder email

#### Sprint 7-8 (Feb 12-25): Offline Foundation

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Add `dexie` package for IndexedDB | Frontend | 1 day | None |
| Create offline database schema | Frontend | 2 days | Dexie installed |
| Refactor `useOffline` to persist queue | Frontend | 3 days | DB schema |
| Service Worker with Workbox | Frontend | 3 days | None |
| Cache-first strategy for static assets | Frontend | 1 day | Service Worker |
| Background sync for mutations | Frontend | 3 days | IndexedDB working |
| Offline indicator improvements | Frontend | 1 day | Sync working |

**Sprint 7-8 Success Criteria:**
- [ ] App is installable as PWA
- [ ] Static assets cached for offline use
- [ ] Form submissions queued when offline
- [ ] Queue syncs automatically when online

#### Sprint 9-10 (Feb 26 - Mar 11): Offline Job Completion

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Cache assigned jobs to IndexedDB | Frontend | 2 days | Offline foundation |
| Offline job detail view | Frontend | 2 days | Cached jobs |
| Offline photo capture & queue | Frontend | 2 days | IndexedDB |
| Offline signature capture | Frontend | 1 day | SignaturePad + IndexedDB |
| Offline job completion flow | Frontend | 3 days | All offline components |
| Conflict resolution UI | Frontend | 2 days | Sync logic |
| Offline E2E tests | QA | 2 days | Complete flow |

**Sprint 9-10 Success Criteria:**
- [ ] Technician can view assigned jobs with no signal
- [ ] Technician can complete job workflow offline
- [ ] Photos and signatures sync when back online
- [ ] No data loss in poor connectivity

#### Sprint 11-12 (Mar 12-25): Q1 Polish & Launch

| Deliverable | Owner | Effort | Dependencies |
|-------------|-------|--------|--------------|
| Portal public launch | All | 2 days | All portal features |
| Customer onboarding emails | Marketing | 2 days | Portal live |
| PWA app store listings | DevOps | 2 days | PWA complete |
| Performance optimization | Frontend | 3 days | All features |
| Security audit | Backend | 3 days | All endpoints |
| Documentation & help articles | All | 3 days | Features stable |
| Beta customer feedback integration | Product | Ongoing | Launch |

**Q1 Exit Criteria:**
- [ ] 90% of invoices payable online
- [ ] 50% of customers activated on portal
- [ ] Predictive reminders generating 10+ bookings/month
- [ ] PWA installable with offline job completion
- [ ] Zero critical bugs

---

### Q2 2026: Intelligence & Efficiency (April - June)

**Theme:** "Work Smarter, Drive Less"

#### April: Route Optimization MVP

| Week | Deliverable | Owner | Notes |
|------|-------------|-------|-------|
| 1 | Google OR-Tools Python integration | Backend | Install, basic solver setup |
| 1 | Route optimization API endpoint | Backend | `POST /schedule/optimize` |
| 2 | Job location geocoding service | Backend | Google Geocoding API |
| 2 | Vehicle capacity constraints | Backend | Gallon limits per truck |
| 3 | Time window constraints | Backend | Customer availability |
| 3 | "Optimize" button on Schedule page | Frontend | Calls API, shows loading |
| 4 | Optimized route visualization | Frontend | Reorder jobs, show map |
| 4 | "Savings" display | Frontend | "This saves 47 minutes" |

**April Success Criteria:**
- [ ] Dispatcher clicks "Optimize" and gets improved route
- [ ] System respects time windows and truck capacity
- [ ] Average route 20% shorter than manual scheduling

#### May: Voice & AI Dispatch

| Week | Deliverable | Owner | Notes |
|------|-------------|-------|-------|
| 1 | Web Speech API integration | Frontend | Voice-to-text for notes |
| 1 | Voice recording UI in job view | Frontend | Record button, transcription display |
| 2 | Whisper API fallback (accuracy) | Backend | For complex audio |
| 2 | AI job assignment suggestions | Backend | "Mike is closest and available" |
| 3 | Assignment suggestion UI | Frontend | Show AI recommendation |
| 3 | Emergency rerouting logic | Backend | "Fastest tech to emergency" |
| 4 | Skill-based matching | Backend | Grease trap specialist |
| 4 | Workload balancing algorithm | Backend | Even distribution |

**May Success Criteria:**
- [ ] Technicians can dictate notes hands-free
- [ ] AI suggests optimal tech for each job
- [ ] Emergency calls routed to fastest available tech

#### June: QuickBooks & Polish

| Week | Deliverable | Owner | Notes |
|------|-------------|-------|-------|
| 1 | QuickBooks OAuth flow | Backend | Connect account |
| 1 | Invoice sync to QuickBooks | Backend | Create QBO invoice on ECBTX invoice |
| 2 | Payment sync from QuickBooks | Backend | Mark paid when QBO payment received |
| 2 | Customer sync | Backend | Bidirectional customer records |
| 3 | Expense tracking from field | Frontend | Log expenses in mobile app |
| 3 | P&L by service type report | Frontend | Profitability analysis |
| 4 | Q2 bug fixes and optimization | All | Performance, stability |
| 4 | Route optimization v2 improvements | All | Based on feedback |

**Q2 Exit Criteria:**
- [ ] Route optimization saves avg 1.5 hrs/tech/day
- [ ] Voice notes used by 50% of technicians
- [ ] AI dispatch suggestions accepted 70% of time
- [ ] QuickBooks sync working for invoices/payments
- [ ] App performance: <500ms schedule load time

---

### Q3 2026: Compliance & Scale (July - September)

**Theme:** "Paperwork That Does Itself"

#### July: Compliance Engine Foundation

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| State form template system | Backend | 5 days |
| Texas TCEQ inspection form | Backend | 3 days |
| South Carolina DHEC form | Backend | 3 days |
| Tennessee TDEC form | Backend | 3 days |
| PDF generation with jsPDF | Frontend | 3 days |
| Signature embedding in PDF | Frontend | 2 days |
| Form auto-population from job data | Full-stack | 3 days |

#### August: Compliance Workflow & Dynamic Pricing

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| Inspector email with PDF attachment | Backend | 2 days |
| Compliance dashboard (pending/submitted) | Frontend | 3 days |
| Distance-based pricing rules | Backend | 3 days |
| Tank size tier pricing | Backend | 2 days |
| Urgency multipliers | Backend | 2 days |
| Pricing rule builder UI | Frontend | 4 days |
| Quote builder with dynamic pricing | Frontend | 3 days |

#### September: AI Dispatch & Polish

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| Full AI dispatch assistant | Backend | 5 days |
| Natural language dispatch queries | Backend | 3 days |
| Dispatch chat interface | Frontend | 4 days |
| Q3 optimization and bug fixes | All | 5 days |
| Compliance form testing with real inspectors | QA | 5 days |

**Q3 Exit Criteria:**
- [ ] Compliance forms generated automatically for 3 states
- [ ] Inspectors receive reports via email
- [ ] Dynamic pricing increases average ticket 15%
- [ ] AI dispatch handles 80% of routine assignments

---

### Q4 2026: Growth & Enterprise (October - December)

**Theme:** "Ready for 50 Trucks"

#### October: Multi-Region Foundation

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| Region/branch data model | Backend | 3 days |
| Region-scoped queries | Backend | 4 days |
| Region selector in UI | Frontend | 2 days |
| Per-region pricing | Backend | 2 days |
| Per-region reporting | Frontend | 3 days |
| Cross-region user permissions | Backend | 3 days |

#### November: Customer Financing & Onboarding

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| Wisetack/Affirm integration | Backend | 5 days |
| Financing offer at checkout | Frontend | 3 days |
| Approval workflow | Full-stack | 3 days |
| New company onboarding wizard | Frontend | 5 days |
| Data import tools (CSV, ServiceTitan) | Backend | 5 days |
| Automated setup validation | Full-stack | 3 days |

#### December: Launch Readiness

| Deliverable | Owner | Effort |
|-------------|-------|--------|
| Help center with video tutorials | Marketing | 10 days |
| Referral program system | Full-stack | 5 days |
| Case studies from beta users | Marketing | 5 days |
| Final security audit | Security | 5 days |
| Load testing (100 concurrent users) | DevOps | 3 days |
| Public launch marketing campaign | Marketing | Ongoing |

**Q4 Exit Criteria:**
- [ ] Multi-region companies can operate independently
- [ ] Customer financing available at checkout
- [ ] New companies onboard in < 1 day
- [ ] System handles 100+ concurrent users
- [ ] Ready for scale customer acquisition

---

## 5. Technical Implementation Details

### Feature 1: AI Route Optimization

#### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   FastAPI       │     │   OR-Tools      │
│   Schedule Page │────▶│   /optimize     │────▶│   Solver        │
│   "Optimize"    │     │   endpoint      │     │   (Python)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        │               │  Google Maps    │            │
        │               │  Distance API   │◀───────────┘
        │               └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Optimized Route Response                      │
│  { jobs: [...], total_distance: 47.3, total_time: 142,         │
│    savings: { distance: 12.1, time: 34 }, map_polyline: "..." } │
└─────────────────────────────────────────────────────────────────┘
```

#### Tech Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Solver | Google OR-Tools | Free, proven, handles VRP constraints |
| Distance Matrix | Google Maps API | Accurate, traffic-aware |
| Fallback | OpenRouteService | Free tier for dev/testing |
| Execution | Sync for < 20 jobs, async for > 20 | UX responsiveness |

#### API Contract

```python
# POST /api/v2/schedule/optimize
{
  "date": "2026-01-15",
  "technician_ids": ["uuid1", "uuid2"],  # Optional: specific techs
  "constraints": {
    "max_hours_per_tech": 8,
    "lunch_break": { "start": "12:00", "duration_minutes": 30 },
    "respect_time_windows": true
  }
}

# Response
{
  "optimized_routes": [
    {
      "technician_id": "uuid1",
      "jobs": ["job1", "job2", "job3"],  # Ordered
      "start_time": "08:00",
      "end_time": "16:30",
      "total_drive_minutes": 87,
      "polyline": "encoded_polyline_string"
    }
  ],
  "savings": {
    "total_drive_minutes_saved": 47,
    "percentage_improvement": 23.5
  }
}
```

#### Testing Strategy

```typescript
// e2e/features/route-optimization.spec.ts
test('optimize button generates better route', async ({ page }) => {
  // Setup: Create 5 jobs in different locations
  await createTestJobs(5, { scattered: true });

  // Navigate to schedule
  await page.goto('/schedule');
  await page.click('[data-testid="optimize-button"]');

  // Assert loading state
  await expect(page.locator('.optimizing-spinner')).toBeVisible();

  // Assert results
  await expect(page.locator('.savings-display')).toContainText(/saves \d+ minutes/);

  // Assert jobs reordered
  const jobOrder = await page.locator('[data-testid="job-card"]').allTextContents();
  expect(jobOrder).not.toEqual(originalOrder);
});
```

---

### Feature 2: Offline-First PWA

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React App     │  │  Service Worker │  │   IndexedDB     │ │
│  │   (UI Layer)    │  │  (Cache Layer)  │  │  (Data Layer)   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           │   ┌────────────────┴────────────────┐   │           │
│           │   │         Dexie.js                │   │           │
│           │   │    (IndexedDB Wrapper)          │   │           │
│           │   └────────────────┬────────────────┘   │           │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    useOffline Hook                          ││
│  │  - isOnline: boolean                                        ││
│  │  - pendingCount: number                                     ││
│  │  - addToQueue(mutation): void                               ││
│  │  - syncNow(): Promise<void>                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ When Online
                              ▼
                    ┌─────────────────┐
                    │   FastAPI       │
                    │   Backend       │
                    └─────────────────┘
```

#### IndexedDB Schema (Dexie)

```typescript
// src/lib/offline-db.ts
import Dexie, { Table } from 'dexie';

interface CachedJob {
  id: string;
  data: WorkOrder;
  cachedAt: number;
}

interface PendingMutation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  payload: unknown;
  createdAt: number;
  retries: number;
}

interface CachedPhoto {
  id: string;
  jobId: string;
  blob: Blob;
  createdAt: number;
}

class OfflineDatabase extends Dexie {
  jobs!: Table<CachedJob>;
  mutations!: Table<PendingMutation>;
  photos!: Table<CachedPhoto>;

  constructor() {
    super('ecbtx-offline');
    this.version(1).stores({
      jobs: 'id, cachedAt',
      mutations: 'id, createdAt, retries',
      photos: 'id, jobId, createdAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();
```

#### Service Worker Strategy

```typescript
// src/sw.ts (Workbox)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API calls: Network first, fall back to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  })
);

// Static assets: Cache first
registerRoute(
  ({ request }) => request.destination === 'image' ||
                   request.destination === 'script' ||
                   request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-cache',
  })
);

// Background sync for mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPendingMutations());
  }
});
```

#### Testing Strategy

```typescript
// e2e/offline/offline-job-completion.spec.ts
test('complete job while offline', async ({ page, context }) => {
  // Login and navigate to assigned job
  await loginAsTechnician(page);
  await page.goto('/jobs/assigned');

  // Go offline
  await context.setOffline(true);

  // Verify offline indicator
  await expect(page.locator('.offline-banner')).toBeVisible();

  // Complete job workflow
  await page.click('[data-testid="start-job"]');
  await page.click('[data-testid="take-photo"]');
  await page.click('[data-testid="capture-signature"]');
  await page.click('[data-testid="complete-job"]');

  // Verify queued
  await expect(page.locator('.pending-sync-badge')).toContainText('1');

  // Go online
  await context.setOffline(false);

  // Verify sync
  await expect(page.locator('.syncing-indicator')).toBeVisible();
  await expect(page.locator('.sync-complete')).toBeVisible({ timeout: 10000 });

  // Verify job updated on server
  const job = await getJobFromApi(jobId);
  expect(job.status).toBe('completed');
});
```

---

### Feature 3: Customer Self-Service Portal

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Customer Portal (Separate Route Tree)         │
│                                                                  │
│  /portal/login     → PortalLoginPage (magic link request)       │
│  /portal/verify    → PortalVerifyPage (magic link handler)      │
│  /portal/dashboard → PortalDashboardPage (overview)             │
│  /portal/history   → PortalHistoryPage (past services)          │
│  /portal/invoices  → PortalInvoicesPage (pay bills)             │
│  /portal/request   → PortalRequestPage (book service)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JWT (portal-specific)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Portal API Endpoints                          │
│                                                                  │
│  POST /portal/auth/login        → Send magic link               │
│  POST /portal/auth/verify       → Verify token, return JWT      │
│  GET  /portal/customer          → Customer profile              │
│  GET  /portal/work-orders       → Service history               │
│  GET  /portal/invoices          → Outstanding invoices          │
│  POST /portal/invoices/:id/pay  → Initiate Stripe payment       │
│  POST /portal/service-requests  → Request new service           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Structure

```
src/features/portal/
├── PortalLayout.tsx          # Portal-specific layout (no sidebar)
├── PortalLoginPage.tsx       # Email input, request magic link
├── PortalVerifyPage.tsx      # Handle magic link token
├── PortalDashboardPage.tsx   # Overview with quick actions
├── PortalHistoryPage.tsx     # Past services table
├── PortalInvoicesPage.tsx    # Invoices with pay buttons
├── PortalRequestPage.tsx     # Service request form
└── components/
    ├── PortalHeader.tsx      # Simple header with logo
    ├── ServiceCard.tsx       # Single service display
    ├── InvoiceCard.tsx       # Invoice with status & pay button
    └── ServiceRequestForm.tsx # Book new service
```

#### Implementation Priority

| Component | Effort | Dependencies |
|-----------|--------|--------------|
| PortalLoginPage | 1 day | SendGrid for magic links |
| PortalVerifyPage | 0.5 day | Login page |
| PortalLayout | 0.5 day | None |
| PortalDashboardPage | 1 day | Layout, auth |
| PortalHistoryPage | 1 day | usePortalWorkOrders hook |
| PortalInvoicesPage | 2 days | usePortalInvoices, Stripe |
| PortalRequestPage | 1 day | useCreateServiceRequest hook |

**Total: ~7 days**

---

### Feature 4: Predictive Maintenance Engine

#### Data Model Changes

```sql
-- Add to customers table
ALTER TABLE customers ADD COLUMN service_interval_days INTEGER DEFAULT 1095; -- 3 years
ALTER TABLE customers ADD COLUMN last_service_date DATE;
ALTER TABLE customers ADD COLUMN next_service_due DATE;
ALTER TABLE customers ADD COLUMN reminder_sent_at TIMESTAMP;

-- Add to work_orders table
ALTER TABLE work_orders ADD COLUMN completes_maintenance BOOLEAN DEFAULT TRUE;
```

#### Reminder Engine Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cron Job (Daily at 6 AM)                      │
│                                                                  │
│  1. Query customers WHERE next_service_due <= NOW() + 30 days   │
│  2. Filter out those with reminder_sent_at > NOW() - 30 days    │
│  3. For each customer:                                          │
│     a. Generate reminder email/SMS                              │
│     b. Include one-click booking link                           │
│     c. Update reminder_sent_at                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Reminder Templates                            │
│                                                                  │
│  EMAIL: "Hi {name}, your septic system is due for service..."   │
│  SMS: "MAC Septic: Your tank is due! Book now: {link}"         │
│                                                                  │
│  One-click link: /portal/request?customer={id}&prefill=pumping  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### API Endpoints

```python
# GET /api/v2/maintenance/due-soon
{
  "customers": [
    {
      "id": 123,
      "name": "John Smith",
      "next_service_due": "2026-02-15",
      "days_until_due": 28,
      "last_service": "2023-02-15",
      "service_type": "pumping",
      "reminder_sent": false
    }
  ],
  "total": 47
}

# POST /api/v2/maintenance/send-reminders
{
  "customer_ids": [123, 456, 789],  # Optional: specific customers
  "channels": ["email", "sms"]
}

# Response
{
  "sent": 45,
  "failed": 2,
  "skipped": 0,  # Already reminded recently
  "failures": [
    { "customer_id": 456, "reason": "Invalid email" }
  ]
}
```

---

### Feature 5: Automated Compliance Reporting

#### Form Template System

```typescript
// src/lib/compliance/templates/index.ts
export interface ComplianceForm {
  state: 'TX' | 'SC' | 'TN';
  formId: string;
  formName: string;
  fields: FormField[];
  generatePdf: (data: JobData) => Promise<Blob>;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'checkbox' | 'signature' | 'photo';
  required: boolean;
  autoPopulate?: (job: WorkOrder, customer: Customer) => string;
}

// Texas TCEQ Inspection Form
export const texasTceqForm: ComplianceForm = {
  state: 'TX',
  formId: 'TCEQ-0123',
  formName: 'On-Site Sewage Facility Inspection Report',
  fields: [
    { id: 'owner_name', label: 'Property Owner', type: 'text', required: true,
      autoPopulate: (_, c) => `${c.first_name} ${c.last_name}` },
    { id: 'property_address', label: 'Property Address', type: 'text', required: true,
      autoPopulate: (j) => j.service_address_line1 },
    { id: 'inspection_date', label: 'Date of Inspection', type: 'date', required: true,
      autoPopulate: (j) => j.scheduled_date },
    { id: 'tank_condition', label: 'Tank Condition', type: 'text', required: true },
    { id: 'inspector_signature', label: 'Inspector Signature', type: 'signature', required: true },
    // ... more fields
  ],
  generatePdf: async (data) => { /* jsPDF generation */ }
};
```

#### PDF Generation

```typescript
// src/lib/compliance/pdf-generator.ts
import jsPDF from 'jspdf';

export async function generateCompliancePdf(
  form: ComplianceForm,
  job: WorkOrder,
  customer: Customer,
  signature: string // base64
): Promise<Blob> {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.text(form.formName, 20, 20);
  doc.setFontSize(10);
  doc.text(`Form ${form.formId} - State of ${form.state}`, 20, 30);

  // Auto-populated fields
  let y = 50;
  for (const field of form.fields) {
    const value = field.autoPopulate?.(job, customer) || '';
    doc.text(`${field.label}: ${value}`, 20, y);
    y += 10;
  }

  // Embed signature
  if (signature) {
    doc.addImage(signature, 'PNG', 20, y, 50, 25);
  }

  return doc.output('blob');
}
```

---

## 6. Resource & Timeline Reality Check

### Team Composition Assumption

| Role | Count | Focus |
|------|-------|-------|
| Full-stack Engineer | 2 | Features, integrations |
| Frontend Engineer | 1 | UI, offline, PWA |
| Backend Engineer | 1 | APIs, optimization, ML |
| DevOps/QA | 0.5 | CI/CD, testing, monitoring |

**Total: 4.5 FTE**

### Effort Estimates

| Quarter | Planned Features | Estimated Effort | Buffer |
|---------|------------------|------------------|--------|
| Q1 | Portal, Payments, Predictive, Offline | 12 person-months | +20% → 14.4 |
| Q2 | Route Opt, Voice, QuickBooks | 10 person-months | +20% → 12 |
| Q3 | Compliance, Pricing, AI Dispatch | 10 person-months | +20% → 12 |
| Q4 | Multi-region, Financing, Launch | 10 person-months | +20% → 12 |

**Total: 50.4 person-months = 4.2 FTE for 12 months** ✅ Feasible with team of 4.5

### Critical Path

```
Q1 Foundation
    │
    ├── Stripe Integration ─────────────────┐
    │                                       │
    ├── Portal Auth ─────┬── Portal MVP ────┼── Portal Launch
    │                    │                  │
    ├── Offline IndexedDB ── Service Worker ── Offline PWA
    │
    └── Service Intervals ── Reminder Engine ── Predictive v1

Q2 Intelligence
    │
    ├── Geocoding ── OR-Tools ── Route Optimization
    │
    ├── Web Speech API ── Voice Notes
    │
    └── QuickBooks OAuth ── Invoice Sync ── Full Integration

Q3 Compliance
    │
    ├── Form Templates ── PDF Generation ── State Forms
    │
    └── Pricing Rules ── Quote Builder ── Dynamic Pricing

Q4 Scale
    │
    ├── Multi-region Model ── Region Queries ── Region UI
    │
    └── Financing API ── Checkout Integration ── Financing Live
```

### Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OR-Tools learning curve | Medium | Medium | Start with simple TSP, iterate |
| Offline sync bugs | High | Medium | Extensive E2E testing, manual override |
| Stripe compliance delays | Medium | Low | Use hosted checkout first |
| State form changes | Medium | Medium | Template versioning system |
| Team capacity | High | Medium | Prioritize ruthlessly, cut scope if needed |
| Third-party API limits | Medium | Low | Caching, fallback providers |

---

## 7. Launch & Growth Plan

### Beta Program Structure

#### Phase 1: Alpha (Jan-Feb 2026)
- **Participants:** 3 companies (including MAC Septic)
- **Focus:** Portal, payments, basic offline
- **Feedback:** Weekly calls, Slack channel
- **Compensation:** Free for 6 months

#### Phase 2: Private Beta (Mar-Apr 2026)
- **Participants:** 10 companies
- **Focus:** All Q1 + Q2 features
- **Feedback:** Bi-weekly surveys, usage analytics
- **Compensation:** 50% discount for 12 months

#### Phase 3: Public Beta (May-Jun 2026)
- **Participants:** Open signup, 50 company cap
- **Focus:** Full platform
- **Feedback:** In-app feedback widget, NPS surveys
- **Compensation:** 25% discount for 6 months

### Pricing Evolution

| Phase | Starter | Professional | Business |
|-------|---------|--------------|----------|
| Alpha | Free | Free | Free |
| Private Beta | Free | $99/mo | $199/mo |
| Public Beta | $49/mo | $149/mo | $299/mo |
| GA Launch | $99/mo | $249/mo | $499/mo |

### Go-to-Market Strategy

#### Channel 1: Content Marketing
- "How to Start a Septic Business" guide (SEO)
- "Septic Business Profitability Calculator"
- Weekly blog: operational tips, industry news
- YouTube: software tutorials, day-in-life videos

#### Channel 2: Industry Events
- WWETT Show (Feb 2026) - Booth + demo
- State pumper association conferences
- Local septic contractor meetups

#### Channel 3: Partnerships
- Samsara co-marketing (already integrated)
- Equipment dealers (recommend to new buyers)
- Industry associations (member discount)

#### Channel 4: Referrals
- $500 credit per referred company
- Referrer gets credit when referee pays first invoice
- Leaderboard for top referrers

---

## 8. Success Dashboard

### Weekly Metrics (Track Every Monday)

| Metric | Target Q1 | Target Q2 | Target Q3 | Target Q4 |
|--------|-----------|-----------|-----------|-----------|
| Active Companies | 10 | 25 | 40 | 50 |
| Daily Active Users | 50 | 150 | 300 | 500 |
| Jobs Scheduled/Week | 500 | 1,500 | 3,000 | 5,000 |
| Portal Logins/Week | 100 | 500 | 1,500 | 3,000 |
| Online Payments/Week | 50 | 200 | 500 | 1,000 |
| NPS Score | 30 | 40 | 50 | 60 |

### Monthly Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **MRR** | Monthly recurring revenue | +15% MoM |
| **Churn** | Companies canceling | <3% |
| **Time to Value** | Days from signup to first job | <3 days |
| **Support Tickets/User** | Tickets per active user | <0.5 |
| **Route Optimization Adoption** | % of companies using | >70% |
| **Offline Completions** | % of jobs completed offline | Track |

### Quarterly OKRs

#### Q1 2026
- **O:** Launch self-service customer experience
- **KR1:** 90% of invoices payable online
- **KR2:** 500 customers activated on portal
- **KR3:** Predictive reminders generate 50 bookings

#### Q2 2026
- **O:** Make technicians 25% more efficient
- **KR1:** Route optimization saves avg 1.5 hrs/tech/day
- **KR2:** 50% of techs using voice notes
- **KR3:** QuickBooks sync active for 20 companies

#### Q3 2026
- **O:** Eliminate compliance paperwork
- **KR1:** 100 compliance forms auto-generated
- **KR2:** 3 state forms supported
- **KR3:** Dynamic pricing increases avg ticket 15%

#### Q4 2026
- **O:** Ready for scale growth
- **KR1:** 5 multi-region companies onboarded
- **KR2:** $10K in financed transactions
- **KR3:** 50 paying companies

---

## 9. Immediate Next Steps

### This Week

1. **Set up Stripe account** and get API keys in Railway
2. **Add Dexie.js** to package.json and create offline DB schema
3. **Create `/portal` route** with basic login page
4. **Add `service_interval_days`** field to Customer model
5. **Write first route optimization test** (failing, TDD)

### This Month

1. **Sprint 1-2:** Stripe checkout + Portal auth working
2. **Sprint 3-4:** Portal MVP with history + invoice payment
3. **Hire/assign:** Backend engineer for OR-Tools work
4. **Plan:** WWETT Show booth and demo

### This Quarter

1. **Launch:** Customer portal to all customers
2. **Launch:** PWA to app stores
3. **Start:** Route optimization development
4. **Achieve:** 10 paying companies

---

## Appendix: Technical Specifications

### A. API Endpoints to Build

| Endpoint | Method | Priority | Sprint |
|----------|--------|----------|--------|
| `/payments/create-checkout` | POST | P0 | 1 |
| `/portal/auth/login` | POST | P0 | 1 |
| `/portal/auth/verify` | POST | P0 | 1 |
| `/portal/invoices/:id/pay` | POST | P0 | 2 |
| `/maintenance/due-soon` | GET | P0 | 5 |
| `/maintenance/send-reminders` | POST | P0 | 5 |
| `/schedule/optimize` | POST | P1 | Q2-1 |
| `/compliance/forms/:state` | GET | P1 | Q3-1 |
| `/compliance/generate-pdf` | POST | P1 | Q3-1 |

### B. Dependencies to Add

```json
{
  "dependencies": {
    "dexie": "^3.2.4",
    "workbox-window": "^7.0.0",
    "jspdf": "^2.5.1",
    "@stripe/stripe-js": "^2.1.0"
  },
  "devDependencies": {
    "workbox-webpack-plugin": "^7.0.0"
  }
}
```

### C. Environment Variables to Add

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Google Maps (for route optimization)
GOOGLE_MAPS_API_KEY=...

# SendGrid (for magic links)
SENDGRID_API_KEY=...

# Twilio (for SMS reminders)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

---

*Document Version: 1.0*
*Created: December 31, 2025*
*Status: Ready for Execution*

---

**Let's build the future of septic service software. One sprint at a time.**
