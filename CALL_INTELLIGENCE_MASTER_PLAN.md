# Call Intelligence Master Fix Plan

**Date:** January 16, 2026
**Status:** Ready for Implementation
**Priority:** CRITICAL

---

## Phase 1: Immediate Data Refresh (30 minutes)

### 1.1 Trigger Manual Sync NOW
```bash
# Sync last 7 days of RingCentral calls
POST /api/v2/ringcentral/debug-sync?hours_back=168
```

### 1.2 Run AI Analysis Pipeline
- Process all calls with recordings that lack analysis
- Generate transcripts, sentiment scores, quality scores

---

## Phase 2: Backend - Automatic Sync (1-2 hours)

### 2.1 Add Background Sync Task

**File:** `react-crm-api/app/api/v2/ringcentral.py`

Create a sync scheduler that runs every 15 minutes:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()

async def auto_sync_ringcentral():
    """Background task to sync RingCentral calls every 15 minutes"""
    async with get_db() as db:
        # Sync last 2 hours of calls
        await sync_ringcentral_calls(db, hours_back=2)

# Start scheduler on app startup
@router.on_event("startup")
async def start_scheduler():
    scheduler.add_job(
        auto_sync_ringcentral,
        IntervalTrigger(minutes=15),
        id="ringcentral_sync",
        replace_existing=True
    )
    scheduler.start()
```

### 2.2 Add Sync Status Endpoint

**File:** `react-crm-api/app/api/v2/ringcentral.py`

```python
@router.get("/sync-status")
async def get_sync_status(db: DbSession):
    """Get last sync timestamp and status"""
    # Query most recent call's created_at
    result = await db.execute(
        select(CallLog.created_at)
        .order_by(CallLog.created_at.desc())
        .limit(1)
    )
    last_call = result.scalar()

    return {
        "last_sync": last_call.isoformat() if last_call else None,
        "auto_sync_enabled": True,
        "sync_interval_minutes": 15
    }
```

### 2.3 Fix Sync Pagination

**File:** `react-crm-api/app/api/v2/ringcentral.py`

Add pagination loop to handle >250 calls:

```python
async def sync_all_pages(hours_back: int):
    all_logs = []
    page = 1
    while True:
        logs = await ringcentral_service.get_call_log(
            date_from=date_from,
            per_page=250,
            page=page
        )
        all_logs.extend(logs)
        if len(logs) < 250:
            break
        page += 1
    return all_logs
```

---

## Phase 3: Frontend - Real-time Updates (1 hour)

### 3.1 Add Auto-Refresh to Dashboard

**File:** `ReactCRM/src/features/call-intelligence/CallIntelligenceDashboard.tsx`

```typescript
// Add auto-refresh every 60 seconds
useEffect(() => {
  const interval = setInterval(() => {
    queryClient.invalidateQueries({ queryKey: callIntelligenceKeys.all });
  }, 60_000);

  return () => clearInterval(interval);
}, [queryClient]);
```

### 3.2 Fix Query Key to Include All Filters

**File:** `ReactCRM/src/features/call-intelligence/api.ts`

Change line 382 from:
```typescript
queryKey: callIntelligenceKeys.callsList(filters),
```

To:
```typescript
queryKey: ["call-intelligence", "calls", filters] as const,
```

This ensures `hasRecording`, `hasAnalysis`, `hasTranscript` are included in the cache key.

### 3.3 Add Sync Status Indicator

**File:** `ReactCRM/src/features/call-intelligence/CallIntelligenceDashboard.tsx`

Add to header:
```typescript
const { data: syncStatus } = useQuery({
  queryKey: ["sync-status"],
  queryFn: () => apiClient.get("/ringcentral/sync-status").then(r => r.data),
  refetchInterval: 60_000
});

// In JSX
<span className="text-sm text-text-muted">
  Last sync: {syncStatus?.last_sync ? formatRelativeTime(syncStatus.last_sync) : "Never"}
</span>
```

### 3.4 Fix Date Calculation Bug

**File:** `ReactCRM/src/features/call-intelligence/CallIntelligenceDashboard.tsx`

Change line 89 from:
```typescript
start = new Date(now.setHours(0, 0, 0, 0));
```

To:
```typescript
const startDate = new Date(now);
startDate.setHours(0, 0, 0, 0);
start = startDate;
```

---

## Phase 4: Visual Feedback Improvements (30 minutes)

### 4.1 Add Recording Badge to Calls Table

Show visual indicator of which calls have recordings:

```typescript
<td className="py-3 px-2">
  {call.has_recording && (
    <Badge variant="outline" size="sm">
      <Mic className="w-3 h-3 mr-1" />
      Recording
    </Badge>
  )}
</td>
```

### 4.2 Add Filter Active Indicators

Show when filters are actively reducing results:

```typescript
{showRecordingsOnly && (
  <Badge variant="info" className="ml-2">
    Filtered: {calls.length} of {totalCalls}
  </Badge>
)}
```

### 4.3 Add Empty State for Date Filters

When date filter returns no results:

```typescript
{calls.length === 0 && filters.dateRange && (
  <div className="text-center py-8 text-text-muted">
    No calls found for selected date range.
    <Button variant="ghost" onClick={() => setFilters({})}>
      Clear filters
    </Button>
  </div>
)}
```

---

## Phase 5: Playwright Verification Tests

### Test Suite: `tests/call-intelligence-dynamic.e2e.spec.ts`

| Test # | Description | Expected Result |
|--------|-------------|-----------------|
| 1 | Login | Dashboard accessible |
| 2 | Initial total calls | Count recorded |
| 3 | Toggle "With Recordings" | API request fires, data updates |
| 4 | Toggle "All Calls" | Returns to full set |
| 5 | "Today" filter | Shows only today's calls |
| 6 | "7 Days" filter | Shows last week |
| 7 | "30 Days" filter | Shows full month |
| 8 | Wait 90s for new calls | Total >= previous |
| 9 | No "101" customer | No Twilio artifacts |
| 10 | No console errors | Clean console |
| 11 | No network 4xx/5xx | All requests succeed |

---

## Implementation Order

1. **FIRST**: Trigger manual sync to get fresh data
2. **SECOND**: Implement backend auto-sync
3. **THIRD**: Add frontend auto-refresh
4. **FOURTH**: Fix query key and date bug
5. **FIFTH**: Add visual indicators
6. **SIXTH**: Run full Playwright test suite

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Total Calls | 88 (static) | Dynamic (increases) |
| Last Sync Age | 2+ days | < 15 minutes |
| Toggle Response | Appears broken | Visual change |
| Date Filter Response | No visible change | Clear count change |
| Console Errors | 0 | 0 |
| Network Errors | 0 | 0 |

---

## Rollback Plan

If issues arise:
1. Disable auto-sync scheduler
2. Revert frontend to previous version
3. Manual sync can still be triggered

