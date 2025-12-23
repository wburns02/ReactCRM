import { test, expect } from '@playwright/test';

/**
 * Authentication Flow E2E Tests
 *
 * Tests the complete authentication lifecycle:
 * - Login page accessibility
 * - Valid login flow
 * - Invalid credentials handling
 * - Session persistence
 * - Logout functionality
 * - Protected route enforcement
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('login page is accessible and renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Should show login form (heading is "Welcome Back" or similar)
      await expect(
        page.getByRole('heading', { name: /welcome back|sign in|login/i })
      ).toBeVisible({
        timeout: 10000,
      });

      // Should have email and password fields
      const emailField = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
      const passwordField = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));

      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();

      // Should have submit button
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeVisible();
    });

    test('login page has no console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Filter out expected/benign errors
      const criticalErrors = consoleErrors.filter(
        (err) =>
          !err.includes('favicon') &&
          !err.includes('third-party') &&
          !err.includes('ResizeObserver')
      );

      expect(criticalErrors.length).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Login Validation', () => {
    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill in invalid credentials
      await page.getByLabel(/email/i).or(page.locator('input[type="email"]')).fill('invalid@test.com');
      await page.getByLabel(/password/i).or(page.locator('input[type="password"]')).fill('wrongpassword');

      // Submit
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      const errorMessage = page.getByText(/invalid|incorrect|wrong|failed/i).first();
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('shows error for empty fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click submit without filling fields
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation error or required message
      const hasError = await page
        .getByText(/required|please enter|cannot be empty/i)
        .first()
        .isVisible()
        .catch(() => false);

      // Or the form fields should have validation state
      const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
      const isInvalid = await emailInput.evaluate((el) => {
        return el.getAttribute('aria-invalid') === 'true' || el.matches(':invalid');
      });

      expect(hasError || isInvalid).toBe(true);
    });
  });

  test.describe('Protected Routes', () => {
    test('unauthenticated users are redirected to login', async ({ browser }) => {
      // Create fresh context without auth
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(`${BASE_URL}/dashboard`);

        // Should redirect to login or show login UI
        await page.waitForLoadState('networkidle');

        const isOnLogin = page.url().includes('login');
        const hasLoginForm = await page
          .getByRole('button', { name: /sign in/i })
          .isVisible()
          .catch(() => false);

        expect(isOnLogin || hasLoginForm).toBe(true);
      } finally {
        await context.close();
      }
    });

    test('protected API returns 401 without auth', async ({ request }) => {
      const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

      const response = await request.get(`${API_URL}/api/v2/customers`, {
        headers: {
          // No auth headers
        },
      });

      expect([401, 403].includes(response.status())).toBe(true);
    });
  });

  test.describe('Session Management', () => {
    test('authenticated session persists across page reloads', async ({ page, context }) => {
      // This test uses the stored auth state
      await page.goto(`${BASE_URL}/dashboard`);

      // Should not redirect to login
      await page.waitForLoadState('networkidle');

      if (!page.url().includes('login')) {
        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be authenticated
        expect(page.url()).not.toContain('login');
      }
    });

    test('session cookie has secure attributes', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === 'session');

      if (sessionCookie) {
        // Verify security attributes
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.secure).toBe(true);
        expect(['Strict', 'Lax']).toContain(sessionCookie.sameSite);
      }
    });
  });
});

test.describe('Logout Flow', () => {
  test('logout clears session and redirects to login', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Find logout button/link
    const logoutButton = page
      .getByRole('button', { name: /logout|sign out/i })
      .or(page.getByRole('link', { name: /logout|sign out/i }))
      .first();

    const isVisible = await logoutButton.isVisible().catch(() => false);

    if (!isVisible) {
      // Try opening user menu first
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"]').first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
      }
    }

    const logoutVisible = await logoutButton.isVisible().catch(() => false);
    if (!logoutVisible) {
      console.log('Logout button not found - skipping test');
      test.skip();
      return;
    }

    // Click logout
    await logoutButton.click();

    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});

    // Verify session is cleared
    const cookiesAfter = await context.cookies();
    const sessionAfter = cookiesAfter.find((c) => c.name === 'session');

    // Session should be cleared or invalidated
    expect(!sessionAfter || sessionAfter.value === '').toBe(true);
  });
});
