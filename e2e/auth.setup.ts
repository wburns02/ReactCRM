import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to save authenticated state
const authFile = join(__dirname, '../.auth/user.json');

/**
 * Authentication setup - runs before all tests
 * Logs in and saves session state for reuse
 */
setup('authenticate', async ({ page, baseURL }) => {
  // Navigate to login page (use baseURL from config, strip /app suffix for login)
  const loginUrl = baseURL?.replace(/\/app\/?$/, '') + '/login';
  await page.goto(loginUrl);

  // Wait for login form to be visible
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || 'will@macseptic.com');
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || '#Espn2025');

  // Click sign in button
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Verify we're logged in by checking for a navigation element
  await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible({ timeout: 5000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
