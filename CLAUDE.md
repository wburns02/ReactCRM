# ReactCRM - ECBTX Septic Service Management Platform

> **Version:** v2.4 — March 10, 2026  
> **Status:** Production  
> **Purpose:** Comprehensive CRM for septic service operations with AI-powered call intelligence and field management

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 |
| **State Management** | TanStack Query v5, Zustand, React Hook Form |
| **Backend** | FastAPI + SQLAlchemy 2.0 + PostgreSQL + Redis |
| **Testing** | Playwright E2E (56 test files), Vitest unit tests |
| **Deployment** | Railway (auto-deploy on git push) |
| **Integrations** | RingCentral, Twilio, Stripe, Sentry |
| **Key Libraries** | @dnd-kit, @hookform/resolvers, axios, clsx, leaflet |

---

## Project Structure

```
ReactCRM/
├── src/                   # Main source code
│   ├── components/        # Reusable UI components (13 files)
│   ├── features/          # Feature-specific modules (73 files)
│   ├── hooks/             # Custom React hooks (27 files)
│   ├── api/               # API client and endpoints (11 files)
│   ├── lib/               # Utilities and configurations (13 files)
│   ├── providers/         # React context providers (4 files)
│   └── mocks/             # Testing mocks (4 files)
├── e2e/                   # Playwright test suites (56 files)
│   ├── features/          # Feature-specific E2E tests (20 files)
│   ├── debug/             # Debug and diagnostic tests (18 files)
│   ├── health/            # Health check tests (8 files)
│   └── accessibility/     # Accessibility tests (2 files)
├── docs/                  # Architecture and user guides
│   ├── architecture/      # Technical documentation (6 files)
│   ├── customer-success/  # User guides (6 files)
│   └── journeys/          # User journey docs (5 files)
├── scrapers/              # Government data extraction (39 files)
│   ├── opengov/           # OpenGov integrations (16 files)
│   ├── mgo/               # MGO platform scrapers (11 files)
│   └── harris_county/     # Harris County specific (6 files)
├── mobile/                # Mobile-optimized components (10 files)
├── scripts/               # Automation and utilities (12 files)
├── healing/               # Auto-healing and monitoring (6 files)
│   ├── llm/               # LLM-powered diagnostics (5 files)
│   ├── playbooks/         # Recovery playbooks (3 files)
│   └── triage/            # Issue classification (4 files)
└── backend/               # FastAPI server (separate repo: ~/react-crm-api)
```

---

## Local Development

```bash
# Frontend (ReactCRM repo)
npm install
npm run dev          # Dev server on localhost:5173
npm run build        # Production build
npm run test         # Unit tests with Vitest
npm run e2e          # Playwright E2E tests

# Backend (separate repo: ~/react-crm-api)
cd ~/react-crm-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # Dev server on localhost:8000
```

---

## Architecture Decisions

### Frontend Architecture
- **Router:** React Router v6 with basename="/" (NO /app/ routes)
- **API Client:** Axios with TanStack Query for caching/sync
- **Forms:** React Hook Form + Zod validation
- **Drag & Drop:** @dnd-kit for reorderable lists
- **Auth:** HTTP-only cookies + Bearer token fallback
- **Build:** Vite with vendor-react chunking strategy (prevents createContext errors)

### Backend Architecture
- **API:** FastAPI with automatic OpenAPI docs
- **Database:** PostgreSQL 17 with async SQLAlchemy 2.0
- **Caching:** Redis for session storage and API caching
- **Auth:** JWT tokens with refresh mechanism
- **Migrations:** Alembic for schema versioning

### Key Patterns
- Feature-based folder structure (not layer-based)
- Server state via TanStack Query, local state via useState/Zustand
- API calls: `/customers/` NOT `/api/customers/` (no double /api)
- All mutations return 200 OK (never 500 on drag-drop)
- React.createElement syntax for component instantiation (prevents createContext errors)

---

## Core Features

### Customer Management
- Customer profiles with service history
- Property management and permit tracking
- Communication logs and follow-ups
- Entity/role-based access control

### Field Operations
- Work order creation and scheduling
- Quote generation and approval workflow
- Real-time technician dispatch and tracking
- Mobile-optimized field interfaces

