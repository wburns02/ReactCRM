# ECBTX 2026: The Definitive Septic Service Platform

## Master Plan for Building the #1 Field Service Platform for Septic, Pumping & Inspection Companies

---

## Executive Summary

ECBTX is positioned to become the undisputed leader in septic field service software by 2026. With a solid foundation of 24 feature modules, advanced drag-and-drop scheduling, real-time fleet tracking, AI content generation, and a modern TypeScript stack, we are 60% of the way to an industry-defining platform.

This document outlines the strategic roadmap to transform ECBTX from a capable CRM into the platform that makes every competitor irrelevant for septic service companies.

**The Goal:** When a septic company owner sees ECBTX, they say: *"This was built for us. Nothing else comes close."*

---

## 1. Vision Statement

### The ECBTX Promise

> **"Every septic job scheduled, routed, completed, and paid—seamlessly. From the first customer call to the 10-year maintenance reminder, ECBTX handles it all while your competitors are still shuffling paper."**

### What Makes ECBTX Unmistakably The Best

1. **Septic-First Design** — Not a generic field service tool adapted for septic. Every feature built for tank pumping, inspections, grease traps, and compliance.

2. **AI That Actually Helps** — Route optimization that saves 2+ hours daily. Predictive maintenance that books jobs before customers call. Content generation that fills your marketing calendar.

3. **Offline-First Field Operations** — Technicians work in rural areas with no signal. ECBTX works offline, syncs when connected, never loses data.

4. **One Platform, Zero Excuses** — Scheduling, dispatch, invoicing, payments, compliance, marketing, fleet tracking, customer portal—all integrated, all included.

5. **Built for Growth** — Start with 2 trucks, scale to 50. Multi-region, multi-brand, franchise-ready.

---

## 2. User Personas

### Persona 1: Sarah — Office Dispatcher / CSR
**Role:** Answers phones, schedules jobs, handles billing
**Pain Points:**
- Juggling phone, scheduling software, and paper permits
- Customers calling to check on technician ETA
- Manually calculating drive times for scheduling
- Chasing overdue invoices

**ECBTX Makes Her Life Better:**
- One-click scheduling with AI-suggested optimal slots
- Customer portal handles ETA questions automatically
- Auto-calculated drive times and route suggestions
- Automated payment reminders and online payment links

**Success Metric:** Schedule 40% more jobs per day without additional staff

---

### Persona 2: Mike — Field Technician
**Role:** Pumps tanks, performs inspections, completes paperwork
**Pain Points:**
- Paper work orders get wet, lost, illegible
- No cell signal at rural properties
- Forgetting to collect signatures or photos
- Getting lost or inefficient routes

**ECBTX Makes His Life Better:**
- Mobile app works 100% offline, syncs when signal returns
- Guided job workflow: arrive → photo → service → signature → done
- Voice-to-text notes while hands are dirty
- Turn-by-turn navigation with optimized daily route

**Success Metric:** Complete 2 additional jobs per day with less stress

---

### Persona 3: Jim — Owner / General Manager
**Role:** Runs the business, manages techs, watches numbers
**Pain Points:**
- No real-time visibility into field operations
- Compliance paperwork scattered across filing cabinets
- Can't tell which services/techs are profitable
- Marketing feels like guesswork

**ECBTX Makes His Life Better:**
- Live dashboard showing every truck, job, and dollar
- One-click compliance reports for state inspectors
- Profitability breakdown by service type, technician, region
- AI-generated marketing campaigns that actually convert

**Success Metric:** 20% revenue increase, 50% less time on admin

---

### Persona 4: Karen — Homeowner Customer
**Role:** Needs septic pumped every 3-5 years, forgets when
**Pain Points:**
- Can't remember when last service was
- Hates calling to schedule, waiting on hold
- Wants to pay online, not write checks
- Worries about surprise costs

**ECBTX Makes Her Life Better:**
- Automatic reminder when service is due
- Self-service portal: view history, book online, pay invoice
- Upfront pricing with no surprises
- Text updates: "Mike is 20 minutes away"

**Success Metric:** 90% of customers rebook through portal/reminders

---

## 3. Killer Features Matrix

### MUST-HAVE (Q1-Q2 2026) — The Differentiators

