import { test, expect } from "@playwright/test";

/**
 * Plan 4 polish smoke — verify that every new HR admin route is registered
 * and redirects unauthenticated users to /login.  Deep functional coverage
 * happens in the backend test suite (tests/hr/test_plan4_backend.py).
 */

const FRONTEND_URL = process.env.BASE_URL || "https://react.ecbtx.com";


test.describe("HR polish admin routes gated by auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of [
    "/hr",
    "/hr/inbox",
    "/hr/settings/message-templates",
  ]) {
    test(`${path} redirects unauth user to /login`, async ({ page }) => {
      await page.goto(`${FRONTEND_URL}${path}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForFunction(() => location.href.includes("/login"), {
        timeout: 15000,
      });
    });
  }
});
