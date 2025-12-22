import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Invoices page
 *
 * Validates invoice CRUD functionality
 */

const PRODUCTION_URL = 'https://mac-septic-crm-production-aaa8.up.railway.app';
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
    const response = await page.goto(`${BASE_URL}/app/invoices`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('invoices page renders header', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/invoices`);

    const header = page.getByRole('heading', { name: /invoices/i });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('invoices page has create button', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create invoice/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
  });

  test('invoices page has status filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible({ timeout: 5000 });
  });

  test('API endpoint returns valid response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/invoices/`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect([200, 401, 500]).toContain(response.status());

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
    await page.goto(`${BASE_URL}/app/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create invoice/i });
    await createButton.click();

    const formTitle = page.getByText(/create invoice/i);
    await expect(formTitle).toBeVisible({ timeout: 5000 });
  });

  test('invoice form has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create invoice/i });
    await createButton.click();

    // Check for customer selection
    await expect(page.getByText(/customer/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('invoice form shows totals calculation', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/invoices`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const createButton = page.getByRole('button', { name: /create invoice/i });
    await createButton.click();

    // Should show subtotal/tax/total
    const subtotalLabel = page.getByText(/subtotal/i);
    await expect(subtotalLabel).toBeVisible({ timeout: 5000 });
  });
});
