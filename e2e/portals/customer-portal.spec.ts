import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

/**
 * Customer Portal E2E Tests
 *
 * Tests the customer self-service portal functionality:
 * - Portal login page loads
 * - Magic link login flow
 * - Dashboard displays when authenticated
 * - Work orders page loads
 * - Invoices page loads
 * - Service request form works
 */

test.describe('Customer Portal', () => {
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

test.describe('Customer Portal - Authenticated Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock portal authentication by setting localStorage
    await page.goto(`${BASE_URL}/portal/login`);

    // Add mock portal token and customer to localStorage
    await page.evaluate(() => {
      localStorage.setItem('portal_token', 'mock_portal_token_12345');
      localStorage.setItem('portal_customer', JSON.stringify({
        id: '123',
        first_name: 'Test',
        last_name: 'Customer',
        email: 'test@example.com',
        phone: '512-555-0123',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      }));
    });
  });

  test('portal dashboard loads when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);

    // Should show dashboard with welcome message
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10000 });

    // Should have quick stats cards
    await expect(page.getByText('Upcoming Appointments')).toBeVisible();
    await expect(page.getByText('Outstanding Balance')).toBeVisible();

    // Should have navigation
    await expect(page.getByRole('link', { name: 'Work Orders' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();
  });

  test('portal work orders page loads when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/work-orders`);

    // Should show work orders heading
    await expect(page.getByRole('heading', { name: 'Work Orders' })).toBeVisible({ timeout: 10000 });

    // Should have filter buttons
    await expect(page.getByRole('button', { name: /All/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible();
  });

  test('portal invoices page loads when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/invoices`);

    // Should show invoices heading
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 10000 });

    // Should have filter buttons
    await expect(page.getByRole('button', { name: /All/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Due/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Paid' })).toBeVisible();
  });

  test('portal request service page loads when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/request-service`);

    // Should show request service heading
    await expect(page.getByRole('heading', { name: 'Request Service' })).toBeVisible({ timeout: 10000 });

    // Should have service type dropdown
    await expect(page.getByText('Service Type')).toBeVisible();

    // Should have submit button
    await expect(page.getByRole('button', { name: 'Submit Request' })).toBeVisible();
  });

  test('portal navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);
    await page.waitForLoadState('networkidle');

    // Navigate to Work Orders
    await page.getByRole('link', { name: 'Work Orders' }).click();
    await expect(page.getByRole('heading', { name: 'Work Orders' })).toBeVisible();

    // Navigate to Invoices
    await page.getByRole('link', { name: 'Invoices' }).click();
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

    // Navigate to Request Service
    await page.getByRole('link', { name: 'Request Service' }).click();
    await expect(page.getByRole('heading', { name: 'Request Service' })).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('portal sign out works', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);
    await page.waitForLoadState('networkidle');

    // Click sign out
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/portal\/login/);

    // localStorage should be cleared
    const hasToken = await page.evaluate(() => !!localStorage.getItem('portal_token'));
    expect(hasToken).toBe(false);
  });
});
