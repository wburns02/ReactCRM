import { test, expect } from '@playwright/test';

/**
 * Customer Success Platform E2E Tests - Campaigns and AI Insights
 *
 * Tests for the new Campaign automation and AI Insights features:
 * - Campaigns tab with API integration
 * - AI Insights tab with portfolio health and subject optimizer
 */

// Helper to set up sessionStorage after page load
async function setupSessionStorage(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    sessionStorage.setItem('session_state', JSON.stringify({
      isAuthenticated: true,
      lastValidated: Date.now(),
      userId: '2',
    }));
  });
}

test.describe('Campaigns Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setupSessionStorage(page);
  });

  test('shows campaigns tab and content', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click Campaigns tab
    const campaignsTab = page.getByRole('button', { name: /Campaigns/i });
    await expect(campaignsTab).toBeVisible();
    await campaignsTab.click();

    // Should show Nurture Campaigns heading
    await expect(page.getByRole('heading', { name: /Nurture Campaigns/i })).toBeVisible({ timeout: 10000 });

    // Should show Create Campaign button
    await expect(page.getByRole('button', { name: /Create Campaign/i })).toBeVisible();
  });

  test('can filter campaigns by goal', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Navigate to Campaigns tab
    const campaignsTab = page.getByRole('button', { name: /Campaigns/i });
    await campaignsTab.click();
    await page.waitForTimeout(1000);

    // Should show filter buttons
    await expect(page.getByRole('button', { name: /All Campaigns/i })).toBeVisible();

    // Check for goal filter buttons (onboarding, adoption, retention, etc.)
    const onboardingFilter = page.getByRole('button', { name: /onboarding/i });
    const filterVisible = await onboardingFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await onboardingFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('handles loading and empty states', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Navigate to Campaigns tab
    const campaignsTab = page.getByRole('button', { name: /Campaigns/i });
    await campaignsTab.click();

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should show either campaigns or empty state (no error)
    const hasContent = await page.locator('[class*="bg-bg-card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/No Campaigns Found/i).isVisible().catch(() => false);

    // One of these should be true (content or empty state)
    expect(hasContent || hasEmptyState).toBe(true);
  });
});

test.describe('AI Insights Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setupSessionStorage(page);
  });

  test('shows AI Insights tab and content', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click AI Insights tab
    const aiInsightsTab = page.getByRole('button', { name: /AI Insights/i });
    await expect(aiInsightsTab).toBeVisible();
    await aiInsightsTab.click();

    // Should show AI Insights Hub heading
    await expect(page.getByRole('heading', { name: /AI Insights Hub/i })).toBeVisible({ timeout: 10000 });

    // Should show Optimize Subject Line button
    await expect(page.getByRole('button', { name: /Optimize Subject Line/i })).toBeVisible();
  });

  test('shows portfolio health section', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Navigate to AI Insights tab
    const aiInsightsTab = page.getByRole('button', { name: /AI Insights/i });
    await aiInsightsTab.click();
    await page.waitForTimeout(2000);

    // Should show Portfolio Health card
    await expect(page.getByText('Portfolio Health')).toBeVisible({ timeout: 10000 });
  });

  test('can open subject line optimizer modal', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Navigate to AI Insights tab
    const aiInsightsTab = page.getByRole('button', { name: /AI Insights/i });
    await aiInsightsTab.click();
    await page.waitForTimeout(1000);

    // Click Optimize Subject Line button
    const optimizeBtn = page.getByRole('button', { name: /Optimize Subject Line/i });
    await optimizeBtn.click();

    // Modal should open
    await expect(page.getByRole('heading', { name: /AI Subject Line Optimizer/i })).toBeVisible({ timeout: 5000 });

    // Should have input field for subject line
    await expect(page.getByPlaceholder(/Enter your subject line/i)).toBeVisible();

    // Should have campaign goal dropdown
    await expect(page.getByText('Campaign Goal')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('shows campaign analysis section', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Navigate to AI Insights tab
    const aiInsightsTab = page.getByRole('button', { name: /AI Insights/i });
    await aiInsightsTab.click();
    await page.waitForTimeout(2000);

    // Should show Campaign Analysis card
    await expect(page.getByText('Campaign Analysis')).toBeVisible({ timeout: 10000 });

    // Should have campaign selector dropdown (check for the select element)
    const selectElement = page.locator('select').first();
    await expect(selectElement).toBeVisible();
  });
});

test.describe('Campaigns + AI Insights Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setupSessionStorage(page);
  });

  test('no JavaScript errors on Campaigns and AI Insights tabs', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Check Campaigns tab for errors
    const campaignsTab = page.getByRole('button', { name: /Campaigns/i });
    if (await campaignsTab.isVisible()) {
      await campaignsTab.click();
      await page.waitForTimeout(2000);
    }

    // Check AI Insights tab for errors
    const aiInsightsTab = page.getByRole('button', { name: /AI Insights/i });
    if (await aiInsightsTab.isVisible()) {
      await aiInsightsTab.click();
      await page.waitForTimeout(2000);
    }

    expect(jsErrors, 'JavaScript errors on new CS tabs').toHaveLength(0);
  });
});