| # | Feature | Impact | Effort | Status |
|---|---------|--------|--------|--------|
| 1 | **AI Route Optimization** | Saves 1.5-2 hrs/tech/day | High | Not Started |
| 2 | **Offline-First Mobile PWA** | Works in zero-signal rural areas | High | 40% (hooks exist) |
| 3 | **Customer Self-Service Portal** | Reduces calls 40%, improves collections | Medium | 60% (usePortal exists) |
| 4 | **Predictive Maintenance Engine** | Auto-generates recurring revenue | Medium | Not Started |
| 5 | **Automated Compliance Reporting** | Eliminates paperwork for inspections | Medium | Not Started |
| 6 | **Real-Time Tech Tracking** | Customers get live ETA, dispatchers see all | Low | 80% (Samsara integrated) |
| 7 | **Integrated Payment Processing** | Get paid same-day, reduce AR | Medium | 30% (UI exists) |

### SHOULD-HAVE (Q3 2026) — The Delighters

| # | Feature | Impact | Effort | Status |
|---|---------|--------|--------|--------|
| 8 | **Voice-to-Text Job Notes** | Hands-free documentation | Low | Not Started |
| 9 | **Photo Annotation & Markup** | Circle problems, add arrows | Low | 20% (PhotoCapture exists) |
| 10 | **Dynamic Pricing Engine** | Distance-based, urgency-based pricing | Medium | 20% (pricing API exists) |
| 11 | **AI Dispatch Assistant** | "Who should take this emergency call?" | Medium | Not Started |
| 12 | **QuickBooks Deep Sync** | Real-time GL, payroll integration | Medium | 10% (placeholder) |
| 13 | **Permit OCR Scanner** | Scan handwritten permits → digital | High | Not Started |

### NICE-TO-HAVE (Q4 2026) — The Wow Factor

| # | Feature | Impact | Effort | Status |
|---|---------|--------|--------|--------|
| 14 | **Customer Financing Integration** | "Pay over 12 months" at checkout | Medium | Not Started |
| 15 | **Franchise/Multi-Brand Mode** | Separate P&Ls, shared platform | High | Not Started |
| 16 | **AR Mode for Tank Locating** | Point phone at yard, see tank location | High | Not Started |
| 17 | **Technician Gamification** | Leaderboards, badges, bonuses | Low | Not Started |
| 18 | **Smart Inventory Alerts** | "Order more tank cleaner—3 jobs scheduled" | Low | 30% (inventory exists) |

---

## 4. Technical Architecture Evolution

