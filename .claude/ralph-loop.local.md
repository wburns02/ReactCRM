---
active: true
iteration: 6
max_iterations: 0
completion_promise: null
started_at: "2026-01-26T14:40:18Z"
---

You are the Build Failure Terminator - Claude Opus - working in the ReactCRM frontend codebase.

Critical failure: Frontend builds are failing repeatedly with TypeScript error in PaymentPlansPage.tsx line 83.

Error details:
- TS2345 in src/features/billing/pages/PaymentPlansPage.tsx(83,5)
- Argument type mismatch in map or similar function
- Expected invoice type has optional customer_name?: string | undefined
- Actual data has customer_name: string | null | undefined
- Null not assignable to string | undefined

Your mission: Fix the TypeScript build error so frontend deploys successfully - no more failed builds.

Login credentials - for verification after deploy:
Username: will@macseptic.com
Password: #Espn2025

Max iterations: 80

Phased with maximum depth and honesty:

PHASE 1: DEEP CODEBASE DIVE AND ERROR REPRODUCTION
- Locate PaymentPlansPage.tsx - src/features/billing/pages/PaymentPlansPage.tsx
- Go to line 83 - identify the map or callback causing TS2345
- Trace invoice data source - likely from useInvoices or similar query
- Check invoice type definition - where defined? Optional customer_name?
- Check actual API response - does customer_name come as null?
- Reproduce locally if possible - describe type mismatch
- Document findings in BUILD_FAILURE_DIAGNOSIS.md

When root cause clear - type mismatch between API and local type, null vs undefined - output: <promise>BUILD_FAILURE_ROOT_CAUSE_IDENTIFIED</promise>

PHASE 2: TYPE-SAFE FIX PLAN
Create BUILD_FIX_PLAN.md with:
- Option 1: Update invoice interface to allow null for customer_name - customer_name: string | null | undefined
- Option 2: Normalize data in selector or mapper - replace null with undefined or empty string
- Option 3: Add non-null assertion or guard in map function
- Safe choice - prefer Option 1 or 2 to avoid runtime null issues
- Ensure consistent across related components
- Update any other affected types

PHASE 3: IMPLEMENTATION WITH BUILD VERIFICATION
Implement fix.
After change:
- Run local build - npm run build or vite build
- Describe: does it succeed? New errors?
- If deploy triggered - describe Railway build log outcome
- Report honest results in PROGRESS_BUILD_FIX.md

PHASE 4: PLAYWRIGHT POST-DEPLOY VERIFICATION
Write tests/build-success-verification.e2e.spec.ts

Exact required tests after successful deploy:
1. Login with will@macseptic.com and #Espn2025
2. Navigate to Payment Plans page
3. Assert page loads without error
4. Assert invoice list visible
5. Click create if available
6. Assert no console errors
7. Assert no type-related runtime errors

If build still fails - state exact new error - fix - repeat

Final success only when:
- Frontend builds succeed with exit code 0
- Deploy completes
- Payment Plans page loads correctly
- No type errors at runtime
- Playwright tests pass on real run

Then - and only then - output exactly: <promise>FRONTEND_BUILD_PERMANENTLY_FIXED</promise>

No more failed builds. Ralph makes TypeScript happy and deploys clean.
