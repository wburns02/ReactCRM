import { test, expect } from '@playwright/test';

test.describe('Dump Sites', () => {
  test('can view and create dump sites', async ({ page }) => {
    // Go directly to login page and authenticate
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in login form
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');

    // Wait for login to complete - should redirect to dashboard or onboarding
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    console.log('Login successful, URL:', page.url());

    // Wait a moment for auth state to settle
    await page.waitForTimeout(1000);

    // Navigate to Dump Sites page
    await page.goto('/admin/dump-sites');
    await page.waitForLoadState('networkidle');
    console.log('Dump sites URL:', page.url());
    await page.screenshot({ path: 'test-results/dump-sites-01-page.png' });

    // Check if we're still on the dump sites page
    if (page.url().includes('/login')) {
      console.log('ERROR: Got redirected to login');
      throw new Error('Session not persisting');
    }

    // Wait for content to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/dump-sites-02-loaded.png' });

    // Look for the page title or content
    const pageTitle = page.locator('h1, h2, [class*="title"]').filter({ hasText: /Dump/i });
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    // Check if the existing test dump site is visible
    const existingSite = page.locator('text=Test Dump Site via API');
    if (await existingSite.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Existing dump site found - API data is showing');
    }

    // Click Add New Site
    const addButton = page.locator('button').filter({ hasText: /Add.*Site/i });
    await addButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/dump-sites-03-form.png' });

    // Fill in the form using IDs
    await page.fill('#site-name', 'Playwright Test Site ' + Date.now());
    await page.selectOption('#site-state', 'TX');
    await page.fill('#site-city', 'Houston');
    await page.fill('#site-fee', '8');
    await page.fill('#hours-operation', '24/7')

    await page.screenshot({ path: 'test-results/dump-sites-04-filled.png' });

    // Submit form - scroll to see button and click
    await page.locator('button').filter({ hasText: /Add Site|Save|Submit/i }).click();

    // Wait for response
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/dump-sites-05-submitted.png' });

    // Check for any error messages
    const errorMsg = page.locator('[class*="error"], [role="alert"]');
    if (await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorMsg.textContent();
      console.log('Error message:', errorText);
    }

    console.log('Test completed');
  });
});
