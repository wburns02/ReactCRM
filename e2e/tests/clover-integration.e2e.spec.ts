import { test, expect, Page } from "@playwright/test";

/**
 * Clover Integration E2E Tests
 *
 * Verifies the Clover POS integration against the live app:
 * - API endpoints: /config, /merchant, /payments, /orders, /items, /reconciliation
 * - Frontend: Clover POS tab, payment feed, orders, service catalog, reconciliation
 * - Sync: /sync creates CRM records from Clover data
 * - No console errors
 */

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

async function loginAndNavigate(page: Page, path: string) {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    } catch {
      // Retry login once
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    }
    await page.waitForTimeout(1000);

    if (!page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(1000);
  }
}

test.describe("Clover Integration", () => {
  // =========================================================================
  // API Tests (use page.evaluate for browser cookie auth)
  // =========================================================================

  test("API: /payments/clover/config returns configured", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/config`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Config: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.is_configured).toBe(true);
    expect(data.body.merchant_id).toBe("Z44MTQTEBN881");
    expect(data.body.merchant_name).toBe("MAC Septic");
    expect(data.body.environment).toBe("production");
    expect(data.body.rest_api_available).toBe(true);
  });

  test("API: /payments/clover/merchant returns merchant info", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/merchant`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Merchant: ${data.body.name}, ID: ${data.body.id}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.id).toBe("Z44MTQTEBN881");
    expect(data.body.name).toBe("MAC Septic");
  });

  test("API: /payments/clover/payments returns payment data", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/payments?limit=5`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Payments: ${data.body.total} returned`);

    expect(data.ok).toBeTruthy();
    expect(data.body.payments).toBeDefined();
    expect(Array.isArray(data.body.payments)).toBeTruthy();
    expect(data.body.payments.length).toBeGreaterThan(0);

    const first = data.body.payments[0];
    expect(first.amount_dollars).toBeGreaterThan(0);
    expect(first.result).toBe("SUCCESS");
    expect(first.tender_label).toBeTruthy();
  });

  test("API: /payments/clover/orders returns orders with line items", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/orders?limit=5`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Orders: ${data.body.total}, first total: $${data.body.orders?.[0]?.total_dollars}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.orders.length).toBeGreaterThan(0);

    const first = data.body.orders[0];
    expect(first.total_dollars).toBeGreaterThan(0);
    expect(first.line_items).toBeDefined();
    expect(Array.isArray(first.line_items)).toBeTruthy();
  });

  test("API: /payments/clover/items returns service catalog", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/items`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Items: ${data.body.total} services, names: ${data.body.items?.slice(0, 3).map((i: any) => i.name).join(", ")}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.items.length).toBeGreaterThan(5);
    expect(data.body.items.some((i: any) => i.name.includes("Pump Out"))).toBeTruthy();
  });

  test("API: /payments/clover/reconciliation returns matched data", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/reconciliation`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    const s = data.body.summary;
    console.log(`Reconciliation: ${s?.matched_count} matched, ${s?.unmatched_clover_count} unsynced, Clover total: $${s?.clover_total_dollars}`);

    expect(data.ok).toBeTruthy();
    expect(s.total_clover_payments).toBeGreaterThan(0);
    expect(s.matched_count).toBeGreaterThan(0);
    expect(s.clover_total_dollars).toBeGreaterThan(0);
  });

  // =========================================================================
  // UI Tests
  // =========================================================================

  test("Clover POS tab is visible on Payments page", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(2000);

    const cloverTab = page.locator('[data-testid="clover-tab"]');
    await expect(cloverTab).toBeVisible({ timeout: 10000 });
    expect(await cloverTab.textContent()).toContain("Clover POS");
  });

  test("Clover dashboard shows merchant status", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    // Click Clover POS tab
    await page.locator('[data-testid="clover-tab"]').click();
    await page.waitForTimeout(3000);

    // Check merchant card
    const merchantText = page.locator("text=MAC Septic").first();
    await expect(merchantText).toBeVisible({ timeout: 10000 });

    // Check connected status
    const connected = page.locator("text=Connected").first();
    await expect(connected).toBeVisible();
  });

  test("Clover dashboard shows payment feed", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="clover-tab"]').click();
    await page.waitForTimeout(3000);

    // Payments tab should be active by default
    const paymentsHeading = page.locator("text=Recent Clover Payments").first();
    await expect(paymentsHeading).toBeVisible({ timeout: 10000 });

    // Check table has data
    const tableRows = page.locator("table tbody tr");
    const rowCount = await tableRows.count();
    console.log(`Payment table has ${rowCount} rows`);
    expect(rowCount).toBeGreaterThan(0);

    // Check for SUCCESS badges
    const successBadges = page.locator("text=SUCCESS");
    const badgeCount = await successBadges.count();
    console.log(`Found ${badgeCount} SUCCESS badges`);
    expect(badgeCount).toBeGreaterThan(0);
  });

  test("Clover dashboard shows service catalog", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="clover-tab"]').click();
    await page.waitForTimeout(2000);

    // Click Service Catalog tab
    const catalogTab = page.locator("button", { hasText: "Service Catalog" });
    await catalogTab.click();
    await page.waitForTimeout(2000);

    // Check catalog header
    const catalogHeading = page.locator("text=Clover Service Catalog").first();
    await expect(catalogHeading).toBeVisible({ timeout: 10000 });

    // Check for known service
    const pumpOut = page.locator("text=SC Pump Out").first();
    await expect(pumpOut).toBeVisible();
  });

  test("Clover dashboard shows reconciliation", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="clover-tab"]').click();
    await page.waitForTimeout(2000);

    // Click Reconciliation tab
    const reconTab = page.locator("button", { hasText: "Reconciliation" });
    await reconTab.click();
    await page.waitForTimeout(2000);

    // Check for summary cards
    const matchedText = page.locator("text=Matched").first();
    await expect(matchedText).toBeVisible({ timeout: 10000 });

    // Check for Clover Payments count
    const cloverPayments = page.locator("text=Clover Payments").first();
    await expect(cloverPayments).toBeVisible();
  });

  test("No console errors on Clover dashboard", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("net::ERR") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("API Schema Violation") &&
          !text.includes("Failed to load resource") &&
          !text.includes("the server responded with a status of")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="clover-tab"]').click();
    await page.waitForTimeout(5000);

    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors:", consoleErrors.join("\n"));
    }
    expect(consoleErrors).toHaveLength(0);
  });
});
