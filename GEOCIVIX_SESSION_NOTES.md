# Geocivix Permit Integration - Session Notes

**Date:** January 22, 2026
**Status:** Implementation Complete, Backend Deployment Pending
**Last Commit:** `6e1bbcc` - test(e2e): Add Geocivix proxy frontend verification tests

---

## Executive Summary

Built a complete integration for Williamson County, TN permits from the Geocivix portal. The integration includes:
- Backend proxy endpoints that authenticate with Geocivix on behalf of users
- Frontend utility to convert direct Geocivix URLs to proxy URLs
- E2E Playwright tests to verify functionality

**Current Blocker:** Backend geocivix endpoints return 404 because Railway hasn't installed the new `beautifulsoup4` dependency yet.

---

## The Problem We Solved

Users clicking permit document links in the CRM were redirected to the Geocivix portal (williamson.geocivix.com) where they received "permission denied" errors because they weren't authenticated with Geocivix.

**Solution:** Created backend proxy endpoints that:
1. Authenticate with Geocivix using stored credentials
2. Fetch the requested content (project, permit, or document)
3. Return the content to the user through our API

---

## Files Created

### Backend (Python/FastAPI)

| File | Purpose |
|------|---------|
| `backend/app/services/geocivix_service.py` | Core service for Geocivix authentication and HTML parsing |
| `backend/app/api/v2/endpoints/geocivix.py` | REST API endpoints (7 total) |

### Frontend (React/TypeScript)

| File | Purpose |
|------|---------|
| `src/utils/geocivixProxy.ts` | Utility to detect and convert Geocivix URLs to proxy URLs |
| `src/features/permits/GeocivixPermitsList.tsx` | Component to display synced Geocivix permits |

### E2E Tests (Playwright)

| File | Purpose |
|------|---------|
| `e2e/tests/geocivix-integration.spec.ts` | API integration tests |
| `e2e/tests/geocivix-proxy-frontend.spec.ts` | Frontend loading tests |
| `e2e/tests/geocivix-url-verification.spec.ts` | URL conversion verification |

### Documentation

| File | Purpose |
|------|---------|
| `GEOCIVIX_ANALYSIS.md` | API reverse-engineering documentation |
| `GEOCIVIX_INTEGRATION_PLAN.md` | Implementation plan |
| `GEOCIVIX_COMPLETE.md` | Completion summary |
| `GEOCIVIX_SESSION_NOTES.md` | This file - session handoff notes |

---

## Files Modified

| File | Change |
|------|--------|
| `backend/app/api/v2/api.py` | Added geocivix router with graceful import handling |
| `backend/requirements.txt` | Added `beautifulsoup4==4.12.2` and `lxml==4.9.3` |
| `src/features/permits/PermitDetailPage.tsx` | Updated to use proxy URLs for document links |
| `src/features/permits/components/PropertyDetailPanel.tsx` | Updated permit table links to use proxy URLs |

---

## API Endpoints Created

All endpoints require authentication and are prefixed with `/api/v2/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/geocivix/sync` | POST | Trigger manual sync from Geocivix portal |
| `/geocivix/permits` | GET | List synced permits |
| `/geocivix/status` | GET | Get portal sync status |
| `/geocivix/test-connection` | GET | Test Geocivix portal connectivity |
| `/geocivix/proxy/project/{project_id}` | GET | Proxy project page |
| `/geocivix/proxy/permit/{issuance_id}` | GET | Proxy permit page |
| `/geocivix/proxy/document/{viewer_id}` | GET | Proxy document/PDF |

---

## How the Proxy Works

### URL Detection (`src/utils/geocivixProxy.ts`)

```typescript
// Detects Geocivix URLs
isGeocivixUrl(url) // Returns true if URL contains 'geocivix.com' or '/secure/'

// Converts to proxy URL
getProxyUrl('/secure/project/?projectid=387856')
// Returns: '/api/v2/geocivix/proxy/project/387856'

getProxyUrl('/secure/permits/?issuanceid=123456')
// Returns: '/api/v2/geocivix/proxy/permit/123456'

getProxyUrl('/secure/utilities/viewer/?vid=789')
// Returns: '/api/v2/geocivix/proxy/document/789'
```

### Backend Proxy Flow

1. Frontend calls `/api/v2/geocivix/proxy/project/387856`
2. Backend authenticates with Geocivix (POST to user.scheme, then user.authenticate)
3. Backend fetches `https://williamson.geocivix.com/secure/project/?projectid=387856`
4. Backend returns HTML content to frontend

---

## Current Status

### What's Working

- [x] Frontend build passes (no TypeScript errors)
- [x] Proxy utility correctly converts URLs
- [x] Frontend loads without JS errors
- [x] 7 Playwright E2E tests pass
- [x] Backend code imports successfully locally
- [x] Code committed and pushed to GitHub

### What's Pending

