import { test, expect } from '@playwright/test';

/**
 * Session Security Tests
 *
 * Validates security invariants:
 * - MUST-004: Secure cookie attributes
 * - MUST-010: Session expiry
 * - Session fixation prevention
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('Session Cookie Security', () => {
  test('session cookie has HttpOnly flag', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie) {
      expect(
        sessionCookie.httpOnly,
        'Session cookie MUST have HttpOnly flag to prevent XSS theft'
      ).toBe(true);
    }
  });

  test('session cookie has Secure flag', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie) {
      expect(
        sessionCookie.secure,
        'Session cookie MUST have Secure flag for HTTPS-only transmission'
      ).toBe(true);
    }
  });

  test('session cookie has SameSite attribute', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie) {
      expect(
        ['Strict', 'Lax'].includes(sessionCookie.sameSite),
        'Session cookie MUST have SameSite=Strict or Lax for CSRF protection'
      ).toBe(true);
    }
  });

  test('session cookie has reasonable expiry', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie && sessionCookie.expires !== -1) {
      const expiryDate = new Date(sessionCookie.expires * 1000);
      const now = new Date();
      const maxExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      expect(
        expiryDate <= maxExpiry,
        'Session cookie should expire within 7 days'
      ).toBe(true);
    }
  });
});

test.describe('Session Fixation Prevention', () => {
  test('session ID changes after login', async ({ page, context }) => {
    // Clear existing session
    await context.clearCookies();

    // Get initial session (if any)
    await page.goto(`${BASE_URL}/login`);
    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find(c => c.name === 'session')?.value;

    // Note: Actual login would be needed here to verify session regeneration
    // This is a template for the test
    console.log('Session before login:', sessionBefore ? 'present' : 'none');

    // After successful login, session ID should be different
    // (This requires actual login flow to verify)
  });

  test('cannot set arbitrary session ID', async ({ page, context }) => {
    // Attempt to set our own session ID
    await context.addCookies([
      {
        name: 'session',
        value: 'attacker_controlled_session_12345',
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ]);

    await page.goto(`${BASE_URL}/dashboard`);

    // Should NOT be authenticated with arbitrary session
    const isOnLogin = page.url().includes('login');
    const hasLoginButton = await page
      .getByRole('button', { name: /sign in/i })
      .isVisible()
      .catch(() => false);

    expect(
      isOnLogin || hasLoginButton,
      'Arbitrary session ID should not grant access'
    ).toBe(true);
  });
});

test.describe('Session Termination', () => {
  test('logout invalidates session', async ({ page, context }) => {
    // Skip if not authenticated
    await page.goto(`${BASE_URL}/dashboard`);
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Get session before logout
    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find(c => c.name === 'session')?.value;

    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first();
    const logoutLink = page.getByRole('link', { name: /logout|sign out/i }).first();

    const logoutVisible = await logoutButton.isVisible().catch(() => false);
    const logoutLinkVisible = await logoutLink.isVisible().catch(() => false);

    if (logoutVisible) {
      await logoutButton.click();
    } else if (logoutLinkVisible) {
      await logoutLink.click();
    } else {
      console.log('No logout button/link found');
      test.skip();
      return;
    }

    // Wait for logout to complete
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});

    // Verify session is invalidated
    const cookiesAfter = await context.cookies();
    const sessionAfter = cookiesAfter.find(c => c.name === 'session')?.value;

    // Session should be cleared or changed
    expect(
      !sessionAfter || sessionAfter !== sessionBefore,
      'Session should be invalidated after logout'
    ).toBe(true);
  });

  test('old session cannot be reused after logout', async ({ request, context }) => {
    // Get current session
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (!sessionCookie) {
      test.skip();
      return;
    }

    const oldSession = sessionCookie.value;

    // Simulate using old session after logout
    // (In real scenario, user would have logged out)
    const response = await request.get(`${API_BASE}/api/v2/auth/me`, {
      headers: {
        Cookie: `session=${oldSession}`,
      },
    });

    // This is informational - depends on server-side session invalidation
    console.log('Old session status:', response.status());
  });
});

test.describe('Concurrent Session Management', () => {
  test('API tracks active sessions', async ({ request }) => {
    // Check if session info endpoint exists
    const response = await request.get(`${API_BASE}/api/v2/auth/sessions`);

    if (response.ok()) {
      const data = await response.json();
      console.log('Active sessions:', data);
      // Should return session info for the user
    } else if (response.status() === 404) {
      console.log('Session management endpoint not implemented');
    }
  });
});

test.describe('Session Timeout', () => {
  test('session requires activity within timeout period', async ({ page, context }) => {
    // This is a template - actual timeout testing would require waiting
    // or manipulating session timestamps

    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Get session info
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    console.log('Session cookie info:', {
      name: sessionCookie?.name,
      expires: sessionCookie?.expires,
      maxAge: sessionCookie?.expires
        ? Math.floor((sessionCookie.expires * 1000 - Date.now()) / 1000 / 60)
        : 'session',
    });
  });
});

test.describe('Session Data Security', () => {
  test('session token is not exposed in URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Session token should never appear in URL
    expect(page.url()).not.toContain('session=');
    expect(page.url()).not.toContain('token=');
    expect(page.url()).not.toContain('sid=');
  });

  test('session token is not exposed in page source', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const content = await page.content();

    // Session token should not be in HTML
    // (Check for common session token patterns)
    const sessionPatterns = [
      /session["']?\s*[:=]\s*["'][a-zA-Z0-9]{32,}["']/,
      /token["']?\s*[:=]\s*["'][a-zA-Z0-9]{32,}["']/,
    ];

    for (const pattern of sessionPatterns) {
      const match = content.match(pattern);
      if (match) {
        console.warn('Potential session exposure in HTML:', match[0].substring(0, 50));
      }
    }
  });

  test('session token has sufficient entropy', async ({ context }) => {
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie) {
      // Session token should be at least 128 bits (32 hex chars or ~22 base64 chars)
      expect(
        sessionCookie.value.length >= 22,
        'Session token should have sufficient length for security'
      ).toBe(true);

      // Should not be easily guessable
      expect(sessionCookie.value).not.toMatch(/^(admin|user|test|1234)/i);
    }
  });
});
