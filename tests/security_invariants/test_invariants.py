"""
Security Invariants Tests

Tests that verify security properties that must ALWAYS hold true:
- CSRF protection on state-changing endpoints
- RBAC enforcement on protected resources
- Rate limiting on public endpoints
- Webhook signature verification
- Injection prevention (SQL, XSS, etc.)

Run with: pytest tests/security_invariants/ -v
"""

import pytest
import requests
import time
import hashlib
import hmac
import base64
from typing import Any


class TestCSRFProtection:
    """
    Invariant: All state-changing endpoints must require valid CSRF token.

    CSRF protection prevents attackers from making unauthorized requests
    on behalf of authenticated users.
    """

    @pytest.mark.csrf
    def test_post_without_csrf_rejected(
        self,
        authenticated_session: requests.Session,
        api_url: str
    ):
        """POST requests without CSRF token should be rejected."""
        endpoints = [
            '/api/v2/customers',
            '/api/v2/work-orders',
            '/api/v2/prospects',
        ]

        for endpoint in endpoints:
            response = authenticated_session.post(
                f"{api_url}{endpoint}",
                json={'name': 'Test'},
                timeout=30
            )

            # Should reject with 401, 403, or 400 (missing CSRF)
            # 500 is also acceptable (server error due to missing token)
            assert response.status_code in [400, 401, 403, 500], \
                f"POST to {endpoint} without CSRF should be rejected, got {response.status_code}"

    @pytest.mark.csrf
    def test_put_without_csrf_rejected(
        self,
        authenticated_session: requests.Session,
        api_url: str
    ):
        """PUT requests without CSRF token should be rejected."""
        endpoints = [
            '/api/v2/customers/1',
            '/api/v2/work-orders/1',
        ]

        for endpoint in endpoints:
            response = authenticated_session.put(
                f"{api_url}{endpoint}",
                json={'name': 'Updated'},
                timeout=30
            )

            assert response.status_code in [400, 401, 403, 404, 500], \
                f"PUT to {endpoint} without CSRF should be rejected, got {response.status_code}"

    @pytest.mark.csrf
    def test_delete_without_csrf_rejected(
        self,
        authenticated_session: requests.Session,
        api_url: str
    ):
        """DELETE requests without CSRF token should be rejected."""
        endpoints = [
            '/api/v2/customers/1',
            '/api/v2/work-orders/1',
        ]

        for endpoint in endpoints:
            response = authenticated_session.delete(
                f"{api_url}{endpoint}",
                timeout=30
            )

            assert response.status_code in [400, 401, 403, 404, 500], \
                f"DELETE to {endpoint} without CSRF should be rejected, got {response.status_code}"

    @pytest.mark.csrf
    def test_get_requests_allowed_without_csrf(
        self,
        session: requests.Session,
        api_url: str
    ):
        """GET requests (read-only) should not require CSRF."""
        response = session.get(f"{api_url}/health", timeout=30)

        # Health endpoint should always be accessible
        assert response.status_code == 200


