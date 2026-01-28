# Customer Quick Actions Diagnosis

## Status: BUGS CONFIRMED

## Playwright Reproduction Results

| Button | Exists | Click Behavior | Modal Opens | Form Submits | API Called |
|--------|--------|---------------|-------------|--------------|------------|
| Schedule Follow-up | ✅ | Nothing | ❌ | N/A | N/A |
| Send Email | ✅ | Nothing | ❌ | N/A | N/A |
| Log Activity | ✅ | Opens modal | ✅ | ❌ BROKEN | ❌ No POST |

## Root Cause Analysis

### 1. Schedule Follow-up Button
**Location:** `src/features/customers/components/CustomerHealthScore.tsx` lines 509-511
```tsx
<Button size="sm" variant="secondary">
  Schedule Follow-up
</Button>
```
**Root Cause:** Button is a placeholder - NO onClick handler at all.

**Fix Required:**
- Add state for schedule modal
- Add onClick to open modal
- Create/use ScheduleFollowupModal component
- Connect to customer update API (PATCH /customers/{id} with next_follow_up_date)

### 2. Send Email Button
**Location:** `src/features/customers/components/CustomerHealthScore.tsx` lines 512-514
```tsx
<Button size="sm" variant="secondary">
  Send Email
</Button>
```
**Root Cause:** Button is a placeholder - NO onClick handler at all.

**Fix Required:**
- Add state for email compose modal
- Add onClick to open modal
- Use existing EmailComposeModal component
- Connect to POST /communications/email/send endpoint

### 3. Log Activity Button
**Location:** `src/features/activities/components/ActivityTimeline.tsx` line 98
```tsx
<Button onClick={() => setIsFormOpen(true)}>Log Activity</Button>
```
**Root Cause:** Button DOES open modal correctly. The ActivityForm component at line 148-155 submits via `onSubmit={handleCreateActivity}` but the Playwright test showed "No POST to /activities detected" meaning the form submission isn't triggering the API call.

**Further Investigation Needed:** Check ActivityForm.tsx for the submit handler and useCreateActivity mutation.

## Files to Modify

1. `src/features/customers/components/CustomerHealthScore.tsx` - Wire Schedule Follow-up and Send Email
2. `src/features/activities/components/ActivityForm.tsx` - Fix form submission

## Backend Endpoints (Already Exist)

| Action | Endpoint | Method | Status |
|--------|----------|--------|--------|
| Schedule Follow-up | /api/v2/customers/{id} | PATCH | ✅ Available |
| Send Email | /api/v2/communications/email/send | POST | ✅ Available |
| Log Activity | /api/v2/activities | POST | ✅ Available |

## Next Steps

1. Fix CustomerHealthScore.tsx - wire both buttons with modals
2. Investigate ActivityForm.tsx submission issue
3. Test all three buttons work end-to-end
4. Commit and push to GitHub
5. Verify on deployed app with Playwright
