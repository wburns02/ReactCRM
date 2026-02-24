# Inspection Checklist Fix Analysis
Generated: 2026-02-23

---

## ISSUE 1: Redundant Valve/Spray Instructions in Step 14

**File:** `/home/will/ReactCRM/src/features/technician-portal/inspectionSteps.ts`

**Aerobic Step 14 (lines 406-429):**
Title: "Check Valve & Spray/Drip System"

Current detailedInstructions:
```
"Open distribution box",
"Inspect check valve — should move freely",
"Clean drip filter",
"For SPRAY systems: Check spray heads for proper output and coverage",
"For DRIP systems: Check drip emitters and distribution lines",
"Note any heads/emitters with poor or no output",    ← REDUNDANT with above spray line
"Check distribution uniformity",
```

**The Redundancy:** Instructions 4 ("Check spray heads for proper output and coverage") and 6 ("Note any heads/emitters with poor or no output") both say to check output quality. Line 6 is redundant. The user-described steps "Check valve in drip box" and "If spray is not spraying at least 20-30 feet, clean spray heads" correspond to the valve and spray instructions in this step. The "20-30 feet" measurement standard is missing from the current code.

**Fix:** Merge instruction 4 and 6 into one clear instruction with the 20-30 feet criterion. Remove "Note any heads/emitters with poor or no output" (absorbed into the spray instruction).

---

## ISSUE 2: PDF Not Attached to Email

**Frontend:** `/home/will/ReactCRM/src/features/technician-portal/components/InspectionChecklist.tsx`
- `handleEmailReport()` at line 1638
- `blobToBase64()` at line 2824 — returns `data:application/pdf;base64,...` data URL
- Sends `pdfBase64` in POST body to `/employee/jobs/{jobId}/inspection/save`

**API Hook:** `/home/will/ReactCRM/src/api/hooks/useTechPortal.ts` line 617-626
- Passes `pdf_base64: sendReport.pdfBase64` in JSON body

**Backend:** `/home/will/react-crm-api/app/api/v2/employee_portal.py` lines 2036-2054
- Reads `pdf_base64` from send_report dict
- Strips `data:...,` prefix
- Creates `attachments = [{"content": pdf_base64, "name": "...pdf"}]`
- Calls `email_svc.send_email(to, subject, body, html_body, attachments=attachments)`

**Email Service:** `/home/will/react-crm-api/app/services/email_service.py`
- `send_email()` at line 74 DOES accept `attachments` parameter
- Adds to Brevo payload as `payload["attachment"] = attachments`

**Root Cause(s):**
1. Missing `type: "application/pdf"` field in attachment dict — some Brevo API versions require it
2. No size check — a PDF with 12 photos can exceed Brevo's 10MB attachment limit, causing silent failure
3. When Brevo fails (returns non-201), `report_sent = False` → frontend falls back to mailto (user sees PDF download + manual email)
4. The frontend sends the FULL inspection state + PDF base64 in ONE request — very large payloads may cause issues

**Fix:**
- Add `type: "application/pdf"` to attachment dict in employee_portal.py
- Add PDF size check in email_service.py: warn if > 8MB (leave buffer below Brevo's 10MB limit)
- Add explicit logging to diagnose attachment failures
- In frontend: if PDF > 8MB after base64, send a photo-free version (lighter PDF) for the email attachment

---

## ISSUE 3: Section Ordering in Summary

**Summary View (screen shown to technician):**
File: `/home/will/ReactCRM/src/features/technician-portal/components/InspectionChecklist.tsx`

Current order (lines 1836-2245):
1. Overall Condition (line 1855)
2. **Weather Summary** (line 1866) ← SHOULD BE LAST
3. Manufacturer Info (line 1884)
4. AI-Powered Report (line 1889) containing:
   - Overall Assessment
   - Weather Impact
   - What to Expect
   - **Priority Repairs** (line 1941) ← SHOULD BE FIRST
   - Maintenance Schedule
   - Seasonal Tips
   - What to Tell Customer
5. Sludge/PSI (line ~2028)
6. Findings/Recommendations
7. Manufacturer Notes
8. Estimated Repairs
9. Steps Completed
10. Send Report

Desired order:
1. **Priority Repairs / Pumping Needed** ← MOVED TO TOP
2. Overall Condition
3. Manufacturer Info
4. AI-Powered Report (minus Priority Repairs since it's at top now)
5. ...remaining sections...
N. **Weather Information** ← MOVED TO BOTTOM (just above Send Report)

**PDF Generation:**
File: same component, `generateReportPDF()` function
Current PDF section order (lines 325-1219):
1. Cover page (header + customer info)
2. Condition Summary
3. **Weather Conditions** (line 518) ← SHOULD BE LAST
4. Key Readings
5. System Info
6. Inspection Results
7. Photo Documentation
8. AI Expert Analysis containing:
   - **Priority Repairs** (line 980) ← SHOULD BE NEAR TOP
9. Estimated Costs
10. Signature Lines

Fix: In PDF, move Weather to just before signature/footer. Move Priority Repairs section to appear just after Condition Summary (page 1).
