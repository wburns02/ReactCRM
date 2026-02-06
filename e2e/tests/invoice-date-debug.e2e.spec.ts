/**
 * Debug Invoice Date Filtering
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Date Debug", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("debug date filtering with network capture", async ({ page }) => {
    // Capture API responses
    const apiResponses: any[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/invoices")) {
        const url = response.url();
        let body = null;
        try {
          body = await response.json();
        } catch {}
        apiResponses.push({ url, status: response.status(), body });
      }
    });

    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    console.log("=== INITIAL STATE ===");
    const initialCount = await page.locator("table tbody tr").count();
    console.log("Initial invoice count:", initialCount);

    // Show due dates
    const dueDates = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Due dates:", dueDates);

    // Test 1: date_from = Jan 26
    console.log("\n=== TEST 1: date_from = 2026-01-26 ===");
    const dateFromInput = page.locator('input[type="date"]').first();
    await dateFromInput.fill("2026-01-26");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");

    const countFrom26 = await page.locator("table tbody tr").count();
    const datesFrom26 = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Invoice count with date_from=Jan26:", countFrom26);
    console.log("Due dates:", datesFrom26);

    // Clear filter
    await dateFromInput.fill("");
    await page.waitForTimeout(1000);

    // Test 2: date_from = Jan 27
    console.log("\n=== TEST 2: date_from = 2026-01-27 ===");
    await dateFromInput.fill("2026-01-27");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");

    const countFrom27 = await page.locator("table tbody tr").count();
    const datesFrom27 = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Invoice count with date_from=Jan27:", countFrom27);
    console.log("Due dates:", datesFrom27);

    // Clear filter
    await dateFromInput.fill("");
    await page.waitForTimeout(1000);

    // Test 3: date_to = Jan 26
    console.log("\n=== TEST 3: date_to = 2026-01-26 ===");
    const dateToInput = page.locator('input[type="date"]').nth(1);
    await dateToInput.fill("2026-01-26");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");

    const countTo26 = await page.locator("table tbody tr").count();
    const datesTo26 = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Invoice count with date_to=Jan26:", countTo26);
    console.log("Due dates:", datesTo26);

    // Clear filter
    await dateToInput.fill("");
    await page.waitForTimeout(1000);

    // Test 4: date_to = Jan 27
    console.log("\n=== TEST 4: date_to = 2026-01-27 ===");
    await dateToInput.fill("2026-01-27");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");

    const countTo27 = await page.locator("table tbody tr").count();
    const datesTo27 = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Invoice count with date_to=Jan27:", countTo27);
    console.log("Due dates:", datesTo27);

    // Print all captured API calls
    console.log("\n=== API RESPONSES ===");
    for (const resp of apiResponses) {
      console.log("URL:", resp.url);
      if (resp.body?.items) {
        console.log("  Items count:", resp.body.items.length);
        console.log("  Due dates:", resp.body.items.map((i: any) => i.due_date));
      }
    }

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-debug.png",
      fullPage: false,
    });
  });
});
