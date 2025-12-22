import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Playwright configuration for one-shot troubleshooting
 *
 * Commands:
 *   npx playwright test                    # Run all tests
 *   npx playwright test --ui               # Run with UI mode for debugging
 *   npx playwright test --project=health   # Run health checks only
 *   npx playwright test --project=contracts # Run API contract tests only
 *   npx playwright test e2e/modules/customers # Run specific module
 *
 * Environment:
 *   BASE_URL=https://...   # Target staging/production
 *   LOCAL_DEV=1            # Start local dev server
 *   CI=true                # CI mode (auto-set by GitHub Actions)
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

  // Enhanced reporters for debugging
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
      ],

  use: {
    // Default to production URL - tests run against deployed app
    baseURL: process.env.BASE_URL || PRODUCTION_URL,

    // Debugging artifacts - capture on failure/retry
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - runs authentication first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Health checks - session, cookies, API connectivity
    {
      name: 'health',
      testDir: './e2e/health',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // API contract tests - fast, no browser needed for most
    {
      name: 'contracts',
      testDir: './e2e/contracts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Module UI tests
    {
      name: 'modules',
      testDir: './e2e/modules',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Default chromium project for any remaining tests
    {
      name: 'chromium',
      testDir: './e2e',
      testIgnore: ['**/health/**', '**/contracts/**', '**/modules/**', '**/fixtures/**'],
      use: {
        ...devices['Desktop Chrome'],
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
