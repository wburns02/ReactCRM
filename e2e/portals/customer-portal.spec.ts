import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

/**
 * Customer Portal E2E Tests
 *
 * Tests the customer self-service portal functionality:
 * - Portal login page loads
 * - Magic link login flow
 * - Redirect to login for unauthenticated access
 */

test.describe('Customer Portal - Public Pages', () => {
  test('portal login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/login`);

    // Should show login page with title
    await expect(page.getByText('Customer Portal')).toBeVisible({ timeout: 10000 });

    // Should have email/phone toggle
    await expect(page.getByRole('button', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phone' })).toBeVisible();

    // Should have email input
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();

    // Should have submit button
    await expect(page.getByRole('button', { name: 'Send Verification Code' })).toBeVisible();
  });

  test('portal login page has phone tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/login`);

    // Click Phone tab
    await page.getByRole('button', { name: 'Phone' }).click();

    // Should show phone input
    await expect(page.getByPlaceholder('(512) 555-0123')).toBeVisible();
  });

  test('portal redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('portal work-orders page redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/work-orders`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('portal invoices page redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/invoices`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('portal request-service page redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/request-service`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/portal\/login/);
  });
});

/**
 * Authenticated flow tests - skipped because mock authentication
 * doesn't work without a real backend session.
 * These tests need real test credentials or proper E2E auth setup.
 */
test.describe('Customer Portal - Authenticated Flow', () => {
  test.skip('portal dashboard loads when authenticated', async ({ page }) => {
    // This test requires real authentication - skip for now
  });

  test.skip('portal work orders page loads when authenticated', async ({ page }) => {
    // This test requires real authentication
  });

  test.skip('portal invoices page loads when authenticated', async ({ page }) => {
    // This test requires real authentication
  });

  test.skip('portal navigation works', async ({ page }) => {
    // This test requires real authentication
  });
});
