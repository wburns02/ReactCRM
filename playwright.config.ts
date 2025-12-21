import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Playwright configuration for smoke tests
 *
 * Run all tests: npx playwright test
 * Run with UI: npx playwright test --ui
 * Run specific test: npx playwright test smoke.spec.ts
 *
 * CI: Set BASE_URL env var to target staging
 */
// Production URL for Mac-CRM-React deployment
const PRODUCTION_URL = 'https://react.ecbtx.com/app';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to authenticated state
const authFile = join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    // Default to production URL - tests run against deployed app
    baseURL: process.env.BASE_URL || PRODUCTION_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project - runs authentication first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main tests - run after setup with authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state from setup
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],

  // Only start local dev server if LOCAL_DEV is set
  // By default, tests run against production
  webServer: process.env.LOCAL_DEV
    ? {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }
    : undefined,
});
