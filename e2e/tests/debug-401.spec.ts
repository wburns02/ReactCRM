import { test, expect } from '@playwright/test';

/**
 * Debug test to reproduce 401 console errors
 * This test doesn't require authentication
 */
test.describe('Debug 401 Errors', () => {
  test('should catch 401 console errors on home page', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect network failures
    const networkErrors: { url: string; status: number; statusText: string }[] = [];
    page.on('response', response => {
      if (response.status() === 401) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to home page (should redirect to /login if not authenticated)
    await page.goto('https://react.ecbtx.com/');

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait a bit more to catch any async API calls
    await page.waitForTimeout(3000);

    console.log('Console errors:', consoleErrors);
    console.log('Network 401 errors:', networkErrors);

    // Report findings
    if (networkErrors.length > 0) {
      console.log(`Found ${networkErrors.length} 401 network errors:`);
      for (const error of networkErrors) {
        console.log(`  - ${error.url} (${error.status} ${error.statusText})`);
      }
    }

    if (consoleErrors.length > 0) {
      console.log(`Found ${consoleErrors.length} console errors:`);
      for (const error of consoleErrors) {
        console.log(`  - ${error}`);
      }
    }
  });

  test('should check if useAuth is making unnecessary calls', async ({ page }) => {
    // Track API calls to auth endpoints
    const authCalls: { url: string; method: string; status?: number }[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/auth/') || url.includes('/api/')) {
        authCalls.push({
          url,
          method: request.method(),
        });
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/auth/') || url.includes('/api/')) {
        const call = authCalls.find(c => c.url === url && !c.status);
        if (call) {
          call.status = response.status();
        }
      }
    });

    // Navigate to home page
    await page.goto('https://react.ecbtx.com/');

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for any async calls
    await page.waitForTimeout(5000);

    console.log('Auth-related API calls:', authCalls);

    // Filter for 401 errors
    const auth401s = authCalls.filter(call => call.status === 401);
    if (auth401s.length > 0) {
      console.log(`Found ${auth401s.length} auth calls that returned 401:`);
      for (const call of auth401s) {
        console.log(`  - ${call.method} ${call.url} → ${call.status}`);
      }
    }
  });
});