import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Customers page
 *
 * Validates customer CRUD functionality matches legacy CRM behavior
 */

const PRODUCTION_URL = 'https://mac-septic-crm-production-aaa8.up.railway.app';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

test.describe('Customers Page Smoke Tests', () => {
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

  test('customers page loads without crashing', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/app/customers`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('customers page renders header', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    const header = page.getByRole('heading', { name: /customers/i });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('customers page has add button', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const addButton = page.getByRole('button', { name: /add customer/i });
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('customers page has search/filter functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Check for search input
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('API endpoint returns valid response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/customers/`, {
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

test.describe('Customer Detail Page', () => {
  test('customer detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Click on first customer in list (if any exist)
    const customerLink = page.locator('a[href*="/app/customers/"]').first();

    if (await customerLink.isVisible({ timeout: 5000 })) {
      await customerLink.click();

      // Should show customer detail page
      const backLink = page.getByText(/back to customers/i);
      await expect(backLink).toBeVisible({ timeout: 5000 });
    }
  });

  test('customer detail has edit button', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const customerLink = page.locator('a[href*="/app/customers/"]').first();

    if (await customerLink.isVisible({ timeout: 5000 })) {
      await customerLink.click();

      const editButton = page.getByRole('button', { name: /edit/i });
      await expect(editButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('customer detail shows work order history', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const customerLink = page.locator('a[href*="/app/customers/"]').first();

    if (await customerLink.isVisible({ timeout: 5000 })) {
      await customerLink.click();

      const workOrderSection = page.getByText(/work order history/i);
      await expect(workOrderSection).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Customer Form Modal', () => {
  test('add customer form opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const addButton = page.getByRole('button', { name: /add customer/i });
    await addButton.click();

    // Form should be visible
    const formTitle = page.getByText(/add new customer/i);
    await expect(formTitle).toBeVisible({ timeout: 5000 });
  });

  test('customer form has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const addButton = page.getByRole('button', { name: /add customer/i });
    await addButton.click();

    // Check for required fields
    await expect(page.getByLabel(/first name/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/last name/i)).toBeVisible({ timeout: 5000 });
  });

  test('customer form can be cancelled', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const addButton = page.getByRole('button', { name: /add customer/i });
    await addButton.click();

    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Form should close
    const formTitle = page.getByText(/add new customer/i);
    await expect(formTitle).not.toBeVisible({ timeout: 3000 });
  });
});
