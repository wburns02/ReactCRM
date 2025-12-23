# Security Policy

## Reporting Security Vulnerabilities

**DO NOT** open a public GitHub issue for security vulnerabilities.

Email security issues to: security@macseptic.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and provide a timeline for resolution.

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Protection Priority |
|-------|-------------|---------------------|
| Customer PII (names, addresses, phone) | HIGH | Critical |
| Session tokens / credentials | CRITICAL | Critical |
| API keys (Twilio, Stripe, etc.) | CRITICAL | Critical |
| Work order / job data | MEDIUM | High |
| Internal business metrics | LOW | Medium |

### Threat Actors

1. **External Attackers** - Targeting customer data or API access
2. **Malicious Insiders** - Employees with legitimate access
3. **Automated Bots** - Credential stuffing, scraping
4. **Supply Chain** - Compromised dependencies

### Attack Vectors

| Vector | Mitigation | Status |
|--------|------------|--------|
| XSS (Cross-Site Scripting) | React's JSX auto-escaping, CSP headers | Active |
| CSRF (Cross-Site Request Forgery) | SameSite cookies, CSRF tokens on mutations | Active |
| SQL Injection | SQLAlchemy ORM parameterized queries | Active |
| Webhook Forgery | Twilio signature verification | Active |
| Session Hijacking | HttpOnly, Secure, SameSite=Strict cookies | Active |
| Credential Stuffing | Rate limiting, account lockout | Active |
| Dependency Vulnerabilities | npm audit, Dependabot | Active |

---

## Security Invariants

### MUST (Mandatory Requirements)

```
MUST-001: All API endpoints MUST require authentication (except /health, /login)
MUST-002: All database queries MUST use parameterized queries (no string concatenation)
MUST-003: All user input MUST be validated before processing
MUST-004: All sensitive cookies MUST have HttpOnly, Secure, SameSite=Strict
MUST-005: All webhook endpoints MUST verify signatures before processing
MUST-006: All API responses MUST NOT leak stack traces in production
MUST-007: All file uploads MUST be scanned and type-validated
MUST-008: All secrets MUST be stored in environment variables, never in code
MUST-009: All password storage MUST use bcrypt with cost factor >= 12
MUST-010: All session tokens MUST expire within 24 hours of inactivity
```

### MUST NOT (Prohibited Actions)

```
MUST-NOT-001: MUST NOT log sensitive data (passwords, tokens, PII)
MUST-NOT-002: MUST NOT expose internal error details to users
MUST-NOT-003: MUST NOT use eval() or dynamic code execution
MUST-NOT-004: MUST NOT store credentials in localStorage
MUST-NOT-005: MUST NOT trust client-side validation alone
MUST-NOT-006: MUST NOT use GET requests for state-changing operations
MUST-NOT-007: MUST NOT disable HTTPS in production
MUST-NOT-008: MUST NOT use deprecated/insecure crypto algorithms
MUST-NOT-009: MUST NOT commit secrets to version control
MUST-NOT-010: MUST NOT bypass authentication for "convenience"
```

---

## CSRF Protection Protocol

### Cookie Configuration

```python
# Backend (FastAPI)
SESSION_COOKIE_CONFIG = {
    "httponly": True,
    "secure": True,  # HTTPS only
    "samesite": "strict",  # Prevents cross-origin requests
    "max_age": 86400,  # 24 hours
    "path": "/",
    "domain": None,  # Same domain only
}
```

### CSRF Token Requirements

| Operation | CSRF Token Required | Method |
|-----------|---------------------|--------|
| GET (read) | No | Query params |
| POST (create) | Yes | X-CSRF-Token header |
| PUT (update) | Yes | X-CSRF-Token header |
| PATCH (partial update) | Yes | X-CSRF-Token header |
| DELETE | Yes | X-CSRF-Token header |

### Implementation

```typescript
// Frontend - API client
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // Send cookies
});

// Add CSRF token to mutating requests
apiClient.interceptors.request.use((config) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1];
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});
```

---

## Webhook Security Protocol

### Twilio Webhook Signature Verification

**ALL Twilio webhooks MUST verify signatures before processing.**

