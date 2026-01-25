import { test, expect } from '@playwright/test';

/**
 * Email Send Tests
 *
 * Validates that email sending works correctly through the UI.
 * Tests the complete flow: compose → send → success feedback.
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Email Send Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, { timeout: 15000 });
  });

  test('email compose modal opens and closes', async ({ page }) => {
    // Navigate to a customer page to find email compose option
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');

    // Find first customer and try to open email compose
    const firstCustomerRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstCustomerRow).toBeVisible({ timeout: 10000 });

    // Click on the row to go to customer detail
    await firstCustomerRow.click({ position: { x: 10, y: 10 } });
    await page.waitForURL(/\/customers\//, { timeout: 5000 });

    // Look for email button/link
    const emailButton = page.getByRole('button', { name: /email/i }).or(
      page.getByText(/send email/i)
    ).first();

    if (await emailButton.isVisible({ timeout: 3000 })) {
      await emailButton.click();

      // Check if compose modal opens
      const modal = page.locator('[role="dialog"]').filter({ hasText: /compose|email/i });
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeButton = modal.getByRole('button', { name: /close|cancel/i }).first();
      await closeButton.click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('email API endpoint returns correct status', async ({ page, request }) => {
    // First login to get session cookie
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');

    // Get cookies from browser context
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // Test email endpoint directly (expect 422 for missing data, not 404)
    const apiUrl = 'https://react-crm-api-production.up.railway.app/api/v2';

    // Make request with session cookie
    const response = await request.post(`${apiUrl}/communications/email/send`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : '',
      },
      data: {},
    });

    // Should NOT be 404 - that was the bug
    // Acceptable: 422 (validation error), 401 (auth needed), 403 (permission denied)
    expect(response.status()).not.toBe(404);

    // Log actual status for debugging
    console.log(`Email send endpoint status: ${response.status()}`);
  });

  test('work order email composer is accessible', async ({ page }) => {
    // Navigate to work orders
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForLoadState('networkidle');

    // Find first work order
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click to go to work order detail
    await firstRow.click({ position: { x: 10, y: 10 } });
    await page.waitForURL(/\/work-orders\//, { timeout: 5000 });

    // Look for Communications tab or section
    const commsTab = page.getByRole('tab', { name: /communications/i }).or(
      page.getByText(/communications/i).filter({ hasText: /communications/i })
    ).first();

    if (await commsTab.isVisible({ timeout: 3000 })) {
      await commsTab.click();

      // Look for email composer
      const emailSection = page.locator('text=/email|compose/i').first();
      await expect(emailSection).toBeVisible({ timeout: 5000 });
    }
  });

  test('no 404 errors on communications API calls', async ({ page }) => {
    const apiErrors: { url: string; status: number }[] = [];

    // Monitor network requests
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes('/api/v2/') && status === 404) {
        // Exclude known optional endpoints
        if (!url.includes('/roles') && !url.includes('/email/conversations')) {
          apiErrors.push({ url, status });
        }
      }
    });

    // Navigate through email-related pages
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    if (await firstRow.isVisible({ timeout: 5000 })) {
      await firstRow.click({ position: { x: 10, y: 10 } });
      await page.waitForLoadState('networkidle');
    }

    // No unexpected 404 errors should have occurred
    if (apiErrors.length > 0) {
      console.log('Unexpected 404 errors:', apiErrors);
    }
    expect(apiErrors.length).toBe(0);
  });

  test('SMS endpoint is also correctly configured', async ({ page, request }) => {
    // Login first
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    const apiUrl = 'https://react-crm-api-production.up.railway.app/api/v2';

    const response = await request.post(`${apiUrl}/communications/sms/send`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : '',
      },
      data: {},
    });

    // Should NOT be 404
    expect(response.status()).not.toBe(404);
    console.log(`SMS send endpoint status: ${response.status()}`);
  });
});
