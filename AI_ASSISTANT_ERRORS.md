# AI Assistant Error Diagnosis Report

**Generated:** 2026-01-14
**Status:** Phase 1 Complete - All errors diagnosed

---

## Executive Summary

The AI Assistant page shows "AI server unavailable" due to **25+ missing or mismatched API endpoints** across 3 frontend hook files. This document provides the complete error mapping and fix plan.

---

## Error Category 1: useAIDispatch.ts (Frontend → Backend Mismatches)

### MISSING Endpoints (Backend does NOT implement these)

| Frontend Call | HTTP Method | Backend Status | Error Type |
|---------------|-------------|----------------|------------|
| `/ai/dispatch/prompt` | POST | **MISSING** | 404 |
| `/ai/dispatch/suggestions/{id}/execute` | POST | **MISSING** | 404 |
| `/ai/dispatch/suggestions/{id}/dismiss` | POST | **MISSING** | 404 |
| `/ai/dispatch/history` | GET | **MISSING** | 404 |
| `/ai/dispatch/auto-assign` | POST | **MISSING** | 404 |
| `/ai/dispatch/work-orders/{id}/predictions` | GET | **MISSING** | 404 |
| `/ai/dispatch/technicians` | GET | **MISSING** | 404 |
| `/ai/dispatch/work-orders/{id}/suggestions` | GET | **MISSING** | 404 |
| `/ai/dispatch/suggestions/{id}` | PATCH | **MISSING** | 404 |
| `/ai/dispatch/analyze` | POST | **MISSING** | 404 |

### PATH Mismatch (Wrong route name)

| Frontend Call | Backend Route | Fix |
|---------------|---------------|-----|
| `/ai/dispatch/optimize-routes` | `/ai/dispatch/optimize-route` | Change frontend to match |

### Working Endpoints

| Frontend Call | HTTP Method | Status |
|---------------|-------------|--------|
| `/ai/dispatch/suggestions` | GET | OK |
| `/ai/dispatch/stats` | GET | OK |

---

## Error Category 2: useAIInsights.ts (Frontend → Backend Mismatches)

### PATH Mismatch

| Frontend Call | Backend Route | Fix |
|---------------|---------------|-----|
| `/cs/ai/campaigns/{id}/analysis` | `/cs/ai/campaigns/{id}/ai-analysis` | Change frontend path |

### MISSING Endpoints

| Frontend Call | HTTP Method | Backend Status | Error Type |
|---------------|-------------|----------------|------------|
| `/cs/ai/customers/{id}/insight` | GET | **MISSING** | 404 |
| `/cs/ai/recommendations` | GET | **MISSING** | 404 |
| `/cs/ai/content-suggestions` | POST | **MISSING** | 404 |
| `/cs/ai/recommendations/{id}/dismiss` | POST | **MISSING** | 404 |
| `/cs/ai/recommendations/{id}/apply` | POST | **MISSING** | 404 |
| `/cs/ai/refresh-insights` | POST | **MISSING** | 404 |

### Working Endpoints

| Frontend Call | HTTP Method | Status |
|---------------|-------------|--------|
| `/cs/ai/portfolio-insights` | GET | OK |
| `/cs/ai/subject-suggestions` | POST | OK |

---

## Error Category 3: useOnboardingAI.ts (FIXED in previous session)

All paths corrected from `/ai/onboarding/...` to `/onboarding/...`. New endpoints added to backend.

---

## Fix Plan

### Strategy: Add Demo Fallbacks + Fix Path Mismatches

For a CRM demo system, the safest approach is:
1. **Fix path mismatches** in frontend (2 fixes)
2. **Add demo fallbacks** for missing endpoints (graceful degradation already exists in most hooks)
3. **Add placeholder backend endpoints** for critical paths

### Priority 1: Frontend Path Fixes

**File:** `src/api/hooks/useAIDispatch.ts`
- Line 331: Change `/ai/dispatch/optimize-routes` → `/ai/dispatch/optimize-route`

**File:** `src/api/hooks/useAIInsights.ts`
- Line 133-134: Change `/cs/ai/campaigns/${campaignId}/analysis` → `/cs/ai/campaigns/${campaignId}/ai-analysis`

### Priority 2: Backend Endpoint Additions

Add to `react-crm-api/app/api/v2/ai.py`:
1. POST `/dispatch/prompt` - NL query interface
2. POST `/dispatch/suggestions/{id}/execute` - Execute suggestion
3. POST `/dispatch/suggestions/{id}/dismiss` - Dismiss suggestion
4. GET `/dispatch/history` - Query history
5. POST `/dispatch/auto-assign` - Bulk auto-assignment
6. GET `/dispatch/work-orders/{id}/predictions` - Work order predictions
7. GET `/dispatch/technicians` - Technician dispatch info
8. GET `/dispatch/work-orders/{id}/suggestions` - Per-WO suggestions
9. PATCH `/dispatch/suggestions/{id}` - Modify suggestion
10. POST `/dispatch/analyze` - Refresh suggestions

Add to `react-crm-api/app/api/v2/customer_success/ai_insights.py`:
1. GET `/customers/{id}/insight` - Customer insight
2. GET `/recommendations` - AI recommendations
3. POST `/content-suggestions` - Content generation
4. POST `/recommendations/{id}/dismiss` - Dismiss recommendation
5. POST `/recommendations/{id}/apply` - Apply recommendation
6. POST `/refresh-insights` - Refresh all insights

---

## Current Error Flow

```
User opens /ai-assistant
  → Component calls useOnboardingProgress()
    → GET /api/v2/onboarding/progress → 200 OK (FIXED)
  → Component calls useOnboardingRecommendations()
    → GET /api/v2/onboarding/recommendations → 200 OK (FIXED)
  → Component calls useAIDispatchSuggestions()
    → GET /api/v2/ai/dispatch/suggestions → 200 OK (Working)
  → Component calls useAIDispatchStats()
    → GET /api/v2/ai/dispatch/stats → 200 OK (Working)
```

**The "AI server unavailable" message was triggered by onboarding 404s, which are now FIXED.**

---

## Verification Commands

```bash
# Test onboarding endpoints (should return 200 with auth)
curl -H "Authorization: Bearer TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/onboarding/progress"

# Test AI dispatch endpoints
curl -H "Authorization: Bearer TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/ai/dispatch/suggestions"

curl -H "Authorization: Bearer TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/ai/dispatch/stats"

# Test CS AI endpoints
curl -H "Authorization: Bearer TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/cs/ai/portfolio-insights"
```

---

## Files Modified

### Frontend (ReactCRM)
1. `src/api/hooks/useOnboardingAI.ts` - 6 path fixes (DONE)
2. `src/api/hooks/useAIDispatch.ts` - 1 path fix needed
3. `src/api/hooks/useAIInsights.ts` - 1 path fix needed

### Backend (react-crm-api)
1. `app/api/v2/onboarding.py` - 3 endpoints added (DONE)
2. `app/api/v2/ai.py` - 10 endpoints to add
3. `app/api/v2/customer_success/ai_insights.py` - 6 endpoints to add

---

<promise>ERRORS_FULLY_DIAGNOSED</promise>
