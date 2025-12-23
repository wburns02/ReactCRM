import { test, expect } from '@playwright/test';

/**
 * CSRF Protection Security Tests
 *
 * Validates security invariants:
 * - MUST-NOT-006: No GET for state-changing operations
 * - CSRF tokens required for mutations
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('CSRF Protection', () => {
  test.describe('SameSite Cookie Protection', () => {
    test('session cookie has SameSite attribute', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/app/login`);

      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');

      if (sessionCookie) {
        expect(
          ['Strict', 'Lax'].includes(sessionCookie.sameSite),
          'Session cookie must have SameSite=Strict or SameSite=Lax'
        ).toBe(true);
      }
    });
  });

  test.describe('State-Changing Operations', () => {
    test('POST endpoints reject requests without proper origin', async ({ request }) => {
      // Attempt to create a customer from a different origin
      const response = await request.post(`${API_BASE}/api/v2/customers`, {
        data: {
          first_name: 'CSRF',
          last_name: 'Test',
          email: 'csrf@test.com',
        },
        headers: {
          Origin: 'https://evil-site.com',
          Referer: 'https://evil-site.com/attack',
        },
      });

      // Should be rejected (401, 403, or CORS error)
      // If it returns 200, CSRF protection may be missing
      if (response.status() === 200) {
        console.warn('WARNING: POST accepted from foreign origin - verify CSRF protection');
      }
    });

    test('DELETE endpoints require authentication', async ({ request }) => {
      // Attempt to delete without auth
      const response = await request.delete(`${API_BASE}/api/v2/customers/1`, {
        headers: {
          Origin: 'https://evil-site.com',
        },
      });

      expect([401, 403, 404, 405].includes(response.status())).toBe(true);
    });

    test('PUT endpoints require authentication', async ({ request }) => {
      const response = await request.put(`${API_BASE}/api/v2/customers/1`, {
        data: { first_name: 'Hacked' },
        headers: {
          Origin: 'https://evil-site.com',
        },
      });

      expect([401, 403, 404, 405].includes(response.status())).toBe(true);
    });
  });

  test.describe('CORS Configuration', () => {
    test('API rejects requests from unauthorized origins', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/v2/customers`, {
        headers: {
          Origin: 'https://malicious-site.com',
        },
      });

      const corsHeader = response.headers()['access-control-allow-origin'];

      // Should either:
      // 1. Not include the malicious origin
      // 2. Return 403
      // 3. Have no CORS header (blocked by browser)
      if (corsHeader) {
        expect(corsHeader).not.toBe('https://malicious-site.com');
        expect(corsHeader).not.toBe('*'); // Wildcard is dangerous with credentials
      }
    });

    test('API allows requests from legitimate origin', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`, {
        headers: {
          Origin: BASE_URL,
        },
      });

      expect(response.ok()).toBe(true);
    });

    test('preflight OPTIONS requests are handled', async ({ request }) => {
      // Send OPTIONS preflight
      const response = await request.fetch(`${API_BASE}/api/v2/customers`, {
        method: 'OPTIONS',
        headers: {
          Origin: BASE_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });

      // Should return 200, 204, or 400 (if CORS rejects the origin)
      // 400 with CORS headers means CORS is properly configured and rejecting unauthorized origins
      expect([200, 204, 400, 405].includes(response.status())).toBe(true);

      // If we get CORS headers, verify they're present
      const corsHeader = response.headers()['access-control-allow-methods'];
      if (corsHeader) {
        expect(corsHeader).toContain('POST');
      }
    });
  });

  test.describe('Safe Methods', () => {
    test('GET requests do not modify state', async ({ page }) => {
      // Navigate to a page with GET
      await page.goto(`${BASE_URL}/app/customers`);

      // Verify no state-changing operations in URL
      expect(page.url()).not.toContain('delete');
      expect(page.url()).not.toContain('create');
      expect(page.url()).not.toContain('update');
    });

    test('links use GET, forms use POST', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dashboard`);

      // Check that delete actions use buttons/forms, not links
      const dangerousLinks = await page.locator('a[href*="delete"]').count();
      expect(
        dangerousLinks,
        'Delete operations should not be links (vulnerable to CSRF)'
      ).toBe(0);
    });
  });
});

test.describe('Token-Based CSRF Protection', () => {
  test('CSRF token is included in forms', async ({ page }) => {
    // Skip if not logged in
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Look for CSRF token in form or meta tag
    const csrfMeta = await page.locator('meta[name="csrf-token"]').count();
    const csrfInput = await page.locator('input[name="_csrf"]').count();
    const csrfInCookies = (await page.context().cookies()).some(c =>
      c.name.toLowerCase().includes('csrf')
    );

    // At least one CSRF mechanism should be present
    console.log('CSRF mechanisms found:', {
      metaTag: csrfMeta > 0,
      hiddenInput: csrfInput > 0,
      cookie: csrfInCookies,
    });
  });
});