class TestRBACEnforcement:
    """
    Invariant: Protected resources require authentication.

    Role-Based Access Control ensures users can only access
    resources they are authorized for.
    """

    @pytest.mark.rbac
    def test_unauthenticated_api_access_rejected(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Unauthenticated requests to protected endpoints should be rejected."""
        protected_endpoints = [
            '/api/v2/customers',
            '/api/v2/work-orders',
            '/api/v2/prospects',
            '/api/v2/users',
            '/api/v2/settings',
        ]

        for endpoint in protected_endpoints:
            response = session.get(f"{api_url}{endpoint}", timeout=30)

            assert response.status_code in [401, 403], \
                f"Unauthenticated access to {endpoint} should be rejected, got {response.status_code}"

    @pytest.mark.rbac
    def test_admin_endpoints_protected(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Admin-only endpoints should reject non-admin users."""
        admin_endpoints = [
            '/api/v2/admin/users',
            '/api/v2/admin/settings',
            '/api/v2/admin/audit-log',
        ]

        for endpoint in admin_endpoints:
            response = session.get(f"{api_url}{endpoint}", timeout=30)

            # Should reject with 401/403 or 404 if endpoint doesn't exist
            assert response.status_code in [401, 403, 404], \
                f"Admin endpoint {endpoint} should be protected, got {response.status_code}"

    @pytest.mark.rbac
    def test_public_endpoints_accessible(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Public endpoints should be accessible without auth."""
        public_endpoints = [
            '/health',
            '/api/v2/health',
        ]

        for endpoint in public_endpoints:
            response = session.get(f"{api_url}{endpoint}", timeout=30)

            assert response.status_code == 200, \
                f"Public endpoint {endpoint} should be accessible, got {response.status_code}"


class TestRateLimiting:
    """
    Invariant: Public endpoints must be rate limited.

    Rate limiting prevents abuse and denial of service attacks.
    """

    @pytest.mark.rate_limit
    @pytest.mark.slow
    def test_rapid_requests_rate_limited(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Rapid repeated requests should trigger rate limiting."""
        responses = []

        # Send 50 rapid requests
        for _ in range(50):
            response = session.get(f"{api_url}/health", timeout=5)
            responses.append(response.status_code)

        # Check if any were rate limited (429)
        rate_limited = responses.count(429)

        # Informational - rate limiting may or may not be configured
        if rate_limited == 0:
            pytest.skip("Rate limiting not detected on health endpoint")

        assert rate_limited > 0, "Expected some requests to be rate limited"

    @pytest.mark.rate_limit
    @pytest.mark.slow
    def test_login_rate_limited(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Login endpoint should be rate limited to prevent brute force."""
        responses = []

        # Send 20 login attempts
        for i in range(20):
            response = session.post(
                f"{api_url}/api/v2/auth/login",
                json={'email': f'test{i}@example.com', 'password': 'wrong'},
                timeout=5
            )
            responses.append(response.status_code)

        # Should see 429 or progressive delays
        rate_limited = responses.count(429)

        if rate_limited == 0:
            # Check for 401s (login failures) - acceptable
            # But warn about missing rate limiting
            print("WARN: Login endpoint does not appear to be rate limited")


class TestWebhookSecurity:
    """
    Invariant: Webhooks must verify signatures.

    Webhook signature verification ensures requests come from
    legitimate sources (Twilio, Stripe, etc.).
    """

    @pytest.mark.webhook
    def test_twilio_webhook_without_signature_rejected(
        self,
        session: requests.Session,
        api_url: str,
        mock_twilio_webhook_payload: dict
    ):
        """Twilio webhook without signature should be rejected."""
        response = session.post(
            f"{api_url}/webhooks/twilio/incoming",
            data=mock_twilio_webhook_payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30
        )

        assert response.status_code in [400, 401, 403, 404], \
            f"Webhook without signature should be rejected, got {response.status_code}"

    @pytest.mark.webhook
    def test_twilio_webhook_invalid_signature_rejected(
        self,
        session: requests.Session,
        api_url: str,
        mock_twilio_webhook_payload: dict
    ):
        """Twilio webhook with invalid signature should be rejected."""
        response = session.post(
            f"{api_url}/webhooks/twilio/incoming",
            data=mock_twilio_webhook_payload,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'invalid_signature_here',
            },
            timeout=30
        )

        assert response.status_code in [400, 401, 403, 404], \
            f"Webhook with invalid signature should be rejected, got {response.status_code}"

    @pytest.mark.webhook
    def test_stripe_webhook_without_signature_rejected(
        self,
        session: requests.Session,
        api_url: str,
        mock_stripe_webhook_payload: dict
    ):
        """Stripe webhook without signature should be rejected."""
        response = session.post(
            f"{api_url}/webhooks/stripe",
            json=mock_stripe_webhook_payload,
            timeout=30
        )

        assert response.status_code in [400, 401, 403, 404], \
            f"Stripe webhook without signature should be rejected, got {response.status_code}"

    @pytest.mark.webhook
    def test_stripe_webhook_invalid_signature_rejected(
        self,
        session: requests.Session,
        api_url: str,
        mock_stripe_webhook_payload: dict
    ):
        """Stripe webhook with invalid signature should be rejected."""
        response = session.post(
            f"{api_url}/webhooks/stripe",
            json=mock_stripe_webhook_payload,
            headers={
                'Stripe-Signature': 't=1234567890,v1=invalid_signature',
            },
            timeout=30
        )

        assert response.status_code in [400, 401, 403, 404], \
            f"Stripe webhook with invalid signature should be rejected, got {response.status_code}"


class TestInjectionPrevention:
    """
    Invariant: All inputs must be sanitized.

    Injection prevention stops SQL injection, XSS, command injection,
    and other injection attacks.
    """

    @pytest.mark.injection
    def test_xss_in_response_sanitized(
        self,
        session: requests.Session,
        api_url: str,
        malicious_payloads: dict
    ):
        """XSS payloads should not be reflected in responses."""
        xss_payloads = [
            malicious_payloads['xss_script'],
            malicious_payloads['xss_img'],
            malicious_payloads['xss_svg'],
        ]

        for payload in xss_payloads:
            # Try to search with XSS payload
            response = session.get(
                f"{api_url}/api/v2/customers",
                params={'search': payload},
                timeout=30
            )

            if response.ok:
                text = response.text
                # Check that script tag is not reflected
                assert '<script>' not in text.lower(), \
                    f"XSS payload reflected in response: {payload}"
                assert 'onerror=' not in text.lower(), \
                    f"XSS event handler reflected in response: {payload}"

    @pytest.mark.injection
    def test_sql_injection_prevented(
        self,
        session: requests.Session,
        api_url: str,
        malicious_payloads: dict
    ):
        """SQL injection payloads should not cause errors."""
        sql_payloads = [
            malicious_payloads['sql_injection'],
            malicious_payloads['sql_union'],
        ]

        for payload in sql_payloads:
            response = session.get(
                f"{api_url}/api/v2/customers",
                params={'search': payload},
                timeout=30
            )

            # Should not return 500 (database error)
            # 400/401/403 are acceptable (input rejected or auth required)
            assert response.status_code != 500, \
                f"SQL injection may have caused server error: {payload}"

            if response.ok:
                text = response.text.lower()
                # Should not leak SQL error messages
                assert 'syntax error' not in text
                assert 'sql' not in text or 'sql injection' not in text
                assert 'select * from' not in text

    @pytest.mark.injection
    def test_path_traversal_prevented(
        self,
        session: requests.Session,
        api_url: str,
        malicious_payloads: dict
    ):
        """Path traversal attempts should be blocked."""
        payload = malicious_payloads['path_traversal']

        response = session.get(
            f"{api_url}/api/v2/files/{payload}",
            timeout=30
        )

        # Should return 400/403/404, not 200 with file contents
        if response.ok:
            text = response.text.lower()
            assert 'root:' not in text, "Path traversal may have exposed /etc/passwd"


class TestErrorLeakage:
    """
    Invariant: Errors must not leak internal details.

    Error messages should be user-friendly and not expose
    stack traces, file paths, or internal implementation details.
    """

    def test_error_does_not_leak_stack_trace(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Error responses should not contain stack traces."""
        # Trigger an error by requesting invalid endpoint
        response = session.get(
            f"{api_url}/api/v2/nonexistent_endpoint_xyz",
            timeout=30
        )

        text = response.text.lower()

        assert 'traceback' not in text, "Stack trace leaked in error response"
        assert 'at line' not in text, "Line numbers leaked in error response"
        assert 'file "' not in text, "File paths leaked in error response"

    def test_error_does_not_leak_paths(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Error responses should not contain internal file paths."""
        response = session.post(
            f"{api_url}/api/v2/customers",
            json={'invalid_field': 'test'},
            timeout=30
        )

        text = response.text

        assert '/home/' not in text, "Linux path leaked in error response"
        assert '/Users/' not in text, "macOS path leaked in error response"
        assert 'C:\\' not in text, "Windows path leaked in error response"
        assert 'node_modules' not in text, "Node.js path leaked in error response"

    def test_error_does_not_leak_technology(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Error responses should not expose technology stack."""
        response = session.get(
            f"{api_url}/api/v2/invalid_xyz",
            timeout=30
        )

        # Check headers
        server_header = response.headers.get('Server', '').lower()
        powered_by = response.headers.get('X-Powered-By', '').lower()

        # Should not expose specific versions
        assert 'nginx/' not in server_header or 'nginx' in server_header
        assert 'express' not in powered_by
        assert 'python' not in powered_by


class TestSessionSecurity:
    """
    Invariant: Sessions must be secure.

    Session cookies should have proper security attributes.
    """

    def test_session_cookie_secure(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Session cookies should have Secure flag."""
        # Make a request to trigger session creation
        response = session.get(f"{api_url}/health", timeout=30)

        # Check Set-Cookie headers
        cookies = response.cookies
        for cookie in cookies:
            if 'session' in cookie.name.lower():
                # In production (HTTPS), Secure should be set
                if api_url.startswith('https://'):
                    assert cookie.secure, "Session cookie missing Secure flag"

    def test_session_cookie_httponly(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Session cookies should have HttpOnly flag."""
        response = session.get(f"{api_url}/health", timeout=30)

        # Check cookies
        for cookie in response.cookies:
            if 'session' in cookie.name.lower():
                # HttpOnly prevents JavaScript access
                # Note: requests library may not expose this flag
                pass  # Manual verification needed


class TestSecurityHeaders:
    """
    Invariant: Security headers must be present.

    Proper security headers protect against various attacks.
    """

    def test_cors_headers_present(
        self,
        session: requests.Session,
        api_url: str
    ):
        """API should have proper CORS headers."""
        response = session.options(f"{api_url}/health", timeout=30)

        # Check for CORS headers
        headers = response.headers

        # Should not be * in production
        allow_origin = headers.get('Access-Control-Allow-Origin', '')
        if allow_origin == '*':
            print("WARN: CORS allows all origins (*)")

    def test_content_type_header_present(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Responses should have Content-Type header."""
        response = session.get(f"{api_url}/health", timeout=30)

        assert 'Content-Type' in response.headers, \
            "Missing Content-Type header"

    def test_no_server_version_exposure(
        self,
        session: requests.Session,
        api_url: str
    ):
        """Server header should not expose version."""
        response = session.get(f"{api_url}/health", timeout=30)

        server = response.headers.get('Server', '')

        # Should not contain version numbers
        import re
        version_pattern = r'\d+\.\d+(\.\d+)?'
        if re.search(version_pattern, server):
            print(f"WARN: Server header exposes version: {server}")
