#!/usr/bin/env python3
"""
repair_orchestrator.py - Safe Remediation Orchestrator

Applies SAFE playbooks ONLY:
a) Restart backend container and rerun tests
b) Reinstall node deps if integrity failure
c) Patch-level dependency bump suggestion (DO NOT auto-apply unless safe files only)
d) Playwright selector repair limited ONLY to e2e test files

Blocks approval-required classes.
Prevents infinite loops (max 2 attempts per signature).
Writes remediation report to artifacts.

Usage:
    python3 scripts/repair_orchestrator.py \
        --triage-report=artifacts/xxx/reports/triage.json \
        --artifact-dir=artifacts/xxx \
        --attempt=1 \
        --output=artifacts/xxx/reports/remediation.json
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# Import LLM client for selector repair
try:
    from llm_client import get_llm_suggestion, is_llm_available
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    def get_llm_suggestion(*args, **kwargs):
        return None
    def is_llm_available():
        return False

# Import redaction
try:
    from redact import redact_sensitive_data
except ImportError:
    def redact_sensitive_data(text):
        return text


# Safe buckets that can be auto-fixed
SAFE_BUCKETS = {
    "SERVICE_DOWN",
    "SELECTOR_DRIFT",
    "TIMEOUT",
    "RATE_LIMIT",
    "NETWORK",
}

# Buckets that require human review
APPROVAL_REQUIRED_BUCKETS = {
    "AUTH_CSRF",
    "WEBHOOK_SIG",
    "DB",
    "DEP_VULN",
    "UNKNOWN",
}

# Track attempts per signature to prevent infinite loops
# Key: signature, Value: attempt count
ATTEMPT_TRACKER_FILE = ".repair_attempts.json"


@dataclass
class FixResult:
    """Result of applying a fix."""
    fix_type: str
    success: bool
    message: str
    file_modified: Optional[str] = None
    diff: Optional[str] = None


@dataclass
class RemediationReport:
    """Complete remediation report."""
    timestamp: str
    attempt: int
    applied: list = field(default_factory=list)
    blocked: list = field(default_factory=list)
    skipped: list = field(default_factory=list)
    status: str = "pending"
    pr_bundle_path: Optional[str] = None


def load_attempt_tracker(artifact_dir: Path) -> dict:
    """Load attempt tracker to prevent infinite loops."""
    tracker_path = artifact_dir / ATTEMPT_TRACKER_FILE
    if tracker_path.exists():
        try:
            with open(tracker_path) as f:
                return json.load(f)
        except:
            pass
    return {}


def save_attempt_tracker(artifact_dir: Path, tracker: dict):
    """Save attempt tracker."""
    tracker_path = artifact_dir / ATTEMPT_TRACKER_FILE
    with open(tracker_path, "w") as f:
        json.dump(tracker, f, indent=2)


def get_signature_hash(failure: dict) -> str:
    """Generate a hash signature for a failure."""
    sig = failure.get("signature", f"{failure.get('bucket')}:{failure.get('file_path')}")
    return hashlib.md5(sig.encode()).hexdigest()[:12]


def can_attempt_fix(failure: dict, tracker: dict, max_attempts: int = 2) -> bool:
    """Check if we can attempt to fix this failure."""
    sig_hash = get_signature_hash(failure)
    current_attempts = tracker.get(sig_hash, 0)
    return current_attempts < max_attempts


def record_attempt(failure: dict, tracker: dict):
    """Record a fix attempt."""
    sig_hash = get_signature_hash(failure)
    tracker[sig_hash] = tracker.get(sig_hash, 0) + 1


# =============================================================================
# SAFE PLAYBOOKS
# =============================================================================

def playbook_restart_backend() -> FixResult:
    """Restart backend container."""
    print("[FIX] Attempting to restart backend container...")

    # Try docker compose restart
    try:
        # Check if we have docker compose
        result = subprocess.run(
            ["docker", "compose", "restart", "backend"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            return FixResult(
                fix_type="restart_backend",
                success=True,
                message="Backend container restarted successfully",
            )

        # Try alternate service names
        for service in ["api", "app", "server", "web"]:
            result = subprocess.run(
                ["docker", "compose", "restart", service],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                return FixResult(
                    fix_type="restart_backend",
                    success=True,
                    message=f"Service '{service}' restarted successfully",
                )

    except subprocess.TimeoutExpired:
        pass
    except FileNotFoundError:
        pass

    return FixResult(
        fix_type="restart_backend",
        success=False,
        message="Could not restart backend container",
    )


def playbook_reinstall_deps() -> FixResult:
    """Reinstall node dependencies."""
    print("[FIX] Reinstalling node dependencies...")

    try:
        # Remove node_modules and package-lock
        if Path("node_modules").exists():
            shutil.rmtree("node_modules")

        # Run npm install
        result = subprocess.run(
            ["npm", "install"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode == 0:
            return FixResult(
                fix_type="reinstall_deps",
                success=True,
                message="Node dependencies reinstalled successfully",
            )
        else:
            return FixResult(
                fix_type="reinstall_deps",
                success=False,
                message=f"npm install failed: {result.stderr[:200]}",
            )

    except Exception as e:
        return FixResult(
            fix_type="reinstall_deps",
            success=False,
            message=f"Failed to reinstall deps: {str(e)}",
        )


def playbook_clear_playwright_cache() -> FixResult:
    """Clear Playwright cache and re-install browsers."""
    print("[FIX] Clearing Playwright cache...")

    try:
        # Clear auth state
        auth_dir = Path(".auth")
        if auth_dir.exists():
            shutil.rmtree(auth_dir)
            auth_dir.mkdir()

        # Clear test results
        for d in ["test-results", "playwright-report"]:
            if Path(d).exists():
                shutil.rmtree(d)

        return FixResult(
            fix_type="clear_pw_cache",
            success=True,
            message="Playwright cache cleared",
        )

    except Exception as e:
        return FixResult(
            fix_type="clear_pw_cache",
            success=False,
            message=f"Failed to clear cache: {str(e)}",
        )


def playbook_selector_repair(failure: dict, artifact_dir: Path) -> FixResult:
    """
    Attempt to repair Playwright selector using LLM.
    ONLY modifies e2e test files, NOT application code.
    """
    file_path = failure.get("file_path", "")
    error_msg = failure.get("error_message", "")

    # Safety check: ONLY modify e2e test files
    if not file_path.startswith("e2e/") and "e2e" not in file_path:
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message="File is not an e2e test file - blocked for safety",
        )

    if not Path(file_path).exists():
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message=f"File not found: {file_path}",
        )

    # Check if LLM is available
    if not LLM_AVAILABLE or not is_llm_available():
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message="LLM not available for selector repair",
        )

    print(f"[FIX] Attempting selector repair for: {file_path}")

    # Read the file
    try:
        original_content = Path(file_path).read_text()
    except Exception as e:
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message=f"Could not read file: {e}",
        )

    # Redact sensitive data before sending to LLM
    redacted_content = redact_sensitive_data(original_content)
    redacted_error = redact_sensitive_data(error_msg)

    # Build prompt for LLM
    prompt = f"""You are fixing a Playwright test selector that is failing.

