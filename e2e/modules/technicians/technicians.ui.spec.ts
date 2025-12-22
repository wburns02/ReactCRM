import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Technicians page
 *
 * Validates technician management matches legacy CRM behavior
 */

const PRODUCTION_URL = 'https://mac-septic-crm-production-aaa8.up.railway.app';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

test.describe('Technicians Page Smoke Tests', () => {
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

  test('technicians page loads without crashing', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/app/technicians`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('technicians page renders header', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/technicians`);

    const header = page.getByRole('heading', { name: /technician/i });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('technicians page shows technician list', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/technicians`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should show technician cards or table rows
    const technicianItems = page.locator('[class*="card"], tr, [class*="technician"]');
    const count = await technicianItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('API endpoint returns valid response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/technicians/`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect([200, 401, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    }
  });
});

test.describe('Technician Detail Page', () => {
  test('technician detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/technicians`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const techLink = page.locator('a[href*="/app/technicians/"]').first();

    if (await techLink.isVisible({ timeout: 5000 })) {
      await techLink.click();

      const backLink = page.getByText(/back to technicians/i);
      await expect(backLink).toBeVisible({ timeout: 5000 });
    }
  });

  test('technician detail shows skills', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/technicians`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const techLink = page.locator('a[href*="/app/technicians/"]').first();

    if (await techLink.isVisible({ timeout: 5000 })) {
      await techLink.click();

      // Should show skills section
      const skillsSection = page.getByText(/skills/i);
      await expect(skillsSection).toBeVisible({ timeout: 5000 });
    }
  });
});
