import { test, expect, type Page } from "@playwright/test";

/**
 * Prospects Schema Validation Fix Test
 *
 * Verifies that /prospects page and detail page produce ZERO API schema violations.
 * Tests the fix for company_name missing field and other schema mismatches.
 */

const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";
const APP_URL = "https://react.ecbtx.com";

const KNOWN_NOISE = [
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
];

function isKnownNoise(text: string): boolean {
  return KNOWN_NOISE.some((noise) => text.includes(noise));
}

async function login(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), {
    timeout: 15000,
  });
}

test.describe("Prospects Schema Validation Fix", () => {
  test("prospects list page loads with zero schema violations", async ({
    page,
  }) => {
    const schemaViolations: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("[API Schema Violation]") && text.includes("/prospects")) {
          schemaViolations.push(text);
        }
      }
    });

    // Login
    await login(page);

    // Navigate to Prospects
    await page.goto(`${APP_URL}/prospects`);

    // Wait for API response to complete
    await page.waitForResponse(
      (resp) => resp.url().includes("/prospects") && resp.status() === 200,
      { timeout: 15000 },
    );

    // Give validation time to run
    await page.waitForTimeout(2000);

    // Verify data loaded - look for table rows or empty state
    const hasRows = await page.locator("tbody tr").count();
    const hasEmptyState = await page
      .locator("text=/no prospects/i")
      .isVisible()
      .catch(() => false);

    expect(hasRows > 0 || hasEmptyState).toBeTruthy();

    // Also check window.__schemaErrors for prospect-specific violations
    const windowErrors = await page.evaluate(() => {
      const errors = (window as any).__schemaErrors || [];
      return errors.filter(
        (e: any) => e.endpoint === "/prospects" || e.endpoint?.startsWith("/prospects/"),
      );
    });

    // Assert zero prospect schema violations
    if (schemaViolations.length > 0) {
      console.error(
        "Schema violations found:",
        JSON.stringify(schemaViolations, null, 2),
      );
    }
    if (windowErrors.length > 0) {
      console.error(
        "Window schema errors:",
        JSON.stringify(windowErrors, null, 2),
      );
    }

    expect(schemaViolations).toHaveLength(0);
    expect(windowErrors).toHaveLength(0);
  });

  test("prospect detail page loads with zero schema violations", async ({
    page,
  }) => {
    const schemaViolations: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("[API Schema Violation]") && text.includes("/prospects")) {
          schemaViolations.push(text);
        }
      }
    });

    // Login
    await login(page);

    // Navigate to Prospects list
    await page.goto(`${APP_URL}/prospects`);
    await page.waitForResponse(
      (resp) => resp.url().includes("/prospects") && resp.status() === 200,
      { timeout: 15000 },
    );
    await page.waitForTimeout(1000);

    // Click first prospect row (if any exist)
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log("No prospects in database — skipping detail page test");
      return;
    }

    // Click first row to navigate to detail
    await rows.first().click();

    // Wait for detail API response
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/prospects/") && resp.status() === 200,
      { timeout: 15000 },
    );
    await page.waitForTimeout(2000);

    // Verify detail page loaded
    expect(page.url()).toContain("/prospects/");

    // Check window errors for detail endpoint
    const windowErrors = await page.evaluate(() => {
      const errors = (window as any).__schemaErrors || [];
      return errors.filter((e: any) => e.endpoint?.startsWith("/prospects/"));
    });

    if (schemaViolations.length > 0) {
      console.error(
        "Detail page schema violations:",
        JSON.stringify(schemaViolations, null, 2),
      );
    }

    expect(schemaViolations).toHaveLength(0);
    expect(windowErrors).toHaveLength(0);
  });

  test("prospects API returns valid paginated shape", async ({ page }) => {
    // Login to get session cookie
    await login(page);

    // Fetch prospects API directly via page context (uses session cookies)
    const response = await page.evaluate(async (apiBase) => {
      const resp = await fetch(`${apiBase}/prospects/?page=1&page_size=5`, {
        credentials: "include",
      });
      return {
        status: resp.status,
        body: await resp.json(),
      };
    }, API_BASE);

    expect(response.status).toBe(200);

    // Validate paginated shape
    const body = response.body;
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("page_size");
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(typeof body.page).toBe("number");
    expect(typeof body.page_size).toBe("number");

    // Verify items don't have company_name (backend doesn't send it)
    if (body.items.length > 0) {
      const firstItem = body.items[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("first_name");
      expect(firstItem).toHaveProperty("prospect_stage");
      expect(firstItem).not.toHaveProperty("company_name");
    }
  });
});
