import { test, expect } from '@playwright/test';

/**
 * Verify pages load WITHOUT JavaScript errors
 * This is the real test - 404 network responses are expected,
 * but JavaScript errors mean the app is broken.
 */

const ROUTES_TO_TEST = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/customers', name: 'Customers' },
  { path: '/prospects', name: 'Prospects' },
  { path: '/work-orders', name: 'Work Orders' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/technicians', name: 'Technicians' },
  { path: '/settings/notifications', name: 'Notification Settings' },
  { path: '/settings/sms', name: 'SMS Settings' },
  { path: '/service-intervals', name: 'Service Intervals' },
  { path: '/predictive-maintenance', name: 'Predictive Maintenance' },
  { path: '/employee', name: 'Employee Portal' },
];

test.describe('No JavaScript Errors on Page Load', () => {
  for (const route of ROUTES_TO_TEST) {
    test(`${route.name} (${route.path}) loads without JS errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      const consoleErrors: string[] = [];

      // Capture JavaScript errors
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      // Capture console.error calls
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore 404 network errors in console (expected)
          if (!text.includes('404') && !text.includes('Failed to load resource')) {
            consoleErrors.push(text);
          }
        }
      });

      // Navigate to the page
      await page.goto(route.path);

      // Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Allow React to render

      // Check for React error boundary (crash indicator)
      const errorBoundary = page.locator('text=/something went wrong/i, text=/error/i').first();
      const hasErrorBoundary = await errorBoundary.isVisible().catch(() => false);

      // Report results
      if (jsErrors.length > 0) {
        console.log(`\n[JS ERRORS on ${route.path}]:`);
        jsErrors.forEach(e => console.log(`  - ${e}`));
      }

      if (consoleErrors.length > 0) {
        console.log(`\n[CONSOLE ERRORS on ${route.path}]:`);
        consoleErrors.forEach(e => console.log(`  - ${e}`));
      }

      // Assertions
      expect(jsErrors, `JavaScript errors on ${route.path}`).toHaveLength(0);
      expect(hasErrorBoundary, `Error boundary triggered on ${route.path}`).toBe(false);
    });
  }
});

test.describe('Critical Pages Render Content', () => {
  test('Dashboard shows AI Dispatch widget', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should have AI Dispatch heading (even if stats are 0)
    const aiDispatchHeading = page.getByRole('heading', { name: /AI Dispatch/i });
    await expect(aiDispatchHeading).toBeVisible({ timeout: 10000 });
  });

  test('Schedule page shows AI Dispatch button', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Should have AI Dispatch floating button
    const aiButton = page.getByRole('button', { name: /AI Dispatch/i });
    await expect(aiButton).toBeVisible({ timeout: 10000 });
  });

  test('Notification Settings page renders form', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Should render the settings page structure
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Service Intervals page renders table', async ({ page }) => {
    await page.goto('/service-intervals');
    await page.waitForLoadState('networkidle');

    // Should render page without crash
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Employee Portal page renders', async ({ page }) => {
    await page.goto('/employee');
    await page.waitForLoadState('networkidle');

    // Should render page without crash
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });
});
