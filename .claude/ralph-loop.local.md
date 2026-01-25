---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-01-25T14:09:15Z"
---

You are the Email System Final Fix Enforcer - Claude Opus - working in the ReactCRM frontend codebase and react-crm-api backend.

Critical persistent bugs in Email:
- GET /api/v2/email/conversations returns 404 Not Found
- POST /api/v2/communications/email/send returns 422 Unprocessable Content
- Previous fixes claimed success but did not verify real behavior

Your mission: Make the full email system work - inbox loads conversations and sending emails succeeds with 200 or 201.

Login credentials - must use in Playwright tests:
Username: will@macseptic.com
Password: #Espn2025

Email page URL: https://react.ecbtx.com/communications/email-inbox or /email

Max iterations: 80

Phased with maximum depth and brutal verification:

PHASE 1: DEEP CODEBASE DIVE AND ERROR REPRODUCTION
- Locate email components - EmailInbox.tsx, EmailComposeModal.tsx, useCommunications.ts
- Trace inbox load - what endpoint called for conversations? Why 404?
- Trace send - POST to /api/v2/communications/email/send - what payload sent? Why 422?
- Check backend routes - do /email/conversations and /communications/email/send exist? Correct paths?
- Check validation - what fields required for send? Missing or wrong types?
- Manually reproduce:
  1. Login with will@macseptic.com and #Espn2025
  2. Go to Email Inbox
  3. Observe conversations load - describe error or empty state
  4. Compose and send test email
  5. Observe send failure - describe toast or spinner
  6. Network tab - exact 404 and 422 responses and payloads
- Document findings in EMAIL_SYSTEM_FAILURE_DIAGNOSIS.md

When root causes clear - wrong paths, missing routes, validation mismatch - output: <promise>EMAIL_SYSTEM_ROOT_CAUSES_IDENTIFIED</promise>

PHASE 2: COMPREHENSIVE FIX PLAN
Create EMAIL_SYSTEM_PLAN.md with:
- Backend fixes - correct or add GET /email/conversations and POST /communications/email/send or unify paths
- Relax or fix validation for send - accept current frontend payload
- Return helpful error messages
- Frontend fixes - correct API paths in useCommunications.ts
- Proper error handling and display from 422
- Loading states for inbox
- Success feedback on send

PHASE 3: IMPLEMENTATION WITH MANUAL VERIFICATION
Implement incrementally.
After each change:
- Manually test:
  1. Login with will@macseptic.com and #Espn2025
  2. Go to Email Inbox
  3. Does conversations list load - conversations visible?
  4. Compose and send email
  5. Does it send successfully - success message? Appears in sent?
  6. Network - 200 on conversations GET and send POST?
  7. Test multiple sends
- Report honest results in PROGRESS_EMAIL_SYSTEM_FIX.md

PHASE 4: PLAYWRIGHT ENFORCEMENT
Write tests/email-system.e2e.spec.ts

Exact required tests:
1. Login with will@macseptic.com and #Espn2025
2. Navigate to Email Inbox page
3. Assert conversations load - list or threads visible
4. Assert GET conversations returns 200
5. Open compose
6. Fill to, subject, body with valid data
7. Click Send
8. Assert success confirmation
9. Assert POST send returns 200 or 201
10. Assert no 404 or 422 network errors
11. Assert no console errors throughout
12. Repeat send test

If any test fails - state exactly which and why - fix - repeat

Final success only when:
- Inbox loads conversations
- Emails send successfully with proper response
- No 404 or 422 on email endpoints
- User feedback clear
- Playwright tests pass on real run

Then - and only then - output exactly: <promise>EMAIL_SYSTEM_FULLY_WORKING</promise>

No more 404 or 422. Ralph makes email actually send and inbox load.
