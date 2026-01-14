#!/bin/bash
# E2E Test & Fix Loop v1.0
# Autonomous Playwright testing that finds and fixes issues
# Tests every page, button, form, and API call

set -euo pipefail

VERSION="1.0.0"

# Configuration
MAX_ITERATIONS="${E2E_MAX_ITERATIONS:-50}"
LOG_DIR="${E2E_LOG_DIR:-$HOME/.claude/e2e-logs}"
BASE_URL="${E2E_BASE_URL:-http://localhost:5173}"
PROD_URL="${E2E_PROD_URL:-}"
FIX_ISSUES="${E2E_FIX_ISSUES:-true}"
LOG_FORMAT="${E2E_LOG_FORMAT:-text}"

# Runtime state
SESSION_ID=""
SESSION_LOG=""
ITERATION=0
ISSUES_FOUND=0
ISSUES_FIXED=0
PAGES_TESTED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

#=============================================================================
# LOGGING
#=============================================================================

get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S"
}

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(get_timestamp)
    local color=""

    case "$level" in
        ERROR) color="$RED" ;;
        WARN)  color="$YELLOW" ;;
        INFO)  color="$BLUE" ;;
        SUCCESS) color="$GREEN" ;;
        TEST) color="$CYAN" ;;
    esac

    echo -e "${color}[$timestamp] [$level] $message${NC}"
    echo "[$timestamp] [$level] $message" >> "$SESSION_LOG"
}

#=============================================================================
# CLAUDE PROMPTS
#=============================================================================

generate_discovery_prompt() {
    cat << 'EOF'
PHASE 1: ROUTE DISCOVERY

Analyze the React application and extract ALL routes/pages that need testing.

1. Read src/routes/index.tsx (or equivalent router config)
2. Read src/components/layout/ for navigation items
3. List ALL accessible routes including:
   - Main pages
   - Sub-routes
   - Modal routes
   - Dynamic routes (use realistic IDs)

Output a JSON array of routes to test:
```json
{
  "routes": [
    {"path": "/dashboard", "name": "Dashboard", "auth_required": true},
    {"path": "/customers", "name": "Customers", "auth_required": true},
    ...
  ]
}
```

Then output: DISCOVERY_COMPLETE
EOF
}

generate_page_test_prompt() {
    local page_path="$1"
    local page_name="$2"
    local base_url="$3"

    cat << EOF
PHASE 2: DEEP PAGE TESTING - $page_name ($page_path)

Test this page EXHAUSTIVELY with Playwright. You MUST run actual Playwright code.

## Required Tests:

### 1. Page Load
\`\`\`javascript
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL console messages
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({type: msg.type(), text: msg.text()}));

  // Capture network failures
  const networkErrors = [];
  page.on('requestfailed', req => networkErrors.push({url: req.url(), error: req.failure()?.errorText}));

  // Navigate and wait
  await page.goto('${base_url}${page_path}', {waitUntil: 'networkidle'});

  // Screenshot
  await page.screenshot({path: 'test-${page_path//\//-}.png', fullPage: true});

  // Report findings
  console.log('Console errors:', consoleLogs.filter(l => l.type === 'error'));
  console.log('Network failures:', networkErrors);

  await browser.close();
})();
\`\`\`

### 2. Interactive Elements - Find and click EVERY:
- Button (button, [role="button"])
- Link (a[href])
- Tab ([role="tab"])
- Menu item ([role="menuitem"])
- Dropdown (select, [role="listbox"])
- Checkbox/Radio (input[type="checkbox"], input[type="radio"])

### 3. Forms - For each form:
- Fill all fields with valid test data
- Submit and verify success
- Test validation (empty fields, invalid data)
- Verify error messages display correctly

### 4. Tables/Lists - For each data table:
- Verify data loads
- Test sorting (click headers)
- Test filtering (if available)
- Test pagination (if available)
- Test row actions (edit, delete, view)

### 5. Modals/Dialogs - For each modal trigger:
- Open the modal
- Verify content renders
- Test form submission (if applicable)
- Test close button
- Test escape key
- Test click outside

### 6. API Verification:
- All GET requests return 200
- All POST/PATCH/DELETE work correctly
- No 4xx or 5xx errors

## Output Format:
\`\`\`
PAGE: $page_name ($page_path)
STATUS: PASS | FAIL
CONSOLE_ERRORS: [list any errors]
NETWORK_FAILURES: [list any failures]
BROKEN_ELEMENTS: [list any non-functional buttons/links]
ISSUES_FOUND: [detailed list]
\`\`\`

If issues found and FIX_ISSUES=true:
1. Identify the root cause in the code
2. Fix it immediately
3. Re-run the test to verify
4. Commit the fix

When done with this page, output: PAGE_TEST_COMPLETE
EOF
}

generate_fix_prompt() {
    local issue="$1"

    cat << EOF
ISSUE FIX MODE

An issue was found during E2E testing:
$issue

Your task:
1. Locate the relevant source file(s)
2. Understand the root cause
3. Implement a fix
4. Verify with a quick Playwright test
5. Commit the fix with message: "fix: [description of fix]"

After fixing, output: FIX_COMPLETE
If unable to fix, output: FIX_FAILED: [reason]
EOF
}

generate_full_test_prompt() {
    local base_url="$1"

    cat << 'EOF'
COMPREHENSIVE E2E TEST & FIX MODE

You are an autonomous QA engineer. Test EVERY aspect of this React application and fix ALL issues.

## PHASE 1: Discovery
1. Read router config to get all routes
2. Read navigation components for all menu items
3. Create a test plan

## PHASE 2: Authentication
1. Test login flow
2. Store auth token/cookies
3. Verify protected routes redirect when not logged in

## PHASE 3: Page-by-Page Testing
For EACH page in the application:

### A. Load Test
```javascript
// Use Playwright to navigate
await page.goto(url);
await page.waitForLoadState('networkidle');

// Capture console
page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });

