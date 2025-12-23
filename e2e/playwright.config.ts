import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Playwright Configuration for Self-Healing System
 *
 * Features:
 * - Trace capture on all failures (for debugging)
 * - Screenshots on failure
 * - Videos retained on failure
 * - Configurable output directory via ARTIFACT_DIR
 * - Multiple test projects (health, contracts, security, e2e)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// URLs
const PRODUCTION_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';
const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

// Artifact directory (set by self_heal_run.sh)
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || join(projectRoot, 'test-results');
const authFile = join(projectRoot, '.auth/user.json');

export default defineConfig({
  testDir: './tests',

  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,

  // Fail fast settings
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,

  // Timeouts
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Output directories
  outputDir: join(ARTIFACT_DIR, 'test-results'),

  // Reporters
  reporter: [
    ['list'],
    ['html', {
      outputFolder: join(ARTIFACT_DIR, 'playwright-report'),
      open: 'never',
    }],
    ['json', {
      outputFile: join(ARTIFACT_DIR, 'reports', 'playwright.json'),
    }],
  ],

  // Global settings
  use: {
    baseURL: PRODUCTION_URL,

    // ALWAYS capture trace for debugging
    trace: 'on',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser settings
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Don't ignore HTTPS errors in production
    ignoreHTTPSErrors: false,
  },

  projects: [
    // Authentication setup
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Core E2E tests
    {
      name: 'e2e',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Health checks (from main e2e directory)
    {
      name: 'health',
      testDir: '../e2e/health',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Contract tests
    {
      name: 'contracts',
      testDir: '../e2e/contracts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Security tests
    {
      name: 'security',
      testDir: '../e2e/security',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});
