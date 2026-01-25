import { test, expect } from '@playwright/test';

/**
 * Technician Row Navigation Tests
 *
 * Validates that clicking anywhere on a technician row navigates to the detail page.
 * This is a modern UX pattern where the entire row is clickable, not just a button.
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Technician Row Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|technicians)/, { timeout: 15000 });

    // Navigate to technicians page
    await page.goto(`${BASE_URL}/technicians`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking technician name navigates to detail page', async ({ page }) => {
    // Wait for technician list to load
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1); // Skip header row
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get technician ID from the View link href
    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click on technician name (first column content)
    const nameCell = firstRow.locator('td').first();
    await nameCell.click();

    // Assert navigation occurred
    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('clicking technician contact area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click on phone number (in the second cell)
    const contactCell = firstRow.locator('td').nth(1);
    // Click on the phone text specifically (not email link)
    const phoneText = contactCell.locator('span');
    if (await phoneText.isVisible()) {
      await phoneText.click();
    } else {
      // Fallback to clicking somewhere on the contact cell
      await contactCell.click({ position: { x: 50, y: 20 } });
    }

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('clicking technician skills area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click on skills cell (third column)
    const skillsCell = firstRow.locator('td').nth(2);
    await skillsCell.click();

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('clicking technician status area navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click on status cell (fifth column)
    const statusCell = firstRow.locator('td').nth(4);
    await statusCell.click();

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('clicking empty space in row navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click directly on the row element
    await firstRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('View button still navigates to detail page', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click View button
    const viewButton = firstRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
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

  test('second technician row also navigates correctly', async ({ page }) => {
    // Wait for multiple rows
    const rows = page.locator('tr').filter({ hasText: /.+/ });
    await expect(rows.nth(2)).toBeVisible({ timeout: 10000 }); // Second data row

    const secondRow = rows.nth(2);
    const viewLink = secondRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Click on second row
    await secondRow.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Enter key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Focus the row and press Enter
    await firstRow.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
  });

  test('keyboard navigation works - Space key', async ({ page }) => {
    const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
    const href = await viewLink.getAttribute('href');
    const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

    // Focus the row and press Space
    await firstRow.focus();
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
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

test.describe('Technician Row Navigation - Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|technicians)/, { timeout: 15000 });
    await page.goto(`${BASE_URL}/technicians`);
    await page.waitForLoadState('networkidle');
  });

  test('clicking mobile technician card navigates to detail', async ({ page }) => {
    // Mobile view may use cards instead of table rows
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();

    // Check if mobile cards exist
    if (await firstCard.isVisible({ timeout: 5000 })) {
      // Get technician ID from the View link
      const viewLink = firstCard.locator('a[href*="/technicians/"]').first();
      const href = await viewLink.getAttribute('href');
      const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

      // Click on card (not on buttons)
      await firstCard.click({ position: { x: 10, y: 10 } });

      await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
    } else {
      // Mobile still uses table rows, test that instead
      const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
      await expect(firstRow).toBeVisible({ timeout: 10000 });

      const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
      const href = await viewLink.getAttribute('href');
      const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

      await firstRow.click({ position: { x: 10, y: 10 } });
      await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
    }
  });

  test('mobile View button still works', async ({ page }) => {
    const firstCard = page.locator('[role="article"], .card, [class*="Card"]').first();

    if (await firstCard.isVisible({ timeout: 5000 })) {
      const viewLink = firstCard.locator('a[href*="/technicians/"]').first();
      const href = await viewLink.getAttribute('href');
      const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

      const viewButton = firstCard.getByRole('button', { name: /view/i });
      await viewButton.click();

      await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
    } else {
      const firstRow = page.locator('tr').filter({ hasText: /.+/ }).nth(1);
      await expect(firstRow).toBeVisible({ timeout: 10000 });

      const viewLink = firstRow.locator('a[href*="/technicians/"]').first();
      const href = await viewLink.getAttribute('href');
      const technicianId = href?.match(/\/technicians\/([a-f0-9-]+)/)?.[1];

      const viewButton = firstRow.getByRole('button', { name: /view/i });
      await viewButton.click();

      await expect(page).toHaveURL(new RegExp(`/technicians/${technicianId}`), { timeout: 5000 });
    }
  });
});
