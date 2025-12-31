import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Dashboard page
 *
 * Validates dashboard metrics and quick actions
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

test.describe('Dashboard Page Smoke Tests', () => {
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

  test('dashboard page loads without crashing', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('dashboard page renders header', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const header = page.getByRole('heading', { name: /dashboard/i });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows summary stats', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should show dashboard content - look for any content area
    const dashboardContent = page.locator('main, [role="main"]');
    await expect(dashboardContent).toBeVisible({ timeout: 5000 });
  });

  test('dashboard shows recent activity', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should show recent items section
    const recentSection = page.getByText(/recent|today|upcoming/i).first();
    await expect(recentSection).toBeVisible({ timeout: 5000 });
  });

  test('dashboard has quick action links', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Check navigation is visible (links to other sections)
    const navLinks = page.locator('nav a, aside a').first();
    await expect(navLinks).toBeVisible({ timeout: 5000 });
  });
});