### Current State (Solid Foundation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 19)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Schedule   │ │  Customers  │ │  Invoicing  │ │  Marketing  │   │
│  │  (DnD-kit)  │ │  (CRUD)     │ │  (Payments) │ │  (AI Gen)   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Map View   │ │  Fleet GPS  │ │  Reports    │ │  Portal     │   │
│  │  (Leaflet)  │ │  (Samsara)  │ │  (Recharts) │ │  (B2C)      │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                     │
│  State: TanStack Query + Zustand | Forms: RHF + Zod | UI: Tailwind │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS/REST
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Python)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  33 API Routers: auth, customers, work_orders, schedule,    │   │
│  │  invoices, payments, technicians, quotes, marketing, ai,    │   │
│  │  predictions, ringcentral, samsara, communications, etc.    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Auth: JWT | ORM: SQLAlchemy | Validation: Pydantic               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL 16)                       │
│  customers, prospects, work_orders, invoices, payments,            │
│  technicians, equipment, inventory, activities, communications     │
└─────────────────────────────────────────────────────────────────────┘
```

### Target State (2026)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │   WEB APP (React)  │  │  MOBILE PWA/NATIVE │  │  CUSTOMER PORTAL   │     │
│  │   Office/Dispatch  │  │  Field Technicians │  │  Self-Service      │     │
│  │   Full Features    │  │  Offline-First     │  │  Book/Pay/Track    │     │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘     │
│                                                                              │
│  NEW: Service Worker for offline | IndexedDB sync | Push notifications      │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  FastAPI + tRPC Hybrid (type-safe end-to-end where it matters)     │     │
│  │  Rate Limiting | Request Validation | API Versioning               │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐
│   CORE SERVICES    │  │   AI SERVICES      │  │   INTEGRATION SERVICES     │
│  ┌──────────────┐  │  │  ┌──────────────┐  │  │  ┌──────────────────────┐  │
│  │ Work Orders  │  │  │  │ Route Optim  │  │  │  │ RingCentral (VoIP)   │  │
│  │ Scheduling   │  │  │  │ (OR-Tools)   │  │  │  │ Samsara (GPS)        │  │
│  │ Invoicing    │  │  │  ├──────────────┤  │  │  │ Stripe (Payments)    │  │
│  │ Customers    │  │  │  │ Predictions  │  │  │  │ QuickBooks (Acct)    │  │
│  └──────────────┘  │  │  │ (ML Models)  │  │  │  │ Twilio (SMS)         │  │
│  ┌──────────────┐  │  │  ├──────────────┤  │  │  │ SendGrid (Email)     │  │
│  │ Compliance   │  │  │  │ Content Gen  │  │  │  │ Google Maps (Route)  │  │
│  │ Engine       │  │  │  │ (Claude API) │  │  │  └──────────────────────┘  │
│  │ (State-Spec) │  │  │  └──────────────┘  │  │                            │
│  └──────────────┘  │  │                    │  │                            │
└────────────────────┘  └────────────────────┘  └────────────────────────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  PostgreSQL 16   │  │  Redis Cache     │  │  S3/R2 Object Storage   │   │
│  │  Primary DB      │  │  Sessions/Queue  │  │  Photos/Docs/Signatures │   │
│  │  + TimescaleDB   │  │  + BullMQ Jobs   │  │  + CDN Distribution     │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Upgrades

| Area | Current | Target | Justification |
|------|---------|--------|---------------|
| **Mobile** | Responsive web | PWA + Optional Expo Native | Offline-first, push notifications, camera/GPS |
| **Offline Sync** | Hooks exist, no persistence | IndexedDB + Sync Queue | Rural areas have no signal |
| **Route Optimization** | Manual | Google OR-Tools | Proven OSS solver, handles constraints |
| **Background Jobs** | None | BullMQ + Redis | Payment retries, notifications, ML jobs |
| **File Storage** | Local/DB blobs | Cloudflare R2 | Cost-effective, CDN, signed URLs |
| **Real-time** | Polling | WebSockets (select features) | Live tech tracking, dispatch updates |
| **Type Safety** | Zod validation | tRPC for critical paths | End-to-end type safety, fewer bugs |
| **ML/Predictions** | Claude API | Claude + custom models | Predictive maintenance needs historical analysis |

### What We're NOT Changing (It Works)

- **React 19 + TanStack Query** — Battle-tested, excellent DX
- **FastAPI + Pydantic** — Fast, type-safe, async-ready
- **PostgreSQL 16** — Rock-solid, JSONB for flexibility
- **Tailwind CSS** — Rapid UI development
- **@dnd-kit** — Best-in-class drag-and-drop
- **Railway deployment** — Simple, scalable, affordable

---

## 5. Phased Roadmap

### Q1 2026: Foundation & Quick Wins (Jan-Mar)

**Theme:** "Bulletproof Core + Immediate Value"

#### Month 1: Stability & Offline Foundation
- [ ] **Fix all known bugs** (PATCH 500s ✅, technician endpoint, etc.)
- [ ] **Implement IndexedDB persistence** for offline queue
- [ ] **Service Worker** for PWA installation + caching
- [ ] **Push notification infrastructure** (Firebase Cloud Messaging)
- [ ] **Stripe integration** for payment processing

**Deliverable:** PWA installable on mobile, payments work end-to-end

#### Month 2: Customer Portal MVP
- [ ] **Portal authentication** (magic link / password)
- [ ] **Service history view** (past jobs, invoices)
- [ ] **Online payment** (pay invoice via Stripe)
- [ ] **Service request form** (schedule pumping)
- [ ] **Text notification opt-in**

**Deliverable:** Customers can view history, pay bills, request service

#### Month 3: Predictive Maintenance v1
- [ ] **Service interval tracking** (septic = 3-5 years, grease = monthly)
- [ ] **Automated reminder engine** (email + SMS 30 days before due)
- [ ] **"Due for Service" dashboard widget**
- [ ] **One-click booking from reminder**

**Deliverable:** System automatically generates recurring revenue opportunities

---

### Q2 2026: AI & Optimization (Apr-Jun)

**Theme:** "Work Smarter, Not Harder"

#### Month 4: Route Optimization MVP
- [ ] **Google OR-Tools integration** (constraint-based solver)
- [ ] **Daily route generation** (minimize drive time)
- [ ] **Drag-to-reorder with recalculation**
- [ ] **Traffic-aware ETAs** (Google Maps API)
- [ ] **"Optimize" button on schedule page**

**Deliverable:** Dispatchers click "Optimize" and get best route instantly

#### Month 5: AI Dispatch Assistant
- [ ] **Smart job assignment** ("Mike is closest and has capacity")
- [ ] **Emergency rerouting** ("Sewer backup—who can get there fastest?")
- [ ] **Workload balancing** (even distribution across techs)
- [ ] **Skill matching** (grease trap specialist for grease jobs)

**Deliverable:** AI suggests optimal assignments, dispatcher approves

#### Month 6: Voice & Mobile Polish
- [ ] **Voice-to-text job notes** (Web Speech API / Whisper)
- [ ] **Photo annotation** (draw arrows, circles on photos)
- [ ] **Guided job workflow** (checklist with required steps)
- [ ] **Offline photo queue** (sync when signal returns)

**Deliverable:** Technicians complete jobs hands-free, fully offline

---

### Q3 2026: Compliance & Integrations (Jul-Sep)

**Theme:** "Automate the Paperwork"

#### Month 7: Compliance Engine
- [ ] **State-specific form templates** (TX, SC, TN to start)
- [ ] **Auto-populated inspection reports**
- [ ] **Digital signature capture** (legally binding)
- [ ] **PDF generation** with company branding
- [ ] **Email to county inspector** with one click

**Deliverable:** Compliance paperwork generated automatically

#### Month 8: QuickBooks Deep Integration
- [ ] **Real-time invoice sync** (ECBTX → QuickBooks)
- [ ] **Payment reconciliation**
- [ ] **Customer/vendor sync**
- [ ] **Expense tracking** from field
- [ ] **P&L by service type**

**Deliverable:** Accountants work in QuickBooks, field works in ECBTX

#### Month 9: Advanced Pricing
- [ ] **Distance-based pricing** (base + per-mile)
- [ ] **Urgency multipliers** (emergency = 1.5x)
- [ ] **Tank size tiers** (500 gal vs 1500 gal)
- [ ] **Recurring discount** (10% for maintenance contracts)
- [ ] **Quote builder** with drag-drop line items

**Deliverable:** Pricing that maximizes revenue without manual calculation

---

### Q4 2026: Scale & Delight (Oct-Dec)

**Theme:** "Ready for 50 Trucks"

#### Month 10: Multi-Region & Franchise
- [ ] **Region/branch management** (separate job queues)
- [ ] **Per-region pricing** and service areas
- [ ] **Consolidated reporting** (owner sees all regions)
- [ ] **Role-based access** (dispatcher sees their region only)

**Deliverable:** Multi-location companies can manage everything centrally

#### Month 11: Customer Financing
- [ ] **Wisetack/Affirm integration** (buy now, pay later)
- [ ] **Financing offer at checkout** ("Pay $89/month for 12 months")
- [ ] **Approval workflow** (instant decision)
- [ ] **Larger ticket capture** (drain field replacements)

**Deliverable:** Customers afford expensive repairs, company gets paid upfront

#### Month 12: Polish & Launch Marketing
- [ ] **Onboarding wizard** for new companies
- [ ] **Data migration tools** (import from spreadsheets, ServiceTitan)
- [ ] **Help center** with videos
- [ ] **Referral program** (customers refer customers)
- [ ] **Case studies** from beta users

**Deliverable:** Ready for scale acquisition of new customers

---

## 6. Monetization & Growth Strategy

### Pricing Model

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Starter** | $99/mo | 1-2 trucks | Core CRM, scheduling, invoicing, 1 user |
| **Professional** | $249/mo | 3-10 trucks | + Route optimization, customer portal, 5 users |
| **Business** | $499/mo | 11-25 trucks | + AI dispatch, compliance, QuickBooks, 15 users |
| **Enterprise** | Custom | 25+ trucks | + Multi-region, API access, dedicated support |

**Add-ons:**
- Additional users: $25/user/month
- SMS package: $0.02/message
- Payment processing: 2.9% + $0.30 (pass-through)

### Growth Flywheel

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌──────────────┐         ┌──────────────┐                   │
│    │  Septic Co   │         │  Happy       │                   │
│    │  Signs Up    │────────▶│  Customers   │                   │
│    └──────────────┘         └──────────────┘                   │
│           │                        │                           │
│           │                        │ Leave Reviews             │
│           │                        ▼                           │
│           │               ┌──────────────┐                     │
│           │               │  More        │                     │
│           │               │  Homeowners  │                     │
│           │               │  Find Them   │                     │
│           │               └──────────────┘                     │
│           │                        │                           │
│           │                        │ More Business             │
│           │                        ▼                           │
│           │               ┌──────────────┐                     │
│           │               │  Company     │                     │
│           ▼               │  Grows       │◀───────────────┐    │
│    ┌──────────────┐       └──────────────┘                │    │
│    │  Uses ECBTX  │              │                        │    │
│    │  AI Marketing│              │ Needs More Trucks      │    │
│    └──────────────┘              ▼                        │    │
│           │               ┌──────────────┐                │    │
│           │               │  Upgrades    │                │    │
│           └──────────────▶│  ECBTX Tier  │────────────────┘    │
│                           └──────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Customer Acquisition Strategy

1. **Content Marketing** — "How to start a septic business" guides, SEO for "septic scheduling software"
2. **Industry Events** — WWETT Show, state pumper conventions
3. **Referral Program** — $500 credit for each referred company
4. **Partnerships** — Samsara, RingCentral, equipment dealers
5. **Vertical Integration** — Partner with septic industry associations

### Revenue Projections (Conservative)

| Year | Customers | MRR | ARR |
|------|-----------|-----|-----|
| End 2026 | 50 | $15K | $180K |
| End 2027 | 200 | $60K | $720K |
| End 2028 | 500 | $175K | $2.1M |

---

## 7. Competitive Moat

### Why No One Can Catch Up

#### 1. Septic-Specific Features
Generic field service tools (ServiceTitan, Housecall Pro) serve HVAC, plumbing, electrical. They'll never prioritize:
- Compliance reporting for septic inspections
- Tank size-based pricing
- Pump-out interval tracking
- Grease trap vs residential workflows

**We are septic-first. They're septic-maybe.**

#### 2. AI That Learns Your Business
Our route optimization and predictive maintenance get smarter with every job. A new competitor starts from zero.

#### 3. Offline-First Architecture
90% of septic jobs are in rural areas. Competitors assume constant connectivity. We assume no signal and still work.

#### 4. Integrated Ecosystem
RingCentral + Samsara + Stripe + QuickBooks + Customer Portal. Competitors offer integrations; we offer seamless workflows.

#### 5. Community & Content
We'll build the largest septic business owner community. Training content, best practices, benchmarking data. Switching means leaving the community.

#### 6. Data Network Effects
Aggregated anonymized data across customers:
- "Average pumping interval in Texas Hill Country: 4.2 years"
- "Optimal route density: 6 jobs/day in urban, 4 jobs/day in rural"

**The more customers we have, the smarter everyone's system gets.**

---

## 8. Success Metrics

### Product Metrics

| Metric | Current | Q2 2026 | Q4 2026 |
|--------|---------|---------|---------|
| Schedule load time | ~2s | <1s | <500ms |
| Offline sync reliability | N/A | 95% | 99.5% |
| Route optimization savings | N/A | 1.5 hrs/tech/day | 2 hrs/tech/day |
| Customer portal adoption | 0% | 30% | 60% |
| Predictive maintenance bookings | 0% | 10% of jobs | 25% of jobs |

### Business Metrics

| Metric | Q2 2026 | Q4 2026 |
|--------|---------|---------|
| Paying customers | 20 | 50 |
| Monthly churn | <3% | <2% |
| NPS score | 40 | 60 |
| Time to value (onboarding) | 3 days | Same day |
| Support tickets/customer/month | 2 | 0.5 |

### Technical Health

| Metric | Target |
|--------|--------|
| API response time (P95) | <200ms |
| Uptime | 99.9% |
| E2E test pass rate | 100% |
| Zero known critical bugs | Always |
| Security vulnerabilities | Zero |

---

## 9. Why This Wins

### The Unfair Advantages

1. **We've Already Built 60% of It**
   - 24 feature modules, 33 API endpoints, AI content generation
   - Real integrations (RingCentral, Samsara) not just "coming soon"
   - Production-grade code with comprehensive E2E tests

2. **We Know The Industry**
   - Built for MAC Septic, a real septic company
   - Every feature battle-tested with actual dispatchers and technicians
   - Not guessing what users want—we've watched them work

3. **Modern Tech Stack**
   - React 19, TypeScript, TanStack Query = developer velocity
   - FastAPI + PostgreSQL = performance and reliability
   - Not maintaining legacy PHP/jQuery code like competitors

4. **AI-Native Design**
   - AI content generation already working
   - Architecture ready for route optimization and predictions
   - Not bolting AI onto a 10-year-old system

5. **The Right Team**
   - Engineers who use Playwright for every change
   - Infrastructure that deploys in minutes
   - Documentation that AI assistants can read and act on

### The 2026 Headline

> **"ECBTX Raises $5M Series A After Becoming the Fastest-Growing Septic Software Platform. Customers Report 40% Efficiency Gains."**

---

## 10. Next Steps

### Immediate Actions (This Week)

1. **Prioritize Q1 features** — Confirm Stripe, IndexedDB, Portal as top 3
2. **Set up monitoring** — Error tracking, performance monitoring
3. **Recruit beta customers** — 5 companies to test offline + portal
4. **Document APIs** — OpenAPI spec for all endpoints

### 30-Day Milestone

- [ ] Stripe payments live in production
- [ ] Service Worker caching deployed
- [ ] IndexedDB sync queue persisting data
- [ ] Customer portal login working
- [ ] 5 beta customers onboarded

### 90-Day Milestone

- [ ] Customer portal MVP launched
- [ ] Predictive maintenance sending reminders
- [ ] 20 paying customers
- [ ] Route optimization POC working
- [ ] Zero critical bugs

---

## Appendix A: Feature Details

### AI Route Optimization — Technical Approach

**Problem:** Technicians drive 2-3 hours/day between jobs. Better routing = more jobs/day.

**Solution:**
1. Use Google OR-Tools (open-source constraint solver)
2. Inputs: job locations, time windows, tech start locations, vehicle capacity
3. Constraints: 8-hour workday, lunch break, drive time limits
4. Objective: Minimize total drive time while meeting all windows

**Integration:**
- "Optimize" button on Schedule page
- Drag-drop to override, auto-recalculates
- Show "savings" ("This route saves 47 minutes vs. original")

### Offline-First Architecture

**Tech Stack:**
- Service Worker (Workbox) for caching
- IndexedDB (Dexie.js) for local data
- Background Sync API for queued mutations

**Sync Strategy:**
1. All reads: cache-first with background revalidation
2. All writes: optimistic UI, queue to IndexedDB, sync when online
3. Conflict resolution: server wins, but notify user of merged changes

**What Works Offline:**
- View assigned jobs
- Complete job workflow (notes, photos, signature)
- Create new customer (queued)
- NOT: route optimization (needs network)

### Compliance Engine — State Forms

**Phase 1 States:**
- Texas (TCEQ septic inspection)
- South Carolina (DHEC septic permit)
- Tennessee (TDEC inspection)

**Form Generation:**
1. Pre-populated from work order + customer data
2. Technician fills inspection-specific fields
3. Digital signature capture
4. PDF generated with state-compliant format
5. One-click email to inspector

---

## Appendix B: Competitive Analysis

| Feature | ECBTX | ServiceTitan | Housecall Pro | Jobber |
|---------|-------|--------------|---------------|--------|
| Septic-specific | Yes | No | No | No |
| Route optimization | Q2 2026 | Yes ($$$) | Basic | Basic |
| Offline mobile | Q1 2026 | Partial | Partial | No |
| Customer portal | Q1 2026 | Yes | Yes | Yes |
| AI content gen | Yes | No | No | No |
| Predictive maint | Q1 2026 | No | No | No |
| Compliance forms | Q3 2026 | No | No | No |
| Pricing | $99-499 | $500+ | $49-199 | $39-199 |
| Setup time | Same day | Weeks | Days | Days |

---

## Appendix C: Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Route optimization is hard | High | Medium | Start with OR-Tools POC, fallback to Google Routes API |
| Offline sync bugs | High | Medium | Extensive E2E testing, gradual rollout, manual override |
| Stripe integration delays | Medium | Low | Use Stripe's hosted checkout first, embed later |
| Competitor copies features | Medium | High | Move fast, build community moat, patent key algorithms |
| Key engineer leaves | High | Low | Document everything, pair programming, no single points of failure |

---

*Document Version: 1.0*
*Created: December 31, 2025*
*Last Updated: December 31, 2025*
*Authors: ECBTX Team + Claude*

---

**Let's build the future of septic service software.**
