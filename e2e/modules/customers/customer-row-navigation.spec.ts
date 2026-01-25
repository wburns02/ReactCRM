import { test, expect } from '@playwright/test';

/**
 * Customer Row Navigation Tests
 *
 * Validates that clicking anywhere on a customer row navigates to the detail page.
 * This is a modern UX pattern where the entire row is clickable, not just a button.
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Customer Row Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|customers)/, { timeout: 15000 });

    // Navigate to customers page
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking customer name navigates to detail page', async ({ page }) => {
    // Wait for customer list to load
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1); // Skip header row
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get customer ID from the row for verification
    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click on customer name (first column content)
    const nameCell = firstRow.locator('td').first();
    await nameCell.click();

    // Assert navigation occurred
    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('clicking customer contact area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click on contact cell (second column - phone/email)
    const contactCell = firstRow.locator('td').nth(1);
    await contactCell.click();

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('clicking customer location area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click on location cell (third column)
    const locationCell = firstRow.locator('td').nth(2);
    await locationCell.click();

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('clicking empty space in row navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click directly on the row element
    await firstRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('View button still navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click View button
    const viewButton = firstRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('Edit button opens edit modal, not navigation', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const initialUrl = page.url();

    // Click Edit button
    const editButton = firstRow.getByRole('button', { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();

      // Should stay on same page (modal opens)
      expect(page.url()).toBe(initialUrl);

      // Modal should be visible
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
    }
  });

  test('email link opens email client, not navigation', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const initialUrl = page.url();

    // Find and click email link
    const emailLink = firstRow.locator('a[href^="mailto:"]').first();
    if (await emailLink.isVisible()) {
      // Email links don't navigate, they open mail client
      // We just verify the href is correct and page doesn't navigate
      const href = await emailLink.getAttribute('href');
      expect(href).toMatch(/^mailto:/);

      // Clicking shouldn't navigate the page
      await emailLink.click();
      expect(page.url()).toBe(initialUrl);
    }
  });

  test('second customer row also navigates correctly', async ({ page }) => {
    // Wait for multiple rows
    const rows = page.locator('tr').filter({ hasText: /.+/ });
    await expect(rows.nth(2)).toBeVisible({ timeout: 10000 }); // Second data row

    const secondRow = rows.nth(2);
    const customerIdText = await secondRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click on second row
    await secondRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Enter key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Focus the row and press Enter
    await firstRow.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Space key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstRow.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Focus the row and press Space
    await firstRow.focus();
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('row has cursor-pointer style', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check for cursor-pointer class or computed style
    const cursor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toBe('pointer');
  });

  test('no console errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click row to navigate
    await firstRow.click({ position: { x: 10, y: 10 } });
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('workbox') && !e.includes('service-worker')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Customer Row Navigation - Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|customers)/, { timeout: 15000 });
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking mobile customer card navigates to detail', async ({ page }) => {
    // Mobile view uses cards instead of table rows
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Get customer ID
    const customerIdText = await firstCard.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    // Click on card (not on buttons)
    await firstCard.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });

  test('mobile View button still works', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const customerIdText = await firstCard.locator('text=/ID: \\d+/').textContent();
    const customerId = customerIdText?.match(/ID: (\d+)/)?.[1];

    const viewButton = firstCard.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`), { timeout: 5000 });
  });
});
