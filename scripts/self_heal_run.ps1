<#
.SYNOPSIS
    Self-Healing Runner Script for Windows

.DESCRIPTION
    This script orchestrates the self-healing system:
    1. Sets up environment
    2. Runs Playwright tests
    3. Classifies failures
    4. Applies SAFE remediations
    5. Re-runs tests to verify fixes
    6. Opens PR/issue for remaining failures

.PARAMETER DryRun
    Run without applying fixes

.PARAMETER SkipLLM
    Skip LLM analysis (faster)

.PARAMETER Projects
    Test projects to run (comma-separated)

.PARAMETER MaxFixes
    Maximum auto-fixes per run

.EXAMPLE
    .\scripts\self_heal_run.ps1
    .\scripts\self_heal_run.ps1 -DryRun
    .\scripts\self_heal_run.ps1 -Projects "health,contracts"
#>

param(
    [switch]$DryRun = $false,
    [switch]$SkipLLM = $false,
    [string]$Projects = "health,contracts,modules",
    [int]$MaxFixes = 3,
    [switch]$Help = $false
)

# Show help
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# Colors
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Generate run ID
$RunId = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString().Substring(0,8))"
$ResultsDir = "healing-results\run-$RunId"

Write-Info "Self-Healing Run: $RunId"
Write-Info "Configuration:"
Write-Info "  - Dry Run: $DryRun"
Write-Info "  - Skip LLM: $SkipLLM"
Write-Info "  - Projects: $Projects"
Write-Info "  - Max Fixes: $MaxFixes"

# Create results directory
New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null

# Step 1: Environment Setup
Write-Info "Step 1: Setting up environment..."

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Info "Node.js version: $nodeVersion"
} catch {
    Write-Err "Node.js is not installed"
    exit 1
}

# Check npm dependencies
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm ci
}

# Check Playwright browsers
try {
    npx playwright --version | Out-Null
} catch {
    Write-Info "Installing Playwright browsers..."
    npx playwright install --with-deps chromium
}

# Step 2: Run Playwright Tests
Write-Info "Step 2: Running Playwright tests..."

$testArgs = @("--reporter=json")
$Projects.Split(',') | ForEach-Object {
    $testArgs += "--project=$($_.Trim())"
}

$testOutput = & npx playwright test @testArgs 2>&1
$testExitCode = $LASTEXITCODE

# Save test output
$testOutput | Out-File -FilePath "$ResultsDir\test-output.json" -Encoding UTF8

# Parse results
try {
    $testJson = $testOutput | ConvertFrom-Json
    $totalTests = $testJson.stats.expected
    $passedTests = $testJson.stats.passed
    $failedTests = $testJson.stats.failed
    $skippedTests = $testJson.stats.skipped
} catch {
    $totalTests = "unknown"
    $passedTests = "unknown"
    $failedTests = "unknown"
    $skippedTests = "unknown"
}

Write-Info "Test Results:"
Write-Info "  - Total: $totalTests"
Write-Info "  - Passed: $passedTests"
Write-Info "  - Failed: $failedTests"
Write-Info "  - Skipped: $skippedTests"

# If all tests pass, we're done
if ($testExitCode -eq 0) {
    Write-Success "All tests passed! No healing needed."
    @{status = "healthy"; fixes_applied = 0} | ConvertTo-Json | Out-File "$ResultsDir\summary.json"
    exit 0
}

# Step 3: Classify Failures and Apply Fixes
Write-Info "Step 3: Classifying failures and applying fixes..."

$healArgs = @()
if ($DryRun) { $healArgs += "--dry-run" }
if ($SkipLLM) { $healArgs += "--skip-llm" }
$healArgs += "--projects=$Projects"
$healArgs += "--max-fixes=$MaxFixes"

Write-Info "Running healing orchestrator with args: $($healArgs -join ' ')"

$healOutput = & npm run heal -- @healArgs 2>&1
$healExitCode = $LASTEXITCODE
$healOutput | Out-File -FilePath "$ResultsDir\healing-output.log" -Encoding UTF8

# Check healing results
$fixesApplied = 0
$status = "unknown"
if (Test-Path "healing-results\latest.json") {
    Copy-Item "healing-results\latest.json" "$ResultsDir\healing-summary.json"
    try {
        $healingSummary = Get-Content "healing-results\latest.json" | ConvertFrom-Json
        $fixesApplied = $healingSummary.fixesApplied
        $status = $healingSummary.status
    } catch {
        Write-Warn "Could not parse healing summary"
    }
}

Write-Info "Healing Results:"
Write-Info "  - Status: $status"
Write-Info "  - Fixes Applied: $fixesApplied"

# Step 4: Re-run tests if fixes were applied
$rerunExitCode = 1
if ($fixesApplied -gt 0 -and -not $DryRun) {
    Write-Info "Step 4: Re-running tests after fixes..."

    $rerunOutput = & npx playwright test @testArgs 2>&1
    $rerunExitCode = $LASTEXITCODE
    $rerunOutput | Out-File -FilePath "$ResultsDir\test-rerun-output.json" -Encoding UTF8

    if ($rerunExitCode -eq 0) {
        Write-Success "All tests pass after fixes!"
    } else {
        Write-Warn "Some tests still failing after fixes"
    }
}

# Step 5: Generate summary report
Write-Info "Step 5: Generating summary report..."

$summary = @"
# Self-Healing Run Summary

**Run ID:** $RunId
**Date:** $(Get-Date -Format "o")

## Test Results

| Metric | Value |
|--------|-------|
| Total Tests | $totalTests |
| Passed | $passedTests |
| Failed | $failedTests |
| Skipped | $skippedTests |

## Healing Actions

| Metric | Value |
|--------|-------|
| Fixes Applied | $fixesApplied |
| Status | $status |

## Artifacts

- Test output: ``$ResultsDir\test-output.json``
- Healing log: ``$ResultsDir\healing-output.log``
- Screenshots: ``test-results\``
- Traces: ``test-results\``

## Configuration

- Dry Run: $DryRun
- Skip LLM: $SkipLLM
- Projects: $Projects
- Max Fixes: $MaxFixes
"@

$summary | Out-File -FilePath "$ResultsDir\summary.md" -Encoding UTF8

Write-Success "Run complete! Summary saved to $ResultsDir\summary.md"

# Return appropriate exit code
if ($testExitCode -eq 0 -or $rerunExitCode -eq 0) {
    exit 0
} else {
    exit 1
}