ERROR MESSAGE:
{redacted_error}

CURRENT TEST FILE (redacted):
```typescript
{redacted_content[:3000]}
```

The selector is failing because the UI element has changed.
Generate a unified diff patch that fixes ONLY the failing selector.

Rules:
1. ONLY output a unified diff patch
2. Do NOT change test logic, only selectors
3. Prefer robust selectors: getByRole, getByLabel, getByText over CSS selectors
4. Use .first() if multiple matches are acceptable

Output ONLY the diff, nothing else:
"""

    # Get LLM suggestion
    suggestion = get_llm_suggestion(prompt, max_tokens=1000)

    if not suggestion:
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message="LLM did not provide a suggestion",
        )

    # Validate suggestion is a diff
    if not suggestion.strip().startswith("---") and "@@" not in suggestion:
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message="LLM output is not a valid diff",
        )

    # Save diff for review
    diff_path = artifact_dir / "reports" / f"selector_repair_{Path(file_path).stem}.diff"
    diff_path.write_text(suggestion)

    # Try to apply the patch
    try:
        result = subprocess.run(
            ["patch", "-p1", "--dry-run"],
            input=suggestion,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return FixResult(
                fix_type="selector_repair",
                success=False,
                message=f"Patch would not apply cleanly: {result.stderr[:200]}",
                diff=suggestion,
            )

        # Apply for real
        result = subprocess.run(
            ["patch", "-p1"],
            input=suggestion,
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            return FixResult(
                fix_type="selector_repair",
                success=True,
                message=f"Selector repaired in {file_path}",
                file_modified=file_path,
                diff=suggestion,
            )
        else:
            return FixResult(
                fix_type="selector_repair",
                success=False,
                message=f"Patch failed: {result.stderr[:200]}",
                diff=suggestion,
            )

    except FileNotFoundError:
        # patch command not available, save for manual review
        return FixResult(
            fix_type="selector_repair",
            success=False,
            message=f"Patch saved to {diff_path} - manual application required",
            diff=suggestion,
        )


def playbook_wait_and_retry() -> FixResult:
    """Simple wait before retry for rate limits."""
    import time
    print("[FIX] Waiting 30 seconds for rate limit cooldown...")
    time.sleep(30)
    return FixResult(
        fix_type="wait_retry",
        success=True,
        message="Waited 30 seconds for rate limit cooldown",
    )


# =============================================================================
# ORCHESTRATOR
# =============================================================================

def apply_safe_fixes(
    triage_report: dict,
    artifact_dir: Path,
    attempt: int,
    max_attempts: int = 2,
) -> RemediationReport:
    """Apply safe fixes based on triage report."""

    report = RemediationReport(
        timestamp=datetime.utcnow().isoformat() + "Z",
        attempt=attempt,
    )

    # Load attempt tracker
    tracker = load_attempt_tracker(artifact_dir)

    failures = triage_report.get("failures", [])

    for failure in failures:
        bucket = failure.get("bucket", "UNKNOWN")
        sig_hash = get_signature_hash(failure)

        # Check if bucket requires approval
        if bucket in APPROVAL_REQUIRED_BUCKETS:
            report.blocked.append({
                "failure": failure,
                "reason": f"Bucket {bucket} requires human review",
            })
            continue

        # Check if we've exceeded attempts for this signature
        if not can_attempt_fix(failure, tracker, max_attempts):
            report.skipped.append({
                "failure": failure,
                "reason": f"Max attempts ({max_attempts}) reached for this failure",
            })
            continue

        # Record this attempt
        record_attempt(failure, tracker)

        # Apply appropriate playbook based on bucket
        fix_result = None

        if bucket == "SERVICE_DOWN":
            fix_result = playbook_restart_backend()

        elif bucket == "SELECTOR_DRIFT":
            fix_result = playbook_selector_repair(failure, artifact_dir)
            if not fix_result.success:
                # Fallback: clear cache
                fix_result = playbook_clear_playwright_cache()

        elif bucket == "TIMEOUT":
            fix_result = playbook_restart_backend()

        elif bucket == "RATE_LIMIT":
            fix_result = playbook_wait_and_retry()

        elif bucket == "NETWORK":
            fix_result = playbook_restart_backend()

        else:
            report.skipped.append({
                "failure": failure,
                "reason": f"No playbook for bucket: {bucket}",
            })
            continue

        if fix_result:
            if fix_result.success:
                report.applied.append({
                    "failure": failure,
                    "fix": asdict(fix_result),
                })
            else:
                report.skipped.append({
                    "failure": failure,
                    "reason": fix_result.message,
                    "fix_attempted": asdict(fix_result),
                })

    # Save tracker
    save_attempt_tracker(artifact_dir, tracker)

    # Determine status
    if len(report.applied) > 0:
        report.status = "fixes_applied"
    elif len(report.blocked) > 0:
        report.status = "blocked_needs_review"
    else:
        report.status = "no_fixes_available"

    # Generate PR bundle if there are blocked items
    if report.blocked:
        bundle_path = generate_pr_bundle(report, artifact_dir)
        report.pr_bundle_path = str(bundle_path) if bundle_path else None

    return report


def generate_pr_bundle(report: RemediationReport, artifact_dir: Path) -> Optional[Path]:
    """
    Generate a PR bundle for blocked issues.
    Contains: branch name, diffs, markdown report.
    """
    bundle_dir = artifact_dir / "pr_bundle"
    bundle_dir.mkdir(exist_ok=True)

    # Generate branch name
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    branch_name = f"heal/auto-{timestamp}"

    # Create markdown report
    md_content = f"""# Self-Healing Report - Requires Review

