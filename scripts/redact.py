#!/usr/bin/env python3
"""
redact.py - Sensitive Data Redaction for LLM Queries

NEVER send secrets or PII to LLMs. This module redacts:
- API keys and tokens
- Passwords and secrets
- Email addresses
- Phone numbers
- IP addresses
- Database connection strings
- Environment variable values
- JWT tokens
- Credit card numbers
- Social Security Numbers

Usage:
    from redact import redact_sensitive_data
    safe_text = redact_sensitive_data(unsafe_text)
"""

import re
from typing import Pattern


# Redaction patterns: (pattern, replacement, description)
REDACTION_PATTERNS: list[tuple[Pattern, str, str]] = [
    # API Keys and Tokens
    (
        re.compile(r'(api[_-]?key|apikey|api_secret|secret_key|access_token|auth_token)\s*[=:]\s*["\']?([a-zA-Z0-9_\-]{20,})["\']?', re.IGNORECASE),
        r'\1=[REDACTED_API_KEY]',
        "API keys"
    ),
    (
        re.compile(r'(sk-[a-zA-Z0-9]{20,})', re.IGNORECASE),
        '[REDACTED_SK_KEY]',
        "Stripe/OpenAI secret keys"
    ),
    (
        re.compile(r'(pk_live_[a-zA-Z0-9]{20,}|pk_test_[a-zA-Z0-9]{20,})', re.IGNORECASE),
        '[REDACTED_PK_KEY]',
        "Stripe publishable keys"
    ),
    (
        re.compile(r'ANTHROPIC_API_KEY\s*=\s*["\']?([^"\'\s]+)["\']?', re.IGNORECASE),
        'ANTHROPIC_API_KEY=[REDACTED]',
        "Anthropic API key"
    ),
    (
        re.compile(r'(ghp_[a-zA-Z0-9]{36})', re.IGNORECASE),
        '[REDACTED_GITHUB_TOKEN]',
        "GitHub personal access token"
    ),
    (
        re.compile(r'(gho_[a-zA-Z0-9]{36})', re.IGNORECASE),
        '[REDACTED_GITHUB_OAUTH]',
        "GitHub OAuth token"
    ),

    # Passwords
    (
        re.compile(r'(password|passwd|pwd|pass)\s*[=:]\s*["\']?([^\s"\']{4,})["\']?', re.IGNORECASE),
        r'\1=[REDACTED_PASSWORD]',
        "Passwords"
    ),
    (
        re.compile(r'(secret|private_key|privatekey)\s*[=:]\s*["\']?([^\s"\']+)["\']?', re.IGNORECASE),
        r'\1=[REDACTED_SECRET]',
        "Secrets"
    ),

    # Connection Strings
    (
        re.compile(r'(postgres|postgresql|mysql|mongodb|redis)://[^\s"\']+', re.IGNORECASE),
        r'[REDACTED_DB_URL]',
        "Database URLs"
    ),
    (
        re.compile(r'(DATABASE_URL|DB_URL|REDIS_URL|MONGO_URI)\s*=\s*["\']?([^\s"\']+)["\']?', re.IGNORECASE),
        r'\1=[REDACTED_DB_URL]',
        "Database environment variables"
    ),

    # JWT Tokens
    (
        re.compile(r'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'),
        '[REDACTED_JWT]',
        "JWT tokens"
    ),

    # Bearer tokens
    (
        re.compile(r'(Bearer|Authorization:?\s*Bearer)\s+([a-zA-Z0-9_\-\.]+)', re.IGNORECASE),
        r'\1 [REDACTED_BEARER]',
        "Bearer tokens"
    ),

    # Session cookies
    (
        re.compile(r'(session|sid|connect\.sid)\s*=\s*([a-zA-Z0-9_\-\.%]{20,})', re.IGNORECASE),
        r'\1=[REDACTED_SESSION]',
        "Session cookies"
    ),

    # Email addresses
    (
        re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
        '[REDACTED_EMAIL]',
        "Email addresses"
    ),

    # Phone numbers (various formats)
    (
        re.compile(r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'),
        '[REDACTED_PHONE]',
        "US phone numbers"
    ),
    (
        re.compile(r'\+[0-9]{1,3}[-.\s]?[0-9]{6,14}'),
        '[REDACTED_PHONE]',
        "International phone numbers"
    ),

    # IP addresses
    (
        re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'),
        '[REDACTED_IP]',
        "IPv4 addresses"
    ),
    (
        re.compile(r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'),
        '[REDACTED_IPV6]',
        "IPv6 addresses"
    ),

    # Credit card numbers (basic patterns)
    (
        re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b'),
        '[REDACTED_CC]',
        "Credit card numbers"
    ),

    # Social Security Numbers
    (
        re.compile(r'\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b'),
        '[REDACTED_SSN]',
        "Social Security Numbers"
    ),

    # AWS keys
    (
        re.compile(r'(AKIA[0-9A-Z]{16})'),
        '[REDACTED_AWS_KEY]',
        "AWS Access Key ID"
    ),
    (
        re.compile(r'(AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\s*[=:]\s*["\']?([^\s"\']+)["\']?', re.IGNORECASE),
        r'\1=[REDACTED_AWS_SECRET]',
        "AWS Secret Access Key"
    ),

    # Twilio
    (
        re.compile(r'(TWILIO_AUTH_TOKEN|TWILIO_SID|TWILIO_ACCOUNT_SID)\s*[=:]\s*["\']?([^\s"\']+)["\']?', re.IGNORECASE),
        r'\1=[REDACTED_TWILIO]',
        "Twilio credentials"
    ),
    (
        re.compile(r'(AC[a-f0-9]{32})', re.IGNORECASE),
        '[REDACTED_TWILIO_SID]',
        "Twilio Account SID"
    ),

    # Generic secrets in env format
    (
        re.compile(r'^([A-Z_]+_SECRET|[A-Z_]+_KEY|[A-Z_]+_TOKEN)\s*=\s*(.+)$', re.MULTILINE),
        r'\1=[REDACTED]',
        "Generic secrets in env"
    ),

    # File paths that might contain usernames
    (
        re.compile(r'/Users/[a-zA-Z0-9_\-]+/'),
        '/Users/[REDACTED_USER]/',
        "macOS user paths"
    ),
    (
        re.compile(r'/home/[a-zA-Z0-9_\-]+/'),
        '/home/[REDACTED_USER]/',
        "Linux user paths"
    ),
    (
        re.compile(r'C:\\Users\\[a-zA-Z0-9_\-]+\\'),
        'C:\\Users\\[REDACTED_USER]\\',
        "Windows user paths"
    ),
]

# Allowlist patterns that should NOT be redacted
ALLOWLIST_PATTERNS = [
    re.compile(r'localhost', re.IGNORECASE),
    re.compile(r'127\.0\.0\.1'),
    re.compile(r'0\.0\.0\.0'),
    re.compile(r'example\.com', re.IGNORECASE),
    re.compile(r'test@example\.com', re.IGNORECASE),
    re.compile(r'\[REDACTED', re.IGNORECASE),  # Already redacted
]


def is_allowlisted(text: str) -> bool:
    """Check if text matches an allowlist pattern."""
    for pattern in ALLOWLIST_PATTERNS:
        if pattern.search(text):
            return True
    return False


def redact_sensitive_data(text: str) -> str:
    """
    Redact sensitive data from text before sending to LLM.

    Args:
        text: Input text that may contain sensitive data

    Returns:
        Text with sensitive data replaced by [REDACTED_*] placeholders
    """
    if not text:
        return text

    redacted = text

    for pattern, replacement, description in REDACTION_PATTERNS:
        try:
            matches = pattern.findall(redacted)
            if matches:
                # Check if any match is allowlisted
                for match in matches:
                    match_str = match if isinstance(match, str) else str(match)
                    if not is_allowlisted(match_str):
                        redacted = pattern.sub(replacement, redacted)
        except Exception as e:
            # Don't fail on regex errors, just skip that pattern
            print(f"[WARN] Redaction pattern error ({description}): {e}")
            continue

    return redacted


def get_redaction_summary(original: str, redacted: str) -> dict:
    """Get a summary of what was redacted."""
    summary = {
        "original_length": len(original),
        "redacted_length": len(redacted),
        "redactions_made": 0,
        "types": [],
    }

    # Count redaction markers
    for marker in [
        "REDACTED_API_KEY",
        "REDACTED_PASSWORD",
        "REDACTED_SECRET",
        "REDACTED_DB_URL",
        "REDACTED_JWT",
        "REDACTED_BEARER",
        "REDACTED_SESSION",
        "REDACTED_EMAIL",
        "REDACTED_PHONE",
        "REDACTED_IP",
        "REDACTED_CC",
        "REDACTED_SSN",
        "REDACTED_AWS",
        "REDACTED_TWILIO",
        "REDACTED_USER",
        "REDACTED",
    ]:
        count = redacted.count(f"[{marker}]")
        if count > 0:
            summary["redactions_made"] += count
            summary["types"].append({"type": marker, "count": count})

    return summary


def main():
    """Test redaction."""
    test_cases = [
        # API keys
        "My API key is api_key=sk-1234567890abcdefghij",
        "Using ANTHROPIC_API_KEY='sk-ant-123456789'",

        # Passwords
        "Connect with password=SuperSecret123!",
        "database_password: 'mydbpass'",

        # Database URLs
        "DATABASE_URL=postgres://user:pass@host:5432/db",
        "mongodb://admin:password123@mongo.example.com/mydb",

        # Tokens
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",

        # Email
        "Contact john.doe@company.com for support",

        # Phone
        "Call us at +1 (555) 123-4567",

        # IP
        "Server IP: 192.168.1.100",

        # Twilio (using obviously fake pattern)
        "TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",

        # Mixed
        """
        config:
          api_key: sk-prod-123456789
          database: postgres://admin:secret@db.example.com/app
          email: admin@company.com
          phone: 555-123-4567
        """,

        # Allowlisted (should NOT be redacted)
        "Connect to localhost:3000 or 127.0.0.1:8080",
        "Send test to test@example.com",
    ]

    print("=" * 60)
    print("Redaction Test")
    print("=" * 60)

    for i, test in enumerate(test_cases, 1):
        print(f"\n[Test {i}]")
        print(f"  Original: {test[:80]}...")
        redacted = redact_sensitive_data(test)
        print(f"  Redacted: {redacted[:80]}...")

        summary = get_redaction_summary(test, redacted)
        if summary["redactions_made"] > 0:
            print(f"  Summary: {summary['redactions_made']} redactions")


if __name__ == "__main__":
    main()
