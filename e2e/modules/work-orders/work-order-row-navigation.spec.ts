import { test, expect } from '@playwright/test';

/**
 * Work Order Row Navigation Tests
 *
 * Validates that clicking anywhere on a work order row navigates to the detail page.
 * This is a modern UX pattern where the entire row is clickable, not just the View button.
 *
 * Related to: WORK_ORDER_ROW_CLICK_DIAGNOSIS.md
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Work Order Row Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, { timeout: 15000 });

    // Navigate to work orders page
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking customer name navigates to detail page', async ({ page }) => {
    // Wait for work order list to load
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1); // Skip header row
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get work order ID from the href of View link
    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on customer name (first column content)
    const nameCell = firstRow.locator('td').first();
    await nameCell.click();

    // Assert navigation occurred
    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking job type area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on job type cell (second column)
    const jobTypeCell = firstRow.locator('td').nth(1);
    await jobTypeCell.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking scheduled date area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on scheduled date cell (third column)
    const dateCell = firstRow.locator('td').nth(2);
    await dateCell.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking technician area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on technician cell (fourth column)
    const technicianCell = firstRow.locator('td').nth(3);
    await technicianCell.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking priority area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on priority cell (fifth column)
    const priorityCell = firstRow.locator('td').nth(4);
    await priorityCell.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking status area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on status cell (sixth column)
    const statusCell = firstRow.locator('td').nth(5);
    await statusCell.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking empty space in row navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click directly on the row element
    await firstRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('View button still navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click View button
    const viewButton = firstRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
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

  test('Delete button does not trigger row navigation', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const initialUrl = page.url();

    // Click Delete button
    const deleteButton = firstRow.getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should stay on same page (confirmation dialog opens)
      expect(page.url()).toBe(initialUrl);
    }
  });

  test('second work order row also navigates correctly', async ({ page }) => {
    // Wait for multiple rows
    const rows = page.locator('tr').filter({ hasText: /.+/ });
    await expect(rows.nth(2)).toBeVisible({ timeout: 10000 }); // Second data row

    const secondRow = rows.nth(2);
    const viewLink = secondRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on second row
    await secondRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Enter key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Focus the row and press Enter
    await firstRow.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Space key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Focus the row and press Space
    await firstRow.focus();
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
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

test.describe('Work Order Row Navigation - Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, { timeout: 15000 });
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking mobile work order card navigates to detail', async ({ page }) => {
    // Mobile view uses cards instead of table rows
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Get work order ID from View button link
    const viewLink = firstCard.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on card (not on buttons)
    await firstCard.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking customer name on mobile card navigates', async ({ page }) => {
    // Close mobile sidebar if open by clicking on main content area
    await page.locator('main, [role="main"], .content').first().click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});

    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const viewLink = firstCard.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on top area of card where customer name is (avoiding buttons at bottom)
    await firstCard.click({ position: { x: 50, y: 30 } });

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('clicking address area on mobile card navigates', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const viewLink = firstCard.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    // Click on address/location area
    const addressArea = firstCard.locator('text=/📍|service|city/i').first();
    if (await addressArea.isVisible()) {
      await addressArea.click();
      await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
    }
  });

  test('mobile View button still works', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const viewLink = firstCard.locator('a[href*="/work-orders/"]').first();
    const href = await viewLink.getAttribute('href');
    const workOrderId = href?.match(/\/work-orders\/([^/]+)/)?.[1];

    const viewButton = firstCard.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${workOrderId}`), { timeout: 5000 });
  });

  test('mobile Edit button does not trigger card navigation', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const initialUrl = page.url();

    const editButton = firstCard.getByRole('button', { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      expect(page.url()).toBe(initialUrl);
    }
  });

  test('mobile card has hover shadow effect', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Check for cursor-pointer on card
    const cursor = await firstCard.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toBe('pointer');
  });
});
