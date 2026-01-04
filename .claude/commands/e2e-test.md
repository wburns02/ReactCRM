# /e2e-test - Comprehensive E2E Testing & Auto-Fix

Run exhaustive Playwright tests on every page, button, form, and API call. Automatically fix any issues found.

## What This Does

1. **Discovery Phase**: Extracts all routes from router config
2. **Auth Testing**: Tests login flow, protected routes
3. **Page-by-Page Testing**:
   - Load each page
   - Capture console errors
   - Click every button/link
   - Fill and submit every form
   - Test all CRUD operations
   - Verify data tables work
4. **Fix Issues**: When problems found, fixes them immediately
5. **Verify**: Re-tests after fixes, runs full test suite

## Usage

```bash
# Test local development
./scripts/e2e-test-fix-loop.sh --url http://localhost:5173

# Test production
./scripts/e2e-test-fix-loop.sh --prod-url https://react.ecbtx.com

# Report only (no fixes)
./scripts/e2e-test-fix-loop.sh --no-fix
```

## Or Run Directly with Claude

```bash
bash ./scripts/ralph-wiggum-runner.sh --prompt "Run comprehensive E2E tests on every page. Use Playwright to test every button, form, link, and API call. Fix any issues immediately. Don't stop until zero console errors and all tests pass." --max-iterations 50
```

## What Gets Tested

- ✅ All navigation links work
- ✅ All buttons are clickable and functional
- ✅ All forms submit correctly
- ✅ All API calls succeed (no 4xx/5xx)
- ✅ All modals open/close properly
- ✅ All tables load, sort, filter, paginate
- ✅ All CRUD operations work
- ✅ Zero console errors
- ✅ Zero network failures
- ✅ TypeScript builds cleanly
- ✅ Playwright test suite passes
