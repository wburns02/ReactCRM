#!/usr/bin/env bash
###############################################################################
# self_heal_run.sh
#
# Single entrypoint for CI + cron self-healing runs.
#
# Steps:
#   1. Start Docker Compose stack (with test overrides)
#   2. Run unit tests + security scanners
#   3. Run Playwright E2E with trace ON
#   4. Collect artifacts into artifacts/YYYYMMDD_HHMMSS/
#   5. Call triage on failures
#   6. Apply safe remediations
#   7. Rerun verification after remediation
#   8. Exit non-zero if unresolved failures remain
#
# Usage:
#   ./scripts/self_heal_run.sh [options]
#
# Options:
#   --dry-run         Do not apply fixes
#   --skip-docker     Skip Docker Compose startup
#   --skip-scanners   Skip security scanners
#   --max-attempts=N  Max remediation attempts (default: 2)
#   --projects=X      Playwright projects (default: all)
#
# Environment:
#   TWILIO_MOCK=true          Force Twilio mock mode
#   ANTHROPIC_API_KEY         Required for LLM fallback
#   OLLAMA_HOST               Local LLM endpoint
#   HEAL_SCHEDULE_HOURS       12 or 24 (for cron config)
###############################################################################

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

###############################################################################
# Configuration
###############################################################################
DRY_RUN="${DRY_RUN:-false}"
SKIP_DOCKER="${SKIP_DOCKER:-false}"
SKIP_SCANNERS="${SKIP_SCANNERS:-false}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-2}"
PROJECTS="${PROJECTS:-health,contracts,security}"
TWILIO_MOCK="${TWILIO_MOCK:-true}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)        DRY_RUN="true"; shift ;;
        --skip-docker)    SKIP_DOCKER="true"; shift ;;
        --skip-scanners)  SKIP_SCANNERS="true"; shift ;;
        --max-attempts=*) MAX_ATTEMPTS="${1#*=}"; shift ;;
        --projects=*)     PROJECTS="${1#*=}"; shift ;;
        --help|-h)        head -50 "$0" | tail -45; exit 0 ;;
        *)                log_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Generate run ID and artifact directory
RUN_ID=$(date +%Y%m%d_%H%M%S)
ARTIFACT_DIR="$PROJECT_ROOT/artifacts/$RUN_ID"
mkdir -p "$ARTIFACT_DIR"/{traces,screenshots,logs,reports}

# Export for child processes
export ARTIFACT_DIR
export RUN_ID
export TWILIO_MOCK
export PW_OUTPUT_DIR="$ARTIFACT_DIR"

log_info "=============================================="
log_info "Self-Healing Run: $RUN_ID"
log_info "=============================================="
log_info "Config: dry_run=$DRY_RUN, max_attempts=$MAX_ATTEMPTS"
log_info "Projects: $PROJECTS"
log_info "Artifacts: $ARTIFACT_DIR"
echo ""

###############################################################################
# Step 1: Start Docker Compose stack
###############################################################################
log_step "Step 1: Docker Compose stack"

if [ "$SKIP_DOCKER" = "true" ]; then
    log_warn "Skipping Docker Compose (--skip-docker)"
else
    # Detect docker compose command
    if docker compose version &> /dev/null; then
        DC="docker compose"
    else
        DC="docker-compose"
    fi

    # Use override file for test configuration
    DC_FILES="-f docker-compose.yml"
    if [ -f "docker-compose.override.yml" ]; then
        DC_FILES="$DC_FILES -f docker-compose.override.yml"
    fi

    log_info "Starting services with: $DC $DC_FILES up -d"
    $DC $DC_FILES up -d --wait --timeout 120 2>&1 | tee "$ARTIFACT_DIR/logs/docker-compose.log"

    if [ $? -ne 0 ]; then
        log_error "Docker Compose failed to start"
        exit 1
    fi
    log_success "Docker stack is up"

    # Wait for health checks
    sleep 5
fi

###############################################################################
# Step 2: Run security scanners
###############################################################################
log_step "Step 2: Security scanners"

SCANNER_FAILED=0

if [ "$SKIP_SCANNERS" = "true" ]; then
    log_warn "Skipping security scanners (--skip-scanners)"