// Screenshot for evidence
await page.screenshot({path: `screenshots/${pageName}.png`});
```

### B. Element Interaction
- Click EVERY button and verify response
- Click EVERY link and verify navigation
- Open EVERY dropdown and select options
- Toggle EVERY checkbox/switch
- Expand EVERY accordion/collapsible

### C. Form Testing
- Fill forms with valid data → verify success
- Fill forms with invalid data → verify validation errors
- Submit empty forms → verify required field errors
- Test field-level validation (email, phone, etc.)

### D. CRUD Operations
For each entity (customers, work orders, etc.):
- CREATE: Fill form, submit, verify in list
- READ: Click item, verify details display
- UPDATE: Edit item, save, verify changes
- DELETE: Delete item, verify removed

### E. Data Tables
- Verify data loads (no empty states with data)
- Test column sorting
- Test search/filter
- Test pagination
- Test row selection
- Test bulk actions

### F. Real-time Features
- Test WebSocket connections (if any)
- Test notifications
- Test auto-refresh

## PHASE 4: Cross-Cutting Concerns
- Responsive design (test at 1920px, 1024px, 768px, 375px)
- Dark mode (if available)
- Accessibility (keyboard navigation, ARIA)
- Performance (no pages taking >3s to load)

## PHASE 5: Fix Issues
When you find ANY issue:
1. Document it clearly
2. Find the source code
3. Fix it immediately
4. Re-test to verify
5. Commit: "fix: [description]"
6. Continue testing

## Output Requirements
After EACH page, report:
```
=== PAGE REPORT: [Page Name] ===
URL: [url]
Status: PASS/FAIL
Console Errors: [count] - [details if any]
Network Errors: [count] - [details if any]
Broken Elements: [list]
Issues Fixed: [list]
Screenshots: [paths]
```

## Completion
When ALL pages pass with zero errors:
1. Run `npm run build` to verify no TS errors
2. Run `npx playwright test` to run full test suite
3. Commit any remaining fixes
4. Output: ALL_TESTS_PASS

NEVER STOP until the entire application works flawlessly.
EOF
}

#=============================================================================
# TEST EXECUTION
#=============================================================================

run_claude_test() {
    local prompt="$1"
    local output_file="$LOG_DIR/claude_output_${SESSION_ID}_iter${ITERATION}.txt"

    log "INFO" "Running Claude with test prompt..."

    if claude --dangerously-skip-permissions -p "$prompt" 2>&1 | tee "$output_file"; then
        return 0
    else
        return $?
    fi
}

check_completion() {
    local output="$1"

    if echo "$output" | grep -qF "ALL_TESTS_PASS"; then
        return 0
    fi
    return 1
}

#=============================================================================
# MAIN LOOP
#=============================================================================

run_e2e_loop() {
    local test_url="${PROD_URL:-$BASE_URL}"

    log "INFO" "Starting E2E Test & Fix Loop v$VERSION"
    log "INFO" "Target URL: $test_url"
    log "INFO" "Fix issues: $FIX_ISSUES"
    log "INFO" "Max iterations: $MAX_ITERATIONS"

    # Generate the comprehensive test prompt
    local prompt=$(generate_full_test_prompt "$test_url")

    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        ITERATION=$((ITERATION + 1))

        log "INFO" "=== E2E Test Iteration $ITERATION ==="

        local output_file="$LOG_DIR/output_${SESSION_ID}_iter${ITERATION}.txt"

        # Run Claude with the test prompt
        if [ $ITERATION -eq 1 ]; then
            # First iteration: full prompt
            run_claude_test "$prompt" > "$output_file" 2>&1
        else
            # Subsequent iterations: continue prompt
            local continue_prompt="Continue testing from where you left off. Review previous output and test remaining pages. When completely done, output ALL_TESTS_PASS."
            run_claude_test "$continue_prompt" > "$output_file" 2>&1
        fi

        local output=$(cat "$output_file")

        # Check for completion
        if check_completion "$output"; then
            log "SUCCESS" "All E2E tests passed!"
            log "INFO" "Total iterations: $ITERATION"
            return 0
        fi

        # Count issues in output
        local errors=$(echo "$output" | grep -c "FAIL\|ERROR\|error:" || echo "0")
        if [ "$errors" -gt 0 ]; then
            log "WARN" "Found $errors potential issues - Claude will fix and continue"
        fi

        sleep 2
    done

    log "WARN" "Max iterations reached without full completion"
    return 1
}

#=============================================================================
# HELP
#=============================================================================

show_help() {
    cat << EOF
E2E Test & Fix Loop v$VERSION

Autonomous Playwright testing that finds and fixes issues in React applications.

USAGE:
    e2e-test-fix-loop.sh [options]

OPTIONS:
    --url <url>              Base URL to test (default: http://localhost:5173)
    --prod-url <url>         Production URL to test (overrides --url)
    --max-iterations <num>   Maximum test iterations (default: 50)
    --no-fix                 Report issues but don't fix them
    --log-format <format>    Log format: text or json (default: text)
    -h, --help               Show this help message
    -v, --version            Show version

ENVIRONMENT VARIABLES:
    E2E_BASE_URL             Base URL for testing
    E2E_PROD_URL             Production URL (takes precedence)
    E2E_MAX_ITERATIONS       Maximum iterations
    E2E_FIX_ISSUES           true/false - whether to auto-fix issues
    E2E_LOG_DIR              Log directory

EXAMPLES:
    # Test local dev server
    e2e-test-fix-loop.sh --url http://localhost:5173

    # Test production
    e2e-test-fix-loop.sh --prod-url https://react.ecbtx.com

    # Test without fixing (report only)
    e2e-test-fix-loop.sh --no-fix

    # Quick test with fewer iterations
    e2e-test-fix-loop.sh --max-iterations 10

EOF
}

#=============================================================================
# ARGUMENT PARSING
#=============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --url)
                BASE_URL="$2"
                shift 2
                ;;
            --prod-url)
                PROD_URL="$2"
                shift 2
                ;;
            --max-iterations)
                MAX_ITERATIONS="$2"
                shift 2
                ;;
            --no-fix)
                FIX_ISSUES="false"
                shift
                ;;
            --log-format)
                LOG_FORMAT="$2"
                shift 2
                ;;
            -v|--version)
                echo "e2e-test-fix-loop v$VERSION"
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

#=============================================================================
# MAIN
#=============================================================================

main() {
    parse_args "$@"

    # Check dependencies
    if ! command -v claude &> /dev/null; then
        echo "Error: claude CLI not found"
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        echo "Error: npx not found (need Node.js)"
        exit 1
    fi

    # Setup
    mkdir -p "$LOG_DIR"
    SESSION_ID=$(date +%Y%m%d_%H%M%S)_$$
    SESSION_LOG="$LOG_DIR/e2e_session_$SESSION_ID.log"

    log "INFO" "Session ID: $SESSION_ID"
    log "INFO" "Logs: $SESSION_LOG"

    # Run the loop
    run_e2e_loop
}

main "$@"
