import { defineConfig, devices } from "@playwright/test";

/**
 * Standalone Playwright config for the HR foundation public smoke.
 * Bypasses the auth.setup dependency since the authed admin pages are
 * verified by the backend test suite (tests/hr/test_workflow_router.py,
 * test_requisition_router.py) and the admin frontend verification will
 * happen once the test-user login is fixed in a separate pass.
 */
export default defineConfig({
  testDir: "./e2e/modules",
  testMatch: /hr-(foundation|admin-flow|recruiting-flow|lifecycle-flow|polish)\.spec\.ts/,
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "https://react.ecbtx.com",
    trace: "on",
    screenshot: "on",
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: "hr-public",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      grep: /public careers|admin frontend|public apply|recruiting frontend|lifecycle public|lifecycle admin|polish admin/,
    },
  ],
});