else
    # npm audit
    log_info "Running npm audit..."
    npm audit --json > "$ARTIFACT_DIR/reports/npm-audit.json" 2>&1 || true
    npm audit --audit-level=high 2>&1 | tee "$ARTIFACT_DIR/logs/npm-audit.log" || {
        log_warn "npm audit found issues"
        SCANNER_FAILED=1
    }

    # pip-audit (if Python deps exist)
    if [ -f "requirements.txt" ] || [ -f "requirements-troubleshooting.txt" ]; then
        log_info "Running pip-audit..."
        pip-audit --format=json > "$ARTIFACT_DIR/reports/pip-audit.json" 2>&1 || true
        pip-audit 2>&1 | tee "$ARTIFACT_DIR/logs/pip-audit.log" || {
            log_warn "pip-audit found issues"
        }
    fi

    # bandit (Python security)
    if [ -d "scripts" ]; then
        log_info "Running bandit..."
        bandit -r scripts -f json -o "$ARTIFACT_DIR/reports/bandit.json" 2>&1 || true
        bandit -r scripts -ll 2>&1 | tee "$ARTIFACT_DIR/logs/bandit.log" || {
            log_warn "bandit found issues"
        }
    fi
fi

###############################################################################
# Step 3: Run Playwright E2E tests
###############################################################################
log_step "Step 3: Playwright E2E tests"

# Build Playwright project args
PW_ARGS="--reporter=json,html,list"
IFS=',' read -ra PROJ_ARRAY <<< "$PROJECTS"
for proj in "${PROJ_ARRAY[@]}"; do
    PW_ARGS="$PW_ARGS --project=$proj"
done

log_info "Running: npx playwright test $PW_ARGS"

# Run Playwright with trace enabled
PLAYWRIGHT_JSON="$ARTIFACT_DIR/reports/playwright.json"
set +e
npx playwright test $PW_ARGS \
    --trace=on \
    --output="$ARTIFACT_DIR/test-results" \
    2>&1 | tee "$ARTIFACT_DIR/logs/playwright.log"
PW_EXIT=$?
set -e

