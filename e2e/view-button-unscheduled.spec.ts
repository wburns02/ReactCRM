import { test, expect } from '@playwright/test';

test.describe('View Button in Unscheduled Work Orders', () => {
  test('clicking View navigates to work order detail page', async ({ page }) => {
    // Login
    await page.goto('https://react.ecbtx.com/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Go to schedule page
    await page.goto('https://react.ecbtx.com/schedule');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/schedule-before-view-click.png', fullPage: true });

    // Find the View link inside a table row (tr) in the unscheduled work orders section
    // This avoids matching "View All" button at the top
    const viewLink = page.locator('tr a:has-text("View")').first();

    // Verify the View link exists
    await expect(viewLink).toBeVisible({ timeout: 10000 });

    // Get the href to verify it's correct
    const href = await viewLink.getAttribute('href');
    console.log('View link href:', href);
    expect(href).toMatch(/^\/work-orders\/[\w-]+$/);

    // Click the View link
    await viewLink.click();

    // Should navigate to work order detail page
    await page.waitForURL(/\/work-orders\/[\w-]+/, { timeout: 10000 });

    // Take screenshot of detail page
    await page.screenshot({ path: 'test-results/work-order-detail-page.png', fullPage: true });

    // Verify we're on the work order detail page
    const url = page.url();
    console.log('Navigated to:', url);
    expect(url).toMatch(/\/work-orders\/[\w-]+$/);

    // The page should have work order content
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Work Order');
  });
});
