import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

test.describe('Payroll Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await expect(page.locator('h1')).toContainText('Payroll', { timeout: 15000 });
  });

  test('should load the payroll page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Payroll');
    await expect(page.locator('p').filter({ hasText: 'Process employee payroll' })).toBeVisible();
  });

  test('should have date range selection', async ({ page }) => {
    // Check for start and end date inputs
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').nth(1);

    await expect(startDate).toBeVisible();
    await expect(endDate).toBeVisible();

    // Check for Run Payroll Report button
    await expect(page.getByRole('button', { name: /Run Payroll Report/i })).toBeVisible();
  });

  test('should display technicians earnings table', async ({ page }) => {
    // Check for table headers
    await expect(page.locator('th', { hasText: 'Technician' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Hours Worked' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Hourly Rate' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Earnings' })).toBeVisible();

    // Check that technician data is displayed
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(5); // 5 mock technicians
  });

  test('should display summary cards with totals', async ({ page }) => {
    await expect(page.locator('text=Total Earnings')).toBeVisible();
    await expect(page.locator('text=Total Hours')).toBeVisible();
    await expect(page.locator('text=Work Orders Completed')).toBeVisible();
  });

  test('should have Process Payroll button', async ({ page }) => {
    const processButton = page.getByRole('button', { name: /Process Payroll/i });
    await expect(processButton).toBeVisible();
  });

  test('should show confirmation dialog when processing payroll', async ({ page }) => {
    // Click Process Payroll button
    await page.getByRole('button', { name: 'Process Payroll' }).click();

    // Check dialog appears
    await expect(page.locator('text=Are you sure you want to process payroll')).toBeVisible({ timeout: 5000 });

    // Check for Cancel and Confirm buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm/i })).toBeVisible();
  });

  test('should show success message after processing payroll', async ({ page }) => {
    // Click Process Payroll button
    await page.getByRole('button', { name: 'Process Payroll' }).click();

    // Wait for dialog and click confirm
    await expect(page.getByRole('button', { name: /Confirm/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Check for success message
    await expect(page.locator('text=Payroll processed successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to payroll from sidebar', async ({ page }) => {
    // Go to dashboard first
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('aside nav')).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside nav');
    const payrollLink = sidebar.getByRole('link', { name: 'Payroll' });

    // Expand Financial group if needed
    const isVisible = await payrollLink.isVisible().catch(() => false);
    if (!isVisible) {
      await sidebar.getByRole('button', { name: /Financial/i }).click();
      await expect(payrollLink).toBeVisible({ timeout: 5000 });
    }

    await payrollLink.click();
    await expect(page).toHaveURL(/\/payroll$/);
  });
});
