import { test, expect, type Page } from "@playwright/test";

/**
 * Prospects Schema Validation Fix Test
 *
 * Verifies that /prospects page and detail page produce ZERO API schema violations.
 * Uses a shared login to avoid rate limiting.
 */

const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";
const APP_URL = "https://react.ecbtx.com";

let sharedPage: Page;

test.describe("Prospects Schema Validation Fix", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    sharedPage = await ctx.newPage();

    // Login once
    await sharedPage.goto(`${APP_URL}/login`);
    await sharedPage.fill('input[type="email"]', "will@macseptic.com");
    await sharedPage.fill('input[type="password"]', "#Espn2025");
    await sharedPage.click('button[type="submit"]');
    await sharedPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 15000 },
    );
  });

  test.afterAll(async () => {
    await sharedPage?.context().close();
  });

  test("prospects list page loads with zero schema violations", async () => {
    const schemaViolations: string[] = [];

    sharedPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("[API Schema Violation]") &&
          text.includes("/prospects")
        ) {
          schemaViolations.push(text);
        }
      }
    });

    await sharedPage.goto(`${APP_URL}/prospects`);
    await sharedPage.waitForResponse(
      (resp) => resp.url().includes("/prospects") && resp.status() === 200,
      { timeout: 15000 },
    );
    await sharedPage.waitForTimeout(2000);

    // Verify data loaded
    const hasRows = await sharedPage.locator("tbody tr").count();
    const hasEmptyState = await sharedPage
      .locator("text=/no prospects/i")
      .isVisible()
      .catch(() => false);
    expect(hasRows > 0 || hasEmptyState).toBeTruthy();

    // Check window.__schemaErrors for prospect violations
    const windowErrors = await sharedPage.evaluate(() => {
      const errors = (window as any).__schemaErrors || [];
      return errors.filter(
        (e: any) =>
          e.endpoint === "/prospects" ||
          e.endpoint?.startsWith("/prospects/"),
      );
    });

    expect(schemaViolations).toHaveLength(0);
    expect(windowErrors).toHaveLength(0);
  });

  test("prospect detail page loads with zero schema violations", async () => {
    const schemaViolations: string[] = [];

    sharedPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("[API Schema Violation]") &&
          text.includes("/prospects")
        ) {
          schemaViolations.push(text);
        }
      }
    });

    await sharedPage.goto(`${APP_URL}/prospects`);
    await sharedPage.waitForResponse(
      (resp) => resp.url().includes("/prospects") && resp.status() === 200,
      { timeout: 15000 },
    );
    await sharedPage.waitForTimeout(1000);

    const rows = sharedPage.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log("No prospects in database — skipping detail page test");
      return;
    }

    await rows.first().click();
    await sharedPage.waitForResponse(
      (resp) => resp.url().includes("/prospects/") && resp.status() === 200,
      { timeout: 15000 },
    );
    await sharedPage.waitForTimeout(2000);

    expect(sharedPage.url()).toContain("/prospects/");

    const windowErrors = await sharedPage.evaluate(() => {
      const errors = (window as any).__schemaErrors || [];
      return errors.filter((e: any) => e.endpoint?.startsWith("/prospects/"));
    });

    expect(schemaViolations).toHaveLength(0);
    expect(windowErrors).toHaveLength(0);
  });

  test("prospects API returns valid paginated shape", async () => {
    const response = await sharedPage.evaluate(async (apiBase) => {
      const resp = await fetch(`${apiBase}/prospects/?page=1&page_size=5`, {
        credentials: "include",
      });
      return { status: resp.status, body: await resp.json() };
    }, API_BASE);

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("page_size");
    expect(Array.isArray(body.items)).toBe(true);

    if (body.items.length > 0) {
      const firstItem = body.items[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("first_name");
      expect(firstItem).toHaveProperty("prospect_stage");
      expect(firstItem).not.toHaveProperty("company_name");
    }
  });
});
