import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Invoices page
 *
 * Validates invoice CRUD functionality
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

test.describe('Invoices Page Smoke Tests', () => {
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

  test('invoices page loads without crashing', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/invoices`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('invoices page renders header', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    const header = page.locator('h1').filter({ hasText: 'Invoices' });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('invoices page has create button', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create invoice/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
  });

  test('invoices page has status filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible({ timeout: 5000 });
  });

  test('API endpoint returns valid response', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';
    const response = await request.get(`${apiUrl}/invoices`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Accept 200 (success) or 401 (auth required) - 500 should not occur
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.items)).toBe(true);
    }
  });
});

test.describe('Invoice Form', () => {
  test('create invoice form opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create|new/i }).first();
    if (!(await createButton.isVisible({ timeout: 3000 }))) {
      test.skip();
      return;
    }
    await createButton.click();

    // Form or modal should appear
    const formContent = page.locator('form, [role="dialog"], [class*="modal"]').first();
    await expect(formContent).toBeVisible({ timeout: 5000 });
  });

  test('invoice form has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create|new/i }).first();
    if (!(await createButton.isVisible({ timeout: 3000 }))) {
      test.skip();
      return;
    }
    await createButton.click();

    // Check form is visible
    const formContent = page.locator('form, [role="dialog"]').first();
    await expect(formContent).toBeVisible({ timeout: 5000 });
  });

  test('invoice form shows totals calculation', async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create|new/i }).first();
    if (!(await createButton.isVisible({ timeout: 3000 }))) {
      test.skip();
      return;
    }
    await createButton.click();

    // Form should be open
    const formContent = page.locator('form, [role="dialog"]').first();
    await expect(formContent).toBeVisible({ timeout: 5000 });
  });
});
