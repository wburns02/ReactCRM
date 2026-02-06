/**
 * Final Invoice Customer Data Verification
 * Tests the complete invoice customer data flow
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Customer Data - Final Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("invoice list loads without error", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-list-verified.png",
      fullPage: false,
    });

    // Check no error
    const errorVisible = await page.locator("text=Failed to load").count() > 0;
    console.log("Has error:", errorVisible);

    // Check table visible
    const tableVisible = await page.locator("table").count() > 0;
    console.log("Table visible:", tableVisible);

    expect(errorVisible).toBe(false);
    expect(tableVisible).toBe(true);
  });

  test("invoice detail shows customer info", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click View on first invoice
    await page.locator("text=View").first().click();
    await page.waitForURL("**/invoices/**");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-detail-verified.png",
      fullPage: true,
    });

    // Check for 404 error (indicates API failure)
    const has404 = await page.locator("text=404").count() > 0 ||
                   await page.locator("text=Invoice Not Found").count() > 0;
    console.log("Has 404:", has404);

    if (has404) {
      console.log("Invoice detail page shows 404");
      expect(has404).toBe(false);
      return;
    }

    // Check page content
    const content = await page.textContent("body");

    // Check for UUID fallback pattern
    const uuidPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/i;
    const hasUUIDFallback = uuidPattern.test(content || "");
    console.log("Has UUID fallback:", hasUUIDFallback);

    // Should NOT show Customer #UUID on detail page
    expect(hasUUIDFallback).toBe(false);
  });
});
