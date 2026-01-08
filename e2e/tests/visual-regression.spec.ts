import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests using Percy
 *
 * These tests capture full-page screenshots of key UI pages for visual
 * regression testing. Percy compares screenshots across builds to detect
 * unintended visual changes.
 *
 * Prerequisites:
 * - @percy/cli and @percy/playwright installed
 * - PERCY_TOKEN environment variable set (in CI or locally)
 *
 * Running locally:
 *   PERCY_TOKEN=your_token npx percy exec -- npx playwright test e2e/tests/visual-regression.spec.ts
 *
 * In CI:
 *   Percy runs automatically when PERCY_TOKEN is set in GitHub secrets
 */

// Check if Percy should run (token must be set)
const PERCY_ENABLED = !!process.env.PERCY_TOKEN;

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Conditionally import Percy - only if token is available
let percySnapshot: ((page: import('@playwright/test').Page, name: string, options?: Record<string, unknown>) => Promise<void>) | null = null;

test.beforeAll(async () => {
  if (PERCY_ENABLED) {
    try {
      const percy = await import('@percy/playwright');
      percySnapshot = percy.percySnapshot;
      console.log('Percy visual testing enabled');
    } catch (error) {
      console.log('Percy not available - skipping visual tests');
    }
  } else {
    console.log('PERCY_TOKEN not set - visual regression tests will be skipped');
  }
});

test.describe('Visual Regression Tests', () => {
  test.skip(!PERCY_ENABLED, 'Percy token not available');

  test.beforeEach(async ({ page }) => {
    // Add auth cookie if available for authenticated pages
    if (process.env.AUTH_COOKIE) {
      await page.context().addCookies([
        {
          name: 'session',
          value: process.env.AUTH_COOKIE,
          domain: new URL(BASE_URL).hostname,
          path: '/',
        },
      ]);
    }
  });

  test('Dashboard - visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check if redirected to login
    if (page.url().includes('login')) {
      console.log('Not authenticated - taking login page snapshot instead');
      await page.waitForLoadState('networkidle');

      if (percySnapshot) {
        await percySnapshot(page, 'Login Page', {
          fullPage: true,
        });
      }
      return;
    }

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');

    // Wait for main content to be visible
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 15000 });

    // Additional wait for any async content
    await page.waitForTimeout(1000);

    if (percySnapshot) {
      await percySnapshot(page, 'Dashboard', {
        fullPage: true,
      });
    }
  });

  test('Customer Success - visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);

    // Check if redirected to login
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for main content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 15000 });

    // Wait for any data to load
    await page.waitForTimeout(1000);

    if (percySnapshot) {
      await percySnapshot(page, 'Customer Success', {
        fullPage: true,
      });
    }
  });

  test('Schedule - visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/schedule`);

    // Check if redirected to login
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for main content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 15000 });

    // Wait for calendar/schedule content to render
    await page.waitForTimeout(1500);

    if (percySnapshot) {
      await percySnapshot(page, 'Schedule', {
        fullPage: true,
      });
    }
  });

  test('Work Orders - visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/work-orders`);

    // Check if redirected to login
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for main content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 15000 });

    // Wait for table/list data to load
    await page.waitForTimeout(1000);

    if (percySnapshot) {
      await percySnapshot(page, 'Work Orders', {
        fullPage: true,
      });
    }
  });
});

test.describe('Visual Regression - Component States', () => {
  test.skip(!PERCY_ENABLED, 'Percy token not available');

  test.beforeEach(async ({ page }) => {
    if (process.env.AUTH_COOKIE) {
      await page.context().addCookies([
        {
          name: 'session',
          value: process.env.AUTH_COOKIE,
          domain: new URL(BASE_URL).hostname,
          path: '/',
        },
      ]);
    }
  });

  test('Work Orders - with filters applied', async ({ page }) => {
    await page.goto(`${BASE_URL}/work-orders?status=scheduled`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (percySnapshot) {
      await percySnapshot(page, 'Work Orders - Scheduled Filter', {
        fullPage: true,
      });
    }
  });

  test('Dashboard - responsive mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (percySnapshot) {
      await percySnapshot(page, 'Dashboard - Mobile', {
        fullPage: true,
        widths: [375], // Override default widths for this snapshot
      });
    }
  });
});
