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
  // Navigate to login page (baseURL is root, login is at /login)
  const loginUrl = (baseURL || 'https://react.ecbtx.com') + '/login';
  await page.goto(loginUrl);

  // Wait for login form to be visible
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });

  // Fill in credentials (test user in FastAPI database)
  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || 'test@macseptic.com');
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || 'TestPassword123');

  // Click sign in button
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful login - redirects through / → /dashboard, /my-dashboard, or /onboarding
  await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 15000 });

  // Set onboarding as completed to bypass wizard for tests
  // This simulates an existing user who has already completed onboarding
  // Also set session state so the auth check passes
  await page.evaluate(() => {
    localStorage.setItem('crm_onboarding_completed', 'true');
    // Set session state in BOTH sessionStorage AND localStorage
    // sessionStorage for the frontend's quick auth check
    // localStorage so it persists in Playwright's storageState
    const sessionState = JSON.stringify({
      isAuthenticated: true,
      lastValidated: Date.now(),
      userId: '1', // Test user ID
    });
    sessionStorage.setItem('session_state', sessionState);
    localStorage.setItem('session_state', sessionState);
    // SECURITY: Clean up any legacy auth tokens - use HTTP-only cookies instead
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem('access_token');
  });

  // If we're on onboarding, navigate to dashboard
  if (page.url().includes('/onboarding')) {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard');
  } else if (!page.url().includes('/dashboard')) {
    // Ensure we end up at dashboard for the shared auth state
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard');
  }

  // Wait for page to load (don't use networkidle - WebSocket keeps it pending)
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

  // Verify we're logged in by checking for sidebar navigation (visible on desktop)
  await expect(page.locator('nav').first()).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