```python
# Backend verification (FastAPI)
from twilio.request_validator import RequestValidator

def verify_twilio_signature(request: Request) -> bool:
    """
    Verify Twilio webhook signature.
    MUST be called before processing ANY Twilio webhook.
    """
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)

    # Get signature from header
    signature = request.headers.get('X-Twilio-Signature', '')

    # Construct full URL
    url = str(request.url)

    # Get POST params
    params = await request.form()

    # Validate
    is_valid = validator.validate(url, dict(params), signature)

    if not is_valid:
        logger.warning(f"Invalid Twilio signature from {request.client.host}")
        raise HTTPException(status_code=403, detail="Invalid signature")

    return True

# Usage in webhook endpoint
@router.post("/webhooks/twilio/incoming")
async def twilio_incoming(request: Request):
    await verify_twilio_signature(request)  # MUST call first
    # ... process webhook
```

### Stripe Webhook Signature Verification

```python
import stripe

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(403, "Invalid signature")

    # Process verified event
    handle_stripe_event(event)
```

### Webhook Security Checklist

- [ ] Signature verified before ANY processing
- [ ] Webhook secrets stored in environment variables
- [ ] Failed verifications logged with source IP
- [ ] Replay attacks prevented (timestamp validation)
- [ ] Rate limiting applied to webhook endpoints

---

## Incident Response Plan

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P0 - Critical | Active breach, data exfiltration | Immediate | Credentials leaked, active attack |
| P1 - High | Security vulnerability exploitable | 4 hours | SQL injection discovered |
| P2 - Medium | Security issue with limited impact | 24 hours | Missing rate limiting |
| P3 - Low | Security improvement needed | 1 week | Outdated dependency |

### Response Procedures

#### P0 - Critical Incident

1. **Contain** (0-15 min)
   - Disable affected endpoints/services
   - Rotate compromised credentials immediately
   - Enable enhanced logging

2. **Assess** (15-60 min)
   - Determine scope of breach
   - Identify affected data/users
   - Document timeline

3. **Remediate** (1-24 hours)
   - Patch vulnerability
   - Reset affected user sessions
   - Notify affected users (if required by law)

4. **Review** (24-72 hours)
   - Post-incident report
   - Update security measures
   - Conduct lessons learned

### Contact Chain

1. On-call engineer (PagerDuty)
2. Security lead
3. CTO
4. Legal (if data breach)

---

## Security Testing

### Automated Security Checks

| Check | Tool | Frequency | Location |
|-------|------|-----------|----------|
| Dependency vulnerabilities | npm audit | Every build | CI/CD |
| Static analysis | ESLint security rules | Every commit | Pre-commit hook |
| Secret detection | gitleaks | Every commit | Pre-commit hook |
| OWASP Top 10 | ZAP (manual) | Monthly | Staging |

### Security Test Files

```
e2e/security/
├── auth.security.spec.ts      # Authentication bypass tests
├── csrf.security.spec.ts      # CSRF protection tests
├── injection.security.spec.ts # Injection prevention tests
├── session.security.spec.ts   # Session security tests
└── webhook.security.spec.ts   # Webhook signature tests
```

### Running Security Tests

```bash
# Run all security tests
npm run test:security

# Run specific security test
npx playwright test e2e/security/csrf.security.spec.ts
```

---

## Secure Development Guidelines

### Code Review Security Checklist

Before approving any PR, verify:

- [ ] No hardcoded secrets or credentials
- [ ] All user input is validated
- [ ] Database queries use parameterized statements
- [ ] Sensitive operations require authentication
- [ ] Error messages don't leak internal details
- [ ] New dependencies have been security-reviewed
- [ ] CSRF protection maintained for mutations
- [ ] Logging doesn't include sensitive data

### Pre-Commit Hooks

```bash
# .husky/pre-commit
npm run lint
npm run type-check
npx gitleaks detect --source . --verbose
```

### Environment Security

| Environment | Security Level | Access Control |
|-------------|---------------|----------------|
| Production | Maximum | 2 engineers + CTO only |
| Staging | High | Engineering team |
| Development | Standard | All developers |
| Local | Developer | Individual |

---

## Compliance

### Data Protection

- **GDPR**: EU customer data handled per GDPR requirements
- **CCPA**: California customer data includes opt-out rights
- **PCI-DSS**: Payment data handled via Stripe (PCI compliant)

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Customer records | 7 years | Soft delete, then hard delete |
| Session tokens | 24 hours inactive | Automatic expiry |
| Audit logs | 2 years | Automated archival |
| Backups | 90 days | Automated rotation |

---

## Related Documentation

- [Troubleshooting & Self-Healing](docs/TROUBLESHOOTING_SELF_HEAL.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Initial security policy created | Claude |
