#!/usr/bin/env bash
#
# Self-Healing Runner Script
#
# This script orchestrates the self-healing system:
# 1. Sets up environment
# 2. Runs Playwright tests
# 3. Classifies failures
# 4. Applies SAFE remediations
# 5. Re-runs tests to verify fixes
# 6. Opens PR/issue for remaining failures
#
# Usage:
#   ./scripts/self_heal_run.sh [options]
#
# Options:
#   --dry-run       Run without applying fixes
#   --skip-llm      Skip LLM analysis (faster)
#   --projects=X    Test projects to run (health,contracts,modules)
#   --max-fixes=N   Maximum auto-fixes per run (default: 3)
#   --schedule=N    Override schedule interval (12 or 24 hours)
#
# Environment Variables:
#   HEAL_DRY_RUN=true       Same as --dry-run
#   HEAL_SKIP_LLM=true      Same as --skip-llm
#   HEAL_PROJECTS=health    Same as --projects
#   HEAL_MAX_FIXES=3        Same as --max-fixes
#   ANTHROPIC_API_KEY       Required for LLM fallback
#   OLLAMA_HOST             Ollama server URL (default: http://localhost:11434)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration defaults
DRY_RUN="${HEAL_DRY_RUN:-false}"
SKIP_LLM="${HEAL_SKIP_LLM:-false}"
PROJECTS="${HEAL_PROJECTS:-health,contracts,modules}"
MAX_FIXES="${HEAL_MAX_FIXES:-3}"
SCHEDULE_HOURS="${HEAL_SCHEDULE:-12}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --skip-llm)
            SKIP_LLM="true"
            shift
            ;;
        --projects=*)
            PROJECTS="${1#*=}"
            shift
            ;;
        --max-fixes=*)
            MAX_FIXES="${1#*=}"
            shift
            ;;
        --schedule=*)
            SCHEDULE_HOURS="${1#*=}"
            shift
            ;;
        --help|-h)
            head -40 "$0" | tail -35
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate run ID
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c 4 /dev/urandom | xxd -p)
RESULTS_DIR="healing-results/run-${RUN_ID}"

log_info "Self-Healing Run: ${RUN_ID}"
log_info "Configuration:"
log_info "  - Dry Run: ${DRY_RUN}"
log_info "  - Skip LLM: ${SKIP_LLM}"
log_info "  - Projects: ${PROJECTS}"
log_info "  - Max Fixes: ${MAX_FIXES}"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Step 1: Environment Setup
log_info "Step 1: Setting up environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v)
log_info "Node.js version: ${NODE_VERSION}"

# Check npm dependencies
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm ci
fi

# Check Playwright browsers
if ! npx playwright --version &> /dev/null; then
    log_info "Installing Playwright browsers..."
    npx playwright install --with-deps chromium
fi

# Step 2: Run Playwright Tests
log_info "Step 2: Running Playwright tests..."

TEST_ARGS="--reporter=json"
IFS=',' read -ra PROJECT_ARRAY <<< "$PROJECTS"
for project in "${PROJECT_ARRAY[@]}"; do
    TEST_ARGS="${TEST_ARGS} --project=${project}"
done

# Run tests and capture output
set +e
npx playwright test ${TEST_ARGS} > "${RESULTS_DIR}/test-output.json" 2>&1
TEST_EXIT_CODE=$?
set -e

# Parse test results
if [ -f "${RESULTS_DIR}/test-output.json" ]; then
    TOTAL_TESTS=$(jq -r '.stats.expected // 0' "${RESULTS_DIR}/test-output.json" 2>/dev/null || echo "0")
    PASSED_TESTS=$(jq -r '.stats.passed // 0' "${RESULTS_DIR}/test-output.json" 2>/dev/null || echo "0")
    FAILED_TESTS=$(jq -r '.stats.failed // 0' "${RESULTS_DIR}/test-output.json" 2>/dev/null || echo "0")
    SKIPPED_TESTS=$(jq -r '.stats.skipped // 0' "${RESULTS_DIR}/test-output.json" 2>/dev/null || echo "0")
else
    TOTAL_TESTS="unknown"
    PASSED_TESTS="unknown"
    FAILED_TESTS="unknown"
    SKIPPED_TESTS="unknown"
fi

