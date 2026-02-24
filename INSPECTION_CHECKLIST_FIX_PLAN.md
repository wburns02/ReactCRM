# Inspection Checklist Fix Plan
Generated: 2026-02-23

---

## Issue 1: Merge Redundant Valve/Spray Instructions in Step 14

**Files to change:**
- `/home/will/ReactCRM/src/features/technician-portal/inspectionSteps.ts`

**What to do:**
- In `INSPECTION_STEPS` aerobic step 14, update `detailedInstructions`:
  - KEEP: "Open distribution box"
  - KEEP: "Inspect check valve — should move freely"
  - KEEP: "Clean drip filter"
  - MERGE: Replace "For SPRAY systems: Check spray heads for proper output and coverage" and "Note any heads/emitters with poor or no output" with a single combined instruction: "For SPRAY systems: Check that heads spray at least 20–30 feet — if not, clean or replace clogged heads"
  - KEEP: "For DRIP systems: Check drip emitters and distribution lines"
  - REMOVE: "Check distribution uniformity" (absorbed into above)
  - Resulting in a clean 5-instruction step (down from 7)

**Expected Playwright assertions:**
- `expect(page.locator('text="Check Valve & Spray/Drip System"')).toBeVisible()` — step still exists
- `expect(page.locator('text="20–30 feet"')).toBeVisible()` — new criterion present
- Count of detailed instructions = 5 (not 7)
- No text "Note any heads" anywhere in checklist

---

## Issue 2: Fix PDF Not Attached to Email

**Files to change:**
- `/home/will/react-crm-api/app/api/v2/employee_portal.py` (add type field to attachment)
- `/home/will/react-crm-api/app/services/email_service.py` (add size check + better logging)
- `/home/will/ReactCRM/src/features/technician-portal/components/InspectionChecklist.tsx` (handle oversized PDFs)

**Backend changes:**
1. In `employee_portal.py` line 2043-2046, add `type: "application/pdf"` to attachment dict
2. Add size check: if base64 > 10MB, log warning and skip attachment (send email without PDF, note in body)
3. Add explicit `logger.info` when attachment is included vs not

**Frontend changes:**
1. In `handleEmailReport()`, if PDF blob exceeds 8MB (before base64), generate a lightweight version without photos for the email attachment (photos available in downloaded PDF)
2. Show clear success/failure toast with specific message about PDF attachment status

**Expected Playwright assertions:**
- After clicking "Email Report to Customer", a success toast appears
- `expect(page.locator('text="Report emailed"')).toBeVisible()`
- API response shows `report_sent: true`
- No fallback mailto window opened

---

## Issue 3: Reorder Summary/Report Sections

**Files to change:**
- `/home/will/ReactCRM/src/features/technician-portal/components/InspectionChecklist.tsx`
  - Summary view: lines 1836-2245 (screen rendering)
  - PDF generation: lines 325-1219 (`generateReportPDF` function)

**Screen summary reordering:**
Move the Priority Repairs block (currently inside AI Report at line 1941) to appear FIRST in the summary, before "Overall Condition". Extract it as a standalone card with red/warning styling.
Move the Weather Summary block (currently line 1866, 2nd section) to appear LAST, just above the "Send Report" section.

**PDF reordering:**
- Move `sectionHeader("Weather Conditions")` block (lines 517-610) to appear AFTER the Estimated Costs table (before signatures)
- Move the Priority Repairs section (lines 980-1011) to appear RIGHT AFTER the Condition Summary (before Key Readings), as the second section on page 1

**Expected Playwright assertions:**
- On summary page: first major section heading after the report title contains "Priority" or "Repairs"
- On summary page: Weather section appears after Steps Completed
- In PDF (if testable): Priority Repairs appears near top, Weather near bottom
