# ReactCRM - ECBTX Septic Service Management Platform

> **Version:** v2.3 — March 5, 2026  
> **Status:** Production  
> **Purpose:** Comprehensive CRM for septic service operations with AI-powered call intelligence and field management

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 |
| **State Management** | TanStack Query v5, Zustand, React Hook Form |
| **Backend** | FastAPI + SQLAlchemy 2.0 + PostgreSQL + Redis |
| **Testing** | Playwright E2E, Vitest unit tests |
| **Deployment** | Railway (auto-deploy on git push) |
| **Integrations** | RingCentral, Twilio, Stripe, Sentry |

---

## Project Structure

```
ReactCRM/
├── src/
│   ├── components/        # Reusable UI components
│   ├── features/         # Feature-specific modules (73 files)
│   ├── hooks/            # Custom React hooks (26 files)  
│   ├── lib/              # Utilities and configurations
│   ├── api/              # API client and endpoints
│   └── context/          # React context providers
├── e2e/                  # Playwright test suites (56 files)
├── backend/              # FastAPI server (separate repo link)
├── docs/                 # Architecture and user guides
├── scrapers/             # Government data extraction (39 files)
├── mobile/               # Mobile-optimized components
├── scripts/              # Automation and utilities
└── claude-docs/          # AI assistant documentation
```

---

## Local Development

```bash
# Frontend (ReactCRM repo)
npm install
npm run dev          # Dev server on localhost:5173
npm run build        # Production build
npm run test         # Unit tests
npm run e2e          # Playwright tests

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

---

## Core Features

### Customer Management
- Customer profiles with service history
- Property management and permit tracking  
- Communication logs and follow-ups

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
- Payroll integration (new 2026)

### Role-Based Access
- Admin, Executive, Manager, Technician, Phone Agent, Dispatcher, Billing
- Dynamic UI based on user permissions
- Demo mode for `will@macseptic.com`

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
| **Monitoring** | https://uptime-kuma-production-3500.up.railway.app | Railway template |

### Deployment Process
```bash
# 1. Make changes locally
npm run build        # Verify frontend builds
cd ~/react-crm-api && python -c "from app.main import app"  # Verify backend

# 2. Commit and push  
git add .
git commit -m "descriptive message"
git push origin master    # Auto-deploys via Railway

# 3. Wait 2-3 minutes for Railway deployment

# 4. Verify backend health
curl "https://react-crm-api-production.up.railway.app/health"

# 5. Run Playwright tests against production (MANDATORY)
npx playwright test
```

---

## Development Rules (MANDATORY)

### The Sacred Loop
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

### Playwright Testing
```javascript
// Auth bypass for production testing
await ctx.addInitScript(() => {
  const state = JSON.stringify({
    isAuthenticated: true,
    lastValidated: Date.now(),
    userId: 'user-123',
  });
  sessionStorage.setItem('session_state', state);
  localStorage.setItem('session_state', state);
  localStorage.setItem('crm_session_token', 'mock-jwt-token-123');
});

// Mock API responses
await ctx.route('https://react-crm-api-production.up.railway.app/**', async (route) => {
  const url = route.request().url();
  if (url.includes('/auth/me')) {
    return route.fulfill({ 
      status: 200, 
      contentType: 'application/json', 
      body: JSON.stringify({
        user: { id: 'user-123', email: 'test@ecbtx.com', role: 'admin' }
      })
    });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
```

---

## Known Issues & Priorities

### Current Sprint Focus
- **AI Assistant Integration:** Voice command processing and natural language workflows
- **Call Intelligence:** Advanced sentiment analysis and automated lead scoring  
- **Mobile Optimization:** Offline-capable field technician interface
- **Commission Engine:** Automated calculation with manager approval workflow

### Banned Bugs (NEVER Reintroduce)
| Bug | Wrong | Correct |
|-----|-------|---------|
| `/app/` prefix | `<Link to="/app/customers">` | `<Link to="/customers">` |
| Double `/api` | `apiClient.get('/api/customers/')` | `apiClient.get('/customers/')` |
| PATCH 500 | No error handling | try/catch + validation |
| Fake Playwright | "I verified..." without proof | Full script + evidence bundle |

### Recent Fixes
- **2026-03-05:** Fixed `pw-pentest.cjs` monitoring script module imports
- **2026-02-28:** Dannia Live Assist caller-focused transcript filtering
- **2026-02-27:** Playwright module import resolution in pentest automation

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
