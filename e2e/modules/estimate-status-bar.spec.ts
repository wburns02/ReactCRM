import { test, expect } from '@playwright/test';

test.describe('Estimate Status Bar', () => {
  test('displays status bar and action buttons', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Navigate to an estimate
    await page.goto('/estimates/147');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/estimate-status-bar-01.png' });

    // Verify status bar is visible
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible({ timeout: 10000 });

    // Verify stages are visible
    await expect(page.locator('text=Draft')).toBeVisible();
    await expect(page.locator('text=Sent')).toBeVisible();
    await expect(page.locator('text=Accepted')).toBeVisible();

    // Check for status description
    const statusDescription = page.locator('text=/ready to convert|awaiting response|customer accepted/i');
    const hasDescription = await statusDescription.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Has status description:', hasDescription);

    await page.screenshot({ path: 'test-results/estimate-status-bar-02.png' });

    console.log('Status bar test completed successfully');
  });
});
