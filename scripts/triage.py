#!/usr/bin/env python3
"""
triage.py - Failure Classification for Self-Healing System

Reads test outputs and Playwright reports, classifies failures into buckets:
- SERVICE_DOWN: Backend/service unreachable
- SELECTOR_DRIFT: Playwright element selectors changed
- AUTH_CSRF: Authentication or CSRF failures
- WEBHOOK_SIG: Webhook signature verification failures
- RATE_LIMIT: Rate limiting triggered
- DB: Database connection/query errors
- DEP_VULN: Dependency vulnerability detected
- UNKNOWN: Unclassified failures

Outputs JSON summary to artifacts directory.

Usage:
    python3 scripts/triage.py --artifact-dir=artifacts/20241223_120000 --output=triage.json
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional


class FailureBucket(str, Enum):
    SERVICE_DOWN = "SERVICE_DOWN"
    SELECTOR_DRIFT = "SELECTOR_DRIFT"
    AUTH_CSRF = "AUTH_CSRF"
    WEBHOOK_SIG = "WEBHOOK_SIG"
    RATE_LIMIT = "RATE_LIMIT"
    DB = "DB"
    DEP_VULN = "DEP_VULN"
    TIMEOUT = "TIMEOUT"
    NETWORK = "NETWORK"
    UNKNOWN = "UNKNOWN"


# Classification rules: (pattern, bucket, safe_to_auto_fix)
CLASSIFICATION_RULES = [
    # Service down patterns
    (r"ECONNREFUSED", FailureBucket.SERVICE_DOWN, True),
    (r"502 Bad Gateway", FailureBucket.SERVICE_DOWN, True),
    (r"503 Service Unavailable", FailureBucket.SERVICE_DOWN, True),
    (r"504 Gateway Timeout", FailureBucket.SERVICE_DOWN, True),
    (r"Connection refused", FailureBucket.SERVICE_DOWN, True),
    (r"getaddrinfo.*ENOTFOUND", FailureBucket.SERVICE_DOWN, True),
    (r"net::ERR_CONNECTION_REFUSED", FailureBucket.SERVICE_DOWN, True),

    # Selector drift patterns
    (r"locator\..*strict mode violation", FailureBucket.SELECTOR_DRIFT, True),
    (r"element\(s\) not found", FailureBucket.SELECTOR_DRIFT, True),
    (r"waiting for (locator|selector)", FailureBucket.SELECTOR_DRIFT, True),
    (r"Timeout.*waiting for.*visible", FailureBucket.SELECTOR_DRIFT, True),
    (r"getByRole.*not found", FailureBucket.SELECTOR_DRIFT, True),
    (r"getByText.*not found", FailureBucket.SELECTOR_DRIFT, True),

    # Auth/CSRF patterns
    (r"401 Unauthorized", FailureBucket.AUTH_CSRF, False),
    (r"403 Forbidden", FailureBucket.AUTH_CSRF, False),
    (r"CSRF.*token", FailureBucket.AUTH_CSRF, False),
    (r"session.*expired", FailureBucket.AUTH_CSRF, True),
    (r"invalid.*token", FailureBucket.AUTH_CSRF, False),

    # Webhook signature patterns
    (r"signature.*invalid", FailureBucket.WEBHOOK_SIG, False),
    (r"X-Twilio-Signature", FailureBucket.WEBHOOK_SIG, False),
    (r"Stripe.*signature", FailureBucket.WEBHOOK_SIG, False),

    # Rate limiting
    (r"429 Too Many Requests", FailureBucket.RATE_LIMIT, True),
    (r"rate.*limit", FailureBucket.RATE_LIMIT, True),

    # Database patterns
    (r"database.*connection", FailureBucket.DB, True),
    (r"SQLSTATE", FailureBucket.DB, False),
    (r"deadlock", FailureBucket.DB, False),
    (r"connection pool exhausted", FailureBucket.DB, True),

    # Dependency vulnerabilities
    (r"vulnerability.*found", FailureBucket.DEP_VULN, False),
    (r"npm audit", FailureBucket.DEP_VULN, False),
    (r"pip-audit", FailureBucket.DEP_VULN, False),
    (r"GHSA-", FailureBucket.DEP_VULN, False),
    (r"CVE-", FailureBucket.DEP_VULN, False),

    # Timeout patterns
    (r"Timeout.*exceeded", FailureBucket.TIMEOUT, True),
    (r"Test timeout", FailureBucket.TIMEOUT, True),
    (r"Navigation timeout", FailureBucket.TIMEOUT, True),

    # Network patterns
    (r"ETIMEDOUT", FailureBucket.NETWORK, True),
    (r"ENETUNREACH", FailureBucket.NETWORK, True),
    (r"socket hang up", FailureBucket.NETWORK, True),
]


@dataclass
class Failure:
    """Represents a single test failure."""
    id: str
    test_name: str
    file_path: str
    error_message: str
    bucket: str
    safe_to_fix: bool
    line_number: Optional[int] = None
    screenshot_path: Optional[str] = None
    trace_path: Optional[str] = None
    raw_output: str = ""
    signature: str = ""  # For dedup

    def __post_init__(self):
        # Generate signature for dedup
        self.signature = f"{self.bucket}:{self.file_path}:{self.test_name}"


@dataclass
class TriageReport:
    """Complete triage report."""
    status: str
    timestamp: str
    artifact_dir: str
    total_failures: int = 0
    failures: list = field(default_factory=list)
    buckets: dict = field(default_factory=dict)
    safe_to_fix_count: int = 0
    needs_review_count: int = 0


def classify_error(error_text: str) -> tuple[FailureBucket, bool]:
    """Classify an error message into a bucket."""
    error_lower = error_text.lower()

    for pattern, bucket, safe in CLASSIFICATION_RULES:
        if re.search(pattern, error_text, re.IGNORECASE):
            return bucket, safe

    return FailureBucket.UNKNOWN, False


def parse_playwright_report(artifact_dir: Path) -> list[Failure]:
    """Parse Playwright JSON report and extract failures."""
    failures = []

    # Try multiple possible locations
    possible_paths = [
        artifact_dir / "reports" / "playwright.json",
        artifact_dir / "test-results" / "results.json",
        artifact_dir / "playwright-report" / "data" / "results.json",
    ]

    report_path = None
    for p in possible_paths:
        if p.exists():
            report_path = p
            break

    if not report_path:
        print(f"[WARN] No Playwright report found in {artifact_dir}")
        return failures

    try:
        with open(report_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in {report_path}: {e}")
        return failures

    # Handle Playwright JSON reporter format
    suites = data.get("suites", [])

    def extract_failures_from_suite(suite, parent_file=""):
        file_path = suite.get("file", parent_file)

        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                for result in test.get("results", []):
                    if result.get("status") in ("failed", "timedOut"):
                        error_msg = ""
                        if result.get("error"):
                            error_msg = result["error"].get("message", "")

                        bucket, safe = classify_error(error_msg)

                        # Find attachments
                        screenshot = None
                        trace = None
                        for att in result.get("attachments", []):
                            if att.get("name") == "screenshot":
                                screenshot = att.get("path")
                            elif att.get("name") == "trace":
                                trace = att.get("path")

                        failure = Failure(
                            id=f"{file_path}:{spec.get('title', 'unknown')}",
                            test_name=spec.get("title", "unknown"),
                            file_path=file_path,
                            error_message=error_msg[:1000],  # Truncate
                            bucket=bucket.value,
                            safe_to_fix=safe,
                            line_number=spec.get("line"),
                            screenshot_path=screenshot,
                            trace_path=trace,
                            raw_output=str(result.get("stdout", ""))[:500],
                        )
                        failures.append(failure)

        # Recurse into child suites
        for child in suite.get("suites", []):
            extract_failures_from_suite(child, file_path)

    for suite in suites:
        extract_failures_from_suite(suite)

    return failures


def parse_log_file(log_path: Path) -> list[Failure]:
    """Parse a log file for errors."""
    failures = []

    if not log_path.exists():
        return failures

    try:
        content = log_path.read_text(errors="ignore")
    except Exception as e:
        print(f"[WARN] Could not read {log_path}: {e}")
        return failures

    # Look for error patterns
    error_lines = []
    for i, line in enumerate(content.split("\n")):
        if any(kw in line.lower() for kw in ["error", "failed", "failure", "exception"]):
            error_lines.append((i + 1, line))

    # Group consecutive error lines
    for line_num, line in error_lines[:20]:  # Limit to first 20
        bucket, safe = classify_error(line)

        if bucket != FailureBucket.UNKNOWN:
            failure = Failure(
                id=f"{log_path.name}:{line_num}",
                test_name=f"Log error at line {line_num}",
                file_path=str(log_path),
                error_message=line[:500],
                bucket=bucket.value,
                safe_to_fix=safe,
                line_number=line_num,
            )
            failures.append(failure)

    return failures


def parse_scanner_reports(artifact_dir: Path) -> list[Failure]:
    """Parse security scanner reports (npm-audit, pip-audit, bandit)."""
    failures = []
    reports_dir = artifact_dir / "reports"

    # npm audit
    npm_audit = reports_dir / "npm-audit.json"
    if npm_audit.exists():
        try:
            with open(npm_audit) as f:
                data = json.load(f)

            vulns = data.get("vulnerabilities", {})
            for name, info in vulns.items():
                severity = info.get("severity", "unknown")
                if severity in ("high", "critical"):
                    failure = Failure(
                        id=f"npm:{name}",
                        test_name=f"npm vulnerability: {name}",
                        file_path="package.json",
                        error_message=f"{severity}: {info.get('via', [{}])[0].get('title', name) if isinstance(info.get('via', [{}])[0], dict) else name}",
                        bucket=FailureBucket.DEP_VULN.value,
                        safe_to_fix=False,
                    )
                    failures.append(failure)
        except Exception as e:
            print(f"[WARN] Could not parse npm-audit.json: {e}")

    # pip-audit
    pip_audit = reports_dir / "pip-audit.json"
    if pip_audit.exists():
        try:
            with open(pip_audit) as f:
                data = json.load(f)

            for vuln in data.get("dependencies", []):
                for v in vuln.get("vulns", []):
                    failure = Failure(
                        id=f"pip:{vuln.get('name')}:{v.get('id')}",
                        test_name=f"pip vulnerability: {vuln.get('name')}",
                        file_path="requirements.txt",
                        error_message=f"{v.get('id')}: {v.get('description', '')[:200]}",
                        bucket=FailureBucket.DEP_VULN.value,
                        safe_to_fix=False,
                    )
                    failures.append(failure)
        except Exception as e:
            print(f"[WARN] Could not parse pip-audit.json: {e}")

    # bandit
    bandit_report = reports_dir / "bandit.json"
    if bandit_report.exists():
        try:
            with open(bandit_report) as f:
                data = json.load(f)

            for issue in data.get("results", []):
                if issue.get("issue_severity") in ("HIGH", "MEDIUM"):
                    failure = Failure(
                        id=f"bandit:{issue.get('filename')}:{issue.get('line_number')}",
                        test_name=f"bandit: {issue.get('issue_text', '')[:50]}",
                        file_path=issue.get("filename", "unknown"),
                        error_message=issue.get("issue_text", ""),
                        bucket=FailureBucket.DEP_VULN.value,  # Security issue
                        safe_to_fix=False,
                        line_number=issue.get("line_number"),
                    )
                    failures.append(failure)
        except Exception as e:
            print(f"[WARN] Could not parse bandit.json: {e}")

    return failures


def deduplicate_failures(failures: list[Failure]) -> list[Failure]:
    """Remove duplicate failures by signature."""
    seen = set()
    unique = []

    for f in failures:
        if f.signature not in seen:
            seen.add(f.signature)
            unique.append(f)

    return unique


def generate_triage_report(artifact_dir: Path) -> TriageReport:
    """Generate complete triage report."""
    all_failures = []

    # Parse Playwright report
    pw_failures = parse_playwright_report(artifact_dir)
    all_failures.extend(pw_failures)

    # Parse log files
    logs_dir = artifact_dir / "logs"
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.log"):
            log_failures = parse_log_file(log_file)
            all_failures.extend(log_failures)

    # Parse security scanner reports
    scanner_failures = parse_scanner_reports(artifact_dir)
    all_failures.extend(scanner_failures)

    # Deduplicate
    unique_failures = deduplicate_failures(all_failures)

    # Group by bucket
    buckets = {}
    for f in unique_failures:
        bucket = f.bucket
        if bucket not in buckets:
            buckets[bucket] = []
        buckets[bucket].append(asdict(f))

    # Calculate counts
    safe_count = sum(1 for f in unique_failures if f.safe_to_fix)
    review_count = len(unique_failures) - safe_count

    # Determine status
    if len(unique_failures) == 0:
        status = "healthy"
    elif safe_count == len(unique_failures):
        status = "degraded_fixable"
    elif review_count > 0:
        status = "degraded_needs_review"
    else:
        status = "unknown"

    return TriageReport(
        status=status,
        timestamp=datetime.utcnow().isoformat() + "Z",
        artifact_dir=str(artifact_dir),
        total_failures=len(unique_failures),
        failures=[asdict(f) for f in unique_failures],
        buckets=buckets,
        safe_to_fix_count=safe_count,
        needs_review_count=review_count,
    )


def main():
    parser = argparse.ArgumentParser(description="Triage test failures")
    parser.add_argument("--artifact-dir", required=True, help="Artifacts directory")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()

    artifact_dir = Path(args.artifact_dir)
    if not artifact_dir.exists():
        print(f"[ERROR] Artifact directory does not exist: {artifact_dir}")
        sys.exit(1)

    print(f"[INFO] Analyzing artifacts in: {artifact_dir}")

    report = generate_triage_report(artifact_dir)

    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(asdict(report), f, indent=2)

    print(f"[INFO] Triage report written to: {output_path}")
    print(f"[INFO] Status: {report.status}")
    print(f"[INFO] Total failures: {report.total_failures}")
    print(f"[INFO] Safe to fix: {report.safe_to_fix_count}")
    print(f"[INFO] Needs review: {report.needs_review_count}")

    for bucket, items in report.buckets.items():
        print(f"[INFO]   {bucket}: {len(items)}")


if __name__ == "__main__":
    main()
