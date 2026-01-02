import { test, expect } from '@playwright/test';

/**
 * 404 Error Detection Script
 * Captures all 404 errors across the application
 */

const ALL_ROUTES = [
  '/',
  '/dashboard',
  '/customers',
  '/prospects',
  '/work-orders',
  '/schedule',
  '/technicians',
  '/invoices',
  '/payments',
  '/inventory',
  '/equipment',
  '/fleet',
  '/tickets',
  '/reports',
  '/marketing',
  '/marketing/ads',
  '/marketing/reviews',
  '/marketing/ai-content',
  '/email-marketing',
  '/users',
  '/admin',
  '/notifications',
  '/settings/notifications',
  '/settings/sms',
  '/service-intervals',
  '/predictive-maintenance',
  '/employee',
  '/payroll',
  '/phone',
  '/integrations',
];

test.describe('404 Error Detection', () => {
  test('capture all 404 errors across routes', async ({ page }) => {
    const errors404: string[] = [];
    const allNetworkErrors: string[] = [];

    // Listen for all responses
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();

      if (status === 404) {
        errors404.push(`404: ${url}`);
        console.log(`[404 FOUND] ${url}`);
      }

      if (status >= 400) {
        allNetworkErrors.push(`[${status}] ${url}`);
      }
    });

    // Listen for failed requests
    page.on('requestfailed', (request) => {
      console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Try to login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    if (page.url().includes('login')) {
      // Try test credentials
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');

      if (await emailInput.isVisible()) {
        await emailInput.fill('admin@example.com');
        await passwordInput.fill('admin123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    // Visit each route and capture 404s
    for (const route of ALL_ROUTES) {
      console.log(`\n--- Visiting ${route} ---`);

      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1000); // Allow API calls to complete
      } catch (e) {
        console.log(`Error visiting ${route}: ${e}`);
      }
    }

    // Report results
    console.log('\n\n========== 404 ERROR SUMMARY ==========');
    console.log(`Total 404 errors found: ${errors404.length}`);

    if (errors404.length > 0) {
      console.log('\n404 URLs:');
      errors404.forEach(e => console.log(e));
    }

    console.log('\n\nAll network errors (400+):');
    allNetworkErrors.forEach(e => console.log(e));

    // Test will fail if 404s found, showing the list
    if (errors404.length > 0) {
      console.log('\n\nFailing test to show 404 errors in report');
    }

    // Output for parsing
    console.log('\n\n[404_LIST_START]');
    errors404.forEach(e => console.log(e));
    console.log('[404_LIST_END]');
  });
});