# Move Playwright artifacts
if [ -d "test-results" ]; then
    cp -r test-results/* "$ARTIFACT_DIR/test-results/" 2>/dev/null || true
fi
if [ -d "playwright-report" ]; then
    cp -r playwright-report "$ARTIFACT_DIR/reports/playwright-html" 2>/dev/null || true
fi

# Extract JSON report
if [ -f "test-results/results.json" ]; then
    cp "test-results/results.json" "$PLAYWRIGHT_JSON"
fi

if [ $PW_EXIT -eq 0 ]; then
    log_success "All Playwright tests passed!"
    TESTS_PASSED=true
else
    log_warn "Playwright tests failed (exit code: $PW_EXIT)"
    TESTS_PASSED=false
fi

###############################################################################
# Step 4: Triage failures
###############################################################################
log_step "Step 4: Triage failures"

TRIAGE_REPORT="$ARTIFACT_DIR/reports/triage.json"

if [ "$TESTS_PASSED" = "true" ] && [ "$SCANNER_FAILED" -eq 0 ]; then
    log_success "No failures to triage"
    echo '{"status": "healthy", "failures": [], "buckets": {}}' > "$TRIAGE_REPORT"
else
    log_info "Running triage analysis..."
    python3 "$SCRIPT_DIR/triage.py" \
        --artifact-dir="$ARTIFACT_DIR" \
        --output="$TRIAGE_REPORT" \
        2>&1 | tee "$ARTIFACT_DIR/logs/triage.log"

    if [ -f "$TRIAGE_REPORT" ]; then
        log_success "Triage report: $TRIAGE_REPORT"
        # Show summary
        python3 -c "
import json
with open('$TRIAGE_REPORT') as f:
    t = json.load(f)
    print(f\"  Status: {t.get('status', 'unknown')}\")
    print(f\"  Failures: {len(t.get('failures', []))}\")
    for bucket, items in t.get('buckets', {}).items():
        print(f\"  - {bucket}: {len(items)}\")
" 2>/dev/null || true
    fi
fi

###############################################################################
# Step 5: Apply safe remediations
###############################################################################
log_step "Step 5: Apply safe remediations"

REMEDIATION_REPORT="$ARTIFACT_DIR/reports/remediation.json"
ATTEMPT=0
RESOLVED=false

if [ "$TESTS_PASSED" = "true" ]; then
    log_success "No remediation needed"
    echo '{"applied": [], "blocked": [], "status": "healthy"}' > "$REMEDIATION_REPORT"
    RESOLVED=true
elif [ "$DRY_RUN" = "true" ]; then
    log_warn "Dry run mode - skipping remediation"
    echo '{"applied": [], "blocked": [], "status": "dry_run"}' > "$REMEDIATION_REPORT"
else
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$RESOLVED" = "false" ]; do
        ATTEMPT=$((ATTEMPT + 1))
        log_info "Remediation attempt $ATTEMPT of $MAX_ATTEMPTS..."

        python3 "$SCRIPT_DIR/repair_orchestrator.py" \
            --triage-report="$TRIAGE_REPORT" \
            --artifact-dir="$ARTIFACT_DIR" \
            --attempt=$ATTEMPT \
            --output="$REMEDIATION_REPORT" \
            2>&1 | tee -a "$ARTIFACT_DIR/logs/remediation.log"

        # Check if any fixes were applied
        FIXES_APPLIED=$(python3 -c "
import json
with open('$REMEDIATION_REPORT') as f:
    r = json.load(f)
    print(len(r.get('applied', [])))
" 2>/dev/null || echo "0")

        if [ "$FIXES_APPLIED" = "0" ]; then
            log_info "No safe fixes could be applied"
            break
        fi

        log_info "Applied $FIXES_APPLIED fixes, re-running verification..."

        # Re-run tests to verify fix
        set +e
        npx playwright test $PW_ARGS \
            --trace=on \
            --output="$ARTIFACT_DIR/test-results-verify-$ATTEMPT" \
            2>&1 | tee "$ARTIFACT_DIR/logs/playwright-verify-$ATTEMPT.log"
        VERIFY_EXIT=$?
        set -e

        if [ $VERIFY_EXIT -eq 0 ]; then
            log_success "Verification passed after remediation!"
            RESOLVED=true
        else
            log_warn "Verification failed, will retry if attempts remain"
            # Re-run triage for next iteration
            python3 "$SCRIPT_DIR/triage.py" \
                --artifact-dir="$ARTIFACT_DIR" \
                --output="$TRIAGE_REPORT" \
                2>&1 >> "$ARTIFACT_DIR/logs/triage.log"
        fi
    done
fi

###############################################################################
# Step 6: Generate final report
###############################################################################
log_step "Step 6: Generate final report"

FINAL_REPORT="$ARTIFACT_DIR/reports/final_summary.json"

python3 << EOF
import json
from datetime import datetime

summary = {
    "run_id": "$RUN_ID",
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "resolved": $( [ "$RESOLVED" = "true" ] && echo "true" || echo "false" ),
    "dry_run": $( [ "$DRY_RUN" = "true" ] && echo "true" || echo "false" ),
    "attempts": $ATTEMPT,
    "max_attempts": $MAX_ATTEMPTS,
    "projects": "$PROJECTS".split(","),
    "artifacts_dir": "$ARTIFACT_DIR",
}

# Load triage if exists
try:
    with open("$TRIAGE_REPORT") as f:
        summary["triage"] = json.load(f)
except:
    summary["triage"] = None

# Load remediation if exists
try:
    with open("$REMEDIATION_REPORT") as f:
        summary["remediation"] = json.load(f)
except:
    summary["remediation"] = None

with open("$FINAL_REPORT", "w") as f:
    json.dump(summary, f, indent=2)

print(json.dumps(summary, indent=2))
EOF

# Create symlink to latest
ln -sf "$ARTIFACT_DIR" "$PROJECT_ROOT/artifacts/latest"
log_success "Final report: $FINAL_REPORT"

###############################################################################
# Step 7: Cleanup and exit
###############################################################################
log_step "Step 7: Cleanup"

if [ "$SKIP_DOCKER" != "true" ]; then
    log_info "Stopping Docker Compose stack..."
    $DC $DC_FILES down --timeout 30 2>&1 >> "$ARTIFACT_DIR/logs/docker-compose.log" || true
fi

echo ""
log_info "=============================================="
if [ "$RESOLVED" = "true" ]; then
    log_success "Self-healing run PASSED"
    log_info "=============================================="
    exit 0
else
    log_error "Self-healing run FAILED - unresolved issues remain"
    log_info "=============================================="
    log_info "Review artifacts at: $ARTIFACT_DIR"
    log_info "Triage report: $TRIAGE_REPORT"
    exit 1
fi