### Call Intelligence
- AI-powered call transcription and analysis
- Automatic lead qualification and routing
- Call disposition tracking and follow-up automation
- RingCentral and Twilio voice integration

### Financial Management
- Commission calculation engine
- Stripe payment processing
- Quote-to-invoice workflow
- Payroll integration

### Data Integration
- Government permit scraping (OpenGov, MGO, Harris County)
- Automated permit status updates
- Property record synchronization
- Septic system compliance tracking

### AI Assistant
- Natural language query interface
- Automated task completion
- Integration with CRM workflows
- Context-aware suggestions

---

## Production Deployment

| Service | URL | Repository |
|---------|-----|------------|
| **Frontend** | https://react.ecbtx.com | `wburns02/ReactCRM` |
| **API** | https://react-crm-api-production.up.railway.app | `wburns02/react-crm-api` |

### The Sacred Loop (MANDATORY)
Every code change MUST complete this cycle:

```
┌─────────────────────────────────────────────────┐
│  1. Build locally (npm run build — must pass)   │
│  2. Commit with descriptive message             │
│  3. Push to GitHub (git push origin master)     │
│  4. Wait ~2 min for Railway deploy              │
│  5. Run Playwright tests against production     │
│  6. ALL PASS? → Done ✓                          │
│  7. ANY FAIL? → Fix code → Go to step 1        │
└─────────────────────────────────────────────────┘
```

### Hard Rules
1. **NEVER fake Playwright** — always show full script + evidence bundle
2. **NO /app/ routes** — basename="/", no /app in links
3. **NO double /api** in API calls
4. **Drag-and-drop mutations MUST succeed** with 200 (no 500s)
5. **Relentless mode** — never ask to continue, just keep fixing
6. **NEVER use `railway up`** — always deploy via git push to GitHub
7. **ALWAYS push + Playwright test loop** — fix until 0 failures
8. **Use React.createElement syntax** — prevents createContext errors in production
9. **NEVER modify build configuration files** — `vite.config.ts`, `tsconfig.json`, `package.json`, `tailwind.config.ts` are PROTECTED
10. **ALWAYS run `npm run build` before pushing** — if build fails, revert and fix before pushing

---

## Build Configuration — DO NOT MODIFY
- **`vite.config.ts`** — NEVER change manualChunks, rollupOptions, or build config
- All React-dependent packages MUST stay in the `vendor-react` chunk
- **`tsconfig.json`** — NEVER change compiler options
- **`package.json`** — NEVER add/remove/change dependencies without explicit human approval
- **`tailwind.config.ts`** — NEVER modify
- If you think you need to change any build config, STOP and ask the user

---

## Recent Critical Fixes (March 2026)

### React createContext Error - RESOLVED (March 9, 2026)
- **Issue**: "Cannot read properties of undefined (reading 'createContext')" causing white screen
- **Root Cause**: Incorrect React syntax treating components as functions instead of using createElement
- **Fix**: Changed `StrictMode({ children: App({}) })` to `React.createElement(StrictMode, null, React.createElement(App))`
- **Status**: Zero console errors confirmed in production

### Playwright Module Resolution - RESOLVED
- **Issue**: `pw-pentest.cjs` monitoring script failing with "Cannot find module 'playwright'"
- **Fix**: Added `playwright` to production dependencies and enhanced module resolution fallbacks
- **Status**: Automated monitoring restored

### 401 Console Error Spam - RESOLVED
- **Issue**: Unauthenticated API calls triggering unnecessary 401 errors
- **Fix**: Added auth guards and updated `optionalEndpoints` array in `client.ts`
- **Status**: Console errors eliminated in production

---

## Environment Variables

```env
# Frontend (.env.production)
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# Backend (Railway environment)
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
REDIS_URL=redis://...@redis.railway.internal:6379
SECRET_KEY=...
ENVIRONMENT=production
```

---

## Activation Commands

**Enter Relentless Mode:**
- `"Enter relentless autonomous troubleshooter mode"`
- `"Fix until all tests pass and zero console errors"`

**When to use Playwright:** ANY UI check, error reproduction, drag test, page load verification

> **CRITICAL:** This document contains binding rules. Violations invalidate the entire response.
