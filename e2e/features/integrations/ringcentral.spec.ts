import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

test.describe('RingCentral Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations/ringcentral`);
    await expect(page.locator('h1')).toContainText('RingCentral', { timeout: 15000 });
  });

  test('should load the RingCentral integration page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('RingCentral Integration');
  });

  test('should show Connected status', async ({ page }) => {
    await expect(page.locator('text=Connected')).toBeVisible();
  });

  test('should display Call Dispositions section', async ({ page }) => {
    await expect(page.locator('text=Call Dispositions')).toBeVisible();

    // Should show disposition items
    await expect(page.locator('text=Scheduled Service')).toBeVisible();
    await expect(page.locator('text=Quote Requested')).toBeVisible();
  });

  test('should display Call Performance section', async ({ page }) => {
    await expect(page.locator('text=Call Performance')).toBeVisible();

    // Should show performance metrics
    await expect(page.locator('text=Inbound Calls')).toBeVisible();
    await expect(page.locator('text=Outbound Calls')).toBeVisible();
    await expect(page.locator('text=Peak Hours')).toBeVisible();
  });

  test('should display Call Recordings section', async ({ page }) => {
    await expect(page.locator('text=Call Recordings')).toBeVisible();
  });

  test('should toggle Call Recordings visibility when clicking button', async ({ page }) => {
    // Initially recordings are hidden
    const showButton = page.getByRole('button', { name: /Show Recordings/i });
    await expect(showButton).toBeVisible();

    // Click to show recordings
    await showButton.click();

    // Should now show recordings table
    await expect(page.locator('th', { hasText: 'Caller' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Duration' })).toBeVisible();

    // Button should change to Hide
    await expect(page.getByRole('button', { name: /Hide Recordings/i })).toBeVisible();
  });

  test('should display recording entries with Listen button', async ({ page }) => {
    // Show recordings
    await page.getByRole('button', { name: /Show Recordings/i }).click();

    // Check for recording entries
    const recordingsTable = page.locator('table').last();
    await expect(recordingsTable).toBeVisible();

    // Should have Listen buttons
    const listenButtons = page.getByRole('button', { name: /Listen/i });
    const count = await listenButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display call statistics', async ({ page }) => {
    await expect(page.locator('text=Total Calls')).toBeVisible();
    await expect(page.locator('text=Avg Duration')).toBeVisible();
    await expect(page.locator('text=Missed Calls')).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
  });

  test('should have breadcrumb navigation', async ({ page }) => {
    await expect(page.locator('text=Integrations').first()).toBeVisible();
  });
});
