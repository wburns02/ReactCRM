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
const PRODUCTION_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

// Artifact directory (set by self_heal_run.sh)
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || join(__dirname, 'test-results');
const authFile = join(__dirname, '.auth/user.json');

// Curated CI test suite — stable, meaningful tests only.
// Add new tests here when they're proven stable. Do NOT add debug/investigation files.
// Paths are relative to testDir ('tests/').
const CI_SUITE = [
  'auth.spec.ts',
  'api-health.spec.ts',
  'backend-health.spec.ts',
  'crm.spec.ts',
  'technicians-crud.e2e.spec.ts',
  'technician-dashboard.e2e.spec.ts',
  'tech-portal-vibe.e2e.spec.ts',
  'work-orders-creation.e2e.spec.ts',
  'payments-page-fix.e2e.spec.ts',
  'phase2-comprehensive.spec.ts',
  'phase3-operational.spec.ts',
  'commissions-auto-calc.e2e.spec.ts',
];

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
  outputDir: './test-results',

  // Reporters
  reporter: [
    ['list'],
    ['html', {
      outputFolder: './playwright-report',
      open: 'never',
    }],
    ['json', {
      outputFile: './test-results/results.json',
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
    // Auth setup — login and save session state
    // testDir must point to e2e/ root since auth.setup.ts lives there, not in tests/
    {
      name: 'setup',
      testDir: './',
      testMatch: /auth\.setup\.ts/,
    },

    // Curated CI suite — runs after setup, uses saved auth state
    {
      name: 'e2e',
      testDir: './tests',
      testMatch: CI_SUITE,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Security tests
    {
      name: 'security',
      testDir: './security',
      testMatch: /.*\.security\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});