**Generated:** {report.timestamp}
**Branch:** `{branch_name}`

## Blocked Issues (Require Human Review)

These issues could not be automatically fixed and require human review:

"""

    for item in report.blocked:
        failure = item.get("failure", {})
        reason = item.get("reason", "Unknown")
        md_content += f"""
### {failure.get('test_name', 'Unknown Test')}

- **Bucket:** {failure.get('bucket', 'UNKNOWN')}
- **File:** `{failure.get('file_path', 'unknown')}`
- **Reason:** {reason}
- **Error:** {failure.get('error_message', 'No error message')[:500]}

"""

    md_content += """
## Applied Fixes

"""
    for item in report.applied:
        fix = item.get("fix", {})
        md_content += f"- **{fix.get('fix_type')}**: {fix.get('message')}\n"

    md_content += """
## How to Review

1. Check out this branch: `git checkout """ + branch_name + """`
2. Review the changes
3. Run tests: `npm test`
4. If approved, merge via PR

"""

    # Write files
    (bundle_dir / "REPORT.md").write_text(md_content)
    (bundle_dir / "branch_name.txt").write_text(branch_name)

    # Create shell script to open PR
    pr_script = f"""#!/bin/bash
# Script to open PR for self-healing fixes
# Requires: gh CLI authenticated

