#!/bin/bash

# Ralph Wiggum Loop: "I'm helping!"
# Autonomous CRM improvement loop with Playwright validation

set -e

PROJECT_DIR="${1:-/path/to/mac-septic-crm}"
MAX_ITERATIONS=50
ITERATION=0
SUCCESS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

cd "$PROJECT_DIR" || exit 1

# The mega-prompt
IMPROVEMENT_PROMPT='You are improving the MAC Septic CRM Operations Command Center. Your mission is NOT complete until ALL changes are implemented, tested, and verified working.

## REQUIRED IMPROVEMENTS (implement ALL of these):

### 1. Dispatch Queue Priority Redesign
- Move dispatch queue to LEFT side of the layout (primary action zone)
- Make it visually dominant - this is where dispatchers live
- Add drag-and-drop from queue to map markers for instant assignment
- Unassigned count should be a large, clickable badge with pulse animation when > 0
- Color-code by priority: red=urgent, yellow=normal, green=scheduled

### 2. Fix the "Behind" Indicator
- When jobs are behind or utilization is low with techs on duty, this is a PROBLEM
- Make it visually loud: red background, larger text, pulse animation
- 0% utilization with 3 techs on duty should scream at the user
- Add tooltip explaining what "behind" means and suggested actions

### 3. KPI Cards Enhancement  
- Add trend arrows (up/down vs yesterday/last week)
- Click-to-drill-down on each metric
- Avg Completion Time showing "--" should show "No data" with proper styling
- Add sparkline mini-charts where appropriate

### 4. Map Interactivity Overhaul
- Drag job from queue onto technician marker = instant assignment
- Click technician marker = show their current jobs, availability, skills
- Draw service area polygons
- Traffic/routing overlay toggle
- Cluster markers that expand on zoom

### 5. Navigation Optimization
- Add "pinned favorites" section at top of sidebar for role-based quick access
- Collapse less-used sections by default
- Add keyboard shortcuts (g+d = dashboard, g+s = schedule, etc.)
- Breadcrumb trail for deep navigation

### 6. Real-time Enhancements
- WebSocket connection status indicator (not just RingCentral)
- Last-updated timestamps on all data cards
- Auto-refresh toggle with configurable interval
- Toast notifications for new jobs, completed jobs, alerts

## VALIDATION REQUIREMENTS:

After implementing, you MUST:
1. Run the dev server
2. Run Playwright tests that click EVERY button and try EVERY feature
3. Test drag-and-drop functionality
4. Test all keyboard shortcuts
5. Test responsive behavior (mobile, tablet, desktop)
6. Verify WebSocket connections work
7. Check console for errors
8. Fix ANY issues found
9. Re-test until ZERO errors

## PLAYWRIGHT TEST REQUIREMENTS:

Create/update tests that verify:
- All navigation items are clickable and load correct views
- Dispatch queue drag-and-drop works
- Map markers are interactive
- KPI cards are clickable and drill-down works
- Keyboard shortcuts function
- Mobile responsive behavior
- No console errors during any interaction
- All buttons have hover states and are accessible

## GIT WORKFLOW:

1. Create feature branch: feature/command-center-overhaul
2. Make atomic commits with clear messages
3. Push to GitHub after each major feature
4. Only merge to main when ALL tests pass

## COMPLETION CRITERIA:

You are NOT done until:
- [ ] All 6 improvement areas are implemented
- [ ] Playwright tests exist for every feature
- [ ] All tests pass with zero failures
- [ ] No console errors or warnings
- [ ] Code is pushed to GitHub
- [ ] You have personally verified each feature works by describing what you tested

DO NOT say you are complete until you have verified EVERY checkbox above.
START NOW. Work autonomously. Fix issues as you find them. Loop until perfect.'

# Playwright comprehensive test prompt
PLAYWRIGHT_PROMPT='Run comprehensive Playwright tests on the CRM application. 

Your tests MUST:
1. Navigate to every page in the sidebar
2. Click every button on each page
3. Test all form inputs
4. Test drag-and-drop on dispatch queue and map
5. Test keyboard shortcuts
6. Test responsive breakpoints (mobile/tablet/desktop)
7. Capture screenshots of any failures
8. Check browser console for errors after each action
9. Test WebSocket reconnection behavior
10. Verify all loading states resolve

Create a detailed report of:
- Total interactions tested
- Pass/fail count
- Any console errors found
- Screenshots of failures
- Suggested fixes for any issues

If ANY test fails, provide the exact fix needed.'

# Fix prompt for when things break
FIX_PROMPT='The previous Playwright test run found issues. 

Review the test output and error logs below, then:
1. Identify the root cause of each failure
2. Implement fixes
3. Re-run the failing tests to verify
4. Continue until all tests pass

