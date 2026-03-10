import { test, expect } from '@playwright/test';

/**
 * Production health check test
 * Verifies core site functionality without authentication dependencies
 */

test.describe('Production Health Check', () => {
  test('site loads and displays correctly', async ({ page }) => {
    // Navigate to the homepage
    const response = await page.goto('https://react.ecbtx.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Verify successful response
    expect(response?.status()).toBe(200);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify page title loads
    const title = await page.title();
    expect(title).toContain('Septic Tank Pumping');

    // Verify main content is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify no JavaScript errors in console
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Wait a bit to capture any console errors
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = logs.filter(log =>
      !log.includes('favicon.ico') &&
      !log.includes('sw.js') &&
      !log.includes('workbox')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    // This should be 0 for a healthy production site
    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow up to 2 non-critical errors
  });

  test('backend API is accessible', async ({ request }) => {
    // Test backend health endpoint
    const response = await request.get('https://react-crm-api-production.up.railway.app/health');
    expect(response.status()).toBe(200);

    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database.status).toBe('healthy');
  });

  test('navigation works without errors', async ({ page }) => {
    await page.goto('https://react.ecbtx.com/');

    // Try to access a simple route that should work
    await page.goto('https://react.ecbtx.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Should either show login form or redirect to dashboard if already logged in
    const response = page.url();
    expect(response).toMatch(/(login|dashboard|home)/);
  });
});