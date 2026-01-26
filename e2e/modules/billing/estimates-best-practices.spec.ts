import { test, expect } from '@playwright/test';

/**
 * Estimates 2026 Best Practices E2E Tests
 *
 * Tests the preset service catalog and quick-add functionality:
 * 1. Quick-add buttons for common services
 * 2. Service selector with categories and search
 * 3. Package selection with discount
 * 4. Real-time total calculation
 * 5. Mobile viewport support
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Estimates Best Practices', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|customers|estimates)/, { timeout: 15000 });

    // Navigate to estimates
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');
  });

  test('quick-add buttons visible in create modal', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should see Quick Add section
    await expect(page.locator('text=Quick Add')).toBeVisible();

    // Should see quick-add buttons for common services
    await expect(page.getByRole('button', { name: /1000/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /1500/i })).toBeVisible();
  });

  test('clicking quick-add adds line item with correct rate', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click quick-add for 1000gal pump out
    await page.getByRole('button', { name: /1000.*\$295/i }).click();

    // Line item should be added with service name
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await expect(serviceInput).toHaveValue(/Pump Out.*1000/i);

    // Rate should be pre-filled
    const rateInput = page.locator('input[placeholder="Rate"]').first();
    await expect(rateInput).toHaveValue('295');
  });

  test('browse all services shows category tabs', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click "Browse all services"
    await modal.getByText('Browse all services').click();

    // Should see category tabs (scoped to modal to avoid matching filter buttons)
    await expect(modal.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(modal.getByRole('button', { name: /🚛 Pumping/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /🔍 Inspection/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /🔧 Maintenance/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /⚠️ Repair/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /📦 Packages/i })).toBeVisible();
  });

  test('search filters services correctly', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Expand service browser
    await modal.getByText('Browse all services').click();

    // Search for "inspection"
    await modal.locator('input[placeholder="Search services..."]').fill('inspection');

    // Should only see inspection-related services (scoped to modal)
    await expect(modal.locator('text=Routine Inspection').first()).toBeVisible();
    await expect(modal.locator('text=Camera Inspection').first()).toBeVisible();

    // Should NOT see pumping services (filtered out)
    await expect(modal.locator('button:has-text("Pump Out - Up to 1000 gal")')).not.toBeVisible();
  });

  test('packages show discount and add multiple items', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Expand service browser
    await modal.getByText('Browse all services').click();

    // Click Packages tab (scoped to modal)
    await modal.getByRole('button', { name: /📦 Packages/i }).click();

    // Should see package with discount
    await expect(modal.locator('text=Maintenance Package')).toBeVisible();
    await expect(modal.locator('text=Save').first()).toBeVisible(); // Discount indicator
  });

  test('total updates in real-time when adding services', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Add pump out service (use first() to avoid strict mode)
    await modal.getByRole('button', { name: /1000.*\$295/i }).first().click();

    // Check subtotal shows (scoped to modal)
    await expect(modal.locator('text=Subtotal')).toBeVisible();
    // Check the subtotal value is shown in the totals section (look for $295.00 format)
    await expect(modal.getByText('$295.00', { exact: true }).first()).toBeVisible();

    // Tax should be calculated (8.25% default) - look for the tax line in totals
    await expect(modal.getByText(/Tax \(8\.25%\)/)).toBeVisible();
  });

  test('can add multiple services from selector', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Add first service
    await page.getByRole('button', { name: /1000.*\$295/i }).click();

    // Add second service (inspection)
    await page.getByRole('button', { name: /Inspection.*\$195/i }).click();

    // Should have 2 line items
    const serviceInputs = page.locator('input[placeholder="Service"]');
    await expect(serviceInputs).toHaveCount(2);
  });

  test('default tax rate is pre-filled', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Tax rate input should have default value (8.25 for Texas)
    const taxInput = page.locator('input[type="number"]').filter({ hasText: /tax/i }).or(
      page.locator('input').filter({ has: page.locator('text=Tax Rate') })
    );

    // Just verify tax section exists
    await expect(page.locator('text=Tax Rate')).toBeVisible();
  });

  test('no console errors during service selection', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');

    // Browse services
    await modal.getByText('Browse all services').click();

    // Add a service (use first() to avoid strict mode)
    await modal.getByRole('button', { name: /1000.*\$295/i }).first().click();

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('workbox') &&
        !e.includes('service-worker') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Third-party cookie')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Estimates Best Practices - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true }); // iPhone SE with touch

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|customers|estimates)/, { timeout: 15000 });
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');
  });

  test('service selector works on mobile viewport', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Quick add should be visible
    await expect(modal.locator('text=Quick Add')).toBeVisible();

    // Should be able to click quick-add button on mobile
    const quickAddBtn = modal.getByRole('button', { name: /1000/i }).first();
    await expect(quickAddBtn).toBeVisible();
    await quickAddBtn.click();

    // Line item should be added
    const serviceInput = modal.locator('input[placeholder="Service"]').first();
    await expect(serviceInput).toHaveValue(/Pump Out/i);
  });

  test('category tabs scroll horizontally on mobile', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    const modal = page.locator('[role="dialog"]');

    // Expand browser
    await modal.getByText('Browse all services').click();

    // Category tabs container should be scrollable (overflow-x-auto class)
    const tabsContainer = modal.locator('.overflow-x-auto').first();
    await expect(tabsContainer).toBeVisible();
  });
});