Do not move on until every test passes. Be thorough.'

log "Starting Ralph Wiggum Loop for MAC Septic CRM improvements"
log "Project directory: $PROJECT_DIR"
log "Max iterations: $MAX_ITERATIONS"

# Ensure playwright is installed
if ! command -v npx &> /dev/null; then
    error "npx not found. Install Node.js first."
    exit 1
fi

# Initialize test results file
TEST_RESULTS="$PROJECT_DIR/test-results.log"
echo "" > "$TEST_RESULTS"

while [ $ITERATION -lt $MAX_ITERATIONS ] && [ "$SUCCESS" = false ]; do
    ITERATION=$((ITERATION + 1))
    log "═══════════════════════════════════════════════════════"
    log "ITERATION $ITERATION of $MAX_ITERATIONS"
    log "═══════════════════════════════════════════════════════"

    # Phase 1: Implement improvements
    log "Phase 1: Implementing improvements with Claude Code..."
    
    if [ $ITERATION -eq 1 ]; then
        # First iteration: full implementation prompt
        claude -p "$IMPROVEMENT_PROMPT" --allowedTools "Bash(git*),Bash(npm*),Bash(npx*),Bash(cat*),Bash(ls*),Bash(mkdir*),Bash(cp*),Bash(mv*),Read,Write,Edit,MultiEdit" 2>&1 | tee -a "$TEST_RESULTS"
    else
        # Subsequent iterations: fix mode
        ERRORS=$(tail -100 "$TEST_RESULTS")
        claude -p "$FIX_PROMPT

Previous errors:
$ERRORS" --allowedTools "Bash(git*),Bash(npm*),Bash(npx*),Bash(cat*),Bash(ls*),Bash(mkdir*),Bash(cp*),Bash(mv*),Read,Write,Edit,MultiEdit" 2>&1 | tee -a "$TEST_RESULTS"
    fi

    # Phase 2: Run Playwright tests
    log "Phase 2: Running Playwright validation..."
    
    # Start dev server in background if not running
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        log "Starting dev server..."
        npm run dev &
        DEV_PID=$!
        sleep 10  # Wait for server to start
    fi

    # Run playwright tests
    log "Executing Playwright test suite..."
    if npx playwright test --reporter=list 2>&1 | tee -a "$TEST_RESULTS"; then
        PLAYWRIGHT_EXIT=0
    else
        PLAYWRIGHT_EXIT=1
    fi

    # Phase 3: Claude analyzes test results and fixes issues
    log "Phase 3: Analyzing test results..."
    
    RECENT_OUTPUT=$(tail -200 "$TEST_RESULTS")
    
    ANALYSIS=$(claude -p "Analyze these Playwright test results. 
    
If ALL tests passed and there are no errors, respond with exactly: ALL_TESTS_PASSED

If there are ANY failures or errors, respond with: NEEDS_FIXES followed by a brief summary of what needs to be fixed.

Test output:
$RECENT_OUTPUT" --allowedTools "Read" 2>&1)

    echo "$ANALYSIS" >> "$TEST_RESULTS"

    if echo "$ANALYSIS" | grep -q "ALL_TESTS_PASSED"; then
        # Phase 4: Final verification - click everything
        log "Phase 4: Final comprehensive verification..."
        
        FINAL_CHECK=$(claude -p "Perform final verification of the MAC Septic CRM Command Center.

1. List every interactive element you can find
2. Describe the current state of each improvement area
3. Confirm each feature works as expected
4. Check for any console errors
5. Verify the code has been pushed to GitHub

If EVERYTHING is working perfectly, end your response with exactly: VERIFICATION_COMPLETE

If anything is missing or broken, end with: NEEDS_MORE_WORK and explain what." --allowedTools "Bash(git*),Bash(npm*),Bash(npx*),Bash(curl*),Read" 2>&1)

        echo "$FINAL_CHECK" >> "$TEST_RESULTS"

        if echo "$FINAL_CHECK" | grep -q "VERIFICATION_COMPLETE"; then
            SUCCESS=true
            success "═══════════════════════════════════════════════════════"
            success "ALL IMPROVEMENTS COMPLETE AND VERIFIED!"
            success "Total iterations: $ITERATION"
            success "═══════════════════════════════════════════════════════"
        else
            warn "Final verification found issues. Continuing loop..."
        fi
    else
        warn "Tests failed or found issues. Continuing to fix..."
    fi

    # Brief pause between iterations
    sleep 5
done

# Cleanup
if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
fi

if [ "$SUCCESS" = true ]; then
    log "Ralph Wiggum says: 'I'm a helper!'"
    exit 0
else
    error "Max iterations reached without complete success."
    error "Review $TEST_RESULTS for details."
    exit 1
fi
