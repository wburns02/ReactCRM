"""
Security Invariants Test Configuration

Pytest fixtures for security invariant testing.
"""

import os
import pytest
import requests
from typing import Generator, Any

# Configuration
API_URL = os.environ.get('API_URL', 'https://react-crm-api-production.up.railway.app')
BASE_URL = os.environ.get('BASE_URL', 'https://react.ecbtx.com/app')
TEST_TIMEOUT = 30


@pytest.fixture(scope="session")
def api_url() -> str:
    """Return the API URL for testing."""
    return API_URL


@pytest.fixture(scope="session")
def base_url() -> str:
    """Return the frontend base URL for testing."""
    return BASE_URL


@pytest.fixture(scope="session")
def session() -> Generator[requests.Session, None, None]:
    """Create a requests session for API testing."""
    with requests.Session() as sess:
        sess.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        })
        yield sess


@pytest.fixture(scope="session")
def authenticated_session(session: requests.Session, api_url: str) -> requests.Session:
    """
    Create an authenticated session if test credentials are available.

    Note: In CI, this may return an unauthenticated session.
    Tests should handle 401/403 gracefully.
    """
    test_email = os.environ.get('TEST_USER_EMAIL')
    test_password = os.environ.get('TEST_USER_PASSWORD')

    if test_email and test_password:
        try:
            response = session.post(
                f"{api_url}/api/v2/auth/login",
                json={'email': test_email, 'password': test_password},
                timeout=TEST_TIMEOUT
            )
            if response.ok:
                # Session cookies are automatically stored
                pass
        except Exception:
            pass  # Continue with unauthenticated session

    return session


@pytest.fixture
def csrf_token(authenticated_session: requests.Session, api_url: str) -> str | None:
    """
    Fetch a CSRF token from the API.

    Returns None if CSRF is not implemented or unavailable.
    """
    try:
        response = authenticated_session.get(
            f"{api_url}/api/v2/auth/csrf",
            timeout=TEST_TIMEOUT
        )
        if response.ok:
            data = response.json()
            return data.get('csrf_token') or data.get('token')
    except Exception:
        pass
    return None


@pytest.fixture
def mock_twilio_webhook_payload() -> dict[str, str]:
    """Return a mock Twilio webhook payload for testing."""
    return {
        'MessageSid': 'SM_TEST_INVARIANT_123',
        'AccountSid': 'AC_TEST_ACCOUNT',
        'From': '+15551234567',
        'To': '+15559876543',
        'Body': 'Security invariant test message',
        'NumMedia': '0',
    }


@pytest.fixture
def mock_stripe_webhook_payload() -> dict[str, Any]:
    """Return a mock Stripe webhook payload for testing."""
    return {
        'id': 'evt_test_invariant_123',
        'type': 'payment_intent.succeeded',
        'data': {
            'object': {
                'id': 'pi_test_123',
                'amount': 10000,
                'currency': 'usd',
                'status': 'succeeded',
            }
        }
    }


@pytest.fixture
def malicious_payloads() -> dict[str, str]:
    """Return common malicious payloads for security testing."""
    return {
        'xss_script': '<script>alert("xss")</script>',
        'xss_img': '<img src=x onerror=alert("xss")>',
        'xss_svg': '<svg onload=alert("xss")>',
        'sql_injection': "'; DROP TABLE users; --",
        'sql_union': "' UNION SELECT * FROM users --",
        'path_traversal': '../../../etc/passwd',
        'command_injection': '; cat /etc/passwd',
        'ldap_injection': '*)(objectClass=*',
        'xml_entity': '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        'ssti': '{{7*7}}',
        'nosql_injection': '{"$gt": ""}',
    }


@pytest.fixture
def rate_limit_config() -> dict[str, int]:
    """Return expected rate limit configuration."""
    return {
        'requests_per_minute': 60,
        'requests_per_hour': 1000,
        'webhook_requests_per_minute': 100,
    }


# Test markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "csrf: marks tests that verify CSRF protection"
    )
    config.addinivalue_line(
        "markers", "rbac: marks tests that verify role-based access control"
    )
    config.addinivalue_line(
        "markers", "rate_limit: marks tests that verify rate limiting"
    )
    config.addinivalue_line(
        "markers", "webhook: marks tests that verify webhook security"
    )
    config.addinivalue_line(
        "markers", "injection: marks tests that verify injection protection"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow running"
    )
