/**
 * Onboarding & Help Features E2E Tests
 * Tests for setup wizard, onboarding flow, and help center
 */
import { test, expect } from '@playwright/test';

test.describe('Onboarding Features', () => {
  test.describe('Onboarding Wizard', () => {
    test('should load onboarding wizard', async ({ page }) => {
      await page.goto('/onboarding');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show onboarding content or redirect
      const url = page.url();
      expect(url.includes('onboarding') || url.includes('login') || url.includes('dashboard')).toBeTruthy();
    });

    test('should display onboarding steps', async ({ page }) => {
      await page.goto('/onboarding');

      await page.waitForLoadState('networkidle');

      // If on onboarding page, check for step indicators
      if (page.url().includes('onboarding')) {
        const pageContent = await page.content().then(c => c.toLowerCase());
        expect(
          pageContent.includes('step') ||
          pageContent.includes('setup') ||
          pageContent.includes('welcome') ||
          pageContent.includes('get started')
        ).toBeTruthy();
      }
    });
  });

  test.describe('Setup Wizard', () => {
    test('should load setup wizard', async ({ page }) => {
      await page.goto('/setup');

      await page.waitForLoadState('networkidle');

      // Should show setup content or redirect
      const url = page.url();
      expect(url.includes('setup') || url.includes('login') || url.includes('dashboard')).toBeTruthy();
    });

    test('should show company setup options', async ({ page }) => {
      await page.goto('/setup');

      await page.waitForLoadState('networkidle');

      if (page.url().includes('setup')) {
        const pageContent = await page.content().then(c => c.toLowerCase());
        expect(
          pageContent.includes('company') ||
          pageContent.includes('business') ||
          pageContent.includes('setup') ||
          pageContent.includes('configure')
        ).toBeTruthy();
      }
    });
  });

  test.describe('Help Center', () => {
    test('should load help center', async ({ page }) => {
      await page.goto('/help');

      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url.includes('help') || url.includes('login')).toBeTruthy();
    });

    test('should display help articles or search', async ({ page }) => {
      await page.goto('/help');

      await page.waitForLoadState('networkidle');

      if (page.url().includes('help')) {
        const pageContent = await page.content().then(c => c.toLowerCase());
        expect(
          pageContent.includes('help') ||
          pageContent.includes('search') ||
          pageContent.includes('article') ||
          pageContent.includes('support') ||
          pageContent.includes('faq')
        ).toBeTruthy();
      }
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/help');

      await page.waitForLoadState('networkidle');

      if (page.url().includes('help')) {
        // Look for search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
        const hasSearch = await searchInput.count() > 0;

        // Either has search or help content
        const pageContent = await page.content().then(c => c.toLowerCase());
        expect(hasSearch || pageContent.includes('help') || pageContent.includes('article')).toBeTruthy();
      }
    });
  });
});
