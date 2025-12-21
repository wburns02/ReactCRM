import { test, expect } from '@playwright/test';

/**
 * Routing Tests - Verify no double /app/app/ links
 *
 * This test ensures React Router basename is correctly configured
 * and all internal links use relative paths without the /app prefix.
 *
 * Uses authenticated state from auth.setup.ts
 */

test.describe('Routing - No Double /app/ Links', () => {
  test('dashboard has no /app/app/ links', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for any double /app/ links
    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('customers page has no /app/app/ links', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('prospects page has no /app/app/ links', async ({ page }) => {
    await page.goto('/prospects');
    await page.waitForLoadState('networkidle');

    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('work orders page has no /app/app/ links', async ({ page }) => {
    await page.goto('/work-orders');
    await page.waitForLoadState('networkidle');

    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('schedule page has no /app/app/ links', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('technicians page has no /app/app/ links', async ({ page }) => {
    await page.goto('/technicians');
    await page.waitForLoadState('networkidle');

    const badLinks = await page.locator('a[href*="/app/app/"]').count();
    expect(badLinks).toBe(0);
  });

  test('all navigation links resolve correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get all internal app links
    const links = page.locator('a[href^="/app/"], a[href^="/"]');
    const count = await links.count();

    // Each link should NOT contain /app/app/
    for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 links
      const href = await links.nth(i).getAttribute('href');
      if (href) {
        expect(href).not.toMatch(/\/app\/app\//);
      }
    }
  });

  test('clicking a link navigates correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find a link to customers
    const customersLink = page.getByRole('link', { name: /customers/i }).first();

    if (await customersLink.isVisible()) {
      await customersLink.click();

      // URL should be /app/customers, NOT /app/app/customers
      await page.waitForURL('**/customers**', { timeout: 5000 });
      expect(page.url()).not.toContain('/app/app/');
    }
  });
});

test.describe('Deep Link Navigation', () => {
  test('back links on detail pages work correctly', async ({ page }) => {
    // Navigate to work orders page
    await page.goto('/work-orders');
    await page.waitForLoadState('networkidle');

    // Check that any "Back" links don't have double /app/
    const backLinks = page.locator('a:has-text("Back")');
    const count = await backLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await backLinks.nth(i).getAttribute('href');
      if (href) {
        expect(href).not.toMatch(/\/app\/app\//);
      }
    }
  });
});
