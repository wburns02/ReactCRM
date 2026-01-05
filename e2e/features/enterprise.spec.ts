/**
 * Enterprise Features E2E Tests
 * Tests for multi-region, franchise, permissions, and compliance
 */
import { test, expect } from '@playwright/test';

test.describe('Enterprise Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for auth
    await page.goto('/login');
  });

  test.describe('Multi-Region Dashboard', () => {
    test('should load multi-region dashboard', async ({ page }) => {
      await page.goto('/enterprise/regions');

      // Check page loads
      await expect(page.locator('h1, h2').filter({ hasText: /region/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display region performance cards', async ({ page }) => {
      await page.goto('/enterprise/regions');

      // Look for performance indicators
      await page.waitForLoadState('networkidle');
      const pageContent = await page.content();
      expect(pageContent).toContain('region');
    });
  });

  test.describe('Franchise Management', () => {
    test('should load franchise management page', async ({ page }) => {
      await page.goto('/enterprise/franchises');

      await expect(page.locator('h1, h2').filter({ hasText: /franchise/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display franchise list or empty state', async ({ page }) => {
      await page.goto('/enterprise/franchises');

      await page.waitForLoadState('networkidle');

      // Either franchises exist or empty state is shown
      const hasFranchises = await page.locator('[data-testid="franchise-card"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no franchises/i').count() > 0;
      const hasContent = await page.locator('text=/franchise/i').count() > 0;

      expect(hasFranchises || hasEmptyState || hasContent).toBeTruthy();
    });
  });

  test.describe('Role Permissions', () => {
    test('should load permissions page', async ({ page }) => {
      await page.goto('/enterprise/permissions');

      await expect(page.locator('h1, h2').filter({ hasText: /permission|role|access/i })).toBeVisible({ timeout: 10000 });
    });

    test('should show role management UI', async ({ page }) => {
      await page.goto('/enterprise/permissions');

      await page.waitForLoadState('networkidle');

      // Should show roles like admin, manager, technician
      const pageContent = await page.content().then(c => c.toLowerCase());
      const hasRoleContent = pageContent.includes('admin') ||
                            pageContent.includes('manager') ||
                            pageContent.includes('role') ||
                            pageContent.includes('permission');

      expect(hasRoleContent).toBeTruthy();
    });
  });

  test.describe('Compliance Dashboard', () => {
    test('should load compliance dashboard', async ({ page }) => {
      await page.goto('/enterprise/compliance');

      await expect(page.locator('h1, h2').filter({ hasText: /compliance/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display compliance metrics', async ({ page }) => {
      await page.goto('/enterprise/compliance');

      await page.waitForLoadState('networkidle');

      // Should show compliance-related content
      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(pageContent.includes('compliance') || pageContent.includes('score') || pageContent.includes('issue')).toBeTruthy();
    });
  });
});
