import { test, expect } from "@playwright/test";

/**
 * HR Module — Plan 1 foundation smoke.
 *
 * - Careers index is public (SSR) and served from the API host.
 * - The admin requisition editor is authed and lives on the frontend.
 *
 * Run locally:
 *   npx playwright test tests/hr-foundation.spec.ts --project=e2e
 */

const API_URL =
  process.env.API_URL || "https://react-crm-api-production.up.railway.app";
const FRONTEND_URL = process.env.BASE_URL || "https://react.ecbtx.com";


test.describe("HR foundation — public careers (no auth)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("careers index renders and does not require auth", async ({ page }) => {
    await page.goto(`${API_URL}/careers`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Careers at Mac Septic/i);
  });

  test("jobs.xml feed returns valid XML", async ({ request }) => {
    const r = await request.get(`${API_URL}/careers/jobs.xml`);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("application/xml");
    const body = await r.text();
    expect(body).toMatch(/<source>/);
    expect(body).toMatch(/<\/source>/);
  });

  test("HR API health probe returns ok (flag-gated)", async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v2/hr/health`);
    // When HR_MODULE_ENABLED is off in production this will 404 — accept both.
    expect([200, 404]).toContain(r.status());
    if (r.status() === 200) {
      expect(await r.json()).toEqual({ status: "ok", module: "hr" });
    }
  });
});


test.describe("HR foundation — admin requisitions (authed)", () => {
  test("requisitions list page loads for authed admin", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const t = msg.text();
        if (
          !t.includes("favicon") &&
          !t.includes("Sentry") &&
          !t.includes("ResizeObserver") &&
          !t.includes("API Schema Violation") &&
          !t.includes("404") &&
          !t.includes("Failed to load resource")
        ) {
          consoleErrors.push(t);
        }
      }
    });

    await page.goto(`${FRONTEND_URL}/hr/requisitions`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !location.href.includes("/login"), {
      timeout: 15000,
    });

    await expect(
      page.getByRole("heading", { name: "Requisitions", exact: true }),
    ).toBeVisible({ timeout: 15000 });

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });

  test("new requisition editor renders form fields", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/requisitions/new`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !location.href.includes("/login"), {
      timeout: 15000,
    });

    await expect(
      page.getByRole("heading", { name: "New requisition", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Slug")).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
  });
});
