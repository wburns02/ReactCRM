/**
 * Payment Plans Bug Reproduction Test
 *
 * This test verifies the reported bugs:
 * 1. Create button does nothing
 * 2. Row clicks do nothing
 * 3. View button does nothing
 */
import { test, expect } from '@playwright/test';

test.describe('Payment Plans Bug Reproduction', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('https://react.ecbtx.com/login');
    await page.fill('input[name="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"]', '#Espn2025');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to Payment Plans
    await page.goto('https://react.ecbtx.com/billing/payment-plans');
    await page.waitForLoadState('networkidle');
  });

  test('Page loads with data', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1')).toContainText('Payment Plans');

    // Wait for data to load (table should have rows)
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    // Log how many rows we see
    const rowCount = await tableRows.count();
    console.log(`Found ${rowCount} payment plan rows`);

    // Verify we see customer names
    await expect(page.locator('text=Johnson Residence')).toBeVisible();
  });

  test('Create button has no onClick handler', async ({ page }) => {
    // Find the Create button
    const createBtn = page.locator('button:has-text("Create Payment Plan")');
    await expect(createBtn).toBeVisible();

    // Check for onClick attribute or handler
    const onClick = await createBtn.getAttribute('onclick');
    console.log('Create button onclick attribute:', onClick);

    // Click the button and verify nothing happens
    const urlBefore = page.url();
    await createBtn.click();
    await page.waitForTimeout(1000);
    const urlAfter = page.url();

    console.log('URL before click:', urlBefore);
    console.log('URL after click:', urlAfter);

    // URL should be the same (no navigation)
    expect(urlBefore).toBe(urlAfter);

    // No modal should appear
    const modal = page.locator('[role="dialog"]');
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log('Modal visible after click:', modalVisible);
    expect(modalVisible).toBe(false);
  });

  test('Table row click does nothing', async ({ page }) => {
    // Wait for table to load
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check if row has cursor-pointer class
    const rowClasses = await firstRow.getAttribute('class');
    console.log('Row classes:', rowClasses);

    const hasCursorPointer = rowClasses?.includes('cursor-pointer') ?? false;
    console.log('Has cursor-pointer:', hasCursorPointer);

    // Click the row
    const urlBefore = page.url();
    await firstRow.click();
    await page.waitForTimeout(1000);
    const urlAfter = page.url();

    console.log('URL before row click:', urlBefore);
    console.log('URL after row click:', urlAfter);

    // Verify no navigation happened
    expect(urlBefore).toBe(urlAfter);
  });

  test('View button does nothing', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Find the View button
    const viewBtn = page.locator('button:has-text("View")').first();
    await expect(viewBtn).toBeVisible();

    // Check if it's a link or button
    const tagName = await viewBtn.evaluate(el => el.tagName.toLowerCase());
    console.log('View element tag:', tagName);

    // Check for href (if it's an anchor)
    const parentLink = page.locator('a:has-text("View")').first();
    const href = await parentLink.getAttribute('href').catch(() => null);
    console.log('View link href:', href);

    // Click the view button
    const urlBefore = page.url();
    await viewBtn.click();
    await page.waitForTimeout(1000);
    const urlAfter = page.url();

    console.log('URL before View click:', urlBefore);
    console.log('URL after View click:', urlAfter);

    // Verify no navigation happened
    expect(urlBefore).toBe(urlAfter);
  });

  test('Console errors and network failures', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    // Reload page to capture all events
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Console errors:', consoleErrors);
    console.log('Network failures:', networkFailures);

    // Log findings
    if (consoleErrors.length > 0) {
      console.log('FOUND CONSOLE ERRORS');
    }
    if (networkFailures.length > 0) {
      console.log('FOUND NETWORK FAILURES');
    }
  });
});
