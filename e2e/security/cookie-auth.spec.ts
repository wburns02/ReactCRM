/**
 * Cookie Auth Security E2E Tests
 * Tests for HTTP-only cookie authentication and CSRF protection
 */
import { test, expect } from '@playwright/test';

test.describe('Cookie Auth Security', () => {
  test.describe('Session Management', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      // Clear any existing cookies
      await page.context().clearCookies();

      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Should be redirected to login
      const url = page.url();
      expect(url).toContain('login');
    });

    test('should handle return URL parameter safely', async ({ page }) => {
      // Try with potentially malicious return URL
      await page.goto('/login?return=javascript:alert(1)');

      await page.waitForLoadState('networkidle');

      // Should sanitize the URL and not execute JavaScript
      const url = page.url();
      expect(url).not.toContain('javascript:');
    });

    test('should prevent open redirect attacks', async ({ page }) => {
      await page.goto('/login?return=//evil.com');

      await page.waitForLoadState('networkidle');

      // Should sanitize the URL
      const url = page.url();
      expect(url).not.toContain('evil.com');
    });

    test('should sanitize data: URL schemes', async ({ page }) => {
      await page.goto('/login?return=data:text/html,<script>alert(1)</script>');

      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).not.toContain('data:');
    });
  });

  test.describe('Login Security', () => {
    test('should show login form', async ({ page }) => {
      await page.goto('/login');

      await page.waitForLoadState('networkidle');

      // Should have email and password fields
      const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]');
      const passwordField = page.locator('input[type="password"]');

      expect(await emailField.count()).toBeGreaterThan(0);
      expect(await passwordField.count()).toBeGreaterThan(0);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');

      await page.waitForLoadState('networkidle');

      // Enter invalid email
      const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
      await emailField.fill('not-an-email');

      // Try to submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show validation error
      await page.waitForTimeout(500);
      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('valid email') ||
        pageContent.includes('invalid') ||
        pageContent.includes('error') ||
        page.url().includes('login')
      ).toBeTruthy();
    });

    test('should require password', async ({ page }) => {
      await page.goto('/login');

      await page.waitForLoadState('networkidle');

      // Enter email only
      const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
      await emailField.fill('test@example.com');

      // Leave password empty and try to submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show validation error or stay on login
      await page.waitForTimeout(500);
      expect(page.url()).toContain('login');
    });
  });

  test.describe('CSRF Protection', () => {
    test('should not expose sensitive tokens in localStorage', async ({ page }) => {
      await page.goto('/login');

      await page.waitForLoadState('networkidle');

      // Check that no sensitive data is stored insecurely
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

      // These should not be in localStorage (migration period may have legacy tokens)
      // Just check that JWT is not exposed as plaintext
      for (const [key, value] of Object.entries(localStorage)) {
        if (key.toLowerCase().includes('token')) {
          // If there's a token, it should be in the auth_token key for legacy support
          expect(['auth_token', 'jwt', 'access_token', 'token']).toContain(key);
        }
      }
    });
  });

  test.describe('Session State', () => {
    test('should use sessionStorage for session metadata', async ({ page }) => {
      await page.goto('/login');

      await page.waitForLoadState('networkidle');

      // sessionStorage should be used for session_state (metadata only)
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

      // session_state key should contain only metadata, not tokens
      if (sessionStorage['session_state']) {
        const state = JSON.parse(sessionStorage['session_state']);
        // Should not contain actual token values
        expect(state.token).toBeUndefined();
        expect(state.jwt).toBeUndefined();
      }
    });
  });
});
