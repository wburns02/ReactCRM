import { test, expect, request as apiRequest } from "@playwright/test";

/**
 * Plan 3 lifecycle smoke — public + authed surface.
 *
 * Public pieces:
 *   - /onboarding/<token> SSR shell 404s for unknown tokens
 *   - /api/v2/public/onboarding/<token> JSON endpoint 404s for unknown tokens
 *
 * The full hire→spawn flow (applicant→technician→onboarding instance) is
 * covered by the backend test suite (tests/hr/test_hire_trigger.py).
 *
 * Frontend route registration:
 *   - /hr/employees/:id, /hr/onboarding/:instanceId, /hr/offboarding/:instanceId
 *     all redirect unauth visitors to /login.
 */

const API_URL =
  process.env.API_URL || "https://react-crm-api-production.up.railway.app";
const FRONTEND_URL = process.env.BASE_URL || "https://react.ecbtx.com";


test.describe("HR lifecycle public surface", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("onboarding SSR shell returns 404 for unknown token", async ({ request }) => {
    const r = await request.get(`${API_URL}/onboarding/does-not-exist-9999`);
    expect(r.status()).toBe(404);
  });

  test("onboarding public API returns 404 for unknown token", async ({ request }) => {
    const r = await request.get(
      `${API_URL}/api/v2/public/onboarding/does-not-exist-9999`,
    );
    expect(r.status()).toBe(404);
  });
});


test.describe("HR lifecycle admin routes gated by auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const uuid = "11111111-1111-1111-1111-111111111111";

  test("/hr/employees/:id redirects unauth → /login", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/employees/${uuid}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => location.href.includes("/login"), {
      timeout: 15000,
    });
  });

  test("/hr/onboarding/:instanceId redirects unauth → /login", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/onboarding/${uuid}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => location.href.includes("/login"), {
      timeout: 15000,
    });
  });

  test("/hr/offboarding/:instanceId redirects unauth → /login", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/offboarding/${uuid}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => location.href.includes("/login"), {
      timeout: 15000,
    });
  });
});
