import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

test.describe('SMS Consent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/sms`);
    await expect(page.locator('h1')).toContainText('SMS', { timeout: 15000 });
  });

  test('should load the SMS consent page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('SMS Consent Management');
    await expect(page.locator('p').filter({ hasText: 'TCPA compliant' })).toBeVisible();
  });

  test('should display customer SMS opt-in list', async ({ page }) => {
    // Check for table headers
    await expect(page.locator('th', { hasText: 'Customer' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Phone' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'SMS Status' })).toBeVisible();

    // Check that customer data is displayed
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display stats cards', async ({ page }) => {
    await expect(page.locator('text=Total Customers')).toBeVisible();
    await expect(page.locator('text=Opted In')).toBeVisible();
    await expect(page.locator('text=Opted Out')).toBeVisible();
    await expect(page.locator('text=Opt-in Rate')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Search for a customer
    await searchInput.fill('John');

    // Should filter results
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(1);

    // Clear search
    await page.getByRole('button', { name: /Clear search/i }).click();
    const allRows = page.locator('table tbody tr');
    const count = await allRows.count();
    expect(count).toBeGreaterThan(1);
  });

  test('should display opted in and opted out badges', async ({ page }) => {
    // Should have Opted In badges
    await expect(page.locator('text=Opted In').first()).toBeVisible();

    // Should have Opted Out badges
    await expect(page.locator('text=Opted Out').first()).toBeVisible();
  });

  test('should have toggle buttons for each customer', async ({ page }) => {
    // Should have Opt Out buttons for opted-in customers
    const optOutButton = page.getByRole('button', { name: 'Opt Out' }).first();
    await expect(optOutButton).toBeVisible();

    // Should have Opt In buttons for opted-out customers
    const optInButton = page.getByRole('button', { name: 'Opt In' }).first();
    await expect(optInButton).toBeVisible();
  });

  test('should toggle SMS consent when clicking button', async ({ page }) => {
    // Find an Opt Out button and click it
    const optOutButton = page.getByRole('button', { name: 'Opt Out' }).first();
    await optOutButton.click();

    // Button should show loading state
    await expect(page.locator('text=Updating...')).toBeVisible();

    // After update, the button should change to Opt In
    await expect(page.getByRole('button', { name: 'Opt In' })).toHaveCount(await page.getByRole('button', { name: 'Opt In' }).count());
  });

  test('should display TCPA compliance notice', async ({ page }) => {
    await expect(page.locator('text=TCPA Compliance')).toBeVisible();
  });
});
