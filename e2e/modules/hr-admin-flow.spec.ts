import { test, expect } from "@playwright/test";

/**
 * Frontend admin surface verification.
 *
 * Full end-to-end (create requisition via authed admin UI) requires a valid
 * test user on the production environment. The global auth.setup uses
 * test@macseptic.com which returns 401 on prod — this is a pre-existing test
 * infrastructure gap unrelated to HR, tracked separately.
 *
 * Until that's fixed we verify:
 *   1. /hr/requisitions exists on the SPA (redirects to /login when unauth,
 *      rather than crashing or 404'ing — proves the route is registered).
 *   2. /hr/requisitions/new behaves the same.
 *
 * The corresponding authed flow is covered by the backend test suite:
 *   - tests/hr/test_requisition_router.py
 *   - tests/hr/test_workflow_router.py
 *   - tests/hr/test_esign_router.py
 */

const FRONTEND_URL = process.env.BASE_URL || "https://react.ecbtx.com";


test.describe("HR admin frontend routes are registered", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/hr/requisitions redirects unauth user to /login", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/requisitions`);
    await page.waitForLoadState("domcontentloaded");
    // Route exists: unauth users hit the auth guard and land on /login.
    await page.waitForFunction(
      () => location.pathname === "/login" || location.href.includes("/login"),
      { timeout: 15000 },
    );
    await expect(
      page.getByRole("heading", { name: /welcome back|sign in/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("/hr/requisitions/new redirects unauth user to /login", async ({
    page,
  }) => {
    await page.goto(`${FRONTEND_URL}/hr/requisitions/new`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(
      () => location.pathname === "/login" || location.href.includes("/login"),
      { timeout: 15000 },
    );
    await expect(
      page.getByRole("heading", { name: /welcome back|sign in/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