- [ ] **Railway deployment needs to install beautifulsoup4**
  - The `/api/v2/geocivix/*` endpoints return 404
  - This is because the new dependency isn't installed yet
  - Once Railway redeploys with the new requirements.txt, it should work

---

## How to Verify Backend Deployment

Run this command to check if geocivix endpoints are available:

```bash
curl -s "https://react-crm-api-production.up.railway.app/api/v2/geocivix/status"
```

**Expected responses:**
- `{"detail":"Not Found"}` = Backend not deployed yet
- `{"detail":"Could not validate credentials"}` = Deployed, needs auth
- `{"portal_name":"Williamson County TN Geocivix",...}` = Fully working

You can also check the OpenAPI spec:
```bash
curl -s "https://react-crm-api-production.up.railway.app/openapi.json" | grep -c "geocivix"
```
- Returns `0` = Not deployed
- Returns `>0` = Deployed

---

## How to Force Railway Deployment

If the deployment is stuck, try:

1. **Make a trivial change and push:**
   ```bash
   echo "# Trigger rebuild" >> backend/requirements.txt
   git add backend/requirements.txt
   git commit -m "chore: trigger Railway rebuild"
   git push origin master
   ```

2. **Check Railway dashboard** for deployment status/errors

3. **Verify requirements.txt has the deps:**
   ```
   beautifulsoup4==4.12.2
   lxml==4.9.3
   ```

---

## Running Playwright Tests

```bash
cd C:\Users\Will\crm-work\ReactCRM

# Run all geocivix tests
npx playwright test e2e/tests/geocivix*.spec.ts --reporter=list

# Run specific test files
npx playwright test e2e/tests/geocivix-proxy-frontend.spec.ts
npx playwright test e2e/tests/geocivix-url-verification.spec.ts
npx playwright test e2e/tests/geocivix-integration.spec.ts
```

---

## Environment Variables Required

For the backend to authenticate with Geocivix:

```env
GEOCIVIX_USERNAME=willwalterburns@gmail.com
GEOCIVIX_PASSWORD=#Espn2025
```

These should be set in Railway environment variables.

---

## Git History (Recent Commits)

```
6e1bbcc test(e2e): Add Geocivix proxy frontend verification tests
e6e3a06 fix(backend): Make geocivix import graceful to not break other endpoints
5c86da5 feat(permits): Add Geocivix proxy endpoints for authenticated portal access
```

---

## Next Steps When You Return

1. **Check if backend deployed:**
   ```bash
   curl -s "https://react-crm-api-production.up.railway.app/api/v2/geocivix/status"
   ```

2. **If still 404, force redeploy:**
   - Check Railway dashboard for errors
   - Verify beautifulsoup4 is being installed
   - Try triggering a new deployment

3. **Once deployed, run full E2E tests:**
   ```bash
   npx playwright test e2e/tests/geocivix-integration.spec.ts --reporter=list
   ```

4. **Test manually in browser:**
   - Go to https://react.ecbtx.com/permits
   - Search for Tennessee permits
   - Click on a permit with document links
   - Verify PDF/Source links work without "permission denied"

---

## Troubleshooting

### Issue: Backend returns 404 for /geocivix/* endpoints

**Cause:** beautifulsoup4 not installed on Railway

**Solution:**
1. Check Railway build logs for pip install errors
2. Verify requirements.txt is correct
3. Try manual redeploy from Railway dashboard

### Issue: Import error for geocivix module

**Cause:** Missing bs4 dependency

**Solution:** The code now has graceful import handling (see `api.py` lines 9-16). The module will be skipped if bs4 isn't available, with a warning logged.

### Issue: Proxy returns HTML but links are broken

**Cause:** Relative URLs in proxied HTML still point to Geocivix

**Solution:** May need to rewrite URLs in the proxied HTML (future enhancement)

---

## Architecture Diagram

```
User Browser
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (react.ecbtx.com)                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ PermitDetailPage.tsx                                    ││
│  │   └── Uses getPermitDocumentUrl() / getPermitViewUrl()  ││
│  │       from src/utils/geocivixProxy.ts                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
     │
     │ API calls to /api/v2/geocivix/proxy/*
     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend (Railway)                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ backend/app/api/v2/endpoints/geocivix.py                ││
│  │   └── proxy_geocivix_project()                          ││
│  │   └── proxy_geocivix_permit()                           ││
│  │   └── proxy_geocivix_document()                         ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ backend/app/services/geocivix_service.py                ││
│  │   └── login() - Authenticates with Geocivix             ││
│  │   └── Uses httpx for async HTTP requests                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
     │
     │ Authenticated requests
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Geocivix Portal (williamson.geocivix.com/secure/)          │
│    └── Returns permit/project/document HTML                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Contact / Support

If you encounter issues:
1. Check this documentation first
2. Review the code in the files listed above
3. Check Railway deployment logs
4. Run Playwright tests for diagnostics

---

**Document saved:** `C:\Users\Will\crm-work\ReactCRM\GEOCIVIX_SESSION_NOTES.md`
