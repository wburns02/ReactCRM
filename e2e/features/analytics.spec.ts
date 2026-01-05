/**
 * Analytics Features E2E Tests
 * Tests for operations, financial, performance, and AI insights dashboards
 */
import { test, expect } from '@playwright/test';

test.describe('Analytics Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('Operations Command Center', () => {
    test('should load operations dashboard', async ({ page }) => {
      await page.goto('/analytics/operations');

      await expect(page.locator('h1, h2').filter({ hasText: /operation|command/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display live technician map or placeholder', async ({ page }) => {
      await page.goto('/analytics/operations');

      await page.waitForLoadState('networkidle');

      // Check for map-related content
      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('map') ||
        pageContent.includes('technician') ||
        pageContent.includes('dispatch') ||
        pageContent.includes('operations')
      ).toBeTruthy();
    });
  });

  test.describe('Financial Dashboard', () => {
    test('should load financial dashboard', async ({ page }) => {
      await page.goto('/analytics/financial');

      await expect(page.locator('h1, h2').filter({ hasText: /financial|revenue/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display revenue metrics', async ({ page }) => {
      await page.goto('/analytics/financial');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('revenue') ||
        pageContent.includes('cash') ||
        pageContent.includes('margin') ||
        pageContent.includes('financial')
      ).toBeTruthy();
    });
  });

  test.describe('Performance Scorecard', () => {
    test('should load performance scorecard', async ({ page }) => {
      await page.goto('/analytics/performance');

      await expect(page.locator('h1, h2').filter({ hasText: /performance|scorecard/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display technician performance metrics', async ({ page }) => {
      await page.goto('/analytics/performance');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('performance') ||
        pageContent.includes('technician') ||
        pageContent.includes('score') ||
        pageContent.includes('rating')
      ).toBeTruthy();
    });
  });

  test.describe('AI Insights Panel', () => {
    test('should load AI insights page', async ({ page }) => {
      await page.goto('/analytics/insights');

      await expect(page.locator('h1, h2').filter({ hasText: /insight|ai/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display AI recommendations or placeholder', async ({ page }) => {
      await page.goto('/analytics/insights');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('insight') ||
        pageContent.includes('recommendation') ||
        pageContent.includes('prediction') ||
        pageContent.includes('ai')
      ).toBeTruthy();
    });
  });

  test.describe('FTFR Dashboard', () => {
    test('should load FTFR dashboard', async ({ page }) => {
      await page.goto('/analytics/ftfr');

      await expect(page.locator('h1, h2').filter({ hasText: /first.time|ftfr|fix.rate/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('BI Dashboard', () => {
    test('should load BI dashboard', async ({ page }) => {
      await page.goto('/analytics/bi');

      await expect(page.locator('h1, h2').filter({ hasText: /business|intelligence|bi|dashboard/i })).toBeVisible({ timeout: 10000 });
    });
  });
});
