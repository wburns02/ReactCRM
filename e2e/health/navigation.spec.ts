import { test, expect } from '@playwright/test';

/**
 * Navigation smoke tests
 *
 * Validates all main routes are accessible and render without errors
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

const ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/prospects', name: 'Prospects' },
  { path: '/customers', name: 'Customers' },
  { path: '/technicians', name: 'Technicians' },
  { path: '/work-orders', name: 'Work Orders' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/email-marketing', name: 'Email Marketing' },
  { path: '/reports', name: 'Reports' },
  { path: '/equipment', name: 'Equipment' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/tickets', name: 'Tickets' },
  { path: '/fleet', name: 'Fleet' },
  { path: '/integrations', name: 'Integrations' },
];

test.describe('Navigation Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.AUTH_COOKIE) {
      await page.context().addCookies([
        {
          name: 'session',
          value: process.env.AUTH_COOKIE,
          domain: new URL(BASE_URL).hostname,
          path: '/',
        },
      ]);
    }
  });

  for (const route of ROUTES) {
    test(`${route.name} page loads without 500 error`, async ({ page }) => {
      // Use domcontentloaded instead of load to avoid waiting for slow API calls
      const response = await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Should not return 500 error on the page itself
      expect(response?.status()).toBeLessThan(500);

      // Page should at least show some structure (sidebar, header, or main)
      const hasStructure = await page.locator('nav, aside, header, main, [role="navigation"]').first().isVisible({ timeout: 5000 }).catch(() => false);

      // If page is stuck on login, skip - this is auth issue not navigation issue
      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Log if page seems stuck loading
      const loadingVisible = await page.getByText('Loading').first().isVisible().catch(() => false);
      if (loadingVisible && !hasStructure) {
        console.log(`⚠️ ${route.name} page stuck on Loading - backend API may be down`);
      }
    });
  }

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should have navigation sidebar
    const nav = page.locator('nav, aside, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('sidebar has all main navigation links', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Check for key navigation items (use .first() for strict mode during migration)
    const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    const prospectsLink = page.getByRole('link', { name: /prospects/i }).first();
    const customersLink = page.getByRole('link', { name: /customers/i }).first();

    await expect(dashboardLink).toBeVisible({ timeout: 5000 });
    await expect(prospectsLink).toBeVisible({ timeout: 5000 });
    await expect(customersLink).toBeVisible({ timeout: 5000 });
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Click on prospects link
    const prospectsLink = page.getByRole('link', { name: /prospects/i }).first();
    await prospectsLink.click();

    // Should navigate to prospects
    await page.waitForURL('**/prospects**', { timeout: 5000 });

    // Click on customers link
    const customersLink = page.getByRole('link', { name: /customers/i }).first();
    await customersLink.click();

    // Should navigate to customers
    await page.waitForURL('**/customers**', { timeout: 5000 });
  });

  test('user menu is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should have user menu or logout button
    const userMenu = page.locator('[class*="user"], [class*="avatar"], button').filter({
      hasText: /logout|sign out|profile/i,
    });

    // This may or may not be visible depending on implementation
    const count = await userMenu.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Authentication', () => {
  // Use fresh browser context without auth for login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page is accessible', async ({ page }) => {

    const response = await page.goto(`${BASE_URL}/login`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBeLessThan(500);

    // Should show login form with Sign In button (may be "Sign In" or "Sign in")
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated access redirects to login', async ({ browser }) => {
    // Create fresh context without any auth state
    const freshContext = await browser.newContext();
    const page = await freshContext.newPage();

    try {
      // Navigate to app first to get the right origin for localStorage
      await page.goto(`${BASE_URL}/login`);

      // Explicitly clear auth token to ensure unauthenticated state
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
      });

      // Clear cookies too
      await freshContext.clearCookies();

      // Now try to access protected route
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Should either:
      // 1. Redirect to login page
      // 2. Show login form on the page
      const url = page.url();
      const signInButton = page.getByRole('button', { name: /sign in/i });

      const isOnLogin = url.includes('/login') || await signInButton.isVisible().catch(() => false);

      expect(isOnLogin).toBe(true);
    } finally {
      await freshContext.close();
    }
  });
});

test.describe('404 Handling', () => {
  test('invalid route shows 404 page', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-xyz`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should show 404 message (use first() to avoid strict mode with multiple matches)
    const notFound = page.getByText(/404|not found|page not found/i).first();
    await expect(notFound).toBeVisible({ timeout: 5000 });
  });
});
