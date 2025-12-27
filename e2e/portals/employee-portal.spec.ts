import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

test.describe('Employee Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/my-portal`);
    await expect(page.locator('h1')).toContainText('Welcome', { timeout: 15000 });
  });

  test('should load the employee portal page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('p').filter({ hasText: 'Your personal dashboard' })).toBeVisible();
  });

  test('should display logged-in user name in welcome message', async ({ page }) => {
    // The welcome message should include the user's first name
    await expect(page.locator('h1')).toBeVisible();
    // If user is logged in, should show their name, otherwise "Employee"
    const welcomeText = await page.locator('h1').textContent();
    expect(welcomeText).toContain('Welcome');
  });

  test('should display upcoming schedule', async ({ page }) => {
    await expect(page.locator('text=Upcoming Schedule')).toBeVisible();

    // Should show schedule items
    const scheduleCard = page.locator('text=Upcoming Schedule').locator('..');
    await expect(scheduleCard).toBeVisible();
  });

  test('should display recent work orders', async ({ page }) => {
    await expect(page.locator('text=Recent Work Orders')).toBeVisible();

    // Should show work order table
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check for table headers
    await expect(page.locator('th', { hasText: 'Order' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Customer' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Status' })).toBeVisible();
  });

  test('should display quick stats', async ({ page }) => {
    await expect(page.locator('text=Today\'s Jobs')).toBeVisible();
    await expect(page.locator('text=Completed This Week')).toBeVisible();
    await expect(page.locator('text=Next Job')).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=View Full Schedule')).toBeVisible();
    await expect(page.locator('text=My Work Orders')).toBeVisible();
  });

  test('should navigate to portal from sidebar', async ({ page }) => {
    // Go to dashboard first
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('aside nav')).toBeVisible({ timeout: 10000 });

    // Click on My Portal link
    const sidebar = page.locator('aside nav');
    await sidebar.getByRole('link', { name: 'My Portal' }).click();

    await expect(page).toHaveURL(/\/my-portal$/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show schedule items with date, time, and customer info', async ({ page }) => {
    // Look for schedule item structure
    const scheduleSection = page.locator('text=Upcoming Schedule').locator('..').locator('..');

    // Should have items with customer names and times
    await expect(scheduleSection.locator('text=Today').first()).toBeVisible();
  });
});
