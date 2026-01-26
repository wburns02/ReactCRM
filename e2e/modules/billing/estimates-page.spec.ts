import { test, expect } from '@playwright/test';

/**
 * Estimates Page E2E Tests
 *
 * Tests that the Estimates page:
 * 1. Loads and displays the estimates list (or empty state)
 * 2. Makes successful API calls to /quotes (not /estimates)
 * 3. Create Estimate button opens a modal form
 * 4. No 404 errors on API calls
 * 5. No console errors
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Estimates Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|customers|estimates)/, { timeout: 15000 });
  });

  test('estimates page loads and displays list or empty state', async ({ page }) => {
    // Navigate to estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Should see the page title
    await expect(page.locator('h1')).toContainText('Estimates');

    // Should see either estimates table or empty state
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No estimates found').isVisible().catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('GET /quotes returns 200 (not 404)', async ({ page }) => {
    // Intercept API calls
    const apiResponses: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/v2/quotes') || url.includes('/api/v2/estimates')) {
        apiResponses.push({ url, status: response.status() });
      }
    });

    // Navigate to estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Wait a moment for API calls to complete
    await page.waitForTimeout(2000);

    // Should have made a call to /quotes (not /estimates)
    const quotesCall = apiResponses.find(r => r.url.includes('/quotes'));
    const estimatesCall = apiResponses.find(r => r.url.includes('/estimates') && !r.url.includes('/quotes'));

    // Should call /quotes endpoint
    expect(quotesCall).toBeDefined();
    // Accept 200 or 307 redirect (Django trailing slash redirect is normal)
    expect([200, 307].includes(quotesCall?.status || 0)).toBe(true);

    // Should NOT call /estimates endpoint (which would 404)
    expect(estimatesCall).toBeUndefined();
  });

  test('Create Estimate button opens modal', async ({ page }) => {
    // Navigate to estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Find and click Create Estimate button
    const createButton = page.getByRole('button', { name: /Create Estimate/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal should have expected content
    await expect(modal).toContainText('Create New Estimate');
    await expect(modal.locator('text=Customer')).toBeVisible();
    await expect(modal.locator('text=Line Items')).toBeVisible();
  });

  test('Create Estimate modal has working form elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Check form elements exist
    await expect(modal.locator('input[placeholder="Search customers..."]')).toBeVisible();
    await expect(modal.locator('input[placeholder="Service"]')).toBeVisible();
    await expect(modal.locator('input[placeholder="Qty"]')).toBeVisible();
    await expect(modal.locator('input[placeholder="Rate"]')).toBeVisible();

    // Check totals section
    await expect(modal.locator('text=Subtotal')).toBeVisible();
    await expect(modal.getByText('Total', { exact: true })).toBeVisible();

    // Check buttons
    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Create Estimate/i })).toBeVisible();

    // Close modal
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();
  });

  test('filter buttons work', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Check filter buttons exist
    const allButton = page.getByRole('button', { name: 'All' });
    const pendingButton = page.getByRole('button', { name: 'Pending' });
    const acceptedButton = page.getByRole('button', { name: 'Accepted' });
    const declinedButton = page.getByRole('button', { name: 'Declined' });

    await expect(allButton).toBeVisible();
    await expect(pendingButton).toBeVisible();
    await expect(acceptedButton).toBeVisible();
    await expect(declinedButton).toBeVisible();

    // Click each filter - should not error
    await pendingButton.click();
    await page.waitForLoadState('networkidle');

    await acceptedButton.click();
    await page.waitForLoadState('networkidle');

    await declinedButton.click();
    await page.waitForLoadState('networkidle');

    await allButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('no console errors on estimates page', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Open and close modal
    await page.getByRole('button', { name: /Create Estimate/i }).click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);

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

  test('no 404 network errors on estimates page', async ({ page }) => {
    const networkErrors: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      if (response.status() === 404) {
        networkErrors.push({ url: response.url(), status: 404 });
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out expected 404s (favicon, etc)
    const apiErrors = networkErrors.filter(
      (e) => e.url.includes('/api/') && !e.url.includes('favicon')
    );

    expect(apiErrors).toHaveLength(0);
  });

  test('AI Pricing Assistant is available', async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');

    // Should see AI pricing toggle
    const aiToggle = page.locator('text=Get AI pricing suggestions');
    await expect(aiToggle).toBeVisible();

    // Click to expand
    await aiToggle.click();

    // Should see AI pricing panel
    await expect(page.locator('text=AI Pricing Assistant')).toBeVisible();
    await expect(page.locator('input[placeholder*="Septic tank"]')).toBeVisible();
  });
});
