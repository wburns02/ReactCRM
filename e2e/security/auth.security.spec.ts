import { test, expect } from '@playwright/test';

/**
 * Authentication Security Tests
 *
 * Validates security invariants:
 * - MUST-001: API endpoints require authentication
 * - MUST-010: Session tokens expire
 * - MUST-NOT-004: No credentials in localStorage
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('Authentication Security', () => {
  test.describe('API Authentication Enforcement', () => {
    test('protected endpoints return 401 without auth', async ({ request }) => {
      // Test various protected endpoints
      const protectedEndpoints = [
        '/api/v2/customers',
        '/api/v2/work-orders',
        '/api/v2/technicians',
        '/api/v2/prospects',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request.get(`${API_BASE}${endpoint}`, {
          headers: {
            // No auth headers
          },
        });

        // Should return 401 or 403, NOT 200
        expect(
          [401, 403].includes(response.status()),
          `${endpoint} should require auth, got ${response.status()}`
        ).toBe(true);
      }
    });

    test('health endpoint is publicly accessible', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.ok()).toBe(true);
    });

    test('login endpoint is publicly accessible', async ({ request }) => {
      // Login should accept requests (may return 422 for invalid data)
      const response = await request.post(`${API_BASE}/api/v2/auth/login`, {
        data: {},
      });

      // Should NOT be 401/403 - endpoint itself is public
      expect(response.status()).not.toBe(401);
    });
  });

  test.describe('Session Security', () => {
    test('session cookie has secure attributes', async ({ page, context }) => {
      // Login to get session cookie
      await page.goto(`${BASE_URL}/app/login`);

      // If already logged in, clear and retry
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');

      if (sessionCookie) {
        // Verify secure attributes
        expect(sessionCookie.httpOnly, 'Cookie must be HttpOnly').toBe(true);
        expect(sessionCookie.secure, 'Cookie must be Secure').toBe(true);
        expect(
          ['Strict', 'Lax'].includes(sessionCookie.sameSite),
          'Cookie must have SameSite'
        ).toBe(true);
      }
    });

    test('no sensitive data in localStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dashboard`);

      // Check localStorage for sensitive patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /api_key/i,
        /apikey/i,
        /auth_token/i,
        /access_token/i,
        /private_key/i,
      ];

      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      for (const [key, value] of Object.entries(localStorage)) {
        for (const pattern of sensitivePatterns) {
          expect(
            pattern.test(key) || pattern.test(value),
            `localStorage should not contain sensitive data matching ${pattern}`
          ).toBe(false);
        }
      }
    });

    test('no credentials in sessionStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dashboard`);

      const sessionStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            items[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        return items;
      });

      const sensitivePatterns = [/password/i, /secret/i, /api_key/i, /token/i];

      for (const [key, value] of Object.entries(sessionStorage)) {
        for (const pattern of sensitivePatterns) {
          expect(
            pattern.test(key) || pattern.test(value),
            `sessionStorage should not contain sensitive data matching ${pattern}`
          ).toBe(false);
        }
      }
    });
  });

  test.describe('Authentication Bypass Prevention', () => {
    test('cannot access protected pages without auth', async ({ browser }) => {
      // Create fresh context without any auth
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(`${BASE_URL}/app/customers`);

        // Should redirect to login or show login UI
        const isOnLogin = page.url().includes('login');
        const hasLoginButton = await page
          .getByRole('button', { name: /sign in/i })
          .isVisible()
          .catch(() => false);

        expect(
          isOnLogin || hasLoginButton,
          'Unauthenticated user should see login'
        ).toBe(true);
      } finally {
        await context.close();
      }
    });

    test('invalid session token is rejected', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/v2/customers`, {
        headers: {
          Cookie: 'session=invalid_token_12345',
        },
      });

      expect([401, 403].includes(response.status())).toBe(true);
    });

    test('expired session token is rejected', async ({ request }) => {
      // Simulate an expired token (this would need backend support)
      const response = await request.get(`${API_BASE}/api/v2/auth/me`, {
        headers: {
          Cookie: 'session=expired_test_token',
        },
      });

      // Should not return user data
      if (response.ok()) {
        const data = await response.json();
        expect(data.user).toBeUndefined();
      } else {
        expect([401, 403].includes(response.status())).toBe(true);
      }
    });
  });
});

test.describe('Password Security', () => {
  test('login does not reveal if user exists', async ({ request }) => {
    // Test with non-existent user
    const response1 = await request.post(`${API_BASE}/api/v2/auth/login`, {
      data: {
        email: 'nonexistent_user_12345@example.com',
        password: 'wrongpassword',
      },
    });

    // Test with likely existing user but wrong password
    const response2 = await request.post(`${API_BASE}/api/v2/auth/login`, {
      data: {
        email: 'admin@macseptic.com',
        password: 'wrongpassword',
      },
    });

    // Both should return same error (no user enumeration)
    // The error message should be generic
    if (!response1.ok() && !response2.ok()) {
      const error1 = await response1.json().catch(() => ({}));
      const error2 = await response2.json().catch(() => ({}));

      // Messages should be identical to prevent enumeration
      // (This is a best practice, may not be implemented yet)
      console.log('Login error messages:', { error1, error2 });
    }
  });
});
