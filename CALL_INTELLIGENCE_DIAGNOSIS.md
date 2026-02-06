# Call Intelligence Dashboard Diagnosis

## Date: 2026-01-16

## Summary

The Call Intelligence Dashboard has significant data quality and feature gaps.

## Key Findings

### 1. Data Inconsistencies

| Metric | Value | Issue |
|--------|-------|-------|
| Total Calls in DB | 88 | Many are old/non-RC calls |
| Calls with Recordings | 10-18 | Only ~11-20% have recordings |
| Calls with Transcripts | 0 visible | Analysis status says 6, but not visible in API |
| Calls with Analysis | 0 visible | Same disconnect |
| Calls in last 48hrs | 8 | Recent RC activity exists |
| Calls without RC ID | 0 | All have RC IDs (good) |

### 2. Analysis Pipeline Status

From `/api/v2/ringcentral/calls/analysis-status`:
- total_calls_with_recordings: 18
- transcribed_calls: 6
- analyzed_calls: 6
- coverage_percentage: 33.3%
- status: "in_progress"

**CRITICAL**: Analysis status reports 6 transcribed/analyzed calls, but the calls list API returns 0 with transcription data. This is a data retrieval bug.

### 3. Dashboard KPIs

Current values from `/api/v2/ringcentral/calls/analytics`:
- Total Calls: 88
- Avg Quality Score: 77.8
- Avg Sentiment Score: 21.7
- Avg CSAT Prediction: 3.75
- Escalation Rate: 0%
- Positive/Neutral/Negative: 1/5/0

### 4. Missing Features

1. **No Transcript Viewer** - Cannot view transcripts anywhere in UI
2. **No "RingCentral Only" Filter** - Shows all calls including those without recordings
3. **No Recording Badge** - Hard to tell which calls have recordings
4. **No Source Indicator** - Can't distinguish RC calls from others

### 5. Root Causes Identified

1. **Analysis data not flowing to call list endpoint** - The `call_log_to_response` function may not be returning the new AI columns properly
2. **No filtering for calls with recordings** - Dashboard shows all 88 calls, not just the 18 with recordings
3. **Missing transcript API endpoint** - No way to fetch/display transcripts
4. **Frontend lacks transcript viewer component**

## Immediate Actions Required

1. Fix backend: Ensure analyzed call data is returned properly
2. Add "has_recording" filter to calls endpoint
3. Add transcript endpoint
4. Add frontend transcript viewer modal
5. Add "Calls with Recordings" badge/filter toggle

## Files to Modify

### Backend (react-crm-api)
- `app/api/v2/ringcentral.py` - Fix call_log_to_response, add filters
- `app/models/call_log.py` - Verify columns

### Frontend (ReactCRM)
- `src/features/call-intelligence/CallIntelligenceDashboard.tsx` - Add filters, transcript viewer
- `src/features/call-intelligence/api.ts` - Add transcript endpoint
- `src/features/call-intelligence/components/` - New TranscriptViewer component