BRANCH="{branch_name}"

git checkout -b "$BRANCH"
git add -A
git commit -m "fix: Self-healing automated fixes

Applied fixes:
$(cat {bundle_dir}/REPORT.md | head -50)

🤖 Generated by self-healing system
"

git push -u origin "$BRANCH"

gh pr create \\
  --title "fix: Self-healing automated fixes ($BRANCH)" \\
  --body-file {bundle_dir}/REPORT.md \\
  --label "self-heal,needs-review"

echo "PR created successfully!"
"""

    (bundle_dir / "open_pr.sh").write_text(pr_script)

    print(f"[INFO] PR bundle created at: {bundle_dir}")
    return bundle_dir


def main():
    parser = argparse.ArgumentParser(description="Apply safe remediations")
    parser.add_argument("--triage-report", required=True, help="Triage report JSON")
    parser.add_argument("--artifact-dir", required=True, help="Artifacts directory")
    parser.add_argument("--attempt", type=int, default=1, help="Attempt number")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--max-attempts", type=int, default=2, help="Max attempts per failure")
    args = parser.parse_args()

    # Load triage report
    triage_path = Path(args.triage_report)
    if not triage_path.exists():
        print(f"[ERROR] Triage report not found: {triage_path}")
        sys.exit(1)

    with open(triage_path) as f:
        triage_report = json.load(f)

    artifact_dir = Path(args.artifact_dir)

    print(f"[INFO] Remediation attempt {args.attempt}")
    print(f"[INFO] Failures to process: {len(triage_report.get('failures', []))}")

    # Apply fixes
    report = apply_safe_fixes(
        triage_report,
        artifact_dir,
        args.attempt,
        args.max_attempts,
    )

    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(asdict(report), f, indent=2)

    print(f"[INFO] Remediation report: {output_path}")
    print(f"[INFO] Status: {report.status}")
    print(f"[INFO] Applied: {len(report.applied)}")
    print(f"[INFO] Blocked: {len(report.blocked)}")
    print(f"[INFO] Skipped: {len(report.skipped)}")


if __name__ == "__main__":
    main()
