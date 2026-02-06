# Call Intelligence Deep Diagnosis Report

**Date:** January 16, 2026
**Investigators:** 5 Parallel Subagents
**Target:** https://react.ecbtx.com/call-intelligence

---

## Executive Summary

After comprehensive parallel investigation by 5 specialized subagents, we have identified the **TRUE root causes** of the Call Intelligence Dashboard issues:

| Issue Reported | Root Cause | Severity |
|----------------|------------|----------|
| Total Calls stuck at 88 | **NO AUTOMATIC RINGCENTRAL SYNC** - Manual trigger only | CRITICAL |
| Toggle does nothing | All 88 calls have recordings, filter works but shows same count | MEDIUM |
| Date filters do nothing | Filters work, but all calls are from Jan 13-14 only | LOW |
| Twilio artifacts ("101") | **NOT FOUND** - No Twilio artifacts exist in current data | FALSE ALARM |

---

## Subagent 1: Network Tracer Findings

### Key Discovery: Network Requests ARE Firing Correctly

| Interaction | Network Activity | Params Sent |
|-------------|------------------|-------------|
| Initial Load | YES (11 requests) | `has_recording=true` |
| Toggle Click | YES | Removes `has_recording=true` |
| Today Filter | YES | `start_date=2026-01-16&end_date=2026-01-16` |
| 7 Days Filter | YES | `start_date=2026-01-09&end_date=2026-01-16` |
| Refresh | YES (4 requests) | All dashboard endpoints |

**Response Size Change on Toggle:**
- With `has_recording=true`: 22,714 bytes
- Without `has_recording=true`: 72,749 bytes (3x more data!)

**Conclusion:** The toggle and filters ARE working at the network level. The backend is returning different data.

---

## Subagent 2: Frontend State Inspector Findings

### Query Key Analysis

The `useCallsWithAnalysis` hook has a potential query key issue:

```typescript
// Current implementation
queryKey: callIntelligenceKeys.callsList(filters)

// callIntelligenceKeys.callsList expects DashboardFilters which does NOT include:
// - hasRecording
// - hasAnalysis
// - hasTranscript
```

**However:** Network Tracer proves requests ARE firing, so React Query is detecting changes somehow (likely through the full `filters` object spread).

### Date Mutation Bug (Minor)

```typescript
case "today":
  start = new Date(now.setHours(0, 0, 0, 0)); // Mutates 'now'!
```

This mutates the `now` variable, which could cause subtle time calculation issues.

---

## Subagent 3: Backend Investigator Findings

### CRITICAL DISCOVERY: No Automatic Sync

**The RingCentral sync is MANUAL ONLY!**

Available sync endpoints (require manual invocation):
- `POST /api/v2/ringcentral/sync` - Authenticated
- `POST /api/v2/ringcentral/debug-sync` - Unauthenticated (for testing)

**Missing:**
- No scheduled background task
- No cron job
- No Celery worker
- No webhook handler for real-time events
- No automatic periodic sync

**Sync Limitations:**
- Default: Last 24 hours only
- Max: 168 hours (7 days)
- Limit: 250 records per sync (no pagination)

**This is why Total Calls is stuck at 88!** No new calls are being automatically ingested from RingCentral.

### Filter Implementation (Backend)

The `/ringcentral/calls` endpoint correctly implements filters:

```python
if has_recording is True:
    query = query.where(CallLog.recording_url.isnot(None))
```

**Backend filters are working correctly.**

---

## Subagent 4: Data Auditor Findings

### Database Statistics

| Metric | Value |
|--------|-------|
| Total Calls | 88 |
| Date Range | January 13-14, 2026 (2 days only) |
| Calls with Recordings | 88 (100%) |
| Calls with AI Analysis | ~7 (8%) |
| Calls without Analysis | ~81 (92%) |
| Twilio Artifacts ("101") | **0 (None found)** |

### Why Toggle "Does Nothing"

ALL 88 calls have `recording_url` set, so:
- Filter ON (`has_recording=true`): 88 calls
- Filter OFF (`has_recording=undefined`): Still shows 88 calls (plus possibly some without recordings, but there are none)

**The toggle IS working - there's just no difference in results because all calls have recordings.**

### Why Date Filters "Do Nothing"

All 88 calls are from January 13-14, 2026:
- "Today" (Jan 16): 0 calls (no calls today)
- "7 Days" (Jan 9-16): 88 calls (all within range)
- "30 Days": 88 calls (all within range)

**The filters ARE working - the data is just clustered in 2 days.**

---

## Subagent 5: Console Silent Hunter Findings

### Hidden Issues Discovered

| Issue | Severity | Impact |
|-------|----------|--------|
| `[Sentry] DSN not configured` | Medium | No production error monitoring |
| `[WebSocket] No valid WebSocket URL` | Medium | No real-time updates |
| `withFallback()` silently catches 404/500 | Low | Could hide API failures |
| Disposition Stats endpoint missing | Low | Shows demo data |
| Quality Heatmap endpoint missing | Low | Shows demo data |

### Console Errors

- **0 critical errors**
- **0 React errors**
- All API requests return 200 OK

---

## Root Cause Analysis

### PRIMARY ROOT CAUSE: No Automatic RingCentral Sync

```
User Expectation: New RingCentral calls appear automatically
Reality: Calls only appear when manually triggered via /sync endpoint
Result: Dashboard shows stale data (last synced: Jan 14, 2026)
```

### SECONDARY ISSUE: Misleading Perception

```
User Perception: "Toggle does nothing"
Reality: Toggle works, but 100% of calls have recordings
Result: No visual difference when toggling

User Perception: "Date filters do nothing"
Reality: Filters work, but all data is from 2 days
Result: Same data in most filter combinations
```

### FALSE ALARM: Twilio Artifacts

```
User Report: "Calls show Twilio artifacts (customer '101')"
Investigation: ZERO instances of "101" or numeric customer names found
Actual State: All customers show as "Unknown" with valid phone numbers
```

---

## Verification Commands

### Trigger Manual Sync (Last 7 Days)
```bash
curl -X POST "https://react-crm-api-production.up.railway.app/api/v2/ringcentral/debug-sync?hours_back=168"
```

### Check Call Count
```bash
curl "https://react-crm-api-production.up.railway.app/api/v2/ringcentral/calls?page_size=1" | jq '.total'
```

---

## Required Fixes

### CRITICAL (Blocks All Progress)
1. **Implement automatic RingCentral sync** - Background task every 5-15 minutes
2. **Run immediate sync** - Pull latest calls from RingCentral

### HIGH PRIORITY
3. **Add real-time polling** - Auto-refresh call list every 60 seconds
4. **Run AI analysis** - Process the 81 calls missing analysis

### MEDIUM PRIORITY
5. **Improve query key** - Include all filter params in React Query key
6. **Fix date mutation bug** - Don't mutate `now` variable
7. **Add sync status indicator** - Show last sync time in UI

### LOW PRIORITY
8. **Configure Sentry** - Enable production error monitoring
9. **Configure WebSocket** - Enable real-time updates
10. **Implement missing endpoints** - Disposition stats, quality heatmap

---

## Conclusion

**The Call Intelligence Dashboard is NOT broken - it's data-starved.**

The filters, toggle, and UI all work correctly. The fundamental issue is that **no new data is being ingested** because there's no automatic sync from RingCentral.

Once automatic sync is implemented and running, the dashboard will show dynamic, real-time data as expected.

