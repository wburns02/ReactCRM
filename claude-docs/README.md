# ECBTX CRM Documentation System

> **Version:** v2.0 — December 31, 2025
> **Status:** Production
> **Maintainer:** Claude Code AI Assistant

---

## Overview

This documentation system provides enforceable rules and technical reference for the ECBTX CRM platform. It consists of two applications:

| Application | URL | Stack |
|-------------|-----|-------|
| **React CRM** (Frontend) | https://react.ecbtx.com | React 19, TypeScript, Vite |
| **CRM API** (Backend) | https://react-crm-api-production.up.railway.app/api/v2 | FastAPI, PostgreSQL |
| **Legacy Flask CRM** | https://crm.ecbtx.com | Flask (deprecated) |

---

## Documentation Files

```
claude-docs/
├── README.md           ← You are here
├── quick-reference.md  ← Cheat sheet & activation commands
├── frontend.md         ← React CRM frontend documentation
└── backend.md          ← FastAPI backend documentation
```

### File Purposes

| File | Purpose | When to Read |
|------|---------|--------------|
| `quick-reference.md` | Activation phrases, banned bugs, evidence format | **Always read first** |
| `frontend.md` | React architecture, components, routing, state | Frontend development |
| `backend.md` | API endpoints, models, database, deployment | Backend development |

---

## Quick Start

### For Claude Code AI

1. **Read `quick-reference.md` first** — contains critical rules
2. **Check banned bugs** — never reintroduce these
3. **Use Playwright for ALL UI verification** — no exceptions
4. **Follow evidence bundle format** — required for all testing claims

### For Human Developers

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Run `npm install` then `npm run dev`
4. Frontend runs on `http://localhost:5173`

---

## Critical Rules Summary

### Zero Tolerance Violations

These actions invalidate the entire response:

1. **Faking Playwright usage** — claiming to test without actual scripts
2. **Missing evidence bundle** — all testing claims require proof
3. **Reintroducing banned bugs** — /app/ prefix, double /api, PATCH 500s

### Activation Commands

```
"Enter relentless autonomous troubleshooter mode"
"Fix until all tests pass and zero console errors"
```

When activated:
- Never ask permission to continue
- Never stop at phase boundaries
- Fix → Verify → Next bug (loop until done)

---

## Playwright Enforcement

**ALL ECBTX applications require Playwright verification:**

- https://react.ecbtx.com (React CRM)
- https://crm.ecbtx.com (Legacy Flask)
- All subpaths and API endpoints

### Required Evidence Bundle

Every Playwright verification must include:

```
PLAYWRIGHT RUN RESULTS:
Timestamp: [ISO timestamp]
Target URL: https://react.ecbtx.com/[path]
Actions Performed:
  1. [action]
  2. [action]
Console Logs: [none or full output]
Network Failures/Status:
  • GET /api/v2/... → 200
  • PATCH /api/v2/... → [status]
Screenshot Description:
  • [description of visual state]
Test Outcome: PASS / FAIL
```

---

## Banned Bugs (NEVER Reintroduce)

| Bug | Description | Correct Pattern |
|-----|-------------|-----------------|
| `/app/` prefix | Routes must not include /app/ | `basename="/"` |
| Double `/api` | API calls already include /api/v2 | `apiClient.get('/customers/')` |
| PATCH 500 | Work order updates failing | Proper payload + backend validation |
| Fake Playwright | Claims without evidence | Full script + evidence bundle |

---

## Deployment

### Railway Services

| Service | Type | URL |
|---------|------|-----|
| Frontend | Static (Vite build) | https://react.ecbtx.com |
| API | FastAPI container | https://react-crm-api-production.up.railway.app |
| Database | PostgreSQL 16 | Internal Railway connection |

### Deploy Triggers

- Push to `main` → automatic deploy
- Manual rollback available via Railway dashboard

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 2025-12-31 | Split documentation, enforcement rules, Playwright requirements |
| v1.0 | 2025-12-29 | Initial combined claude.md |

---

## Support

- **Issues**: https://github.com/[your-org]/ecbtx-react-crm/issues
- **Frontend Logs**: Railway dashboard → react-crm-frontend
- **API Logs**: Railway dashboard → react-crm-api-production