log_info "Test Results:"
log_info "  - Total: ${TOTAL_TESTS}"
log_info "  - Passed: ${PASSED_TESTS}"
log_info "  - Failed: ${FAILED_TESTS}"
log_info "  - Skipped: ${SKIPPED_TESTS}"

# If all tests pass, we're done
if [ "${TEST_EXIT_CODE}" -eq 0 ]; then
    log_success "All tests passed! No healing needed."
    echo '{"status": "healthy", "fixes_applied": 0}' > "${RESULTS_DIR}/summary.json"
    exit 0
fi

# Step 3: Classify Failures
log_info "Step 3: Classifying failures..."

# Run the healing orchestrator
HEAL_ARGS=""
if [ "${DRY_RUN}" = "true" ]; then
    HEAL_ARGS="${HEAL_ARGS} --dry-run"
fi
if [ "${SKIP_LLM}" = "true" ]; then
    HEAL_ARGS="${HEAL_ARGS} --skip-llm"
fi
HEAL_ARGS="${HEAL_ARGS} --projects=${PROJECTS} --max-fixes=${MAX_FIXES}"

log_info "Running healing orchestrator with args: ${HEAL_ARGS}"

set +e
npm run heal -- ${HEAL_ARGS} > "${RESULTS_DIR}/healing-output.log" 2>&1
HEAL_EXIT_CODE=$?
set -e

# Check healing results
if [ -f "healing-results/latest.json" ]; then
    cp "healing-results/latest.json" "${RESULTS_DIR}/healing-summary.json"

    FIXES_APPLIED=$(jq -r '.fixesApplied // 0' "${RESULTS_DIR}/healing-summary.json")
    FIXES_FAILED=$(jq -r '.fixesFailed // 0' "${RESULTS_DIR}/healing-summary.json")
    STATUS=$(jq -r '.status // "unknown"' "${RESULTS_DIR}/healing-summary.json")

    log_info "Healing Results:"
    log_info "  - Status: ${STATUS}"
    log_info "  - Fixes Applied: ${FIXES_APPLIED}"
    log_info "  - Fixes Failed: ${FIXES_FAILED}"
else
    log_warn "No healing summary found"
    FIXES_APPLIED=0
fi

# Step 4: Re-run tests if fixes were applied
if [ "${FIXES_APPLIED}" -gt 0 ] && [ "${DRY_RUN}" != "true" ]; then
    log_info "Step 4: Re-running tests after fixes..."

    set +e
    npx playwright test ${TEST_ARGS} > "${RESULTS_DIR}/test-rerun-output.json" 2>&1
    RERUN_EXIT_CODE=$?
    set -e

    if [ "${RERUN_EXIT_CODE}" -eq 0 ]; then
        log_success "All tests pass after fixes!"
    else
        log_warn "Some tests still failing after fixes"
    fi
fi

# Step 5: Generate summary report
log_info "Step 5: Generating summary report..."

cat > "${RESULTS_DIR}/summary.md" << EOF
# Self-Healing Run Summary

**Run ID:** ${RUN_ID}
**Date:** $(date -Iseconds)

## Test Results

| Metric | Value |
|--------|-------|
| Total Tests | ${TOTAL_TESTS} |
| Passed | ${PASSED_TESTS} |
| Failed | ${FAILED_TESTS} |
| Skipped | ${SKIPPED_TESTS} |

## Healing Actions

| Metric | Value |
|--------|-------|
| Fixes Applied | ${FIXES_APPLIED} |
| Fixes Failed | ${FIXES_FAILED:-0} |
| Status | ${STATUS:-completed} |

## Artifacts

- Test output: \`${RESULTS_DIR}/test-output.json\`
- Healing log: \`${RESULTS_DIR}/healing-output.log\`
- Screenshots: \`test-results/\`
- Traces: \`test-results/\`

## Configuration

- Dry Run: ${DRY_RUN}
- Skip LLM: ${SKIP_LLM}
- Projects: ${PROJECTS}
- Max Fixes: ${MAX_FIXES}
EOF

log_success "Run complete! Summary saved to ${RESULTS_DIR}/summary.md"

# Return appropriate exit code
if [ "${TEST_EXIT_CODE}" -eq 0 ] || [ "${RERUN_EXIT_CODE:-1}" -eq 0 ]; then
    exit 0
else
    exit 1
fi
