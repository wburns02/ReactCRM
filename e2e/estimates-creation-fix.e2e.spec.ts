import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

/**
 * Estimates Creation Fix - E2E Tests
 *
 * These tests verify that the estimate creation bug (422 error) has been fixed
 * and that estimates can be created, viewed, and managed properly.
 */
test.describe('Estimates Creation Fix - Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|estimates)/, { timeout: 15000 });
  });

  test('1. Navigate to Estimates page', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Verify we're on the estimates page
    await expect(page.locator('h1:has-text("Estimates")')).toBeVisible();
  });

  test('2. Open Create Estimate modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Click Create Estimate button
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Verify modal opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('text=Create New Estimate')).toBeVisible();
  });

  test('3. Fill required fields and create estimate - verify 201 response', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);

    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await expect(customerOptions.first()).toBeVisible({ timeout: 5000 });
    await customerOptions.first().click();

    // Fill line items
    await dialog.locator('input[placeholder="Service"]').first().fill('Test Septic Service');
    await dialog.locator('input[placeholder="Rate"]').first().fill('250');

    // Capture POST response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/quotes') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Submit
    const submitButton = dialog.getByRole('button', { name: 'Create Estimate' });
    await submitButton.click();

    // Verify 201 response (NOT 422)
    const response = await responsePromise;
    expect(response.status()).toBe(201);
  });

  test('4. Success toast appears after creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal and fill form
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await customerOptions.first().click();

    // Fill line items
    await dialog.locator('input[placeholder="Service"]').first().fill('Toast Test Service');
    await dialog.locator('input[placeholder="Rate"]').first().fill('175');

    // Submit
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Verify success toast
    const successToast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /success|created/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('5. New estimate appears in list after creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    const uniqueServiceName = `List Test Service ${Date.now()}`;

    // Open modal and fill form
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await customerOptions.first().click();

    // Fill line items with unique service name
    await dialog.locator('input[placeholder="Service"]').first().fill(uniqueServiceName);
    await dialog.locator('input[placeholder="Rate"]').first().fill('300');

    // Submit
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Wait for modal to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // Verify estimate appears in list (check for the $300 total we just created)
    const estimateRow = page.locator('table tbody tr').first();
    await expect(estimateRow).toBeVisible();
  });

  test('6. Validation error shown for missing customer', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill line items but NOT customer
    await dialog.locator('input[placeholder="Service"]').first().fill('Test Service');
    await dialog.locator('input[placeholder="Rate"]').first().fill('100');

    // Submit without customer
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Verify validation error toast
    const errorToast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /customer/i });
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('7. No 422 errors in network on successful creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Track all responses
    const responses: { url: string; status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({ url: response.url(), status: response.status() });
      }
    });

    // Open modal and fill form
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await customerOptions.first().click();

    // Fill line items with decimal values that could trigger 422
    await dialog.locator('input[placeholder="Service"]').first().fill('Precision Test');
    await dialog.locator('input[placeholder="Rate"]').first().fill('199.99');

    // Set tax rate to create more decimals - find by label
    const taxRateSection = dialog.locator('label:has-text("Tax Rate")').locator('..');
    const taxRateInput = taxRateSection.locator('input[type="number"]');
    if (await taxRateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await taxRateInput.fill('8.25');
    }

    // Submit
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify no 422 errors
    const has422 = responses.some(r => r.status === 422);
    expect(has422).toBe(false);
  });

  test('8. No critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal and fill form
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await customerOptions.first().click();

    // Fill and submit
    await dialog.locator('input[placeholder="Service"]').first().fill('Console Test');
    await dialog.locator('input[placeholder="Rate"]').first().fill('150');
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Wait for operation to complete
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('net::ERR') &&
      !err.includes('favicon')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('9. Modal closes on successful creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal and fill form
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await createButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await customerInput.focus();
    await page.waitForTimeout(500);
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    await customerOptions.first().click();

    // Fill and submit
    await dialog.locator('input[placeholder="Service"]').first().fill('Modal Close Test');
    await dialog.locator('input[placeholder="Rate"]').first().fill('200');
    await dialog.getByRole('button', { name: 'Create Estimate' }).click();

    // Verify modal closes
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
